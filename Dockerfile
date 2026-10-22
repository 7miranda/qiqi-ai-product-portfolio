FROM python:3.12-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8080 \
    CROSSBOUND_CONTEXT_PATH=/crossbound CROSSBOUND_DATA_DIR=/app/data CROSSBOUND_LOG_DIR=/app/logs
WORKDIR /app
COPY scripts/crossbound-local/requirements.txt scripts/crossbound-local/requirements.txt
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt \
    && groupadd --gid 10001 crossbound \
    && useradd --uid 10001 --gid 10001 --no-create-home crossbound \
    && mkdir -p /app/data /app/logs \
    && chown -R 10001:10001 /app/data /app/logs
COPY scripts/crossbound-local/ scripts/crossbound-local/
COPY database/mysql/ database/mysql/
COPY backend/ backend/
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('PORT','8080')+os.environ.get('CROSSBOUND_CONTEXT_PATH','/crossbound')+'/api/health',timeout=4)"
CMD ["gunicorn", "--config", "backend/gunicorn.conf.py", "--chdir", "backend", "app:create_app()"]
