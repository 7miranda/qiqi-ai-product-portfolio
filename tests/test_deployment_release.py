"""Exercise real release.sh success/rollback inside a disposable Linux container.

Docker/curl are simulated here; real container/MySQL checks run separately.
Never runs on the user's host: requires an explicit isolated-container marker.
"""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

@unittest.skipUnless(os.environ.get('CROSSBOUND_ISOLATED_RELEASE_TEST') == '1', 'disposable Linux container only')
class ReleaseFlowTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.work = Path(self.temp.name)
        (self.work/'deploy').mkdir()
        for file in ('release.sh','preflight.sh','compose.yaml'):
            shutil.copyfile(Path('/release-source')/file,self.work/'deploy'/file)
        self.front = self.work/'dist/crossbound'; self.front.mkdir(parents=True)
        (self.front/'index.html').write_text('test frontend')
        (self.front/'runtime-config.js').write_text('window.CROSSBOUND_API_BASE = "/crossbound/api";\n')
        self.config=Path('/data/crossbound/config'); self.config.mkdir(parents=True,exist_ok=True)
        self.releases=Path('/data/www/releases/crossbound'); self.releases.mkdir(parents=True,exist_ok=True)
        Path('/data/crossbound/backend').mkdir(parents=True,exist_ok=True)
        self.live=Path('/data/www/crossbound')
        if self.live.is_symlink(): self.live.unlink()
        self.old=self.releases/'old'; self.old.mkdir(exist_ok=True)
        self.live.symlink_to(self.old)
        (self.config/'runtime.env').write_text('old-secret-config\n')
        self.credential=self.work/'credential.env'
        self.credential.write_text('CROSSBOUND_PUBLIC_ORIGIN=https://game.internal\n')
        self.bin=self.work/'bin';self.bin.mkdir()
        (self.bin/'docker').write_text('''#!/usr/bin/env bash
set -eu
printf '%s %s\n' "$CROSSBOUND_IMAGE" "$*" >> "$CALL_LOG"
case "$*" in
  *"ps -q backend"*) echo old-container ;;
  *"inspect --format"*) echo crossbound-backend:previous ;;
  *"up -d"*) if [[ "$FAIL_STAGE" == backend && "$CROSSBOUND_IMAGE" != crossbound-backend:previous ]]; then exit 1; fi ;;
esac
''')
        (self.bin/'curl').write_text('''#!/usr/bin/env bash
set -eu
case "$*" in
 *https://*) if [[ "$FAIL_STAGE" == public ]]; then exit 22; fi ;;
esac
case "$*" in
 *runtime-config.js*) cat dist/crossbound/runtime-config.js ;;
 *api/health*) printf '{"status":"ok","database":"mysql"}' ;;
 *) printf 'test frontend' ;;
esac
''')
        for script in self.bin.iterdir(): script.chmod(0o755)
        self.env={**os.environ,'PATH':str(self.bin)+':'+os.environ['PATH'],
                  'CROSSBOUND_IMAGE':'crossbound-backend:new','APP_ENV_FILE':str(self.credential),
                  'CALL_LOG':str(self.work/'calls.log'),'FAIL_STAGE':'none',
                  'RELEASE_ID':'100-abcdef012345'}
        target=self.releases/self.env['RELEASE_ID']
        if target.exists(): shutil.rmtree(target)  # /data is this test container's disposable tmpfs.

    def tearDown(self): self.temp.cleanup()

    def run_release(self, fail='none'):
        return subprocess.run(['bash','deploy/release.sh'],cwd=self.work,env={**self.env,'FAIL_STAGE':fail},capture_output=True,text=True)

    def test_success_publishes_matching_frontend_and_config(self):
        result=self.run_release()
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(self.live.resolve(),self.releases/self.env['RELEASE_ID'])
        self.assertEqual((self.config/'runtime.env').read_text(),self.credential.read_text())
        self.assertEqual((self.config/'runtime.env').stat().st_mode & 0o777,0o600)
        self.assertEqual((self.config/'current-image.txt').read_text().strip(),self.env['CROSSBOUND_IMAGE'])

    def test_backend_failure_restores_old_config_and_image(self):
        result=self.run_release('backend')
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(self.live.resolve(),self.old)
        self.assertEqual((self.config/'runtime.env').read_text(),'old-secret-config\n')
        self.assertIn('crossbound-backend:previous compose',(self.work/'calls.log').read_text())

    def test_public_failure_restores_frontend_too(self):
        result=self.run_release('public')
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(self.live.resolve(),self.old)
        self.assertEqual((self.config/'runtime.env').read_text(),'old-secret-config\n')

    def test_real_directory_refused_before_service_changes(self):
        self.live.unlink();self.live.mkdir();(self.live/'keep.txt').write_text('keep')
        try:
            result=self.run_release()
            self.assertNotEqual(result.returncode,0)
            self.assertEqual((self.live/'keep.txt').read_text(),'keep')
            self.assertFalse((self.work/'calls.log').exists())
        finally:
            (self.live/'keep.txt').unlink();self.live.rmdir()
