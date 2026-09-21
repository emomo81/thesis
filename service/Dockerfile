FROM python:3.11-slim
WORKDIR /app
COPY service/requirements.lock /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt && useradd --create-home predictor
COPY --chown=predictor:predictor service/ /app/service/
COPY --chown=predictor:predictor dashboard/__init__.py dashboard/inference.py /app/dashboard/
COPY --chown=predictor:predictor artifacts/ /app/artifacts/
USER predictor
ENV OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 PORT=8000
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:'+__import__('os').environ.get('PORT','8000')+'/health', timeout=3)"
CMD ["sh", "-c", "exec uvicorn service.api:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --limit-concurrency 20"]
