// Cloudflare Pages Function. All mail settings are server-side bindings.
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
});
const configured = env => ['CONTACT_TO','CONTACT_FROM','RESEND_API_KEY','TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY'].every(k => typeof env[k] === 'string' && env[k].trim());
const error = (message, status) => json({ok:false,message},status);
async function readBody(request) {
  const reader=request.body?.getReader();if(!reader)return '';
  const chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();throw Error('size');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return new TextDecoder().decode(bytes);
}
export async function onRequest({request,env}) {
  if(request.method==='GET')return json({ready:!!configured(env),siteKey:configured(env)?env.TURNSTILE_SITE_KEY:null});
  if(request.method!=='POST')return error('Method not allowed.',405);
  const url=new URL(request.url);
  if(request.headers.get('Origin')!==url.origin)return error('Submit the form from this website.',403);
  if(!configured(env))return error('Messaging is not available yet. Please try again later.',503);
  if(!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded'))return error('Invalid submission.',415);
  let data;try{data=new URLSearchParams(await readBody(request));}catch{return error('Message is too large.',413);}
  const value=k=>(data.get(k)||'').trim();
  if(value('website'))return error('Submission rejected.',400);
  const name=value('name'),email=value('email'),subject=value('subject'),message=value('message'),token=value('cf-turnstile-response');
  if(!name||name.length>120||!subject||subject.length>160||!message||message.length>10000||email.length>254||! /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)||/[\r\n\x00-\x1f\x7f]/.test(name+email+subject))return error('Check your name, email address, subject, and message.',400);
  if(!token||token.length>2048)return error('Complete the spam check and try again.',400);
  try {
    const verification=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:token}),signal:AbortSignal.timeout(8000)
    });
    if(!verification.ok)return error('The spam check is unavailable. Please try again.',502);
    const checked=await verification.json();
    if(!checked.success||checked.hostname!==url.hostname||checked.action!=='contact')return error('The spam check expired or failed. Please try again.',400);
    const sent=await fetch('https://api.resend.com/emails',{
      method:'POST',headers:{'Authorization':`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({from:env.CONTACT_FROM,to:[env.CONTACT_TO],reply_to:email,subject:`HPLC Simulator: ${subject}`,text:`Name: ${name}\nEmail: ${email}\n\n${message}`}),
      signal:AbortSignal.timeout(8000)
    });
    if(!sent.ok)return error('The mail service could not accept your message. Please try again later.',502);
    const receipt=await sent.json();if(!receipt.id)return error('The mail service could not confirm your message.',502);
    return json({ok:true});
  } catch {return error('Your message could not be confirmed. Please try again later.',502);}
}
