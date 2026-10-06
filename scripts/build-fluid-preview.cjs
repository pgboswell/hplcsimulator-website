// Render the actual six-port example with the visualizer's artwork and routing.
// Run: node scripts/build-fluid-preview.cjs
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,'public/assets/fluid',file),'utf8');
const M=require('../public/assets/fluid/model.js'),G=require('../public/assets/fluid/geometry.js');
const context=vm.createContext({window:{},M,G,selected:null,pending:null,$:()=>({checked:false}),
  fmt:n=>String(Number(n.toPrecision(3))),esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')});
vm.runInContext(read('examples.js')+read('pump-symbol.js'),context);
context.layout=G.snapLayout(M.validate(JSON.parse(JSON.stringify(context.window.FluidExamples.find(e=>e.name==='6-port valve').layout))));
context.calculation=M.calculate(context.layout);
const app=read('app.js');
vm.runInContext(`
const part=id=>layout.parts.find(p=>p.id===id);
const point=e=>{const p=part(e.part),v=p.ports[e.port];return [p.x+v[0],p.y+v[1]];};
const same=(a,b)=>a&&b&&a.part===b.part&&a.port===b.port;
`+app.slice(app.indexOf('  function columnSymbol('),app.indexOf('  const pumpTool='))
 +app.slice(app.indexOf('  function route('),app.indexOf('  function viewbox('))
 +app.slice(app.indexOf('  function partArtwork('),app.indexOf('  function draw(){')),context);
// Reuse the tube, part, and connection-marker rendering; omit editor controls.
const draw=app.slice(app.indexOf('    const colors=calculation.colors'),app.indexOf('    const t=tube(selected);'));
let markup=vm.runInContext(`(()=>{${draw} return html;})()`,context);
markup=markup.replace(/ role="button"| tabindex="0"/g,'');
const points=context.layout.parts.flatMap(p=>[[p.x-25,p.y-20],[p.x+p.width+25,p.y+p.height+45]])
  .concat(context.layout.tubes.flatMap(t=>t.bends));
const left=Math.min(...points.map(p=>p[0])),top=Math.min(...points.map(p=>p[1]));
const width=Math.max(...points.map(p=>p[0]))-left,height=Math.max(...points.map(p=>p[1]))-top;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Six-port injection valve example: autosampler and sample loop, HPLC pump, column, detector, and waste outlets" viewBox="${left} ${top} ${width} ${height}" font-family="Segoe UI,Arial,sans-serif">${markup}</svg>\n`;
fs.writeFileSync(path.join(root,'public/assets/fluid-preview.svg'),svg);
console.log('Built fluid-preview.svg from the six-port injection valve example.');
