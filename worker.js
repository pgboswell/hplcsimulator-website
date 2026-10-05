import {onRequest} from './functions/api/contact.js';

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/api/contact' || path === '/api/contact/') {
      return onRequest({request, env});
    }
    return env.ASSETS.fetch(request);
  }
};
