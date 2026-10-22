"""Contact encryption. Keep the key with deployment secrets, never with exports."""
import hashlib
import hmac
import json
import os
from pathlib import Path
from cryptography.fernet import Fernet

class Contacts:
    def __init__(self, folder):
        path = Path(folder) / 'contact-encryption.key'
        supplied = os.environ.get('CROSSBOUND_CONTACT_KEY')
        if supplied:
            key = supplied.encode()
        elif path.exists():
            key = path.read_bytes().strip()
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            key = Fernet.generate_key()
            with path.open('xb') as file:
                file.write(key)
            try: path.chmod(0o600)
            except OSError: pass
        self.key, self.cipher = key, Fernet(key)
    def fingerprint(self, email):
        return hmac.new(self.key, email.strip().lower().encode(), hashlib.sha256).hexdigest()
    def seal(self, data):
        data = dict(data)
        email, wechat = data.get('email', '').strip(), data.get('wechat', '').strip()
        data['contact_value'] = self.cipher.encrypt(json.dumps({'email':email,'wechat':wechat}).encode()).decode()
        data['contact_hash'] = self.fingerprint(email)
        data['email'] = email[:1] + '***@' + email.rsplit('@', 1)[-1]
        data['wechat'] = wechat[:1] + '***' if wechat else ''
        return data
    def open(self, data):
        return json.loads(self.cipher.decrypt(data['contact_value'].encode()))
