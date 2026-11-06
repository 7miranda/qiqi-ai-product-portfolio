import fs from 'node:fs';
// Contract tests inspect the shipped module, whether embedded or cacheable.
export function entrySource(html){
  return html.replace(/<script type="module">import "\.\/game\.js\?v=[a-f0-9]+";<\/script>/,
    ()=>'<script type="module">'+fs.readFileSync(new URL('../public/previews/crossbound/game.js',import.meta.url),'utf8')+'</script>');
}
