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
  assert.deepEqual(config.assets.run_worker_first, ['/api/*']);
  console.log('PASS: Worker routes contact requests to the server handler and other requests to static assets.');
})().catch(error => {console.error(error); process.exitCode = 1;});
