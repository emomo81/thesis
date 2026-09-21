"""HTTP contract and security tests for the private inference service."""
import pytest
from fastapi.testclient import TestClient
from dashboard.inference import load_manifest, template
from service.api import app

TEST_KEY = 'test-only-secret-not-for-production-123456789'

@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv('MODEL_API_KEY', TEST_KEY)
    with TestClient(app) as client:
        yield client

def payload(stage='enrollment'):
    return {'stage': stage, 'rows': template(load_manifest()['models'][stage]).to_dict('records')}

def test_health(client):
    assert client.get('/health').json() == {'status': 'ok'}
    assert client.get('/docs').status_code == 404

@pytest.mark.parametrize('key', ['', 'wrong-key'])
def test_requires_server_secret(client, key):
    assert client.post('/v1/predict', json=payload(), headers={'x-model-api-key': key}).status_code == 401

@pytest.mark.parametrize('stage', ['enrollment', 'semester1', 'semester2'])
def test_prediction_contract(client, stage):
    body = payload(stage)
    body['rows'][0]['private identifier'] = 'not returned'
    response = client.post('/v1/predict', json=body, headers={'x-model-api-key': TEST_KEY})
    assert response.status_code == 200
    data = response.json()
    assert data['stage'] == stage
    assert len(data['model_version']) == 64
    assert len(data['results']) == 1
    assert set(data['results'][0]) == {'row', 'outcome', 'probabilities'}
    assert sum(data['results'][0]['probabilities'].values()) == pytest.approx(1)
    assert 'private identifier' not in response.text
    assert 'Age at enrollment' not in data['results'][0]

@pytest.mark.parametrize('body', [
    {'stage': 'invalid', 'rows': [{}]}, {'stage': 'enrollment', 'rows': []},
    {'stage': 'enrollment', 'rows': [{}] * 251}, {'stage': 'enrollment', 'rows': [{}]},
])
def test_invalid_payloads(client, body):
    assert client.post('/v1/predict', json=body, headers={'x-model-api-key': TEST_KEY}).status_code == 422

def test_limits_and_bad_json(client):
    headers = {'x-model-api-key': TEST_KEY}
    assert client.post('/v1/predict', content=b'x' * (1024 * 1024 + 1), headers=headers).status_code == 413
    assert client.post('/v1/predict', content=b'{bad json', headers=headers).status_code == 422

def test_invalid_input_is_not_imputed(client):
    body = payload()
    body['rows'][0]['Age at enrollment'] = -1
    response = client.post('/v1/predict', json=body, headers={'x-model-api-key': TEST_KEY})
    assert response.status_code == 422
    assert 'Age at enrollment' in response.json()['detail']

def test_missing_service_secret_fails_startup(monkeypatch):
    monkeypatch.delenv('MODEL_API_KEY', raising=False)
    with pytest.raises(RuntimeError, match='MODEL_API_KEY'):
        with TestClient(app):
            pass
