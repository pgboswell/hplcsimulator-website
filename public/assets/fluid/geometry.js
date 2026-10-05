/* Drawing coordinates only; physical tubing dimensions are independent. */
(function(root){
  'use strict';
  const GRID=30, snap=n=>Math.round(n/GRID)*GRID, snapPoint=p=>p.map(snap);
  function alignPorts(p){
    if(p.type==='pump'||p.type==='autosampler'){
      p.width=120;p.height=90;p.ports=[[60,90]];
    }else if(p.type==='detector'){
      p.width=120;p.height=90;p.ports=[[0,60],[120,30]];
    }else if(p.type==='column'){
      p.width=Math.max(120,snap(p.width));p.height=60;p.ports=[[0,30],[p.width,30]];
    }else if(p.type==='waste'){
      p.width=60;p.height=90;p.ports=[[30,0]];
    }
    return p;
  }
  function snapLayout(layout){
    layout.parts.forEach(p=>{p.x=snap(p.x);p.y=snap(p.y);alignPorts(p);});
    layout.tubes.forEach(t=>{t.bends=t.bends.map(snapPoint);});
    return layout;
  }
  function roundedPath(points,radius=12){
    const p=points.filter((v,i)=>!i||Math.hypot(v[0]-points[i-1][0],v[1]-points[i-1][1])>1e-8);
    if(!p.length)return '';
    let d=`M${p[0].join(' ')}`;
    for(let i=1;i<p.length-1;i++){
      const a=p[i-1],b=p[i],c=p[i+1],ab=Math.hypot(b[0]-a[0],b[1]-a[1]),bc=Math.hypot(c[0]-b[0],c[1]-b[1]);
      const r=Math.min(radius,ab/2,bc/2);
      const start=[b[0]+(a[0]-b[0])*r/ab,b[1]+(a[1]-b[1])*r/ab];
      const end=[b[0]+(c[0]-b[0])*r/bc,b[1]+(c[1]-b[1])*r/bc];
      d+=` L${start.join(' ')} Q${b.join(' ')} ${end.join(' ')}`;
    }
    if(p.length>1)d+=` L${p.at(-1).join(' ')}`;
    return d;
  }
  const api={GRID,snap,snapPoint,alignPorts,snapLayout,roundedPath};
  if(typeof module!=='undefined')module.exports=api;else root.FluidGeometry=api;
})(globalThis);
