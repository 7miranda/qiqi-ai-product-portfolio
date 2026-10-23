# Company registry is the deployment default; override explicitly for local validation.
ARG PYTHON_IMAGE=hub.aukeyvalue.com/library/python:3.12-slim
FROM ${PYTHON_IMAGE}
ENV TZ=Asia/Shanghai \
    PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=5017 \
    PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    CROSSBOUND_CONTEXT_PATH=/crossbound CROSSBOUND_DATA_DIR=/app/data CROSSBOUND_LOG_DIR=/app/logs
WORKDIR /app

# Support both Debian source formats. PyMySQL needs no MySQL C client or GUI libraries.
RUN if [ -f /etc/apt/sources.list ]; then \
        sed -i 's@deb.debian.org@mirrors.aliyun.com@g; s@security.debian.org@mirrors.aliyun.com@g' /etc/apt/sources.list; \
    fi \
    && if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
        sed -i 's@deb.debian.org@mirrors.aliyun.com@g; s@security.debian.org@mirrors.aliyun.com@g' /etc/apt/sources.list.d/debian.sources; \
    fi \
    && apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ca-certificates tzdata \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./requirements.txt
COPY scripts/crossbound-local/requirements.txt scripts/crossbound-local/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt \
    && groupadd --gid 10001 crossbound \
    && useradd --uid 10001 --gid 10001 --no-create-home crossbound \
    && mkdir -p /app/data /app/logs \
    && chown -R 10001:10001 /app/data /app/logs
COPY scripts/crossbound-local/ scripts/crossbound-local/
COPY database/mysql/ database/mysql/
COPY backend/ backend/
USER 10001:10001
EXPOSE 5017
VOLUME ["/app/data", "/app/logs"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('PORT','5017')+os.environ.get('CROSSBOUND_CONTEXT_PATH','/crossbound')+'/api/health',timeout=4)"
CMD ["gunicorn", "--config", "backend/gunicorn.conf.py", "--chdir", "backend", "app:create_app()"]
