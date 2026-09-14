FROM python:3.11-slim
WORKDIR /app
COPY requirements.lock .
RUN pip install --no-cache-dir -r requirements.lock && useradd --create-home dashboard
COPY --chown=dashboard:dashboard app.py ./
COPY --chown=dashboard:dashboard dashboard/__init__.py dashboard/schema.py dashboard/inference.py ./dashboard/
COPY --chown=dashboard:dashboard artifacts/ ./artifacts/
COPY --chown=dashboard:dashboard .streamlit/config.toml ./.streamlit/config.toml
USER dashboard
ENV OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2
EXPOSE 8501
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8501/_stcore/health', timeout=3)"
CMD ["streamlit", "run", "app.py"]
