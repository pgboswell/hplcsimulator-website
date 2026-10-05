import {onRequest} from './functions/api/contact.js';

const canonicalHost = 'hplcsimulator.org';
const productionHosts = new Set([canonicalHost, 'www.hplcsimulator.org', 'hplcsimulator-website.pgboswell.workers.dev']);
const legacyPages = new Map([
  ['/index.php', '/'], ['/simulator.php', '/simulator'],
  ['/fluidvisualizer', '/fluid-visualizer'], ['/fluidvisualizer/', '/fluid-visualizer'],
  ['/fluidvisualizer/index.php', '/fluid-visualizer'],
  ...['resources', 'development', 'about', 'contact'].flatMap(page => [
    [`/${page}/index.php`, `/${page}`], [`/${page}.php`, `/${page}`]
  ])
]);
const pageNames = new Set(['simulator', 'fluid-visualizer', 'resources', 'development', 'about', 'contact']);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (productionHosts.has(url.hostname)) {
      const destination = new URL(url);
      destination.protocol = 'https:';
      destination.host = canonicalHost;
      const name = url.pathname.replace(/^\//, '').replace(/(?:\.html|\/)$/, '');
      if (legacyPages.has(url.pathname)) destination.pathname = legacyPages.get(url.pathname);
      else if (url.pathname === '/index.html') destination.pathname = '/';
      else if (pageNames.has(name)) destination.pathname = '/' + name;
      if (destination.href !== url.href) {
        // Preserve request methods and bodies on non-GET requests.
        return Response.redirect(destination.href, ['GET', 'HEAD'].includes(request.method) ? 301 : 308);
      }
    }
    const path = url.pathname;
    if (path === '/api/contact' || path === '/api/contact/') {
      return onRequest({request, env});
    }
    const response = await env.ASSETS.fetch(request);
    if (url.hostname.endsWith('.workers.dev') && !productionHosts.has(url.hostname)) {
      const preview = new Response(response.body, response);
      preview.headers.set('X-Robots-Tag', 'noindex');
      return preview;
    }
    return response;
  }
};
