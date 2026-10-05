/* Browser plumbing editor; all drawing and calculations run locally. */
(() => {
  'use strict';
  const help=window.FluidHelp.button, G=window.FluidGeometry, M=window.FluidModel, $=id=>document.getElementById('fv-'+id), svg=$('canvas');
  if(!svg)return;
  const copy=o=>JSON.parse(JSON.stringify(o)), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>!Number.isFinite(n)?'∞':n===0?'0':Number(n.toPrecision(4)).toLocaleString('en-US',{maximumSignificantDigits:4});
  // getRandomValues also works on local HTTP hostnames without a secure context.
  const uid=()=>Array.from(crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16).padStart(8,'0')).join(''), empty=()=>({format:'hplc-fluid-visualizer',version:1,parts:[],tubes:[]});
  let layout=copy(FluidExamples.find(e=>e.name==='6-port valve').layout), selected=null, mode=false, pending=null, placement=null, drag=null, view={x:0,y:0,w:1000,h:600}, history=[], future=[], calculation,lastPress=null;
  const part=id=>layout.parts.find(p=>p.id===id), tube=id=>layout.tubes.find(t=>t.id===id);
  const point=e=>{const p=part(e.part),v=p.ports[e.port];return [p.x+v[0],p.y+v[1]];};
  const same=(a,b)=>a&&b&&a.part===b.part&&a.port===b.port;
  const occupied=e=>layout.tubes.some(t=>same(t.from,e)||same(t.to,e));
  function columnSymbol(width,height=60,stroke='#657398',selected=false){
    const cy=height/2;
    let art=`<path d="M0 ${cy}H${width}" stroke="${stroke}" stroke-width="4"/><rect x="22" y="${cy-12}" width="${width-44}" height="24" rx="3" fill="#e0e4f5" stroke="${stroke}" stroke-width="${selected?3:2}"/>`;
    for(let x=44;x<width-40;x+=10)art+=`<path d="M${x} ${cy-9}v18" stroke="#a6b0cd"/>`;
    for(const x of [22,width-22]){
      art+=`<path d="M${x-14} ${cy-17}l5-5h18l5 5v34l-5 5h-18l-5-5Z" fill="#d2d9e9" stroke="${stroke}" stroke-width="${selected?3:2}" stroke-linejoin="round"/><path d="M${x-14} ${cy-11}h28v22h-28Z" fill="#eef1f8" stroke="${stroke}" stroke-width="1"/>`;
    }
    return art;
  }
  function detectorSymbol(width){
    let path='M0 60H12V48';
    for(let x=12;x<=width-12;x++){
      const y=48-25*Math.exp(-.5*((x-width*.4)/(width*.025))**2)-17*Math.exp(-.5*((x-width*.67)/(width*.035))**2);
      path+=` L${x} ${y.toFixed(2)}`;
    }
    return `<path d="${path} V30H${width}" stroke="#202396" stroke-width="2" fill="none" stroke-linejoin="round"/>`;
  }
  const pumpTool=document.querySelector('[data-add="pump"] svg');
  pumpTool.setAttribute('viewBox','0 0 120 90');
  pumpTool.innerHTML='<rect x="3" y="3" width="114" height="84" rx="8" fill="#f4f6fd" stroke="#657398" stroke-width="3"/>'+window.FluidPumpSymbol(60,90);
  const detectorTool=document.querySelector('[data-add="detector"] svg');
  detectorTool.setAttribute('viewBox','0 0 120 90');
  detectorTool.innerHTML='<rect x="3" y="3" width="114" height="84" rx="8" fill="#f4f6fd" stroke="#657398" stroke-width="3"/>'+detectorSymbol(120);
  const columnTool=document.querySelector('[data-add="column"] svg');
  columnTool.setAttribute('viewBox','0 0 160 60');
  columnTool.innerHTML=columnSymbol(160);
  const fluidColors=[['Blue','#0072b2'],['Orange','#f58220'],['Green','#009e60'],['Red','#e61932'],['Purple','#7b3294'],['Yellow','#e6c200'],['Cyan','#26c6da'],['Magenta','#e729a4'],['Lime','#a6d82b'],['Navy','#182766'],['Brown','#8c510a'],['Lavender','#b7a4ed'],['Pink','#f6a6b2'],['Olive','#737b16'],['Gray','#8a8a8a'],['Black','#202020']];
  function colorSwatches(p){
    return '<fieldset class="fv-colors"><legend>Fluid color'+help('color')+'</legend><div class="fv-color-grid">'+fluidColors.map(([name,color])=>`<button type="button" class="fv-color-swatch" data-color="${color}" aria-label="${name}" title="${name}" aria-pressed="${p.color.toLowerCase()===color}" style="background:${color}">${p.color.toLowerCase()===color?'<span aria-hidden="true">✓</span>':''}</button>`).join('')+'</div></fieldset>';
  }
  function message(s,error=false){$('message').textContent=s;$('message').classList.toggle('fv-error',error);}
  function checkpoint(){history.push(copy(layout));if(history.length>80)history.shift();future=[];}
  function buttons(){$('undo').disabled=!history.length;$('redo').disabled=!future.length;$('delete').disabled=!selected;}
  function persist(){try{localStorage.setItem('hplc-fluid-layout-v1',JSON.stringify(layout));}catch{}}
  function update(){calculation=M.calculate(layout);draw();results();buttons();persist();}
  function commit(){update();inspector();}
  function replace(next){cancelPlacement();checkpoint();layout=G.snapLayout(M.validate(copy(next)));selected=null;pending=null;mode=false;$('connect').setAttribute('aria-pressed','false');svg.classList.remove('connecting');commit();fit();}
  function undo(redo=false){cancelPlacement();drawPlacement();const from=redo?future:history,to=redo?history:future;if(!from.length)return;to.push(copy(layout));layout=from.pop();selected=null;pending=null;commit();}
  function route(t){
    const a=point(t.from);
    if(t.bends.length||!t.to)return [a,...t.bends,...(t.to?[point(t.to)]:[])];
    const b=point(t.to),mid=G.snap((a[0]+b[0])/2);
    return [a,[mid,a[1]],[mid,b[1]],b];
  }
  function flowArrows(points,direction){
    let markup='';
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      if(length<45)continue;
      const angle=Math.atan2((b[1]-a[1])*direction,(b[0]-a[0])*direction)*180/Math.PI;
      const count=Math.min(6,Math.max(1,Math.floor(length/150)));
      for(let n=0;n<count;n++){
        const f=(n+1)/(count+1),x=a[0]+(b[0]-a[0])*f,y=a[1]+(b[1]-a[1])*f;
        markup+=`<g transform="translate(${x} ${y}) rotate(${angle})" pointer-events="none"><path d="M-5-5L2 0-5 5" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M-5-5L2 0-5 5" fill="none" stroke="#25314e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>`;
      }
    }
    return `<g data-flow-direction="${direction}" aria-hidden="true">${markup}</g>`;
  }
  function viewbox(){svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);}
  function fit(){
    if(!layout.parts.length){view={x:0,y:0,w:1000,h:600};viewbox();return;}
    const pts=layout.parts.flatMap(p=>[[p.x-35,p.y-35],[p.x+p.width+35,p.y+p.height+55]]).concat(layout.tubes.flatMap(t=>route(t)));
    const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);let x=Math.min(...xs)-20,y=Math.min(...ys)-20,w=Math.max(...xs)-x+20,h=Math.max(...ys)-y+20;
    const ratio=svg.clientWidth/svg.clientHeight;if(w/h>ratio){const nh=w/ratio;y-=(nh-h)/2;h=nh;}else{const nw=h*ratio;x-=(nw-w)/2;w=nw;}
    view={x,y,w,h};viewbox();
  }
  function zoom(f,at=[view.x+view.w/2,view.y+view.h/2]){const w=Math.max(150,Math.min(6000,view.w*f)),r=w/view.w;view={x:at[0]-(at[0]-view.x)*r,y:at[1]-(at[1]-view.y)*r,w,h:view.h*r};viewbox();}
  function partArtwork(p,inner={},ghost=false){
    let html='';
      const is=!ghost&&selected===p.id,stroke=is?'#d79412':'#657398',w=p.width,h=p.height,cx=w/2,cy=h/2;
      html+=`<g class="part" data-part="${p.id}" transform="translate(${p.x} ${p.y})" tabindex="0" role="button" aria-label="${esc(p.name)}, ${p.type}"><title>${esc(p.name)}${p.type==='valve'?' — double-click to switch position':''}</title>`;
      if(p.type==='valve') {
        html+=`<circle cx="${cx}" cy="${cy}" r="${Math.min(w,h)/2-3}" fill="#f0f2fa" stroke="${stroke}" stroke-width="${is?3:2}"/>`;
        p.ports.forEach((a,i)=>{const j=M.internal(p,i);if(j!==null&&j>i){const b=p.ports[j];html+=`<path d="M${a} L${b}" fill="none" stroke="${inner[p.id+':'+i]||'#a8b2c9'}" stroke-width="7" stroke-linecap="round"/>`;}});
        html+=`<text x="${cx}" y="${h+37}" text-anchor="middle" font-size="12" fill="#56607a">Position ${p.state+1} / ${p.positions}</text>`;
      } else if(p.type==='column'){
        html+=columnSymbol(w,h,stroke,is);
        html+=`<text x="${cx}" y="${cy-28}" text-anchor="middle" font-size="12" fill="#56607a">${fmt(p.diameter)} × ${fmt(p.length)} mm</text>`;
      } else if(p.type==='waste'){
        html+=`<path d="M${cx-10} 7h20v18l12 14v${h-43}h-44V39l12-14Z" fill="#f0f3fc" stroke="${stroke}" stroke-width="${is?3:2}"/><path d="M${cx-18} ${h-31}h36v23h-36Z" fill="#d5e4f1"/>`;
      } else {
        html+=`<rect x="2" y="2" width="${w-4}" height="${h-4}" rx="8" fill="#f4f6fd" stroke="${stroke}" stroke-width="${is?3:2}"/>`;
        if(p.type==='pump')html+=window.FluidPumpSymbol(cx,h);
        if(p.type==='autosampler')html+=`<path d="M${cx-14} 20h28M${cx} 20v8m-7 0h14v26h-14Zm7 26V${h}" fill="none" stroke="${p.color}" stroke-width="3"/>`;
        if(p.type==='detector')html+=detectorSymbol(w);
      }
      html+=`<text x="${cx}" y="${h+19}" text-anchor="middle" font-size="14" font-weight="600" fill="#283451">${esc(p.name)}</text></g>`;
    return ghost?html.replace('tabindex="0"','').replace('role="button"','').replace('data-part=','data-preview-part='):html;
  }
  function draw(){
    $('finish').hidden=!pending?.bends.length;
    const colors=calculation.colors,inner=calculation.internalColors;
    let portMarkup='';
    let html='<defs><pattern id="fv-grid" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r="1" fill="#99a6bf"/></pattern></defs><rect x="-100000" y="-100000" width="200000" height="200000" fill="url(#fv-grid)"/>';
    for(const t of layout.tubes){
      const routePoints=route(t),path=G.roundedPath(routePoints),is=selected===t.id,col=colors[t.id]||'#8f9aae';
      html+=`<g data-tube="${t.id}" role="button" tabindex="0" aria-label="Tubing, ${fmt(t.length)} cm, ${fmt(t.diameter)} mil"><title>${fmt(t.diameter)} mil ID · ${fmt(t.length)} cm · ${fmt(M.volume(t.diameter,t.length))} µL</title><path d="${path}" fill="none" stroke="${is?'#e4a82c':'#ffffff'}" stroke-width="${is?10:8}" stroke-linejoin="round" stroke-linecap="round"/><path d="${path}" fill="none" stroke="${col}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/><path d="${path}" fill="none" stroke="transparent" stroke-width="16"/></g>`;
      if($('flow-arrows').checked&&calculation.directions[t.id])html+=flowArrows(routePoints,calculation.directions[t.id]);
      if($('tube-labels').checked||is){
        let a=routePoints[0],b=routePoints.at(-1),longest=0;
        for(let i=1;i<routePoints.length;i++){const u=routePoints[i-1],v=routePoints[i],length=Math.hypot(v[0]-u[0],v[1]-u[1]);if(length>longest){longest=length;a=u;b=v;}}
        let angle=Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;if(angle>90)angle-=180;if(angle< -90)angle+=180;
        const label=`${fmt(t.diameter)} mil · ${t.showVolume?fmt(M.volume(t.diameter,t.length))+' µL':fmt(t.length)+' cm'}`;
        html+=`<text transform="translate(${(a[0]+b[0])/2} ${(a[1]+b[1])/2}) rotate(${angle})" y="-8" text-anchor="middle" font-size="12" fill="#43516c" stroke="#fcfdff" stroke-width="4" paint-order="stroke" pointer-events="none">${label}</text>`;
      }
    }
    for(const p of layout.parts){
      html+=partArtwork(p,inner);
      p.ports.forEach((v,i)=>{
        const x=p.x+v[0],y=p.y+v[1],endpoint={part:p.id,port:i},active=same(pending?.from,endpoint);
        const connection=layout.tubes.find(t=>same(t.from,endpoint)||same(t.to,endpoint));
        const color=connection?(colors[connection.id]||'#8f9aae'):'white';
        portMarkup+=`<g data-port="${i}" data-owner="${p.id}" data-connected="${!!connection}" role="button" tabindex="0" aria-label="${esc(p.name)}, port ${i+1}"><title>${connection?'Connected tubing':'Open port'} — ${esc(p.name)}, port ${i+1}</title>`;
        if(connection)portMarkup+=`<circle cx="${x}" cy="${y}" r="11" fill="white" stroke="#151763" stroke-width="2" pointer-events="none"/>`;
        portMarkup+=`<circle class="port" cx="${x}" cy="${y}" r="8" fill="${active?'#e4a82c':color}" stroke="#46567a" stroke-width="2"/>`;
        if(p.type==='valve')portMarkup+=`<text x="${x}" y="${y+3.5}" text-anchor="middle" font-size="10" font-weight="600" fill="#151763" pointer-events="none">${i+1}</text>`;
        else if(connection)portMarkup+=`<circle cx="${x}" cy="${y}" r="3" fill="#151763" pointer-events="none"/>`;
        portMarkup+='</g>';
      });
    }
    html+=portMarkup;

    const t=tube(selected);
    if(t)t.bends.forEach((p,i)=>{html+=`<rect data-bend="${i}" x="${p[0]-6}" y="${p[1]-6}" width="12" height="12" fill="white" stroke="#bd851d" stroke-width="2" style="cursor:move"/>`;});
    html+='<g id="fv-tube-preview" pointer-events="none" aria-hidden="true"></g><g id="fv-part-preview" opacity="0.45" pointer-events="none" aria-hidden="true"></g>';
    svg.innerHTML=html;viewbox();drawPreview();drawPlacement();
  }
  function cancelPlacement(){
    placement=null;svg.classList.remove('placing');
    document.querySelectorAll('[data-add]').forEach(b=>b.setAttribute('aria-pressed','false'));
  }
  function movePlacement(at){
    const p=placement.part;p.x=G.snap(at[0]-p.width/2);p.y=G.snap(at[1]-p.height/2);
    placement.visible=true;drawPlacement();
  }
  function drawPlacement(){
    const layer=$('part-preview');if(!layer)return;
    if(!placement?.visible){layer.innerHTML='';return;}
    const p=placement.part;
    layer.innerHTML=partArtwork(p,{},true)+p.ports.map(v=>`<circle cx="${p.x+v[0]}" cy="${p.y+v[1]}" r="8" fill="white" stroke="#46567a" stroke-width="2"/>`).join('');
  }
  function placePart(){
    const p=placement.part;checkpoint();layout.parts.push(p);selected=p.id;
    cancelPlacement();commit();message(`${p.name} placed.`);svg.focus({preventScroll:true});
  }
  function drawPreview(){
    const preview=$('tube-preview');if(!preview)return;
    if(!pending){preview.innerHTML='';return;}
    const pts=pending.preview||[point(pending.from),...pending.bends];
    const color=part(pending.from.part).color||'#202396';
    const path=G.roundedPath(pts),end=pending.preview?.at(-1);
    preview.innerHTML=`<g opacity="0.5"><path d="${path}" fill="none" stroke="white" stroke-width="8" stroke-linecap="round"/><path d="${path}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round"/>${end?`<circle cx="${end[0]}" cy="${end[1]}" r="6" fill="white" stroke="${color}" stroke-width="2"/>`:''}</g>`;
  }
  function updatePreview(e){
    if(!pending)return;
    const port=e.target.closest('[data-port]');
    if(port){
      const end={part:port.dataset.owner,port:Number(port.dataset.port)};
      pending.preview=!same(pending.from,end)&&!occupied(end)?route({...pending,to:end}):null;
    }else if(!e.target.closest('[data-part],[data-tube],[data-bend]')){
      pending.preview=route({...pending,to:null,bends:[...pending.bends,G.snapPoint(coords(e))]});
    }else pending.preview=null;
    drawPreview();
  }
  function results(){
    $('results').innerHTML=calculation.results.length?calculation.results.map(r=>`<tr><th scope="row"><span class="fv-swatch" style="background:${r.color}"></span>${esc(r.name)}</th><td class="${r.overLimit?'warning':''}">${fmt(r.pressure)}${r.overLimit&&Number.isFinite(r.pressure)?' — above limit':''}</td><td>${Number.isFinite(r.pressure)?fmt(r.broadening):'—'}</td><td>${Number.isFinite(r.pressure)?fmt(r.delay):'—'}</td><td class="${r.status.startsWith('Blocked')?'warning':''}">${esc(r.status)}</td></tr>`).join(''):'<tr><td colspan="5">Add a pump and connect a flow path to calculate system properties.</td></tr>';
    $('legend').innerHTML=layout.parts.filter(p=>p.type==='pump'||p.type==='autosampler').map(p=>`<span><i class="fv-swatch" style="background:${p.color}"></i>${esc(p.name)}</span>`).join('')+'<span><i class="fv-swatch" style="background:#8f9aae"></i>No connected source</span><span><i class="fv-port-key connected"></i>Connected port</span><span><i class="fv-port-key"></i>Open port</span>';
  }
  const ranges={flow:[.001,1e7],volume:[0,1e7],limit:[.001,1e7],diameter:[.001,1000],length:[.001,1e6],particle:[.001,1000],temperature:[0,200],inter:[.001,.999],intra:[0,.999],a:[0,1e4],b:[0,1e4],c:[0,1e4],preDiameter:[.001,1000],preLength:[0,1e6],statorLength:[0,1e6],statorDiameter:[.001,1000],grooveLength:[0,1e6],grooveDiameter:[.001,1000]};
  // Some Java examples contain float-to-double tails (e.g. 2.0999999046).
  // Format known defaults only; retain custom and explicitly edited precision.
  const columnDefaults=[M.createPart('column','defaults'),...FluidExamples.flatMap(e=>e.layout.parts.filter(p=>p.type==='column'))];
  function fieldValue(p,k,type){
    const explicit=Array.isArray(p.preciseFields)&&p.preciseFields.includes(k);
    return p.type==='column'&&type==='number'&&!explicit&&columnDefaults.some(d=>d[k]===p[k])
      ?Number(p[k].toPrecision(3)):p[k];
  }
  function field(p,k,label,type='number'){
    const range=ranges[k]||[0,1e6];return `<label>${label}${help(['diameter','length'].includes(k)?`${p.type||'tube'}.${k}`:k)}<input aria-label="${label}" data-field="${k}" type="${type}" ${type==='number'?`step="any" min="${range[0]}" max="${range[1]}"`:type==='text'?'maxlength="150"':''} value="${esc(fieldValue(p,k,type))}"></label>`;
  }
  function inspector(){
    const p=part(selected),t=tube(selected);let html='';
    if(p){
      html=field(p,'name','Name','text');
      if(p.type==='pump'||p.type==='autosampler')html+=colorSwatches(p);
      if(p.type==='pump'){
        html+=field(p,'flow','Flow rate (µL/min)')+field(p,'volume','Pump volume (µL)')+field(p,'limit','Pressure limit (bar)');
        html+=`<label>Solvent B${help('solvent')}<select aria-label="Solvent B" data-field="solvent"><option value="0" ${p.solvent===0?'selected':''}>Methanol</option><option value="1" ${p.solvent===1?'selected':''}>Acetonitrile</option></select></label><p>Solvent A: water</p><h3>Solvent program${help('gradient')}</h3><div class="fv-gradient-head"><span>Time (min)</span><span>Solvent B (%)</span></div><div class="fv-gradient">`;
        html+=p.gradient.map((r,i)=>`<div class="fv-row"><input type="number" step="any" min="0" max="1000000" data-row="${i}" data-col="0" aria-label="Time, row ${i+1}" value="${r[0]}"><input type="number" step="any" min="0" max="100" data-row="${i}" data-col="1" aria-label="Solvent B percentage, row ${i+1}" value="${r[1]}"><button data-remove-row="${i}" aria-label="Remove gradient row ${i+1}" ${p.gradient.length===1?'disabled':''}>×</button></div>`).join('');
        html+='</div><button data-action="add-row">Add row</button><p>Use a single row for constant composition.</p>';
        html+=`<p id="fv-composition">Calculation composition: ${fmt(M.composition(p)*100)}% B (maximum viscosity).</p>`;
      }
      if(p.type==='column'){
        html+=field(p,'diameter','Internal diameter (mm)')+field(p,'length','Length (mm)')+field(p,'particle','Particle size (µm)')+field(p,'temperature','Temperature (°C)');
        html+=`<label><input aria-label="Column preheater" type="checkbox" data-field="preheater" ${p.preheater?'checked':''}> Column preheater${help('preheater')}</label>`;
        if(p.preheater)html+=field(p,'preDiameter','Preheater internal diameter (mil)')+field(p,'preLength','Preheater length (cm)');
        html+='<details><summary>Packing & efficiency</summary>'+field(p,'inter','Interparticle porosity')+field(p,'intra','Intraparticle porosity')+field(p,'a','van Deemter A')+field(p,'b','van Deemter B')+field(p,'c','van Deemter C')+'</details>';
      }
      if(p.type==='valve'){
        html+=`<p>${p.ports.length} ports · ${p.positions} positions</p><label>Position${help('state')}<select aria-label="Position" data-field="state">${Array.from({length:p.positions},(_,i)=>`<option value="${i}" ${p.state===i?'selected':''}>${i+1}</option>`).join('')}</select></label><button data-action="switch">Switch position</button><details><summary>Internal dimensions</summary>`;
        html+=field(p,'statorDiameter','Stator hole diameter (mil)')+field(p,'statorLength','Stator hole length (cm)')+field(p,'grooveDiameter','Rotor groove diameter (mil)')+field(p,'grooveLength','Rotor groove length (cm)')+'</details>';
      }
      if(p.type==='autosampler')html+='<p>The autosampler supplies the sample-colored flow path. Connect it to the loading side of an injection valve.</p>';
      if(p.type==='detector')html+='<p>The detector connects its two ports. Internal dispersion and pressure drop are not included in this model.</p>';
      if(p.type==='waste')html+='<p>Terminates a flow path at atmospheric pressure.</p>';
    } else if(t){
      html='<h3 style="margin-top:0">Tubing</h3>'+field(t,'diameter','Internal diameter (mil)')+field(t,'length','Length (cm)')+field({tubeVolume:Number(M.volume(t.diameter,t.length).toPrecision(8))},'tubeVolume','Volume (µL)');
      html+=`<label><input aria-label="Label with volume instead of length" type="checkbox" data-field="showVolume" ${t.showVolume?'checked':''}> Label with volume instead of length${help('showVolume')}</label>`;
      html+='<p>1 mil = 0.001 inch = 25.4 µm. Changing volume adjusts the physical length. Diagram dimensions do not change physical length.</p><button data-action="reset-route">Reset route</button><button data-action="add-bend">Add bend</button>';
    } else html='<p>Select a component or tube to edit its properties.</p><p>To connect ports, choose <strong>Connect tubing</strong>, then select the start and end ports.</p>';
    $('properties').innerHTML=html;
  }
  function select(id){selected=id;draw();inspector();buttons();svg.focus({preventScroll:true});}
  function connect(e){
    if(occupied(e)){select(layout.tubes.find(t=>same(t.from,e)||same(t.to,e)).id);message('This port already has tubing. Delete that tube to reconnect it.');return;}
    if(!pending){pending={from:e,bends:[]};mode=true;$('connect').setAttribute('aria-pressed','true');svg.classList.add('connecting');message('Select the other port. Select blank space to add bends.');draw();return;}
    if(same(pending.from,e)){pending=null;draw();message('Connection canceled.');return;}
    checkpoint();const t={id:uid(),from:pending.from,to:e,bends:pending.bends,diameter:5,length:10};layout.tubes.push(t);selected=t.id;pending=null;commit();message('Tubing connected. Set its physical length and diameter in Properties.');
  }
  function switchValve(p){checkpoint();p.state=(p.state+1)%p.positions;selected=p.id;commit();message(`${p.name}: position ${p.state+1}.`);}
  function remove(){if(!selected)return;checkpoint();layout.parts=layout.parts.filter(p=>p.id!==selected);layout.tubes=layout.tubes.filter(t=>t.id!==selected&&t.from.part!==selected&&t.to?.part!==selected);selected=null;pending=null;commit();}
  function coords(e){const v=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());return [v.x,v.y];}
  svg.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;const target=e.target,port=target.closest('[data-port]'),bend=target.closest('[data-bend]'),pnode=target.closest('[data-part]'),tnode=target.closest('[data-tube]'),at=coords(e);
    if(placement){movePlacement(at);placePart();e.preventDefault();return;}
    if(port){connect({part:port.dataset.owner,port:Number(port.dataset.port)});return;}
    if(mode&&pending&&!pnode&&!tnode&&!bend){pending.bends.push(G.snapPoint(at));pending.preview=null;draw();return;}
    if(bend){drag={type:'bend',index:Number(bend.dataset.bend),start:at,original:copy(layout),moved:false};}
    else if(pnode){const p=part(pnode.dataset.part),now=performance.now();if(p.type==='valve'&&lastPress?.id===p.id&&now-lastPress.time<350){lastPress=null;switchValve(p);return;}lastPress={id:p.id,time:now};select(p.id);drag={type:'part',id:p.id,start:at,x:p.x,y:p.y,original:copy(layout),moved:false};}
    else if(tnode){select(tnode.dataset.tube);return;}
    else{drag={type:'pan',start:at,x:view.x,y:view.y,moved:false};}
    svg.setPointerCapture(e.pointerId);e.preventDefault();
  });
  svg.addEventListener('pointermove',e=>{
    if(placement){movePlacement(coords(e));return;}
    if(!drag)updatePreview(e);
    if(!drag)return;const at=coords(e),dx=at[0]-drag.start[0],dy=at[1]-drag.start[1];if(Math.abs(dx)+Math.abs(dy)>2)drag.moved=true;
    if(drag.type==='pan'){view.x-=dx;view.y-=dy;viewbox();}
    else if(drag.type==='part'){const p=part(drag.id);p.x=G.snap(drag.x+dx);p.y=G.snap(drag.y+dy);draw();}
    else{tube(selected).bends[drag.index]=G.snapPoint(at);draw();}
  });
  svg.addEventListener('pointerleave',()=>{if(placement){placement.visible=false;drawPlacement();}if(pending){pending.preview=null;drawPreview();}});
  function endDrag(){if(!drag)return;if(drag.moved){lastPress=null;if(drag.type!=='pan'){history.push(drag.original);future=[];update();}}drag=null;}
  svg.addEventListener('pointerup',endDrag);svg.addEventListener('pointercancel',endDrag);
  svg.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(Math.max(-.3,Math.min(.3,e.deltaY*.001))),coords(e));},{passive:false});
  svg.addEventListener('keydown',e=>{
    if(placement){
      const delta={ArrowLeft:[-G.GRID,0],ArrowRight:[G.GRID,0],ArrowUp:[0,-G.GRID],ArrowDown:[0,G.GRID]}[e.key];
      if(delta){e.preventDefault();placement.part.x+=delta[0];placement.part.y+=delta[1];placement.visible=true;drawPlacement();}
      if(e.key==='Enter'||e.key===' '){e.preventDefault();placePart();}
      return;
    }

    const port=e.target.closest('[data-port]'),pnode=e.target.closest('[data-part]'),tnode=e.target.closest('[data-tube]');
    if(e.key==='Enter'||e.key===' '){e.preventDefault();if(port)connect({part:port.dataset.owner,port:Number(port.dataset.port)});else if(pnode)select(pnode.dataset.part);else if(tnode)select(tnode.dataset.tube);}
    const moves={ArrowLeft:[-G.GRID,0],ArrowRight:[G.GRID,0],ArrowUp:[0,-G.GRID],ArrowDown:[0,G.GRID]};
    if(moves[e.key]&&part(selected)){e.preventDefault();checkpoint();const p=part(selected);p.x+=moves[e.key][0];p.y+=moves[e.key][1];update();svg.focus();}
  });
  document.querySelector('.fv').addEventListener('keydown',e=>{
    if(e.key==='Escape'){cancelPlacement();pending=null;mode=false;$('connect').setAttribute('aria-pressed','false');svg.classList.remove('connecting');draw();message('Placement canceled.');}
    if(e.target.matches('input,select,textarea'))return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo(e.shiftKey);}
    if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove();}
  });
  let editing=null;
  $('properties').addEventListener('focusout',()=>{editing=null;});
  $('properties').addEventListener('input',e=>{
    const input=e.target,p=part(selected)||tube(selected);if(!p)return;
    if(!input.checkValidity()||input.type==='number'&&input.value==='')return;
    const before=copy(layout),k=input.dataset.field;
    if(k==='tubeVolume'){p.length=Number(input.value)/M.volume(p.diameter,1);}
    else if(k)p[k]=input.type==='checkbox'?input.checked:input.type==='text'||input.type==='color'?input.value:Number(input.value);
    else if(input.dataset.row!==undefined)p.gradient[Number(input.dataset.row)][Number(input.dataset.col)]=Number(input.value);
    else return;
    if(p.type==='column'&&k&&input.type==='number')p.preciseFields=[...new Set([...(Array.isArray(p.preciseFields)?p.preciseFields:[]),k])];
    try{M.validate(layout);}catch(error){layout=before;message(error.message,true);inspector();return;}
    if(editing!==input){history.push(before);if(history.length>80)history.shift();editing=input;}future=[];update();
    if(k==='preheater')inspector();
    if(tube(selected)){
      if(k!=='tubeVolume')$('properties').querySelector('[data-field="tubeVolume"]').value=Number(M.volume(p.diameter,p.length).toPrecision(8));
      if(k!=='length')$('properties').querySelector('[data-field="length"]').value=Number(p.length.toPrecision(10));
    }
    if(p.type==='pump')$('composition').textContent=`Calculation composition: ${fmt(M.composition(p)*100)}% B (maximum viscosity).`;
    message('Properties updated.');
  });
  $('properties').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;const p=part(selected),t=tube(selected),action=b.dataset.action;
    if(b.dataset.color){checkpoint();p.color=b.dataset.color;commit();$('properties').querySelector(`[data-color="${p.color}"]`).focus({preventScroll:true});message('Fluid color updated.');return;}
    if(action==='switch'){switchValve(p);return;}
    if(action==='add-row'){if(p.gradient.length>=100)return;checkpoint();const last=p.gradient.at(-1);p.gradient.push([last[0]+5,last[1]]);}
    else if(b.dataset.removeRow!==undefined){checkpoint();p.gradient.splice(Number(b.dataset.removeRow),1);}
    else if(action==='reset-route'){checkpoint();t.bends=[];}
    else if(action==='add-bend'){checkpoint();const pts=route(t);if(!t.bends.length)t.bends=pts.slice(1,-1);const a=point(t.from),b=t.bends[0]||point(t.to);t.bends.unshift(G.snapPoint([(a[0]+b[0])/2,(a[1]+b[1])/2]));}
    else return;commit();
  });
  document.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>{
    if(placement?.button===b){cancelPlacement();draw();message('Placement canceled.');return;}
    cancelPlacement();pending=null;mode=false;drag=null;selected=null;
    $('connect').setAttribute('aria-pressed','false');svg.classList.remove('connecting');
    const ports=Number(b.dataset.ports||6),positions=Number(b.dataset.positions||2),p=G.alignPorts(M.createPart(b.dataset.add,uid(),0,0,ports,positions));
    p.x=G.snap(view.x+view.w/2-p.width/2);p.y=G.snap(view.y+view.h/2-p.height/2);
    const count=layout.parts.filter(v=>v.type===p.type).length;if(count)p.name+=' '+(count+1);
    if(p.type==='pump')p.color=fluidColors[count%fluidColors.length][1];
    if(p.type==='autosampler')p.color=fluidColors[3][1];
    placement={part:p,button:b,visible:false};b.setAttribute('aria-pressed','true');svg.classList.add('placing');
    draw();inspector();buttons();message(`Click the diagram to place ${p.name}. Escape cancels.`);
  }));
  $('connect').addEventListener('click',()=>{cancelPlacement();mode=!mode;if(!mode)pending=null;$('connect').setAttribute('aria-pressed',String(mode));svg.classList.toggle('connecting',mode);draw();message(mode?'Select a port to start a tube.':'Select or drag components.');});
  $('finish').addEventListener('click',()=>{if(!pending?.bends.length)return;checkpoint();const t={id:uid(),from:pending.from,to:null,bends:pending.bends,diameter:5,length:10};layout.tubes.push(t);selected=t.id;pending=null;commit();message('Open-ended tube added.');});
  $('tube-labels').addEventListener('change',draw);
  $('flow-arrows').addEventListener('change',draw);
  $('fit').addEventListener('click',fit);$('plus').addEventListener('click',()=>zoom(.8));$('minus').addEventListener('click',()=>zoom(1.25));$('delete').addEventListener('click',remove);$('undo').addEventListener('click',()=>undo());$('redo').addEventListener('click',()=>undo(true));
  $('new').addEventListener('click',()=>{replace(empty());message('New layout. Undo restores your previous layout.');$('example').value='';});
  FluidExamples.forEach((e,i)=>{const o=document.createElement('option');o.value=i;o.textContent=({'6-port valve':'Six-port injection valve','6-column selector':'Six-column selector','2DLC':'Two-dimensional LC'})[e.name]||e.name;$('example').append(o);});
  $('example').addEventListener('change',()=>{if($('example').value==='')return;const e=FluidExamples[Number($('example').value)];replace(e.layout);message(`${e.name} loaded. Undo restores your previous layout.`);});
  function download(content,type,name){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('save').addEventListener('click',()=>{download(JSON.stringify(layout,null,2),'application/json','hplc-fluid-layout.json');message('Layout saved as JSON.');});
  $('export').addEventListener('click',()=>{const clone=svg.cloneNode(true);clone.querySelectorAll('#fv-part-preview,#fv-tube-preview').forEach(n=>n.remove());clone.setAttribute('width','1200');clone.setAttribute('height',String(1200*view.h/view.w));clone.querySelectorAll('[tabindex]').forEach(n=>n.removeAttribute('tabindex'));download(new XMLSerializer().serializeToString(clone),'image/svg+xml','hplc-flow-path.svg');});
  $('open').addEventListener('click',()=>$('file').click());
  $('file').addEventListener('change',async()=>{const file=$('file').files[0];if(!file)return;try{if(file.size>2e6)throw Error('Layout file is too large (maximum 2 MB).');const next=M.validate(JSON.parse(await file.text()));replace(next);$('example').value='';message('Layout opened.');}catch(error){message('Could not open layout: '+error.message,true);}finally{$('file').value='';}});
  $('example').value=String(FluidExamples.findIndex(e=>e.name==='6-port valve'));
  try{
    const saved=localStorage.getItem('hplc-fluid-layout-v1');
    if(saved){
      layout=M.validate(JSON.parse(saved));
      // Match the normalized example geometry when restoring an unchanged example.
      const restored=JSON.stringify(G.snapLayout(copy(layout)));
      const index=FluidExamples.findIndex(e=>JSON.stringify(G.snapLayout(copy(e.layout)))===restored);
      $('example').value=index<0?'':String(index);
    }
  }catch{message('The saved layout could not be restored. Loaded the six-port injection valve example.');}
  G.snapLayout(layout);commit();requestAnimationFrame(fit);
  let previousWidth=svg.clientWidth;new ResizeObserver(()=>{if(svg.clientWidth!==previousWidth){previousWidth=svg.clientWidth;fit();}}).observe(svg);
})();
