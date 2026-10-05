"""Build the dependency-free local website. Run: python build_site.py."""
from pathlib import Path
from html import escape
from urllib.parse import quote
import math
import hashlib

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / 'public'
NAV = [('index.html', 'Home'), ('simulator.html', 'HPLC Simulator'), ('fluid-visualizer.html', 'HPLC Fluid Visualizer'), ('resources.html', 'Educational Resources'), ('development.html', 'Development'), ('about.html', 'About'), ('contact.html', 'Contact')]

def icon(name, size=22):
    paths = {
        'book':'<path d="M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Z"/><path d="M12 5v15"/>',
        'open':'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0M12 14v3"/>',
        'people':'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v2"/>',
        'info':'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
        'chart':'<path d="M3 3v18h18M5 17h2c2 0 1-10 3-10s1 10 3 10h1c2 0 1-5 3-5s1 5 3 5"/>',
    }
    return f'<svg aria-hidden="true" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">{paths[name]}</svg>'

# Sample Gaussian peaks so the small brand mark resembles a chromatogram.
logo_points = [(6 + i / 4, 32 - 23 * math.exp(-0.5 * ((6 + i / 4 - 17) / 1.65) ** 2)
                - 14 * math.exp(-0.5 * ((6 + i / 4 - 28) / 2.0) ** 2)) for i in range(129)]
logo_path = 'M' + ' L'.join(f'{x:.2f} {y:.2f}' for x, y in logo_points)
LOGO = f'<svg aria-hidden="true" viewBox="0 0 44 44" fill="none"><rect width="44" height="44" rx="11" fill="#202396"/><path d="{logo_path}" stroke="#f1f3ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'


def button(text, href, secondary=False):
    return f'<a class="button{" secondary" if secondary else ""}" href="{href}">{text}<span class="arrow" aria-hidden="true">↗</span></a>'

def chart(compact=False):
    # Decorative illustration, deliberately independent of the deferred simulation engine.
    width, height = 480, 248
    traces = []
    for peaks, color, dash in [([(127,13,95),(208,12,150),(302,16,115),(385,18,69)], '#b57437', '4 4'), ([(108,6,83),(176,7,150),(277,9,119),(370,10,72)], '#202396', '')]:
        points=[]
        for x in range(43,459):
            y=202-sum(a*math.exp(-0.5*((x-mu)/sigma)**2) for mu,sigma,a in peaks)
            points.append(f'{x},{y:.2f}')
        traces.append(f'<polyline points="{" ".join(points)}" fill="none" stroke="{color}" stroke-width="2" stroke-dasharray="{dash}"/>')
    grid=''.join(f'<path d="M43 {y}H460"/>' for y in [52,102,152,202]) + ''.join(f'<path d="M{x} 32V202"/>' for x in [43,126,209,292,375,458])
    ticks=''.join(f'<text x="{43+i*83}" y="223" text-anchor="middle">{i*2}</text>' for i in range(6))
    return f'<svg role="img" aria-label="Illustrative chromatogram comparing two separations; not simulated data" viewBox="0 0 {width} {height}"><g stroke="#e0e5f3" stroke-width=".8">{grid}</g><g fill="#727e97" font-family="Arial,sans-serif" font-size="9">{ticks}<text x="250" y="244" text-anchor="middle">Time (min)</text><text x="14" y="120" transform="rotate(-90 14 120)" text-anchor="middle">Detector response</text></g>{"".join(traces)}</svg>'

