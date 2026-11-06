import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

const hash=value=>createHash('sha256').update(value).digest('hex').slice(0,12);
const images=new Map();
async function writeAsset(file,bytes){const temporary=file+".tmp";await fs.writeFile(temporary,bytes);await fs.rename(temporary,file);}
// Keep image payloads out of the JavaScript parser and make app assets reusable
// between the homepage and the game. Every URL is same-origin and content-versioned.
export async function splitEntryAssets(html,directory){
  const embedded=[...new Set(html.match(/data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/=]+/g)||[])];
  for(const data of embedded){
    if(data.length<10000)continue;
    if(!images.has(data)){
      const name=`assets/site/${hash(data)}.webp`,file=path.join(directory,name);
      await fs.mkdir(path.dirname(file),{recursive:true});
      const bytes=await sharp(Buffer.from(data.slice(data.indexOf(',')+1),'base64')).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:84}).toBuffer();
      await writeAsset(file,bytes);images.set(data,'./'+name);
    }
    html=html.split(data).join(images.get(data));
  }
  const scripts=[...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
  for(const match of scripts){
    if(match[1].length<100000)continue;
    const name='game.js',code=match[1];await writeAsset(path.join(directory,name),code);
    html=html.replace(match[0],`<script type="module">import "./${name}?v=${hash(code)}";</script>`);
  }
  for(const match of [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]){
    if(match[1].length<100000)continue;
    const name='game.css',css=match[1];await writeAsset(path.join(directory,name),css);
    html=html.replace(match[0],`<link rel="stylesheet" href="./${name}?v=${hash(css)}">`);
  }
  return html;
}
