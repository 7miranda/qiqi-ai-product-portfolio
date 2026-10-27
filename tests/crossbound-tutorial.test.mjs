import test from 'node:test';
import assert from 'node:assert/strict';
import {tutorialSteps,markReportRead,REPORT_READ_MS} from '../public/previews/crossbound/v2/tutorial.js';
import {activeWalkthrough,walkthroughPlan,bubblePosition} from '../public/previews/crossbound/v2/walkthrough.js';

test('first round covers entry, every real decision, listing and financial reading',()=>{
  const n={round:1,stage:0};
  assert.equal(tutorialSteps(n,null)[0].id,'1:enter');
  for(let stage=0;stage<6;stage++){
    n.stage=stage;
    const step=tutorialSteps(n,'decision')[0];
    const plan=walkthroughPlan(step.id,'decision');
    assert.ok(plan.length>=2,step.id);
    const last=plan.at(-1);assert.equal(last.wait,true);assert.equal(last.keep,undefined);
  }
  assert.equal(walkthroughPlan('1:listing','decision').at(-1).target,'[data-guide="publish"]');
  assert.equal(walkthroughPlan('1:report','financials').length,3);
});

test('second round only teaches new systems when they affect a decision',()=>{
  const n={round:2,stage:1,v2:{events:[]}};
  assert.deepEqual(tutorialSteps(n,'decision'),[]);
  n.stage=3;n.currentListing={};assert.deepEqual(tutorialSteps(n,'decision'),[]);
  n.stage=2;assert.deepEqual(tutorialSteps(n,'decision').map(s=>s.id),['2:credit']);
  n.v2.events=[{dueRound:2,stage:4,choice:null}];assert.equal(tutorialSteps(n,'decision').some(s=>s.id==='2:event'),false);
  // REQ-053 §4.6: first mile is taught at fulfilment, beside a pending event.
  n.stage=4;assert.deepEqual(tutorialSteps(n,'decision').map(s=>s.id),['2:first-mile','2:event']);
  n.v2.events[0].choice='prepare';assert.deepEqual(tutorialSteps(n,'decision').map(s=>s.id),['2:first-mile']);
});

test('REQ-053 P2-4: a read report is never walked through again; reading counts once, after a few seconds',()=>{
  const n={round:1,stage:6};
  assert.equal(tutorialSteps(n,'complete')[0].id,'1:report');
  assert.deepEqual(tutorialSteps(n,'financials',{reports:{1:true}}),[]);
  assert.deepEqual(tutorialSteps(n,'complete',{reports:{1:true}}),[]);
  const s={reports:{}};
  assert.equal(markReportRead(s,1,REPORT_READ_MS-1),s,'a glance does not count');
  const read=markReportRead(s,1,REPORT_READ_MS);
  assert.equal(read.reports[1],true);
  assert.equal(markReportRead(read,1,99999),read,'only once');
});

test('refresh resumes at saved control; confirmations never advance the game themselves',()=>{
  const steps=[{id:'1:stock',segment:2}];
  const next=activeWalkthrough(steps,{walk:{'1:stock:action':1}},'decision');
  assert.equal(next.item.target,'label[for="campaign-quantity"]');
  const last=activeWalkthrough(steps,{walk:{'1:stock:action':2}},'decision');
  assert.equal(last.item.wait,true);assert.equal(last.item.keep,undefined);
  const systems=[{id:'2:first-mile'},{id:'2:credit'}];
  assert.equal(activeWalkthrough(systems,{walk:{'2:first-mile:action':1}},'decision').step.id,'2:credit');
});

test('reading report finishes the lesson and returns to next round, never reopens the lesson',()=>{
  const steps=[{id:'1:report',segment:4}],state={reports:{1:true}};
  assert.equal(activeWalkthrough(steps,state,'complete').item.target,'[data-guide="next-round"]');
  assert.equal(activeWalkthrough(steps,state,'financials').item.target,'[data-guide="report"]');
  assert.equal(activeWalkthrough([{id:'2:report'}],{reports:{2:true}},'complete'),null);
});

test('coach fits desktop and narrow screens beside compact controls without overlap',()=>{
  for(const [width,height,rect] of [[1440,1000,{left:700,right:1200,top:100,bottom:160}],[390,844,{left:39,right:351,top:150,bottom:250}],[320,568,{left:30,right:290,top:80,bottom:170}]]){
    const box=bubblePosition(rect,width,height,250);
    assert.ok(box.left>=0&&box.left+box.width<=width);
    assert.ok(box.top>=0&&box.top+250<=height);
    assert.ok(box.left>=rect.right||box.left+box.width<=rect.left||box.top>=rect.bottom||box.top+250<=rect.top);
  }
});
