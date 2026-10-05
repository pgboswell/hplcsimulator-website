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

## Cloudflare Workers deployment

Connect this repository to the `hplcsimulator-website` Worker with:

- Production branch: `main`
- Build command: `python build_site.py`
- Deploy command: `npx wrangler deploy`
- Root directory: repository root (leave blank)

`wrangler.jsonc` deploys `worker.js` and the `public` static assets together.
The Worker handles `/api/contact`; all other requests use the static files.
Custom domains are managed in the Cloudflare dashboard.

All build inputs are included. No old website backup or Java installation is needed.

## Contact form configuration

The form uses Mailgun for delivery and Cloudflare Turnstile for spam protection.
Configure `CONTACT_TO`, `CONTACT_FROM`, `MAILGUN_DOMAIN`, `MAILGUN_REGION`,
`MAILGUN_API_KEY`, `TURNSTILE_SITE_KEY`, and `TURNSTILE_SECRET_KEY` as Worker
runtime bindings. Store the recipient, API key, and Turnstile secret as secrets.
The form stays disabled until configuration is complete.

See [contact setup details](public/README.md#contact-form-on-cloudflare-workers)
for the binding values and verification steps. No credentials or destination
address are committed here.

## Files and editing

- `build_site.py`: shared page structure and informational page content.
- `simulator/workspace.html`, `fluid/workspace.html`: application page templates.
- `public/assets/`: JavaScript source, styles, data, and logos.
- `public/downloads/`: teaching materials, Java examples, and historical source archives.
- `worker.js`, `wrangler.jsonc`: Worker entry point and deployment configuration.
- `functions/api/contact.js`: shared contact endpoint, deployed only on the server.
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
node tests/worker.test.cjs
```

Contact tests use mocked services and do not send email. Reference data are
included, so Java is not needed. Agreement with the original calculations is
not validation against experimental measurements.

## License

The original software license, CC BY-NC-SA 3.0 US, and source attribution are
retained. See `LICENSE` and `NOTICE`. Downloaded historical materials retain
their original notices.
