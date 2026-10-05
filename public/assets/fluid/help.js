/* Contextual help for the fluid visualizer. Text is local, static content. */
(() => {
  const entries={
    name:['Name','The component name shown on the diagram and in system results.'],
    color:['Fluid color','Identifies the flow path connected to this source at the current valve position. Colors show connectivity, not fluid mixing over time.'],
    flow:['Flow rate','The pump’s volumetric flow rate. Higher flow generally raises backpressure and reduces gradient delay.'],
    volume:['Pump volume','The volume inside the pump and mixer before its outlet. This contributes to gradient delay: volume divided by flow rate.'],
    limit:['Pressure limit','The maximum pressure allowed for this pump. The results flag calculated backpressure above this limit; the model does not automatically reduce flow.'],
    solvent:['Solvent B','Choose methanol or acetonitrile. Solvent A is water. Composition and temperature determine the viscosity and estimated diffusion coefficient used in the calculations.'],
    gradient:['Solvent program','Enter increasing times in minutes and solvent B percentages. One row gives constant composition. System properties use the highest-viscosity composition within the programmed range; this is not a time-resolved gradient simulation.'],
    'column.diameter':['Column internal diameter','The internal diameter of the packed bed. Together with flow rate, it determines the mobile-phase velocity.'],
    'column.length':['Column length','The length of the packed bed. Longer columns increase pressure drop and change the column’s contribution to band broadening.'],
    particle:['Particle size','The packing particle diameter, <i>d</i><sub><i>p</i></sub>. Smaller particles generally increase efficiency and backpressure.'],
    temperature:['Column temperature','Used to calculate solvent viscosity and analyte diffusion in the column and its optional preheater. Other tubing and valves are modeled at 25 °C.'],
    preheater:['Column preheater','Includes tubing immediately before the packed bed, modeled at the column temperature. It contributes pressure drop, dispersion, and gradient delay.'],
    preDiameter:['Preheater internal diameter','The bore of the preheater tubing. One mil is 0.001 inch, or 25.4 µm. Narrower tubing has a much higher pressure drop.'],
    preLength:['Preheater length','The physical length of tubing used to preheat the mobile phase before it enters the column.'],
    inter:['Interparticle porosity','The fraction of the packed-bed volume between particles. It affects mobile-phase velocity, column pressure, and hold-up volume.'],
    intra:['Intraparticle porosity','The fraction of each particle’s volume occupied by accessible pores. Total porosity is <i>ε</i><sub><i>e</i></sub> + (1 − <i>ε</i><sub><i>e</i></sub>)<i>ε</i><sub><i>i</i></sub>.'],
    a:['van Deemter A','The dimensionless eddy-dispersion coefficient. Reduced plate height is <i>h</i> = <i>A</i> + <i>B</i>/<i>ν</i> + <i>Cν</i>, where <i>ν</i> is reduced velocity.'],
    b:['van Deemter B','The dimensionless longitudinal-diffusion coefficient in <i>h</i> = <i>A</i> + <i>B</i>/<i>ν</i> + <i>Cν</i>. This contribution is greatest at low reduced velocity.'],
    c:['van Deemter C','The dimensionless mass-transfer coefficient in <i>h</i> = <i>A</i> + <i>B</i>/<i>ν</i> + <i>Cν</i>. This contribution increases with reduced velocity.'],
    state:['Valve position','Selects which ports are connected internally. The diagram, flow arrows, and system properties update immediately. You can also double-click the valve to switch position.'],
    statorDiameter:['Stator hole diameter','The internal diameter of each fixed passage in the valve, in mil (25.4 µm). Each connected path includes two stator holes and one rotor groove.'],
    statorLength:['Stator hole length','The length of one fixed passage in the valve. The calculation includes two of these lengths per connected path.'],
    grooveDiameter:['Rotor groove diameter','The equivalent circular bore used to estimate pressure drop, dispersion, and volume for the rotor groove.'],
    grooveLength:['Rotor groove length','The length of the passage linking two ports inside the valve. One groove is included per connected path.'],
    'tube.diameter':['Tubing internal diameter','The bore of the tubing, in mil (25.4 µm). Pressure drop scales with the inverse fourth power of diameter for a fixed length and flow rate.'],
    'tube.length':['Tubing length','The physical tubing length used in calculations. Moving components or changing the drawn route does not change this length.'],
    tubeVolume:['Tubing volume','Calculated from the bore and physical length: <i>V</i> = π<i>r</i><sup>2</sup><i>L</i>. Editing this value adjusts the tubing length while keeping its diameter.'],
    showVolume:['Tube label','Choose whether the diagram labels this tube with its volume or physical length. Both use the same underlying tubing dimensions.'],
    pressure:['Backpressure','The sum of pressure drops along the pump’s connected path, including tubing, valve passages, columns, and preheaters. A blocked path has no finite operating pressure in this model.'],
    broadening:['Band broadening','The standard deviation, <i>σ</i>, in volume units. Independent volume variances from tubing, valve passages, columns, and preheaters are added: <i>σ</i> = √(Σ<i>σ</i><sub><i>j</i></sub><sup>2</sup>). Detector and autosampler internal dispersion are not included.'],
    delay:['Gradient delay','The pump volume plus upstream tubing and valve volumes, including the first column’s preheater, divided by pump flow rate. The packed bed and everything after the first column are excluded.'],
    status:['Flow path','Shows whether the pump reaches waste, an open outlet, or a blocked connection. A closed selector port or connection to another source blocks flow.'],
    arrows:['Flow arrows','Shows the direction from each connected pump or autosampler through the current valve connections. Blocked paths and paths without a source have no arrows.'],
    labels:['Tube labels','Shows the tubing diameter and physical length (or volume). Select an individual tube to see its label and edit its properties.']
  };
  const escape=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const button=key=>entries[key]?`<button type="button" class="fv-help" data-fluid-help="${key}" aria-label="Help: ${escape(entries[key][0])}" aria-expanded="false">?</button>`:'';
  const panel=document.createElement('div');panel.className='fv-help-panel';panel.id='fv-help-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','fv-help-title');
  document.body.append(panel);let active=null;
  function close(restore=false){const old=active;if(old)old.setAttribute('aria-expanded','false');active=null;panel.hidden=true;if(restore&&old?.isConnected)old.focus();}
  function position(){if(!active?.isConnected){close();return;}const r=active.getBoundingClientRect(),h=panel.offsetHeight,w=panel.offsetWidth;panel.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+'px';panel.style.top=Math.max(8,Math.min(innerHeight-h-8,r.bottom+8))+'px';}
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-fluid-help]');
    if(b){e.preventDefault();e.stopPropagation();if(active===b){close(true);return;}close();active=b;b.setAttribute('aria-expanded','true');b.setAttribute('aria-controls',panel.id);const [title,body]=entries[b.dataset.fluidHelp];panel.innerHTML=`<button type="button" class="fv-help-close" aria-label="Close help">×</button><strong id="fv-help-title">${title}</strong><p>${body}</p>`;panel.hidden=false;position();panel.querySelector('button').focus();return;}
    if(e.target.closest('.fv-help-close'))close(true);else if(!panel.contains(e.target))close();
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){e.preventDefault();e.stopPropagation();close(true);}},true);
  addEventListener('resize',position);document.addEventListener('scroll',()=>{if(active)position();},true);
  new MutationObserver(()=>{if(active&&!active.isConnected)close();}).observe(document.querySelector('#fv-properties'),{childList:true});
  document.querySelectorAll('[data-fluid-help-anchor]').forEach(el=>el.insertAdjacentHTML('beforeend',button(el.dataset.fluidHelpAnchor)));
  window.FluidHelp={button,close};
})();
