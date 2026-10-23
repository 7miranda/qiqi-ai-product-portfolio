import os
from pathlib import Path
bind='0.0.0.0:'+os.environ.get('PORT','5017')
workers=2
worker_class='gthread'
threads=4
timeout=60
graceful_timeout=30
keepalive=5
log_dir=Path(os.environ.get('CROSSBOUND_LOG_DIR','/app/logs'))
log_dir.mkdir(parents=True,exist_ok=True)
accesslog=str(log_dir/'access.log')
errorlog=str(log_dir/'error.log')
loglevel='info'
# U excludes query strings. No contact payload, token, user-agent or IP is logged.
access_log_format='%(t)s pid=%(p)s method=%(m)s path=%(U)s status=%(s)s duration_us=%(D)s'
capture_output=True
forwarded_allow_ips=''  # Origin validation uses the explicit public origin, never forwarded headers.
