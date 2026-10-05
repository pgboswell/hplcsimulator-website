const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
  const code=fs.readFileSync('functions/api/contact.js','utf8');
  const {onRequest}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  const env={CONTACT_TO:'private@example.net',CONTACT_FROM:'contact@example.org',MAILGUN_API_KEY:'test-secret',MAILGUN_DOMAIN:'mg.example.org',TURNSTILE_SITE_KEY:'public-key',TURNSTILE_SECRET_KEY:'private-key'};
  const values={name:'Test Person',email:'visitor@example.net',subject:'Test',message:'A test message','cf-turnstile-response':'token'};
  const request=(v=values,origin='https://example.org')=>new Request('https://example.org/api/contact',{method:'POST',headers:{Origin:origin},body:new URLSearchParams(v)});
  let calls=[],verified=true,mailOK=true,hostname='example.org';
  global.fetch=async(url,options)=>{
    calls.push({url,options});
    if(url.includes('siteverify'))return Response.json({success:verified,hostname,action:'contact'});
    return Response.json(mailOK?{id:'receipt'}:{message:'secret provider detail'}, {status:mailOK?200:500});
  };
  let r=await onRequest({request:new Request('https://example.org/api/contact'),env});
  const publicConfig=await r.text();assert.ok(!publicConfig.includes(env.CONTACT_TO));assert.ok(!publicConfig.includes('private-key'));assert.ok(publicConfig.includes('public-key'));
  r=await onRequest({request:request(),env:{}});assert.equal(r.status,503);assert.equal(calls.length,0);
  r=await onRequest({request:request(values,'https://foreign.example'),env});assert.equal(r.status,403);
  for(const fields of [{email:'a\r\nBcc: other@example.org'},{subject:'hello\nheader'},{message:''},{name:'x'.repeat(121)},{website:'spam'},{'cf-turnstile-response':''}]){
    r=await onRequest({request:request({...values,...fields}),env});assert.equal(r.status,400);
  }
  assert.equal(calls.length,0);
  r=await onRequest({request:request({...values,message:'x'.repeat(70000)}),env});assert.equal(r.status,413);
  verified=false;r=await onRequest({request:request(),env});assert.equal(r.status,400);assert.equal(calls.length,1);
  verified=true;hostname='other.example';r=await onRequest({request:request(),env});assert.equal(r.status,400);
  hostname='example.org';calls=[];r=await onRequest({request:request({...values,to:'attacker@example.net'}),env});assert.equal(r.status,200);
  const mail=calls[1].options.body;assert.ok(mail instanceof FormData);assert.equal(mail.get('to'),env.CONTACT_TO);assert.equal(mail.get('h:Reply-To'),values.email);assert.equal(mail.get('from'),env.CONTACT_FROM);assert.equal(mail.get('text'),`Name: ${values.name}\nEmail: ${values.email}\n\n${values.message}`);assert.ok(!mail.has('html'));
  assert.equal(calls[1].url,'https://api.mailgun.net/v3/mg.example.org/messages');
  assert.equal(calls[1].options.headers.Authorization,'Basic '+Buffer.from('api:test-secret').toString('base64'));
  calls=[];r=await onRequest({request:request(),env:{...env,MAILGUN_REGION:'EU'}});assert.equal(r.status,200);assert.equal(calls[1].url,'https://api.eu.mailgun.net/v3/mg.example.org/messages');
  for(const settings of [{MAILGUN_DOMAIN:'https://evil.example/path'},{MAILGUN_REGION:'invalid'},{MAILGUN_API_KEY:''}]){
    calls=[];r=await onRequest({request:request(),env:{...env,...settings}});assert.equal(r.status,503);assert.equal(calls.length,0);
  }
  mailOK=false;r=await onRequest({request:request(),env});assert.equal(r.status,502);assert.ok(!(await r.text()).includes('secret provider detail'));
  global.fetch=async()=>{throw Error('network');};r=await onRequest({request:request(),env});assert.equal(r.status,502);
  for(const file of ['public/contact.html','public/assets/contact.js'])assert.ok(!fs.readFileSync(file,'utf8').includes(env.CONTACT_TO));
  console.log('PASS: private configuration, origin/size/input checks, spam validation, fixed recipient, reply-to, provider failure, and network failure. No real emails sent.');
})().catch(e=>{console.error(e);process.exitCode=1;});
