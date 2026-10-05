const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const M=require('../public/assets/fluid/model.js');
const references=require('../fluid/java-reference.json');
const context={window:{}};vm.runInNewContext(fs.readFileSync('public/assets/fluid/examples.js','utf8'),context);
const examples=JSON.parse(JSON.stringify(context.window.FluidExamples));
const close=(a,b)=>assert.ok(Math.abs(a-b)<=Math.max(1e-14,Math.abs(b)*1e-11),`${a} != ${b}`);
for(const {part,expected} of references){const r=M.properties(part,400,0,.5);[r.pressure,r.variance,r.delay].forEach((v,i)=>close(v,expected[i]));}
console.log(`PASS: ${references.length} Java component reference calculations (pressure, dispersion, delay)`);
for(const {name,expected} of require('../fluid/java-systems.json')){
  const actual=M.calculate(examples.find(e=>e.name===name).layout).results;
  assert.equal(actual.length,expected.length);
  expected.forEach((r,i)=>{if(r.pressure===null)assert.equal(actual[i].pressure,Infinity);else close(actual[i].pressure,r.pressure);close(actual[i].broadening,r.broadening);close(actual[i].delay,r.delay);});
}
console.log('PASS: complete flow-path totals against Java for all six examples');
for(const {layout} of examples){M.validate(layout);for(const p of layout.parts.filter(p=>p.type==='valve')){for(let i=0;i<p.positions;i++){p.state=i;for(let j=0;j<p.ports.length;j++){const other=M.internal(p,j);if(other!==null)assert.equal(M.internal(p,other),j);}const r=M.calculate(layout);for(const v of r.results){assert.ok(v.pressure>=0);assert.ok(Number.isFinite(v.broadening));assert.ok(Number.isFinite(v.delay));}}}}
console.log('PASS: all six converted layouts, all valve states, and reciprocal valve connections');
const p=M.createPart('pump','pump'),c=M.createPart('column','column'),w=M.createPart('waste','waste');
const t=(id,from,to,length=10)=>({id,from,to,length,diameter:5,bends:[]});
const layout={format:'hplc-fluid-visualizer',version:1,parts:[p,c,w],tubes:[t('a',{part:p.id,port:0},{part:c.id,port:0}),t('b',{part:c.id,port:1},{part:w.id,port:0})]};
M.validate(layout);const r=M.calculate(layout).results[0],f=M.composition(p),tp=M.tube(layout.tubes[0],p.flow,p.solvent,f),cp=M.properties(c,p.flow,p.solvent,f);
close(r.pressure,2*tp.pressure+cp.pressure);close(r.broadening,Math.sqrt(2*tp.variance+cp.variance)*1000);close(r.delay,p.volume/p.flow+tp.delay);assert.equal(r.status,'Flow to waste');
layout.tubes[1].length=100;close(M.calculate(layout).results[0].delay,r.delay);
c.preheater=true;assert.ok(M.calculate(layout).results[0].delay>r.delay);
layout.parts[2]=M.createPart('autosampler','waste');assert.match(M.calculate(layout).results[0].status,/Blocked/);assert.equal(M.calculate(layout).results[0].pressure,Infinity);
console.log('PASS: path totals, upstream-only gradient delay, preheater, and conflicting sources');
const valve=M.createPart('valve','valve',0,0,7,6);layout.parts=[p,valve];layout.tubes=[t('a',{part:'pump',port:0},{part:'valve',port:1})];assert.equal(M.calculate(layout).results[0].pressure,Infinity);valve.state=1;assert.equal(M.calculate(layout).results[0].status,'Open outlet');
const tube5=M.tube({diameter:5,length:10},400,0,.5),tube10=M.tube({diameter:10,length:10},400,0,.5);close(tube5.pressure/tube10.pressure,16);close(tube10.delay/tube5.delay,4);
console.log('PASS: selector blocking and tubing diameter scaling');
const bad=JSON.parse(JSON.stringify(layout));bad.parts[0].flow=0;assert.throws(()=>M.validate(bad));bad.parts[0].flow=400;bad.tubes.push({...bad.tubes[0],id:'duplicate'});assert.throws(()=>M.validate(bad));
const escaped=JSON.parse(JSON.stringify(layout));escaped.parts[0].id='bad" onclick="alert(1)';assert.throws(()=>M.validate(escaped));
console.log('PASS: invalid file and duplicate connection rejection');
