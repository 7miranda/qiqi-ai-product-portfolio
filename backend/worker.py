"""Dedicated delivery worker; MySQL advisory locking prevents parallel queue claims."""
import logging
from logging.handlers import WatchedFileHandler
import os
from pathlib import Path
import signal
import sys
import threading
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts/crossbound-local'))
from mail_delivery import deliver
from server import Store
from app import verify_schema
from configuration import validate_environment
validate_environment()
log_dir=Path(os.environ.get('CROSSBOUND_LOG_DIR','/app/logs'))
log_dir.mkdir(parents=True,exist_ok=True)
logging.basicConfig(level=logging.INFO,format='%(asctime)s %(levelname)s %(message)s',
                    handlers=[logging.StreamHandler(),WatchedFileHandler(log_dir/'worker.log')])
if not os.environ.get('CROSSBOUND_CONTACT_KEY'):
    raise RuntimeError('CROSSBOUND_CONTACT_KEY is required')
store=Store(data_dir=Path(os.environ.get('CROSSBOUND_DATA_DIR','/app/data')),auto_migrate=False)
verify_schema(store)
stop=threading.Event()
signal.signal(signal.SIGTERM,lambda *_:stop.set())
signal.signal(signal.SIGINT,lambda *_:stop.set())
while not stop.is_set():
    try:
        count=deliver(store)
        if count: logging.info('delivery_batch count=%d',count)
    except Exception as exc:
        logging.error('delivery_failure exception_type=%s',type(exc).__name__)
    stop.wait(20)
