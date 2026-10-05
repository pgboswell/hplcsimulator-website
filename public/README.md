# HPLC Simulator website preview

Open http://hplcsimulator/ using the existing local server, or open `index.html` directly in a browser. All seven pages, styles, illustrations, navigation, and downloads work without a build tool or internet connection. The contact form requires the Cloudflare Pages Function and mail configuration described below.

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

## Contact form on Cloudflare Pages

The contact page posts to `/api/contact`, implemented in `../functions/api/contact.js`.
Deploy from the project root with `public` as the Pages output directory; the sibling
`functions` directory must be deployed too. Static file serving alone cannot send mail.
The build command is `python build_site.py`. All required assets and downloads are included.

The mail transport is Resend. Create a Resend account, verify a sender domain you
control, and create a sending API key. Configure these bindings in Cloudflare Pages
under Settings → Variables and Secrets for the deployment environment:

| Binding | Value |
| --- | --- |
| `CONTACT_TO` (secret) | The Gmail destination specified by the site owner |
| `CONTACT_FROM` | A sender at your verified domain, such as `HPLC Simulator <contact@example.org>` |
| `RESEND_API_KEY` (secret) | Resend sending API key |
| `TURNSTILE_SITE_KEY` | Public site key from a Cloudflare Turnstile managed widget |
| `TURNSTILE_SECRET_KEY` (secret) | Matching Turnstile secret key |

Add your deployed hostname to the Turnstile widget's allowed hostnames. Configure
production and preview separately; leave mail settings unset on public previews
unless those previews should send real mail. Redeploy after configuring bindings.
Do not use your Gmail address as `CONTACT_FROM`: the sender must be verified with
Resend. Replies to contact messages go to the visitor's email address.

The recipient is never returned by the endpoint or included in page HTML or
browser JavaScript. The form has a honeypot, input/size validation, same-origin
submission checks, and server-side Turnstile verification. Messages are sent as
plain text. Add a Cloudflare rate-limit rule for POST `/api/contact` if needed for
traffic volume. The function does not log message bodies or credentials.

For local function testing, use `npx wrangler pages dev public` from the repository
root. Bindings can go in a root `.dev.vars` file (ignored by Git). Never put that file
inside `public`. Use Turnstile's official local testing keys only in development.
The current plain static local server displays the form but cannot send messages.

Run `node tests/contact.test.cjs` for mocked validation and delivery tests. These
tests do not send email. After deployment, submit one test message and verify receipt
and reply behavior; API acceptance is not a guarantee of inbox delivery.

References: [Pages Functions](https://developers.cloudflare.com/pages/functions/get-started/),
[Pages secrets](https://developers.cloudflare.com/pages/functions/bindings/),
[Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/),
[Resend send API](https://resend.com/docs/api-reference/emails/send-email).
