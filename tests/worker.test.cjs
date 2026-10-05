const assert = require('node:assert/strict');
const fs = require('node:fs');
const moduleURL = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
(async () => {
  const contactURL = moduleURL(fs.readFileSync('functions/api/contact.js', 'utf8'));
  const code = fs.readFileSync('worker.js', 'utf8').replace('./functions/api/contact.js', contactURL);
  const {default: worker} = await import(moduleURL(code));
  const assets = [];
  const env = {ASSETS: {fetch: request => {assets.push(request.url); return new Response('asset');}}};
  for (const path of ['/api/contact', '/api/contact/']) {
    const response = await worker.fetch(new Request('https://example.org' + path), env);
    assert.deepEqual(await response.json(), {ready: false, siteKey: null});
  }
  assert.equal(assets.length, 0);
  for (const path of ['/', '/simulator.html', '/assets/contact.js', '/missing-page']) {
    const response = await worker.fetch(new Request('https://example.org' + path), env);
    assert.equal(await response.text(), 'asset');
  }
  assert.equal(assets.length, 4);
  const config = JSON.parse(fs.readFileSync('wrangler.jsonc', 'utf8'));
  assert.equal(config.main, 'worker.js');
  assert.equal(config.assets.binding, 'ASSETS');
  assert.equal(config.assets.run_worker_first, true);
  const redirects = [
    ['http://hplcsimulator.org/simulator', 'https://hplcsimulator.org/simulator'],
    ['https://www.hplcsimulator.org/simulator.html?method=test', 'https://hplcsimulator.org/simulator?method=test'],
    ['https://hplcsimulator-website.pgboswell.workers.dev/index.html', 'https://hplcsimulator.org/'],
    ...[['/index.php','/'], ['/simulator.php','/simulator'], ['/fluidvisualizer/index.php','/fluid-visualizer'],
      ...['resources','development','about','contact'].map(p=>[`/${p}/index.php`,`/${p}`])]
      .map(([oldPath,newPath])=>['http://www.hplcsimulator.org'+oldPath,'https://hplcsimulator.org'+newPath])
  ];
  for (const [from,to] of redirects) {
    const response = await worker.fetch(new Request(from), env);
    assert.equal(response.status,301);assert.equal(response.headers.get('Location'),to);
    const final = await worker.fetch(new Request(to),env);
    assert.equal(final.status,200,'Canonical URL must not redirect again');
  }
  const post = await worker.fetch(new Request('http://hplcsimulator.org/api/contact',{method:'POST',body:'test'}),env);
  assert.equal(post.status,308);
  const preview = await worker.fetch(new Request('https://preview-hplcsimulator-website.pgboswell.workers.dev/simulator'),env);
  assert.equal(preview.status,200);assert.equal(preview.headers.get('X-Robots-Tag'),'noindex');
  const api = await worker.fetch(new Request('https://hplcsimulator.org/api/contact'),env);
  assert.equal(api.status,200);assert.deepEqual(await api.json(),{ready:false,siteKey:null});
  const sitemap = fs.readFileSync('public/sitemap.xml','utf8');
  const urls = Array.from(sitemap.matchAll(/<loc>(.*?)<\/loc>/g),m=>m[1]);
  assert.equal(urls.length,7);assert.equal(new Set(urls).size,7);
  for(const url of urls){
    const slug=new URL(url).pathname.slice(1);
    const html=fs.readFileSync('public/'+(slug||'index')+'.html','utf8');
    assert.ok(html.includes(`<link rel="canonical" href="${url}">`));
  }
  assert.ok(fs.readFileSync('public/robots.txt','utf8').includes('Sitemap: https://hplcsimulator.org/sitemap.xml'));
  console.log('PASS: Worker routes contact requests to the server handler and other requests to static assets.');
})().catch(error => {console.error(error); process.exitCode = 1;});
