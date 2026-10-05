/* One shared, centered twin-piston symbol for the palette and the workspace. */
window.FluidPumpSymbol = function(cx,height){
  const cylinders=[{x:cx-18,piston:41},{x:cx+18,piston:35}];
  return `<g aria-hidden="true" fill="none" stroke="#46567a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M${cx-18} 24V14h36v10M${cx} 14V${height}" stroke="#379bb7" stroke-width="2.5"/>
    ${cylinders.map(({x,piston})=>`<rect x="${x-12}" y="24" width="24" height="32" rx="4" fill="#fff"/>
      <path d="M${x-8} 28h16v${piston-28}h-16Z" fill="#d9edf5" stroke="none"/>
      <path d="M${x-9} ${piston}h18" stroke-width="4"/>
      <path d="M${x} ${piston+2}V68" stroke-width="3"/>
      <path d="M${x-5} 57h10M${x-6} 69h12"/>
      <path d="M${x-3} 19l3-4 3 4-3 4Z" fill="#fff" stroke-width="1.5"/>`).join('')}
    </g>`;
};
