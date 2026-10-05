'use strict';
(() => {
  const form=document.querySelector('#contact-form');if(!form)return;
  const button=form.querySelector('[type="submit"]'),status=document.querySelector('#contact-status');
  let widget=null,busy=false,token='';
  function report(message,error=false){status.hidden=false;status.dataset.error=String(error);status.textContent=message;}
  function ready(value){token=value||'';button.disabled=busy||!token;}
  async function initialize(){
    try{
      const response=await fetch(form.action,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw Error('unavailable');
      const config=await response.json();
      if(!config.ready||!config.siteKey)throw Error('unavailable');
      await new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        const timer=setTimeout(()=>reject(Error('timeout')),15000);
        script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
        script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);reject(Error('unavailable'));};document.head.append(script);
      });
      widget=window.turnstile.render('#contact-challenge',{
        sitekey:config.siteKey,action:'contact',size:'flexible',
        callback:value=>{ready(value);if(status.textContent==='Complete the spam check to send your message.'||status.textContent==='Please complete the spam check again.')report('');},
        'expired-callback':()=>{ready('');report('Please complete the spam check again.');},
        'error-callback':()=>{ready('');report('The spam check could not load. Please reload the page and try again.',true);}
      });
      report('Complete the spam check to send your message.');
    }catch{report('Messaging is not available yet. Please try again later.',true);}
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!token||!form.reportValidity())return;
    busy=true;button.disabled=true;report('Sending your message…');
    try{
      const data=new URLSearchParams(new FormData(form));data.set('cf-turnstile-response',token);
      const response=await fetch(form.action,{method:'POST',headers:{Accept:'application/json'},body:data,signal:AbortSignal.timeout(20000)});
      const result=await response.json();
      if(!response.ok||result.ok!==true){report(result.message||'Your message could not be sent. Please try again later.',true);return;}
      form.reset();report('Your message has been submitted. Thank you.');
    }catch{report('Your message could not be confirmed. Your text has been kept; please try again later.',true);}
    finally{busy=false;ready('');if(widget!==null)window.turnstile.reset(widget);}
  });
  initialize();
})();
