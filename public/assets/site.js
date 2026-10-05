'use strict';
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  menu.textContent = open ? 'Close ×' : 'Menu ☰';
  nav.classList.toggle('open', open);
});
document.addEventListener('keydown', event => {
  if(event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') {menu.click();menu.focus();}
});
const search = document.querySelector('#resource-search');
let category = 'all';
function filterResources() {
  const query = search.value.trim().toLowerCase();
  let count = 0;
  document.querySelectorAll('.resource-card').forEach(card => {
    const visible = (category === 'all' || card.dataset.category === category) && card.textContent.toLowerCase().includes(query);
    card.hidden = !visible;
    if(visible) count++;
  });
  document.querySelector('#resource-count').textContent = `${count} resource${count === 1 ? '' : 's'}`;
  document.querySelector('#no-results').hidden = count !== 0;
}
search?.addEventListener('input', filterResources);
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  category = button.dataset.filter;
  document.querySelectorAll('.filter').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  filterResources();
}));
