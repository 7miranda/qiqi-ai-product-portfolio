import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './crossbound-v11-fixture.mjs';
import {createCrossboundV2} from '../public/previews/crossbound/v2/model.js';
import {recommend} from '../public/previews/crossbound/v2/release.js';
import {capture,enqueue,flush,saveLead,userId} from '../public/previews/crossbound/v2/records.js';
import {tutorialSteps,checklist} from '../public/previews/crossbound/v2/tutorial.js';
import {readFileSync,readdirSync} from 'node:fs';
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const key='crossbound-outbox-20261021';
const queue=()=>JSON.parse(storage.get(key)||'[]');
const engine=createCrossboundV2(fixture().adapter);

test('capture emits complete reports with current economics and preserves nullable quiz rounds',()=>{
  storage.clear();let n=engine.create(12345);
  for(let i=0;i<6;i++){const r=recommend(engine,n);if(i===3)n=engine.publish(n,r.listing);n=engine.commit(n,{...r.choice,used_default:true})}
  capture(n,{history:[]},true,[],engine);
  const report=queue().find(r=>r.type==='round_reports').data;
  assert.equal(report.orders-report.refunds,report.kept_orders);
  assert.equal(report.profit,n.report.profit);assert.equal(report.completed,true);
  assert.equal(report.price,n.price);assert.ok(report.category);assert.ok(report.quantity>0);
  assert.ok(queue().some(r=>r.data.event==='round_complete'));
  assert.ok(queue().some(r=>r.type==='assessments'&&r.data.profit_score>=0));
});
test('lead retries retain one id but separate submissions get new snapshots and no local contact history',()=>{
  storage.clear();const n=engine.create(123);n.history=[{round:1}];
  const a={averageScore:50,number:'CB-test',scores:[{key:'profit',value:50}]};
  const input={email:'qa@example.com',wechat:'qa',category:'家居',followers:'还没开始',platform:'抖音',consent:true,report_text:'同一份报告'};
  saveLead(n,a,input);saveLead(n,a,input);
  const rows=queue().filter(r=>r.type==='leads');assert.equal(rows.length,2);assert.notEqual(rows[0].id,rows[1].id);
  assert.equal(rows[0].data.report_text,input.report_text);
  assert.ok(!storage.get('crossbound-leads-20261021').includes('qa@example.com'));
});
test('offline queue rotates unmet prerequisites and keeps in-flight newer revisions',async()=>{
  storage.clear();globalThis.location={protocol:'http:'};
  enqueue('feedback','user:first',{user_id:'user'});enqueue('round_reports','user:round:1',{user_id:'user',value:'old'});
  globalThis.fetch=async()=>{enqueue('round_reports','user:round:1',{user_id:'user',value:'new'});return {ok:true,json:async()=>({accepted:['user:round:1']})}};
  await flush();assert.equal(queue()[0].data.value,'new');assert.equal(queue()[1].id,'user:first');
  delete globalThis.location;
});
test('tutorial progress follows game state and completed report reading, not clicking through hints',()=>{
  const n=engine.create(1);
  assert.equal(tutorialSteps(n,'decision')[0].id,'1:market');
  assert.deepEqual(checklist(n,{}),[false,false,false,false,false]);
  n.stage=3;assert.equal(tutorialSteps(n,'decision')[0].id,'1:listing');
  n.currentListing={};assert.equal(tutorialSteps(n,'decision')[0].id,'1:promotion');
  n.history=[{round:1}];assert.deepEqual(checklist(n,{}),[true,true,true,false,false]);
  assert.deepEqual(checklist(n,{reports:{1:true}}),[true,true,true,true,false]);
  n.round=2;n.stage=2;assert.deepEqual(tutorialSteps(n,'decision').map(x=>x.id),['2:first-mile','2:credit']);
});
test('legacy analytics identity survives engine migration without changing UUID company identity',()=>{
  const company={runSeed:123,v2:{identity:'new-engine-uuid',collectionIdentity:'legacy-123'}};
  assert.equal(userId(company),'legacy-123');assert.equal(company.v2.identity,'new-engine-uuid');
});
test('both generated pages version every nested game module before loading application code',()=>{
  for(const page of ['index.html','preview.html']){
    const html=readFileSync(new URL('../public/previews/crossbound/'+page,import.meta.url),'utf8');
    const match=html.match(/<script type="importmap">(.*?)<\/script>/);
    assert.ok(match,`${page}: import map required for cached deployments`);
    const {imports}=JSON.parse(match[1]);
    for(const dir of ['v11','v2'])for(const file of readdirSync(new URL('../public/previews/crossbound/'+dir+'/',import.meta.url)).filter(x=>x.endsWith('.js'))){
      const key=`./${dir}/${file}`;assert.ok(imports[key].startsWith(key+'?v='),key);
    }
    assert.ok(html.indexOf(match[0])<html.indexOf('<script type="module">'));
  }
});