def fluid():
    return '''<svg role="img" aria-label="Illustrative HPLC flow path from solvent through a pump, injection valve, column, and detector" viewBox="0 0 480 145">
    <g fill="none" stroke="#a7b1d0" stroke-width="1.4"><path d="M21 46v-9h24v9l5 10v43H16V56Z" fill="#f8faff"/><path d="M19 70h28v26H19Z" fill="#d4dcf4" stroke="none"/>
    <path d="M33 61V25h41v47h40M158 72h54M248 72h38M377 72h30M449 72h16v34" stroke="#5969b5" stroke-width="3"/>
    <rect x="91" y="47" width="66" height="50" rx="8" fill="#fafbff"/><circle cx="124" cy="71" r="13"/><path d="m120 64 9 7-9 7Z" fill="#505fac" stroke="none"/>
    <circle cx="230" cy="72" r="22" fill="#f9faff"/><circle cx="230" cy="72" r="8"/><path d="m214 61 32 22" stroke="#b57437" stroke-width="3"/>
    <rect x="284" y="61" width="94" height="22" rx="4" fill="#dfe5f7"/><path d="M290 57v30M372 57v30M300 63v18M308 63v18M316 63v18M324 63v18M332 63v18M340 63v18M348 63v18M356 63v18M364 63v18"/>
    <rect x="406" y="48" width="45" height="48" rx="6" fill="#fafbff"/><path d="M412 80h7l3-17 5 17 4-9 4 9h10" stroke="#b57437"/>
    </g><g fill="#606b85" font-family="Arial,sans-serif" font-size="9" text-anchor="middle"><text x="33" y="120">Solvent</text><text x="124" y="120">Pump</text><text x="230" y="120">Injector</text><text x="332" y="120">Column</text><text x="430" y="120">Detector</text></g></svg>'''

def page(file, title, description, body):
    nav=''.join(f'<a href="{href}"'+(' aria-current="page"' if href==file else '')+f'>{label}</a>' for href,label in NAV)
    extra = '<link rel="stylesheet" href="assets/simulator/simulator.css"><script src="assets/simulator/compounds.js" defer></script><script src="assets/simulator/model.js" defer></script><script src="assets/simulator/app.js" defer></script><script src="assets/simulator/help-data.js" defer></script><script src="assets/simulator/help.js" defer></script>' if file == 'simulator.html' else ''
    if file == 'contact.html':
        extra = '<script src="assets/contact.js" defer></script>'
    if file == 'fluid-visualizer.html':
        extra = '<link rel="stylesheet" href="assets/fluid/fluid.css"><script src="assets/fluid/model.js" defer></script><script src="assets/fluid/examples.js" defer></script><script src="assets/fluid/geometry.js" defer></script><script src="assets/fluid/pump-symbol.js" defer></script><script src="assets/fluid/help.js" defer></script><script src="assets/fluid/app.js" defer></script>'
    html=f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="{escape(description, quote=True)}"><meta name="theme-color" content="#202396"><title>{title} | HPLC Simulator</title><link rel="icon" href="assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="assets/site.css"><script src="assets/site.js" defer></script>{extra}</head>
