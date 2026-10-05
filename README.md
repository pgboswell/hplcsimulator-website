# HPLC Simulator website

Complete website for hplcsimulator.org, including both browser applications,
educational downloads, project information, and the contact form.

## Local preview

```
python build_site.py
python -m http.server 8000 --directory public
```

Open http://localhost:8000/. The applications run entirely in the browser.
A plain static server cannot send contact messages.

## Cloudflare Pages

Connect this repository to Cloudflare Pages with:

- Production branch: `main`
- Framework preset: None
- Build command: `python build_site.py`
- Build output directory: `public`
- Root directory: repository root (leave blank)

All build inputs are included. No old website backup, Java installation,
Eclipse workspace, or Node package installation is needed for the site build.
The sibling `functions/` directory contains the contact API; Git-based Pages
builds deploy it with the static files. Do not upload only `public/` through the
Cloudflare dashboard if the contact form is needed.

After deployment, add `hplcsimulator.org` in the Pages project's Custom domains.
This repository does not configure DNS or deploy itself automatically until it
is connected to Cloudflare.

## Contact form configuration

The form uses a Cloudflare Pages Function, Resend for email delivery, and
Cloudflare Turnstile for spam protection. Add these bindings in Cloudflare:

- `CONTACT_TO` (secret): the destination email address.
- `CONTACT_FROM`: a sender on your Resend-verified domain.
- `RESEND_API_KEY` (secret): a sending API key.
- `TURNSTILE_SITE_KEY`: the public key for the site's managed Turnstile widget.
- `TURNSTILE_SECRET_KEY` (secret): its matching secret key.

Configure production and preview environments separately and redeploy after
changing settings. The form stays disabled when configuration is missing.
No destination address or credentials are committed here. See
[contact setup details](public/README.md#contact-form-on-cloudflare-pages).

## Files and editing

- `build_site.py`: shared page structure and informational page content.
- `simulator/workspace.html`, `fluid/workspace.html`: application page templates.
- `public/assets/`: JavaScript source, styles, data, and logos.
- `public/downloads/`: teaching materials, Java examples, and historical source archives.
- `functions/api/contact.js`: contact endpoint, deployed only on the server.
- `tests/`: application reference fixtures and tests.

Edit the templates or application assets, run the build, and commit the source
and regenerated pages. Generated HTML is included for immediate static previews.

The two standalone application repositories are separate copies:
[HPLC Simulator](https://github.com/pgboswell/hplc-simulator) and
[HPLC Fluid Visualizer](https://github.com/pgboswell/hplc-fluid-visualizer).
Changes do not automatically synchronize between these repositories.

## Tests

With Node.js installed, run from the repository root:

```
node tests/model.test.js
node tests/plot-interactions.cjs
node tests/fluid-model.test.cjs
node tests/fluid-flow.test.cjs
node tests/contact.test.cjs
```

Contact tests use mocked services and do not send email. Reference data are
included, so Java is not needed. Agreement with the original calculations is
not validation against experimental measurements.

## License

The original software license, CC BY-NC-SA 3.0 US, and source attribution are
retained. See `LICENSE` and `NOTICE`. Downloaded historical materials retain
their original notices.
