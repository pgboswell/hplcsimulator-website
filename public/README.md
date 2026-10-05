# HPLC Simulator website preview

Open http://hplcsimulator/ using the existing local server, or open `index.html` directly in a browser. All seven pages, styles, illustrations, navigation, and downloads work without a build tool or internet connection. The contact form requires the Cloudflare Worker and mail configuration described below.

The website uses plain HTML, CSS, JavaScript, and inline SVG. No framework, package installation, remote fonts, analytics, PHP, or Java runtime is required.

## Scope

- Seven pages: Home, HPLC Simulator, HPLC Fluid Visualizer, Educational Resources, Development, About, Contact.
- Responsive navigation, keyboard focus states, skip link, reduced-motion support, and searchable/filterable educational downloads.
- Original teaching documents, six Fluid Visualizer examples, and two historical source archives are copied into `downloads/`.
- HPLC Simulator is now a live JavaScript/Canvas port of the supplied v1.16 source. See `SIMULATOR.md` for scope, numerical verification, and model differences. The Fluid Visualizer also runs in the browser; see `FLUID-VISUALIZER.md`.
- Original contributor credits, historical funding acknowledgments, and software licensing are retained. Historical affiliations and archives are labeled accordingly. The old forum, obsolete launch instructions, and dated promotional announcements are omitted.

## Editing

Content and shared HTML: `../build_site.py` (run `python build_site.py` from the project root to regenerate the HTML).

Styles: `assets/site.css`. Navigation and resource filtering: `assets/site.js`. Simulator: `assets/simulator/`, with its page template in `../simulator/workspace.html`.

Downloadable documents and historical archives are versioned in `downloads/`. Building the website does not require the original website backup or Eclipse projects.

## Contact form on Cloudflare Workers

The contact page posts to `/api/contact`. `../worker.js` routes it to the shared
handler in `../functions/api/contact.js`; other requests use the static assets.
`../wrangler.jsonc` deploys the Worker and the `public` assets together.

In the connected Worker's build settings, use `python build_site.py` as the build
command and `npx wrangler deploy` as the deploy command. Keep the repository root
as the root directory. Domains are managed through the Cloudflare dashboard.

The mail transport is Mailgun's HTTPS API. Use an existing verified sending domain
and a domain sending API key. Add these runtime bindings in the Worker's
Settings > Variables and Secrets (not the build environment variables):

| Binding | Value |
| --- | --- |
| `CONTACT_TO` (secret) | The destination email address specified by the site owner |
| `CONTACT_FROM` | A sender at your Mailgun domain, such as `HPLC Simulator <contact@mg.example.org>` |
| `MAILGUN_DOMAIN` | Verified Mailgun sending domain, without https:// or a path |
| `MAILGUN_REGION` | `US` or `EU`, matching the domain's region; defaults to US |
| `MAILGUN_API_KEY` (secret) | Mailgun domain sending API key (not an SMTP password) |
| `TURNSTILE_SITE_KEY` | Public site key from a Cloudflare Turnstile managed widget |
| `TURNSTILE_SECRET_KEY` (secret) | Matching Turnstile secret key |

Create a managed Turnstile widget and allow `hplcsimulator.org` and
`www.hplcsimulator.org`. Add the workers.dev hostname too if testing there.
Save and deploy the runtime settings. The form stays disabled until all required
bindings are set. Do not commit credentials or place them inside `public`.

The From address uses your Mailgun sending domain; replies go to the visitor's
email address. If using a Mailgun sandbox domain, the destination must be an
authorized sandbox recipient. Production should use a verified custom domain.

The recipient is never returned by the endpoint or included in page HTML or
browser JavaScript. The form has a honeypot, input/size validation, same-origin
submission checks, and server-side Turnstile verification. Messages are sent as
plain text. The handler does not log message bodies or credentials.

For local testing, use `npx wrangler dev` from the repository root. Bindings can
go in a root `.dev.vars` file (ignored by Git). Use Turnstile's official local
testing keys only in development. A plain static server cannot send messages.

Run `node tests/contact.test.cjs` and `node tests/worker.test.cjs` for mocked
validation, delivery, and routing tests. These do not send email. After deployment,
submit a test message and verify receipt and reply behavior; API acceptance is
not a guarantee of inbox delivery.

For Pages deployments, the shared `functions/api/contact.js` handler still works
with `public` as the output directory and the same runtime bindings.

References: [Worker static assets](https://developers.cloudflare.com/workers/static-assets/),
[Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/),
[Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/),
[Mailgun sending API](https://documentation.mailgun.com/docs/mailgun/user-manual/sending-messages/send-http).