<body><a class="skip" href="#main">Skip to content</a><header class="header"><div class="wrap"><div class="masthead"><a href="index.html" class="brand" aria-label="HPLC Simulator home">{LOGO}<span><strong>HPLC Simulator</strong><small>the free, open-source HPLC simulator</small></span></a><button class="menu-toggle" aria-expanded="false" aria-controls="main-nav">Menu ☰</button></div></div><div class="nav-band"><div class="wrap"><nav id="main-nav" class="nav" aria-label="Main navigation">{nav}</nav></div></div></header>
<main id="main" class="wrap">{body}</main>
<footer class="footer"><div class="wrap"><div class="footer-top"><div><a href="index.html" class="footer-brand" style="text-decoration:none">HPLC Simulator</a><p>Simulation tools and teaching materials for high-performance liquid chromatography.</p></div><div class="footer-links"><a href="about.html">About the project</a><a href="development.html">Development</a><a href="contact.html">Contact ↗</a></div></div><div class="footer-bottom"><span>Original software: <a href="https://creativecommons.org/licenses/by-nc-sa/3.0/us/">CC BY-NC-SA 3.0 US ↗</a></span></div></div></footer></body></html>'''
    for asset in (PUBLIC/'assets').rglob('*'):
        if asset.is_file() and asset.suffix in ['.css', '.js', '.svg']:
            relative = asset.relative_to(PUBLIC).as_posix()
            version = hashlib.sha256(asset.read_bytes()).hexdigest()[:10]
            html = html.replace(f'"{relative}"', f'"{relative}?v={version}"')
    (PUBLIC/file).write_text(html,encoding='utf-8')

def heading(kicker,title,description):
    return f'<div class="page-heading">'+(f'<div class="eyebrow">{kicker}</div>' if kicker else '')+f'<h1>{title}</h1><p>{description}</p></div>'

def notice(tool):
    return f'<div class="notice">{icon("info")}<p><strong>{tool} update planned.</strong> The updated source is available. This application remains deferred while the HPLC Simulator is modernized.</p></div>'

def download(path,label,meta):
    return f'<li><a href="downloads/{quote(path)}" download><span>{label}</span><small>{meta} ↓</small></a></li>'

PUBLIC.mkdir(exist_ok=True)
(PUBLIC/'assets').mkdir(exist_ok=True)
(PUBLIC/'downloads').mkdir(exist_ok=True)
(PUBLIC/'assets/favicon.svg').write_text(LOGO.replace('aria-hidden="true"','xmlns="http://www.w3.org/2000/svg"'),encoding='utf-8')
# Teaching documents, examples, and historical archives are versioned in public/downloads.

home=f'''<section class="hero"><div><h1>HPLC simulation<br>and teaching resources</h1><p class="intro">Browser-based tools for studying high-performance liquid chromatography. Calculate chromatograms, draw flow paths, and examine how operating conditions affect a separation.</p><div class="actions">{button('Open HPLC Simulator','simulator.html')}{button('Educational resources','resources.html',True)}</div></div>
<figure class="hero-figure simulator-preview"><a class="preview-image-link" href="simulator.html" aria-label="Open the HPLC Simulator"><img src="assets/simulator-preview.svg" width="1000" height="460" alt="HPLC Simulator gradient-elution chromatogram with numbered peaks, a red selected-compound trace, and increasing solvent B on the right axis." fetchpriority="high"></a></figure></section>
<section class="section"><div class="section-top"><div><h2>Applications</h2></div><p>Both applications run in the browser without Java.</p></div><div class="tool-grid">
<article class="tool-card"><div class="tool-art">{chart(True)}</div><div class="tool-copy"><div class="tag">Chromatographic separations</div><h3>HPLC Simulator</h3><p>Calculate chromatograms for isocratic and gradient runs. Adjust mobile-phase composition, flow rate, column properties, and sample composition to compare retention times, peak widths, and resolution.</p><a class="text-link" href="simulator.html">Open HPLC Simulator <span class="arrow" aria-hidden="true">↗</span></a></div></article>
<article class="tool-card"><div class="tool-art sand">{fluid()}</div><div class="tool-copy"><div class="tag">System plumbing</div><h3>HPLC Fluid Visualizer</h3><p>Draw flow paths using pumps, valves, tubing, columns, and detectors. Calculate system backpressure, band broadening, and gradient delay for the connected components.</p><a class="text-link" href="fluid-visualizer.html">Open HPLC Fluid Visualizer <span class="arrow" aria-hidden="true">↗</span></a></div></article></div></section>
<section class="learning-band"><div class="book-icon">{icon('book',45)}</div><div><h2>Educational resources</h2><p>Download contributed problem sets, simulator exercises, instructor notes, and a companion spreadsheet.</p></div>{button('View resources','resources.html',True)}</section>'''
page('index.html','Home','Free HPLC simulation and education resources for students, educators, and scientists.',home)

sim=(ROOT/'simulator/workspace.html').read_text(encoding='utf-8')
page('simulator.html','HPLC Simulator','Interactive browser-based HPLC simulator: explore retention, efficiency, gradients, and backpressure.',sim)

examples=[('6-port valve.lc','Six-port injection valve','A simple six-port valve configuration.'),('6-column selector.lc','Six-column selector','Explore a system with six selectable columns.'),('sample enrichment.lc','Sample enrichment','Load and concentrate a sample before separation.'),('sample stripping.lc','Sample stripping','Separate sample loading and pre-column flushing.'),('regeneration.lc','Column regeneration','Alternate columns between separation and flushing.'),('2DLC.lc','Two-dimensional LC','A two-dimensional setup with a 10-port, 2-position valve.')]
example_html=''.join(f'<article class="resource-card"><div class="tag">Example configuration / LC file</div><h2>{label}</h2><p>{desc}</p><a href="downloads/{quote(name)}" download class="text-link">Download example <span aria-hidden="true">↓</span></a></article>' for name,label,desc in examples)
vis=(ROOT/'fluid/workspace.html').read_text(encoding='utf-8')
page('fluid-visualizer.html','HPLC Fluid Visualizer','Build HPLC flow paths and explore backpressure, dispersion, and gradient delay in your browser.',vis)

resources=[
 ('Instrumental Analysis Problem Set - Stoll.doc','Instrumental analysis problem set','Dwight Stoll','Gustavus Adolphus College','Problems for a senior-level undergraduate instrumental analysis course.','problems','DOC'),
 ('HPLC Simulator Exercise - Vitha.doc','A guided HPLC simulator exercise','Mark Vitha','Drake University','An undergraduate instrumental analysis exercise for exploring the simulator.','problems','DOC'),
 ('HPLC Simulator Problem Set - Nagel.doc','HPLC simulator problem set','Megan Nagel','Bethel University','Chromatography problems for an undergraduate instrumental analysis course.','problems','DOC'),
 ('Analytical Chemistry Problem Set - Mabbott.doc','Analytical chemistry problem set','Gary Mabbott','University of St. Thomas','A two-part problem set for an undergraduate analytical chemistry course.','problems','DOC'),
 ('Window Analysis Results - Mabbott.xlsx','Window analysis results','Gary Mabbott','University of St. Thomas','A companion spreadsheet containing the results of a window analysis exercise.','data','XLSX'),
 ('Instructor Notes on Window Analysis - Mabbott.docx','Instructor notes on window analysis','Gary Mabbott','University of St. Thomas','Teaching notes to accompany the analytical chemistry problem set and spreadsheet.','notes','DOCX')]
cards=''
for name,title,author,school,desc,category,kind in resources:
    label={'problems':'Problem set & exercise','data':'Companion spreadsheet','notes':'Instructor notes'}[category]
    size=round((PUBLIC/'downloads'/name).stat().st_size/1024)
    cards+=f'<article class="resource-card" data-category="{category}"><div class="tag">{label} / {kind}</div><h2>{title}</h2><p>{desc}</p><span class="resource-meta">{author} · {school}</span><a class="text-link" href="downloads/{quote(name)}" download><span>Download {kind} <small>· {size} KB</small></span><span aria-hidden="true">↓</span></a></article>'
res=heading('','Educational resources','Problem sets, simulator exercises, and teaching materials contributed by chromatography educators.')+f'''<div class="resource-tools"><div class="filters" role="group" aria-label="Filter resources"><button class="filter" data-filter="all" aria-pressed="true">All resources</button><button class="filter" data-filter="problems" aria-pressed="false">Exercises</button><button class="filter" data-filter="notes" aria-pressed="false">Instructor notes</button><button class="filter" data-filter="data" aria-pressed="false">Data</button></div><label><span class="sr-only">Search resources</span><input class="search" id="resource-search" type="search" placeholder="Search topics or contributors…"></label></div><p class="resource-count" id="resource-count" role="status" aria-live="polite">6 resources</p><div class="resource-grid">{cards}<p id="no-results" class="empty" hidden>No resources match. Try another search or select “All resources.”</p></div><div class="support">These are the original contributed teaching materials. Some exercises refer to legacy application controls. Contributor affiliations reflect the original collection.</div><section class="section"><h2>Contributing teaching materials</h2><p>To submit an exercise or other teaching material for this collection, contact the project team.</p><a class="text-link" href="contact.html">Contact <span aria-hidden="true">↗</span></a></section>'''
page('resources.html','Educational Resources','Download free HPLC problem sets, simulator exercises, instructor notes, and window analysis data.',res)

dev=heading('','Development','Source code, historical archives, and information for contributors.')+'''
<div class="split"><section class="panel"><h2>HPLC Simulator</h2><p>Current JavaScript application, standalone page, build instructions, and calculation tests.</p><a class="text-link" href="https://github.com/pgboswell/hplc-simulator">View HPLC Simulator on GitHub <span aria-hidden="true">↗</span></a></section><section class="panel"><h2>HPLC Fluid Visualizer</h2><p>Current JavaScript application, example layouts, standalone page, and calculation tests.</p><a class="text-link" href="https://github.com/pgboswell/hplc-fluid-visualizer">View HPLC Fluid Visualizer on GitHub <span aria-hidden="true">↗</span></a></section></div><h2 class="subheading">Historical Java archives</h2><div class="notice">'''+icon('info')+'''<p><strong>Archived source code.</strong> The downloads below contain older Java versions of the applications. They do not contain the current browser application source.</p></div>'''+f'''<div class="split"><section class="panel"><div class="tag">Source archive / Java</div><h2 style="margin-top:15px">HPLC Simulator</h2><p>Version 1.1.3 · Eclipse project</p><p>The original Java application and its chromatography models, retained as a historical source archive.</p><ul class="download-list">{download('HPLC Simulator src 1.1.3.zip','HPLC Simulator source · 1.1.3','ZIP · 16 MB')}</ul></section><section class="panel"><div class="tag">Source archive / Java</div><h2 style="margin-top:15px">HPLC Fluid Visualizer</h2><p>Version 1.0 · Eclipse project</p><p>The Java project for drawing HPLC flow paths and calculating system properties.</p><ul class="download-list">{download('HPLC Fluid Visualizer src 1.0.zip','Fluid Visualizer source · 1.0','ZIP · 1.9 MB')}</ul></section></div>

