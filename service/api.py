"""Private Render inference API. Only the authenticated Next.js backend calls this."""
from __future__ import annotations
import asyncio
import logging
import os
import secrets
from contextlib import asynccontextmanager
from typing import Literal

import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from starlette.concurrency import run_in_threadpool
from dashboard.inference import InputError, load_manifest, load_model, predict

logger = logging.getLogger(__name__)
MAX_BODY = 1024 * 1024

class PredictionRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    stage: Literal['enrollment', 'semester1', 'semester2']
    rows: list[dict[str, float | str | None]] = Field(min_length=1, max_length=250)

@asynccontextmanager
async def lifespan(app: FastAPI):
    key = os.environ.get('MODEL_API_KEY', '')
    if len(key) < 32:
        raise RuntimeError('Set MODEL_API_KEY to a private random secret of at least 32 characters.')
    manifest = load_manifest()
    app.state.key = key
    app.state.manifest = manifest
    app.state.models = {stage: load_model(stage, manifest) for stage in manifest['models']}
    app.state.capacity = asyncio.Semaphore(2)
    yield

app = FastAPI(title='Academa model service', lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

@app.get('/health')
def health():
    return {'status': 'ok'}

@app.post('/v1/predict')
async def predict_students(request: Request):
    if not secrets.compare_digest(request.headers.get('x-model-api-key', ''), request.app.state.key):
        raise HTTPException(401, 'Unauthorized')
    # Bound streamed bodies, not just client-provided Content-Length headers.
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > MAX_BODY:
            raise HTTPException(413, 'Request exceeds 1 MB.')
    try:
        payload = PredictionRequest.model_validate_json(body)
    except ValidationError:
        raise HTTPException(422, 'Use a valid stage and between 1 and 250 numeric student profiles.')
    info = request.app.state.manifest['models'][payload.stage]
    # Only documented predictors enter the model; no names/identifiers are returned.
    for row in payload.rows:
        if len(row) > 60 or any(len(k) > 120 or (isinstance(v, str) and len(v) > 100) for k, v in row.items()):
            raise HTTPException(422, 'Too many columns or oversized field values.')
    try:
        async with request.app.state.capacity:
            output, warnings = await run_in_threadpool(
                predict, pd.DataFrame(payload.rows), request.app.state.models[payload.stage], info,
            )
    except InputError as exc:
        raise HTTPException(422, str(exc))
    except Exception:
        # Never log payloads containing student data.
        logger.error('Packaged model inference failed')
        raise HTTPException(503, 'The model is temporarily unavailable.')
    results = [{'row': index + 1, 'outcome': row['Predicted outcome'],
                'probabilities': {label: float(row[f'P({label})']) for label in info['classes']}}
               for index, (_, row) in enumerate(output.iterrows())]
    return {'stage': payload.stage, 'model_version': info['sha256'], 'results': results, 'warnings': warnings}
