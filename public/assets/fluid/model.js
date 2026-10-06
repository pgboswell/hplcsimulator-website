/* HPLC Fluid Visualizer. Port of the Paul Boswell / Jon Thompson Java model.
 * License: CC BY-NC-SA 3.0 US. All flows µL/min; pressure bar;
 * dispersion is volume variance in mL²; delay min. Solvent 0 MeOH, 1 ACN.
 */
(function (root) {
  'use strict';
  function viscosity(solvent, f, temperature = 25) {
    const t = temperature + 273.15;
    return Math.exp(solvent === 1
      ? f * (-3.476 + 726 / t) + (1-f)*(-5.414+1566/t)+f*(1-f)*(-1.762+929/t)
      : f * (-4.597 + 1211 / t) + (1-f)*(-5.961+1736/t)+f*(1-f)*(-6.215+2809/t));
  }
  function diffusion(s, f, t = 25) {
    return 7.4e-8 * Math.sqrt(((1-f)*0.7+1.9)*(f*((s===1?41:32)-18)+18))*(t+273.15)/(viscosity(s,f,t)*120**0.6);
  }
  function volume(diameter, length) { return Math.PI*(diameter*0.00254/2)**2*length*1000; }
  function tube(p, q, s, f, t = 25) {
    const r=p.diameter*0.00254/2, a=Math.PI*r*r, u=q/60000/a, d=diffusion(s,f,t);
    return { pressure:8*(viscosity(s,f,t)/1000)*(p.length/100)*(q/1e9/60)/(Math.PI*(r/100)**4)/1e5,
      variance:(2*d*p.length/u+r*r*p.length*u/(24*d))*a*a, delay:volume(p.diameter,p.length)/q };
  }
  function properties(p,q,s,f) {
    if(p.type==='column') {
      const u=q/60000/(Math.PI*(p.diameter/20)**2), v=p.particle/10000*u/p.inter/diffusion(s,f,p.temperature);
      const plates=(p.length/10)/(p.particle/10000*(p.a+p.b/v+p.c*v));
      const v0=Math.PI*(p.diameter/20)**2*p.length/10*(p.inter+p.intra*(1-p.inter));
      const pre=p.preheater?tube({diameter:p.preDiameter,length:p.preLength},q,s,f,p.temperature):{pressure:0,variance:0,delay:0};
      return {pressure:(u/100)*(p.length/1000)*(viscosity(s,f,p.temperature)/1000)*180*(1-p.inter)**2/(p.inter**3*(p.particle/1e6)**2)/1e5+pre.pressure,variance:v0*v0/plates+pre.variance,delay:pre.delay};
    }
    if(p.type==='valve') {
      const groove=tube({diameter:p.grooveDiameter,length:p.grooveLength},q,s,f);
      const stator=tube({diameter:p.statorDiameter,length:p.statorLength},q,s,f);
      return {pressure:groove.pressure+2*stator.pressure,variance:groove.variance+2*stator.variance,delay:groove.delay+2*stator.delay};
    }
    return {pressure:0,variance:0,delay:0};
  }
  function composition(p) {
    const values=p.gradient.map(r=>r[1]/100), lo=Math.min(...values), hi=Math.max(...values);
    let best=lo, eta=-Infinity;
    for(let i=0;i<=100;i++){const f=lo+(hi-lo)*i/100, e=viscosity(p.solvent,f);if(e>eta){eta=e;best=f;}}
    return best;
  }
  function internal(p, i) {
    if(p.type==='column'||p.type==='detector') return 1-i;
    if(p.type!=='valve') return null;
    if(p.positions===2) return (i+(i%2===p.state?1:-1)+p.ports.length)%p.ports.length;
    return i===p.ports.length-1?p.state:i===p.state?p.ports.length-1:null;
  }
  const key = e => e.part+':'+e.port;
  function calculate(layout) {
    const parts=new Map(layout.parts.map(p=>[p.id,p])), connections=new Map(), colors={}, internalColors={};
    layout.tubes.forEach(t=>{connections.set(key(t.from),t);if(t.to)connections.set(key(t.to),t);});
    const results=[],directions={},claims=new Map();
    for(const source of layout.parts.filter(p=>p.type==='pump'||p.type==='autosampler')) {
      const pump=source.type==='pump', q=source.flow||400, f=pump?composition(source):0.5, s=source.solvent||0;
      let end={part:source.id,port:0}, pressure=0, variance=0, delay=pump?source.volume/q:0, before=true, status='Open outlet';
      const visited=new Set(), path=[],traversal=[];
      while(end) {
        const k=key(end);
        if(visited.has(k)){status='Blocked: closed loop';pressure=Infinity;break;} visited.add(k);
        const t=connections.get(k); if(!t)break;
        colors[t.id]=source.color;path.push(t.id);
        traversal.push([t.id,key(t.from)===k?1:-1]);
        const tp=tube(t,q,s,f);pressure+=tp.pressure;variance+=tp.variance;if(before)delay+=tp.delay;
        const next=key(t.from)===k?t.to:t.from;
        if(!next)break;
        const p=parts.get(next.part);
        if(p.type==='pump'||p.type==='autosampler'){status='Blocked: connected to another source';pressure=Infinity;break;}
        const pp=properties(p,q,s,f);pressure+=pp.pressure;variance+=pp.variance;if(before)delay+=pp.delay;
        if(p.type==='column')before=false;
        if(p.type==='waste'){status='Flow to waste';break;}
        const out=internal(p,next.port);
        if(out===null){status='Blocked: closed valve port';pressure=Infinity;break;}
        internalColors[p.id+':'+Math.min(next.port,out)]=source.color;
        end={part:p.id,port:out};
      }
      for(const [id,direction] of traversal){
        const values=claims.get(id)||[];values.push(status.startsWith('Blocked')?0:direction);claims.set(id,values);
      }
      if(pump)results.push({id:source.id,name:source.name,color:source.color,pressure,broadening:Math.sqrt(variance)*1000,delay,fraction:f,status,overLimit:pressure>source.limit,path});
    }
    for(const [id,values] of claims)if(values.every(v=>v!==0&&v===values[0]))directions[id]=values[0];
    return {results,colors,internalColors,directions};
  }
  function createPart(type,id,x=60,y=60,portCount=6,positions=2) {
    const p={id,type,name:({pump:'Pump',autosampler:'Autosampler',column:'Column',detector:'Detector',waste:'Waste',valve:'Valve'})[type],x,y,width:90,height:60,ports:[],color:type==='autosampler'?'#df536d':'#379bb7'};
    if(type==='pump')Object.assign(p,{flow:400,volume:50,limit:400,solvent:0,gradient:[[0,5],[10,95],[15,95]]});
    if(type==='pump'||type==='autosampler')p.ports=[[45,45]];
    if(type==='column'){Object.assign(p,{width:220,diameter:4.6,length:150,particle:4.6,temperature:25,inter:.4,intra:.4,a:1,b:5,c:.05,preheater:false,preDiameter:5,preLength:10});p.ports=[[10,30],[210,30]];}
    if(type==='detector')p.ports=[[15,45],[75,15]];
    if(type==='waste'){p.height=90;p.width=60;p.ports=[[30,15]];}
    if(type==='valve'){
      Object.assign(p,{width:140,height:140,positions,state:0,statorLength:.1,statorDiameter:24,grooveLength:.5,grooveDiameter:18});
      const n=positions===2?portCount:portCount-1;
      p.ports=Array.from({length:n},(_,i)=>{const a=-Math.PI*5/6-i*2*Math.PI/n;return [70+53*Math.cos(a),70+53*Math.sin(a)];});
      if(positions!==2)p.ports.push([70,70]);
      p.name=portCount+'-port valve';
    }
    return p;
  }
  // Validate saved documents before replacing the active workspace.
  function validate(data) {
    if(data?.format!=='hplc-fluid-visualizer'||data.version!==1||!Array.isArray(data.parts)||!Array.isArray(data.tubes)||data.parts.length>500||data.tubes.length>1500)throw Error('This is not a supported Fluid Visualizer JSON file.');
    const ids=new Set(), occupied=new Set();
    const numeric=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
    for(const p of data.parts){
      if(typeof p.id!=='string'||!/^[-\w]{1,80}$/.test(p.id)||ids.has(p.id)||!['pump','autosampler','column','detector','waste','valve'].includes(p.type)||typeof p.name!=='string'||p.name.length>150)throw Error('Invalid component.');ids.add(p.id);
      if(!numeric(p.x,-1e5,1e5)||!numeric(p.y,-1e5,1e5)||!numeric(p.width,10,2000)||!numeric(p.height,10,2000)||!Array.isArray(p.ports)||p.ports.length<1||p.ports.length>13||p.ports.some(v=>!Array.isArray(v)||v.length!==2||v.some(n=>!numeric(n,-2000,2000))))throw Error('Invalid component geometry.');
      if(!/^#[0-9a-f]{6}$/i.test(p.color))throw Error('Invalid fluid color.');
      const ranges=p.type==='pump'?{flow:[.001,1e7],volume:[0,1e7],limit:[.001,1e7]}:p.type==='column'?{diameter:[.001,1000],length:[.001,1e6],particle:[.001,1000],temperature:[0,200],inter:[.001,.999],intra:[0,.999],a:[0,1e4],b:[0,1e4],c:[0,1e4],preDiameter:[.001,1000],preLength:[0,1e6]}:p.type==='valve'?{statorLength:[0,1e6],statorDiameter:[.001,1000],grooveLength:[0,1e6],grooveDiameter:[.001,1000]}:{};
      for(const [k,[lo,hi]] of Object.entries(ranges))if(!numeric(p[k],lo,hi))throw Error('Invalid '+k+'.');
      if(p.type==='column'&&(typeof p.preheater!=='boolean'||p.a+p.b+p.c===0))throw Error('Invalid column efficiency.');
      const expected=p.type==='valve'?p.ports.length:['column','detector'].includes(p.type)?2:1;
      if(p.ports.length!==expected)throw Error('Invalid port count.');
      if(p.type==='pump'&&(![0,1].includes(p.solvent)||!Array.isArray(p.gradient)||p.gradient.length<1||p.gradient.length>100||p.gradient.some((r,i)=>!Array.isArray(r)||r.length!==2||!numeric(r[0],0,1e6)||!numeric(r[1],0,100)||(i>0&&r[0]<=p.gradient[i-1][0]))))throw Error('Invalid gradient program.');
      if(p.type==='valve'&&(!Number.isInteger(p.state)||p.state<0||p.state>=p.positions||!(p.positions===2?[4,6,8,10,12].includes(p.ports.length):p.positions===p.ports.length-1&&[5,7,9,11,13].includes(p.ports.length))))throw Error('Invalid valve configuration.');
    }
    for(const t of data.tubes){
      if(typeof t.id!=='string'||!/^[-\w]{1,80}$/.test(t.id)||ids.has(t.id)||!numeric(t.diameter,.001,1000)||!numeric(t.length,0,1e6)||!Array.isArray(t.bends)||t.bends.length>1000||t.bends.some(v=>!Array.isArray(v)||v.length!==2||v.some(n=>!numeric(n,-1e5,1e5))))throw Error('Invalid tubing.');ids.add(t.id);
      if(!t.from)throw Error('Missing tubing port.');
      for(const e of [t.from,t.to].filter(Boolean)){const p=data.parts.find(p=>p.id===e.part);if(!p||!Number.isInteger(e.port)||e.port<0||e.port>=p.ports.length||occupied.has(key(e)))throw Error('Invalid or multiply connected port.');occupied.add(key(e));}
    }
    return data;
  }
  const api={viscosity,diffusion,volume,tube,properties,composition,internal,calculate,createPart,validate};
  if(typeof module!=='undefined')module.exports=api;else root.FluidModel=api;
})(globalThis);