<div class="content-bottom"><details class="details"><summary>About the historical build environment</summary><p>The original projects were distributed for Eclipse and Java 6. The Simulator used JOGL, JavaHelp, and SwingX; the Fluid Visualizer used SwingX. These details describe the archived applications, not the requirements for this redesigned website.</p></details><details class="details"><summary>License and attribution</summary><p>The original software was distributed under the <a href="https://creativecommons.org/licenses/by-nc-sa/3.0/us/">Creative Commons Attribution–NonCommercial–ShareAlike 3.0 United States license</a>. Preserve the original attribution and license terms when using the archives.</p></details><details class="details"><summary>Contributing to the project</summary><p><a href="contact.html">Contact the project team</a> to report a bug, submit a teaching resource, or discuss a proposed change.</p></details></div>'''
page('development.html','Development','Historical HPLC Simulator and Fluid Visualizer source archives, project status, and contribution information.',dev)

about=heading('','About the project','HPLC Simulator and HPLC Fluid Visualizer are educational tools for studying liquid chromatography.')+f'''<div><section class="panel" style="background:var(--mint)"><h2>Purpose and scope</h2><p>The applications model relationships between HPLC operating conditions, separation performance, and system plumbing.</p><p>The models are intended for teaching and study. Calculated retention times are not intended as accurate predictions for experimental samples.</p><a class="text-link" href="resources.html">View educational resources <span aria-hidden="true">↗</span></a></section></div>
<section aria-labelledby="publication-title"><h2 id="publication-title" class="subheading">Publication</h2><div class="panel"><p><a href="https://pubs.acs.org/doi/10.1021/ed300117b">An Advanced, Interactive, High-Performance Liquid Chromatography Simulator and Instructor Resources</a></p><p>Paul G. Boswell, Dwight R. Stoll, Peter W. Carr, Megan L. Nagel, Mark F. Vitha, and Gary A. Mabbott.<br><cite>Journal of Chemical Education</cite>, 2013, <strong>90</strong> (2), 198–202.<br>DOI: 10.1021/ed300117b</p></div></section>
<h2 class="subheading">Contributors</h2><div class="people"><div class="person"><h3>Paul Boswell</h3><p>HPLC Simulator and HPLC Fluid Visualizer</p><p>Originally at the University of Minnesota; now at Upper Story LLC.</p></div><div class="person"><h3>Peter Carr</h3><p>Contributed the original Excel spreadsheet</p><p>University of Minnesota</p></div><div class="person"><h3>Dwight Stoll</h3><p>Provided educational materials, feedback, and suggestions.</p><p>Gustavus Adolphus College</p></div><div class="person"><h3>Megan Nagel</h3><p>Provided educational materials.</p><p>Penn State Greater Allegheny</p></div><div class="person"><h3>Mark Vitha</h3><p>Provided educational materials.</p><p>Drake University</p></div><div class="person"><h3>Gary Mabbott</h3><p>Provided educational materials.</p><p>University of St. Thomas</p></div></div><section class="funding" aria-labelledby="funding-title"><h2 id="funding-title" class="subheading">Funding</h2><div class="funding-grid"><article class="funding-card"><a class="funding-logo" href="https://www.upperstory.com/"><img src="assets/funding/upper-story.svg" alt="Upper Story" width="190" height="83" loading="lazy"></a><h3>Upper Story LLC</h3><p>Project support</p></article><article class="funding-card"><a class="funding-logo" href="https://www.nih.gov/"><img src="assets/funding/nih.jpg" alt="National Institutes of Health" width="83" height="83" loading="lazy"></a><h3>National Institutes of Health</h3><p>Original funding: R01GM098290</p></article><article class="funding-card"><a class="funding-logo" href="https://www.nsf.gov/"><img src="assets/funding/nsf.jpg" alt="National Science Foundation" width="83" height="83" loading="lazy"></a><h3>National Science Foundation</h3><p>Original funding: IOS-0923960 and MCB-0725149</p></article></div></section><section class="section"><h2>Contact</h2><p>Contact the project team with questions, bug reports, or proposed contributions.</p>{button('Contact the team','contact.html',True)}</section>'''
page('about.html','About','Project history, contributors, and scope of HPLC Simulator and HPLC Fluid Visualizer.',about)

contact=heading('','Contact','Send a question, bug report, or message about teaching materials.')+'''<div class="split"><section class="panel"><h2>Send a message</h2><form id="contact-form" method="post" action="api/contact"><label for="contact-name">Name</label><input id="contact-name" name="name" autocomplete="name" maxlength="120" required><label for="contact-email">Your email address</label><input id="contact-email" name="email" type="email" autocomplete="email" maxlength="254" required><label for="contact-subject">Subject</label><input id="contact-subject" name="subject" maxlength="160" required><label for="contact-message">Message</label><textarea id="contact-message" name="message" rows="8" maxlength="10000" required></textarea><div class="contact-trap" aria-hidden="true"><label for="contact-website">Leave this field empty</label><input id="contact-website" name="website" tabindex="-1" autocomplete="off"></div><p class="contact-note">Your email address will be used to reply to your message.</p><div id="contact-challenge"></div><button class="button" type="submit" disabled>Send message</button><p id="contact-status" role="status" aria-live="polite">Loading contact form…</p><noscript><p>Please enable JavaScript to use this form.</p></noscript></form></section><section class="panel"><h2>Reporting a problem</h2><p>Include the page or application you were using, what you expected to happen, and what happened instead. Include your browser and operating system.</p><p>For a teaching resource or proposed collaboration, include a short description of the course or project.</p><a class="text-link" href="resources.html">View educational resources <span aria-hidden="true">↗</span></a></section></div>'''
page('contact.html','Contact','Contact the HPLC Simulator project team with questions, feedback, or educational contributions.',contact)
print(f'Built {len(NAV)} pages in {PUBLIC}')
