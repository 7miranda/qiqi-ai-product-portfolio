import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root=new URL('../public/previews/crossbound/',import.meta.url);
test('both entry pages reuse versioned app assets and external optimized images',()=>{
 for(const page of ['index.html','preview.html']){const html=fs.readFileSync(new URL(page,root),'utf8');assert.ok(Buffer.byteLength(html)<20000);
 for(const name of ['game.js','game.css']){const hash=html.match(new RegExp(name.replace('.','\\.')+'\\?v=([a-f0-9]+)'))?.[1];assert.ok(hash);assert.equal(createHash('sha256').update(fs.readFileSync(new URL(name,root))).digest('hex').slice(0,12),hash);}
 }
 const code=fs.readFileSync(new URL('game.js',root),'utf8');assert.doesNotMatch(code,/data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/=]{10000}/);
 const images=[...code.matchAll(/\.\/assets\/site\/[a-f0-9]+\.webp/g)];assert.ok(images.length>0);for(const [name] of images)assert.ok(fs.statSync(new URL(name,root)).size>0);
});
