import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const venv=path.join(root,'.crossbound-local/venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
const child=spawn(existsSync(venv)?venv:'python',[path.join(root,'scripts/crossbound-local/server.py'),...process.argv.slice(2)],{cwd:root,stdio:'inherit'});
child.on('error',error=>{console.error(error.message);process.exitCode=1});
child.on('exit',code=>{process.exitCode=code??1});
