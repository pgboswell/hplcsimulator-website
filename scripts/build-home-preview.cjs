// Regenerate the vector Home illustration from the actual simulator model.
// Run: node scripts/build-home-preview.cjs
const fs = require('node:fs');
const path = require('node:path');
const M = require('../public/assets/simulator/model.js');
const method = M.defaults();
method.mode = 'gradient';
const result = M.simulate(method, () => 0.5);
const width = 1000, height = 460, left = 80, top = 28, pw = 840, ph = 376;
const {times, values} = result.detector;
const x = t => left + t / result.end * pw;
const labels = result.peaks.map(p => ({...p, x: x(p.retention), value: M.detectorAt(result,p.retention)})).sort((a,b)=>a.x-b.x);
// The same non-overlapping label placement used by the interactive plot.
const gap = 26, blocks = [];
labels.forEach((p,i) => {
  blocks.push({sum:p.x-i*gap,count:1});
  while(blocks.length>1){
    const b=blocks.at(-1),a=blocks.at(-2);
    if(a.sum/a.count<=b.sum/b.count)break;
    blocks.splice(-2,2,{sum:a.sum+b.sum,count:a.count+b.count});
  }
});
let index=0;
for(const block of blocks){
  const base=Math.max(left+12,Math.min(left+pw-12-(labels.length-1)*gap,block.sum/block.count));
  for(let j=0;j<block.count;j++,index++)labels[index].labelX=base+index*gap;
}
let max=values.reduce((a,b)=>Math.max(a,b),0)*1.14;
let min=values.reduce((a,b)=>Math.min(a,b),0);
min-=(max-min)*0.025;
for(let pass=0;pass<12;pass++){
  let overflow=0;
  for(const p of labels){
    const peakY=top+ph-(p.value-min)/(max-min)*ph;
    overflow=Math.max(overflow,top+10+26+Math.abs(p.labelX-p.x)-peakY);
  }
  if(overflow<0.1)break;
  max=min+(max-min)*Math.min(2,ph/Math.max(ph/2,ph-overflow-1));
}
const y = value => top+ph-(value-min)/(max-min)*ph;
const f = value => Number(value.toFixed(2));
const text = (px,py,value,extra='') => `<text x="${f(px)}" y="${f(py)}" ${extra}>${value}</text>`;
const line = (points,color,extra='') => `<path d="${points.map(([px,py],i)=>`${i?'L':'M'}${f(px)},${f(py)}`).join(' ')}" fill="none" stroke="${color}" ${extra}/>`;
const parts=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">HPLC gradient-elution chromatogram</title><desc id="desc">Calculated with the HPLC Simulator's default gradient method: nine numbered compounds, selected acetophenone in red, and solvent B percentage on the right axis.</desc><rect width="1000" height="460" fill="white"/><defs><clipPath id="plot"><rect x="${left}" y="${top}" width="${pw}" height="${ph}"/></clipPath></defs><g font-family="Segoe UI,Arial,sans-serif" font-size="16" fill="#62718d" text-anchor="middle">`];
for(let i=0;i<=4;i++){
  const py=top+ph*i/4;
  parts.push(line([[left,py],[left+pw,py]],'#e6eaf4'),text(left-10,py+5,f(max-(max-min)*i/4),'text-anchor="end"'),text(left+pw+10,py+5,100-i*25,'text-anchor="start" fill="#627ba4"'));
}
for(let i=0;i<=6;i++){
  const px=left+pw*i/6;
  parts.push(line([[px,top],[px,top+ph]],'#eef1f8'),text(px,top+ph+25,f(result.end/60*i/6)));
}
parts.push(text(left+pw/2,height-7,'Time (min)','fill="#4e5b7d"'),`<text transform="translate(20 ${top+ph/2}) rotate(-90)" fill="#4e5b7d">Concentration (µM)</text>`,`<text transform="translate(982 ${top+ph/2}) rotate(90)" fill="#627ba4">Solvent B (%)</text>`,`<g clip-path="url(#plot)" stroke-linejoin="round">`);
parts.push(line(times.map((t,i)=>[x(t),y(values[i])]),'#202396','stroke-width="1.8"'));
parts.push(line(times.map(t=>[x(t),y(M.peakSignal(result.peaks[0],t)+method.offset)]),'#d32f2f','stroke-width="2.2"'));
parts.push(line(Array.from({length:301},(_,i)=>{const t=result.end*i/300;return [x(t),top+ph-M.auxiliary(result,t,'composition')/100*ph];}),'#6c84ae','stroke-width="1.4" stroke-dasharray="5 4"'),'</g>');
for(const p of labels){
  const py=y(p.value),diagonal=Math.abs(p.labelX-p.x),ly=py-26-diagonal;
  parts.push(line([[p.x,py-2],[p.x,py-7],[p.labelX,py-7-diagonal],[p.labelX,ly+9]],p.index===0?'#d32f2f':'#778098','stroke-width="1.1"'));
  parts.push(text(p.labelX,ly+4,p.index+1,`font-weight="600" fill="${p.index===0?'#d32f2f':'#3c4665'}"`));
}
parts.push('</g></svg>');
fs.writeFileSync(path.join(__dirname,'../public/assets/simulator-preview.svg'),parts.join('\n'));
console.log('Generated vector gradient preview from simulator data.');
