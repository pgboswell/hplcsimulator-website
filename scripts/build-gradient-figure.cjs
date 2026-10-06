// Figure S-1 redrawn as accessible vector panels; profiles use the simulator model.
const fs=require('node:fs'),path=require('node:path'),M=require('../public/assets/simulator/model.js');
const root=path.resolve(__dirname,'../public/assets');
const start=(w,h,title,desc)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc"><title id="title">${title}</title><desc id="desc">${desc}</desc><rect width="100%" height="100%" rx="12" fill="#f7f9fd"/><g font-family="Segoe UI,Arial,sans-serif" fill="#283451" font-size="17">`;
const arrows='<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#657398"/></marker></defs><path d="M24 110H68M330 150H374" fill="none" stroke="#657398" stroke-width="2" marker-end="url(#arrow)"/>';
const tube='M80 110H292Q306 110 306 124Q306 138 292 138H112Q98 138 98 152Q98 166 112 166H320';
let svg=start(400,235,'A. Non-mixing volume','Liquid passes through tubing without mixing. A composition change is delayed but retains its shape.')+'<text x="20" y="32" font-weight="600">A. Non-mixing volume</text><text x="20" y="72">From pump</text><text x="295" y="200">To column</text>'+arrows.replace('M330 150H374','M330 166H374')+`<path d="${tube}" stroke="#657398" stroke-width="13" fill="none"/><path d="${tube}" stroke="#e4edf8" stroke-width="9" fill="none"/><path d="M150 110h40" stroke="#0072b2" stroke-width="3" marker-end="url(#arrow)"/><text x="190" y="210" text-anchor="middle" font-style="italic">V<tspan baseline-shift="sub" font-size="12">nonmix</tspan></text></g></svg>`;
svg=svg.replace('M24 110H68M330 166H374','M24 110H68').replace('</g></svg>','<path d="M330 166H374" stroke="#657398" stroke-width="2" marker-end="url(#arrow)"/></g></svg>');
fs.writeFileSync(path.join(root,'gradient-nonmixing.svg'),svg);
svg=start(400,235,'B. Mixing volume','Liquid entering a stirred chamber mixes with the liquid already inside. Composition changes become delayed and rounded.')+'<text x="20" y="32" font-weight="600">B. Mixing volume</text><text x="20" y="72">From pump</text><text x="295" y="200">To column</text>'+arrows.replace('M24 110H68M330 150H374','M24 130H68M330 130H374')+'<path d="M80 130H158M242 130H320" stroke="#657398" stroke-width="13"/><path d="M80 130H160M240 130H320" stroke="#dce9f7" stroke-width="9"/><circle cx="200" cy="130" r="43" fill="#dce9f7" stroke="#657398" stroke-width="2"/><path d="M222 130a22 22 0 1 1-22-22" fill="none" stroke="#0072b2" stroke-width="2.5" marker-end="url(#arrow)"/><circle cx="200" cy="130" r="4" fill="#283451"/><text x="200" y="210" text-anchor="middle" font-style="italic">V<tspan baseline-shift="sub" font-size="12">mix</tspan></text></g></svg>';
svg=svg.replace('M24 130H68M330 130H374','M24 130H68').replace('</g></svg>','<path d="M330 130H374" stroke="#657398" stroke-width="2" marker-end="url(#arrow)"/></g></svg>');
fs.writeFileSync(path.join(root,'gradient-mixing.svg'),svg);
const x=t=>70+t/8*670,y=v=>318-v/100*235;
svg=start(800,475,'C. Gradient profiles at the column inlet','A five-minute gradient from zero to 100 percent solvent B at one milliliter per minute. No dwell volume follows the program; one milliliter non-mixing volume delays it by one minute; one milliliter mixing volume rounds the changes.');
svg+='<text x="20" y="32" font-size="20" font-weight="600">C. Gradient profiles at the column inlet</text>';
for(let v=0;v<=100;v+=25)svg+=`<path d="M70 ${y(v)}H740" stroke="#dfe5ef"/><text x="58" y="${y(v)+6}" text-anchor="end">${v}</text>`;
for(let t=0;t<=8;t++)svg+=`<path d="M${x(t)} 83V318" stroke="#e8ecf4"/><text x="${x(t)}" y="343" text-anchor="middle">${t}</text>`;
svg+='<path d="M70 78V318H745" fill="none" stroke="#657398" stroke-width="1.5"/><text x="405" y="374" text-anchor="middle">Time (min)</text><text transform="translate(22 200) rotate(-90)" text-anchor="middle">Solvent B (%)</text>';
const configs=[['No dwell volume','#657398','3 6',0,0],['1 mL non-mixing volume','#202396','',1000,0],['1 mL mixing volume','#bb5a16','12 6',0,1000]];
configs.forEach(([label,color,dash,nonmixing,mixing],i)=>{
 const s={...M.defaults(),mode:'gradient',flow:1,duration:8,gradient:[[0,0],[5,100]],nonmixing,mixing};
 const points=M.gradientProfile(s).map(([t,v])=>`${x(t/60).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
 svg+=`<polyline points="${points}" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="${dash}" stroke-linecap="round"/><path d="M90 ${401+i*26}h45" stroke="${color}" stroke-width="3" stroke-dasharray="${dash}"/><text x="146" y="${407+i*26}">${label}</text>`;
});
fs.writeFileSync(path.join(root,'gradient-profiles.svg'),svg+'</g></svg>');
console.log('Built three gradient-profile panels using the simulator mixer calculation.');
