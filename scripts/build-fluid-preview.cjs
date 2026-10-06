// Regenerate the Home card using the visualizer's current symbol artwork.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'public/assets/fluid/app.js'),'utf8');
const context=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync(path.join(root,'public/assets/fluid/pump-symbol.js'),'utf8'),context);
vm.runInContext(app.slice(app.indexOf('  function columnSymbol('),app.indexOf('  const pumpTool=')),context);
const pump=context.window.FluidPumpSymbol(60,90),column=context.columnSymbol(160),detector=context.detectorSymbol(120);
const ports=Array.from({length:6},(_,i)=>{const a=(-90+i*60)*Math.PI/180;return [240+30*Math.cos(a),78+30*Math.sin(a)];});
const dot=(x,y)=>`<circle cx="${x}" cy="${y}" r="4" fill="#0072b2" stroke="white" stroke-width="1.5"/>`;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="HPLC flow path with a twin-piston pump, six-port injection valve, column with end fittings, and detector displaying chromatographic peaks" viewBox="0 0 620 175">
<defs><pattern id="fluid-preview-grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r=".7" fill="#b8c2d5"/></pattern></defs>
<rect width="620" height="175" fill="url(#fluid-preview-grid)"/>
<g fill="none" stroke="#0072b2" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
<path d="M90 118v8q0 8 8 8h73q8 0 8-8V56q0-8 8-8h53"/>
<path d="M${ports[1]}H282q8 0 8 8v-1q0 8 8 8h22"/>
<path d="M480 78h8q8 0 8 8q0 5 5 5h9"/>
<path d="M240 108v12q0 8 8 8h26q8 0 8-8V101q0-8-8-8h-8"/>
</g>
<g transform="translate(30 28)"><rect x="2" y="2" width="116" height="86" rx="8" fill="#f4f6fd" stroke="#657398" stroke-width="2"/>${pump}</g>
<circle cx="240" cy="78" r="39" fill="#f0f2fa" stroke="#657398" stroke-width="2"/>
${[[0,1],[2,3],[4,5]].map(([a,b])=>`<path d="M${ports[a]}L${ports[b]}" stroke="${a===0?'#0072b2':'#f58220'}" stroke-width="7" stroke-linecap="round"/>`).join('')}
<g transform="translate(320 48)">${column}</g>
<g transform="translate(510 43) scale(.8)"><rect x="2" y="2" width="116" height="86" rx="8" fill="#f4f6fd" stroke="#657398" stroke-width="2"/>${detector}</g>
${[[90,118],[320,78],[480,78],[510,91],...ports].map(([x,y])=>dot(x,y)).join('')}
<g fill="#283451" font-family="Segoe UI,Arial,sans-serif" font-size="14" font-weight="600" text-anchor="middle"><text x="90" y="162">Pump</text><text x="240" y="162">Injection valve</text><text x="400" y="162">Column</text><text x="558" y="162">Detector</text></g></svg>`;
fs.writeFileSync(path.join(root,'public/assets/fluid-preview.svg'),svg+'\n');
console.log('Built fluid-preview.svg from current visualizer symbols.');
