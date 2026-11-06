import {entrySource} from './entry-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const parse=text=>ts.createSourceFile('app.js',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
function find(tree,predicate){let found;function visit(n){if(predicate(n))found=n;ts.forEachChild(n,visit);}visit(tree);assert.ok(found,'production callback exists');return found;}
function fn(text,name){const tree=parse(text);return find(tree,n=>ts.isFunctionDeclaration(n)&&n.name?.text===name).getText(tree);}
const boot=read('public/previews/crossbound/v3/world/boot.js');
const world=read('public/previews/crossbound/v3/world/world.js');

test('resuming achievements closes its native modal before entering or focusing the current scene',()=>{
  for(const view of ['achievements','passport','tutorial-guide','zone',null]){
    const events=[],state={snapshot:{view,actions:{close(){events.push('close');state.snapshot.view=null;}}}};
    const context={state,scenesOn:()=>true,inGame:()=>true,currentWorld:()=> 'w1',openScene:id=>events.push(id)};
    assert.equal(vm.runInNewContext(fn(boot,'enter')+';enter()',context),true);
    assert.deepEqual(events,view?['close','w1']:['w1']);
  }
});

test('classic mode and the landing page do not consume resume actions',()=>{
  for(const [enabled,playing] of [[false,true],[true,false]]){
    assert.equal(vm.runInNewContext(fn(boot,'enter')+';enter()',{scenesOn:()=>enabled,inGame:()=>playing}),false);
  }
});

test('finance controls open their own panel; stage completion does not dismiss a player-opened panel',()=>{
  const events=[],actions={panel:id=>events.push(id),close:()=>events.push('close')};
  vm.runInNewContext(fn(world,'advancedOptions')+';advancedOptions()',{engine:{act:()=>actions}});
  assert.deepEqual(events,['funding']);
  for(const view of ['funding','community','complete','decision']){
    events.length=0;
    vm.runInNewContext(fn(world,'closeNextPanel')+';closeNextPanel()',{store:{snapshot:()=>({view,actions})}});
    assert.deepEqual(events,view==='decision'?['close']:[]);
  }
});

for(const file of ['index.html','preview.html'])test(`${file}: replay disposes settlement before publishing restored progress; tutorial resumes the scene`,()=>{
  const html=entrySource(read('public/previews/crossbound/'+file));
  const script=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].find(m=>m[1].includes('function Roe('))[1];
  const tree=parse(script);
  const callback=find(tree,n=>ts.isArrowFunction(n)&&n.getText(tree).includes('const restored=lG(t,Oe)'));
  const events=[],restored={stage:2},context={t:{stage:6},Oe:2,lG:()=>restored,window:{CrossboundScenes:{reset:()=>events.push('reset')}},i:value=>{assert.equal(value,restored);events.push('company');},d:zone=>events.push(zone),u:view=>events.push(view),R7:['market','product','supply']};
  vm.runInNewContext('('+callback.getText(tree)+')()',context);
  assert.deepEqual(events,['reset','company','supply','decision']);
  const tutorial=find(tree,n=>ts.isCallExpression(n)&&n.arguments[0]?.getText(tree)==='V2UI.Tutorial'&&n.arguments[1]?.getText(tree).includes('checklistOnly:true'));
  const props=vm.runInNewContext('('+tutorial.arguments[1].getText(tree)+')',{v4Guide:{},t:{stage:6},nr:()=> 'scene'});
  assert.equal(props.onResume(),'scene');
  const exitEvents=[];
  vm.runInNewContext(fn(script,'hu')+';hu()',{
    v11SetFailure:value=>exitEvents.push(['failure',value]),window:{CrossboundScenes:{reset:()=>exitEvents.push(['scene',null])},scrollTo(){}},
    v11Flow:{active:false},dt:null,u:value=>exitEvents.push(['view',value]),tn(){},a:value=>exitEvents.push(['playing',value]),
    URL,location:{href:'http://localhost/preview.html#home-start'},history:{replaceState(){}},
  });
  assert.deepEqual(exitEvents,[['failure',null],['scene',null],['view',null],['playing',false]]);
});
