const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../public/assets/simulator/model.js');
const source=fs.readFileSync('public/assets/simulator/app.js','utf8');
const text=[];
const context=new Proxy({measureText:t=>({width:String(t).length*7}),fillText:t=>text.push(t)}, {get:(target,key)=>key in target?target[key]:()=>{}});
const canvas={clientWidth:350,clientHeight:180,getContext:()=>context,setAttribute(){}};
const nodes={chromatogram:canvas,overlay:{value:'composition',selectedOptions:[{textContent:'Solvent B (%)'}]},'overlay-label':{},'show-peak-labels':{checked:true}};
const method=M.defaults();method.fraction=100;
const result=M.simulate(method,()=>0.5);
const ctx=vm.createContext({M,$:id=>nodes[id],window:{devicePixelRatio:1},result,view:null,reference:null,lockedY:null,selected:0,compareResolution:false,num:(v,d=2)=>String(Number(v.toFixed(d)))});
vm.runInContext(source.slice(source.indexOf('function detectorWindow('),source.indexOf("const plot=$('chromatogram')")),ctx);
vm.runInContext('draw()',ctx);
const range=vm.runInContext('plotGeometry.max-plotGeometry.min',ctx);
const peak=Math.max(...result.detector.values),bottom=Math.min(0,...result.detector.values);
assert(range<=(peak*1.14-bottom)*1.025*1.3+1e-8,'Crowded labels must not expand the y-axis without bound');
for(const [value,unit] of [[0.0000001,'fM'],[0.0001,'pM'],[0.1,'nM'],[5,'µM'],[1000,'mM'],[1e6,'M']]){
 const axis=vm.runInContext(`concentrationAxis(0,${value})`,ctx);assert.equal(axis.unit,unit);assert(value/axis.scale<1000);
}
for(const [value,label] of [[123.456,'123'],[1.23456,'1.23'],[0.00123456,'0.00123'],[-0.000123456,'-0.000123']])assert.equal(vm.runInContext(`axisTick(${value})`,ctx),label);
assert.equal(vm.runInContext('concentrationAxis(0,999.9).unit',ctx),'mM');
text.length=0;
ctx.result={...result,detector:{times:result.detector.times,values:result.detector.values.map(v=>v*1000)},peaks:result.peaks.map(p=>({...p,height:p.height*1000}))};
vm.runInContext('draw()',ctx);assert(text.includes('Concentration (mM)')||text.includes('Concentration (M)'));
console.log('PASS: crowded mobile peaks retain their height; concentration units scale from fM through M.');
