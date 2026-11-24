#!/usr/bin/env node
/**
 * Générateur du site — aucune dépendance, Node 18+.
 *
 *   node build.mjs            → génère dist/ (mode aperçu : « À COMPLÉTER » surligné)
 *   node build.mjs --prod     → échoue s'il reste une information à compléter
 *   node build.mjs --serve    → génère puis sert dist/ sur http://localhost:8080
 *   node build.mjs --apercu   → crée aussi dist/apercu-site.html, tout le site en un seul fichier (styles, polices,
 *                               images et pages intégrés), navigable, à ouvrir sur un téléphone ou à envoyer
 *
 * Sources :
 *   site.config.json   informations du cabinet (une seule source de vérité)
 *   src/partials/      morceaux communs (en-tête, pied de page…)
 *   src/pages/         une page = un fichier, avec un en-tête JSON entre deux lignes « --- »
 *   src/assets/        CSS, JS, polices, images  → dist/assets/
 *   src/static/        fichiers copiés à la racine (favicon, image de partage…)
 *
 * Syntaxe des gabarits :
 *   {{ chemin.vers.valeur }}    texte échappé
 *   {{@ chemin }}               valeur d'attribut échappée
 *   {{{ chemin }}}              HTML brut (blocs calculés)
 *   {{> nom }}                  inclut src/partials/nom.html (ou .svg)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const args = new Set(process.argv.slice(2));
const PROD = args.has('--prod');
const TODO = 'À COMPLÉTER';

const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
if (process.env.SITE_URL) site.siteUrl = process.env.SITE_URL; // ex. SITE_URL=https://www.mon-domaine.fr node build.mjs
const placeholderDomain = /\.example\/?$/.test(site.siteUrl);
const baseUrl = site.siteUrl.replace(/\/$/, '');

/* ---------- utilitaires ---------- */
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const get = (obj, p) => p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const hash = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);
const isTodo = (v) => typeof v === 'string' && v.includes(TODO);
const icon = (id, cls = 'icon') => `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#i-${id}"/></svg>`;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}
function copyDir(from, to) {
  for (const file of walk(from)) {
    const dest = path.join(to, path.relative(from, file));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
  }
}

/* ---------- moteur de gabarits ---------- */
const partials = Object.fromEntries(
  walk(path.join(SRC, 'partials')).map((f) => [path.basename(f).replace(/\.(html|svg)$/, ''), fs.readFileSync(f, 'utf8')])
);

function render(tpl, ctx, depth = 0) {
  if (depth > 10) throw new Error('Inclusions trop profondes');
  return tpl
    .replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => {
      if (!(name in partials)) throw new Error(`Gabarit introuvable : ${name}`);
      return render(partials[name], ctx, depth + 1);
    })
    .replace(/\{\{\{\s*([\w.-]+)\s*\}\}\}/g, (_, p) => {
      const v = get(ctx, p);
      if (v === undefined) throw new Error(`Valeur inconnue : {{{ ${p} }}}`);
      return v;
    })
    .replace(/\{\{(@?)\s*([\w.-]+)\s*\}\}/g, (_, attr, p) => {
      const v = get(ctx, p);
      if (v === undefined) throw new Error(`Valeur inconnue : {{ ${p} }}`);
      return esc(v);
    });
}

/* Surligne les « [À COMPLÉTER …] » visibles (hors balises, scripts et styles). */
function markTodos(html) {
  let inRaw = false;
  return html.split(/(<[^>]+>)/).map((part) => {
    if (part.startsWith('<')) {
      if (/^<(script|style)\b/i.test(part)) inRaw = true;
      if (/^<\/(script|style)>/i.test(part)) inRaw = false;
      return part;
    }
    if (inRaw) return part;
    return part.replace(/\[À COMPLÉTER[^\]]*\]/g, (m) => `<mark class="todo">${m}</mark>`);
  }).join('');
}

/* ---------- blocs calculés à partir de la configuration ---------- */
const NAV = [
  { label: 'Le cabinet', url: '/le-cabinet/' },
  { label: 'Prestations', url: '/prestations/' },
  { label: 'Semelles orthopédiques', court: 'Semelles', url: '/semelles-orthopediques/' },
  { label: 'Tarifs', url: '/tarifs-remboursements/' },
  { label: 'FAQ', url: '/faq/' },
  { label: 'Contact', url: '/contact-acces/' },
];

function navHtml(current, court = false) {
  return NAV.map((n) => {
    const active = current === n.url || (n.url !== '/' && current.startsWith(n.url));
    return `<li><a href="${n.url}"${active ? ' aria-current="page"' : ''}>${esc(court && n.court ? n.court : n.label)}</a></li>`;
  }).join('');
}

function servicesGrid() {
  return site.prestations.map((s) => `
        <li class="service">
          <span class="service__icon">${icon(s.icone)}</span>
          <div class="service__body">
            <h3 class="service__title"><a href="${esc(s.url)}">${esc(s.titre)}</a></h3>
            <p class="service__text">${esc(s.resume)}</p>
          </div>
          ${icon('arrow', 'icon service__arrow')}
        </li>`).join('');
}

const JOURS = { Mo: 'Lundi', Tu: 'Mardi', We: 'Mercredi', Th: 'Jeudi', Fr: 'Vendredi', Sa: 'Samedi', Su: 'Dimanche' };
const SCHEMA_JOURS = { Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday' };
/* horaires : [{ "jour": "Mo", "creneaux": [["09:00","12:30"],["14:00","19:00"]] }, …] — jour absent = fermé */
function hoursTable() {
  if (!site.horaires.length) return `<p class="hours__empty">${esc(site.horairesTexte)}</p>`;
  const rows = Object.entries(JOURS).map(([k, label]) => {
    const d = site.horaires.find((h) => h.jour === k);
    const val = d ? d.creneaux.map(([a, b]) => `${a.replace(':', ' h ')} – ${b.replace(':', ' h ')}`).join(', ') : 'Fermé';
    return `<tr><th scope="row">${label}</th><td>${esc(val)}</td></tr>`;
  }).join('');
  return `<table class="hours__table"><caption class="visually-hidden">Horaires d'ouverture du cabinet</caption><tbody>${rows}</tbody></table>`;
}

function metroList() {
  return site.acces.metro.map((m) => `${esc(m.station)} <span class="line-badge" aria-label="ligne ${esc(m.ligne)}">${esc(m.ligne)}</span>`).join(', ');
}

const adresseLigne = `${site.cabinet.rue}, ${site.cabinet.codePostal} ${site.cabinet.ville}`;
const mapsQuery = encodeURIComponent(`${site.cabinet.rue}, ${site.cabinet.codePostal} ${site.cabinet.ville}`);

function breadcrumb(page) {
  if (!page.breadcrumb) return '';
  const items = [{ name: 'Accueil', path: '/' }, ...page.breadcrumb];
  return `<nav class="breadcrumb" aria-label="Fil d'Ariane"><ol>${items.map((b, i) => (i === items.length - 1
    ? `<li><span aria-current="page">${esc(b.name)}</span></li>`
    : `<li><a href="${esc(b.path)}">${esc(b.name)}</a></li>`)).join('')}</ol></nav>`;
}

/* Autres prestations (maillage interne entre les pages de soins) */
function autresPrestations(currentId) {
  return site.prestations.filter((s) => s.id !== currentId).map((s) => `
            <li><a href="${esc(s.url)}"><span class="mini-icon">${icon(s.icone)}</span>${esc(s.titre)}</a></li>`).join('');
}

/* Tarifs : une ligne liée à une prestation retirée de la configuration disparaît aussi. */
function tarifsTable() {
  const ids = new Set(site.prestations.map((s) => s.id));
  const rows = site.tarifs.lignes.filter((l) => !l.prestation || ids.has(l.prestation)).map((l) => `
            <tr><th scope="row">${esc(l.acte)}${l.note ? `<span class="price-table__note">${esc(l.note)}</span>` : ''}</th><td>${esc(l.prix)}</td></tr>`).join('');
  return `<table class="price-table"><caption class="visually-hidden">Tarifs du cabinet</caption>
          <thead><tr><th scope="col">Acte</th><th scope="col">Tarif</th></tr></thead>
          <tbody>${rows}
          </tbody></table>`;
}

/* FAQ : une seule source (src/data/faq.json), affichée sur plusieurs pages ; balisage FAQPage sur /faq/ uniquement. */
const FAQ = JSON.parse(fs.readFileSync(path.join(SRC, 'data/faq.json'), 'utf8'));
function faqItems(key, ctx) {
  return FAQ.filter((f) => f.sur.includes(key)).map((f) => ({ ...f, a: render(f.a, ctx) }));
}
function faqHtml(items, withIds = false) {
  return items.map((f) => `
          <details class="faq__item"${withIds ? ` id="${esc(f.id)}"` : ''}>
            <summary>${esc(f.q)}</summary>
            <div class="faq__answer">${f.a}</div>
          </details>`).join('');
}
function faqComplete(ctx) {
  const items = faqItems('faq', ctx);
  const cats = [...new Set(items.map((f) => f.categorie))];
  return cats.map((c, i) => `
        <section class="faq-group" aria-labelledby="faq-cat-${i}">
          <h2 id="faq-cat-${i}">${esc(c)}</h2>
          <div class="faq">${faqHtml(items.filter((f) => f.categorie === c), true)}
          </div>
        </section>`).join('');
}
const stripTags = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/* ---------- données structurées (JSON-LD) ---------- */
function jsonLd(page) {
  const graph = [];
  const url = baseUrl + page.path;
  const cabinetId = `${baseUrl}/#cabinet`;
  const personId = `${baseUrl}/#praticienne`;
  const want = new Set(page.schema || []);

  if (want.has('cabinet')) {
    const c = site.cabinet;
    const biz = {
      '@type': ['MedicalBusiness', 'LocalBusiness'],
      '@id': cabinetId,
      name: `${site.praticienne.nom} – ${site.praticienne.titre}`,
      alternateName: c.nom,
      description: 'Cabinet de pédicurie-podologie à Paris 16e : bilan podologique, semelles orthopédiques sur mesure et soins de pédicurie.',
      url: `${baseUrl}/`,
      telephone: c.telephone,
      email: c.email,
      image: `${baseUrl}/assets/img/lucilia-afonso-podologue-paris-16-600.webp`,
      logo: `${baseUrl}/favicon.svg`,
      medicalSpecialty: 'Podiatric',
      address: {
        '@type': 'PostalAddress', streetAddress: c.rue, postalCode: c.codePostal,
        addressLocality: c.ville, addressRegion: c.region, addressCountry: c.pays,
      },
      hasMap: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
      areaServed: c.zone.map((z) => ({ '@type': 'Place', name: z })),
      availableService: site.prestations.map((s) => ({ '@type': 'MedicalProcedure', name: s.titre, url: baseUrl + s.url })),
      founder: { '@id': personId },
      potentialAction: { '@type': 'ReserveAction', target: c.doctolib, name: 'Prendre rendez-vous sur Doctolib' },
      sameAs: [c.doctolib, c.ficheGoogle].filter(Boolean),
    };
    if (site.horaires.length) {
      biz.openingHoursSpecification = site.horaires.flatMap((h) => h.creneaux.map(([o, cl]) => ({
        '@type': 'OpeningHoursSpecification', dayOfWeek: SCHEMA_JOURS[h.jour], opens: o, closes: cl,
      })));
    }
    graph.push(biz, {
      '@type': 'Person',
      '@id': personId,
      name: site.praticienne.nom,
      jobTitle: site.praticienne.titre,
      worksFor: { '@id': cabinetId },
      image: `${baseUrl}/assets/img/lucilia-afonso-podologue-paris-16-600.webp`,
      hasCredential: { '@type': 'EducationalOccupationalCredential', credentialCategory: site.praticienne.diplome },
    });
  }
  if (want.has('website')) {
    graph.push({ '@type': 'WebSite', '@id': `${baseUrl}/#website`, url: `${baseUrl}/`, name: site.nomSite, inLanguage: site.langue, publisher: { '@id': cabinetId } });
  }
  graph.push({
    '@type': 'WebPage', '@id': `${url}#webpage`, url, name: page.title, description: page.description,
    inLanguage: site.langue, isPartOf: { '@id': `${baseUrl}/#website` }, about: { '@id': cabinetId },
  });
  if (page.breadcrumb) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [{ name: 'Accueil', path: '/' }, ...page.breadcrumb].map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.name, item: baseUrl + b.path })),
    });
  }
  if (page.faqItems?.length) {
    // Une réponse encore « À COMPLÉTER » est exclue du balisage (elle reste visible sur la page).
    const ready = page.faqItems.filter((q) => !isTodo(q.a));
    graph.push({
      '@type': 'FAQPage',
      mainEntity: ready.map((q) => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: stripTags(q.a) } })),
    });
  }
  // Les valeurs « À COMPLÉTER » ne doivent jamais partir dans les données structurées.
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, (k, v) => (isTodo(v) ? undefined : v), 2);
  return `<script type="application/ld+json">\n${json.replace(/</g, '\\u003c')}\n</script>`;
}

/* ---------- construction ---------- */
function readPage(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!m) throw new Error(`En-tête JSON manquant : ${path.relative(ROOT, file)}`);
  return { meta: JSON.parse(m[1]), body: raw.slice(m[0].length), file };
}

function build() {
  const report = { pages: [], warnings: [], todos: [] };
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  copyDir(path.join(SRC, 'assets'), path.join(DIST, 'assets'));
  copyDir(path.join(SRC, 'static'), DIST);

  const assets = {
    css: `/assets/css/site.css?v=${hash(fs.readFileSync(path.join(SRC, 'assets/css/site.css')))}`,
    js: `/assets/js/site.js?v=${hash(fs.readFileSync(path.join(SRC, 'assets/js/site.js')))}`,
  };

  const pages = walk(path.join(SRC, 'pages')).filter((f) => f.endsWith('.html')).map(readPage);
  const titles = new Map();
  const descs = new Map();

  for (const { meta, body, file } of pages) {
    const page = { ...meta };
    const prestation = page.prestation ? site.prestations.find((s) => s.id === page.prestation) : null;
    if (page.prestation && !prestation) {
      report.warnings.push(`${path.relative(ROOT, file)} ignorée : la prestation « ${page.prestation} » n'est plus dans site.config.json`);
      continue;
    }
    page.canonical = baseUrl + page.path;
    page.noindex = page.noindex || placeholderDomain;
    const ctx = { site, page, assets, prestation };
    if (page.faqSchema) page.faqItems = faqItems('faq', ctx);
    ctx.blocks = {
        robots: page.noindex ? '<meta name="robots" content="noindex, follow">' : '',
        canonical: page.path.endsWith('.html') ? '' : `<link rel="canonical" href="${esc(page.canonical)}">`,
        jsonld: jsonLd(page),
        breadcrumb: breadcrumb(page),
        autresPrestations: autresPrestations(page.prestation),
        tarifsTable: tarifsTable(),
        faqAccueil: faqHtml(faqItems('accueil', ctx)),
        faq: page.faq ? faqHtml(faqItems(page.faq, ctx)) : '',
        faqComplete: page.faqSchema ? faqComplete(ctx) : '',
        heroActions: page.cta === false ? '' : partials['hero-actions'],
        asideSoinsTitre: page.prestation ? 'Autres soins' : 'Les soins du cabinet',
        langues: site.praticienne.langues.join(', '),
        nav: navHtml(page.path),
        navCourt: navHtml(page.path, true),
        servicesGrid: servicesGrid(),
        hoursTable: hoursTable(),
        metroList: metroList(),
        year: String(new Date().getFullYear()),
        adresse: adresseLigne,
        mapsDirections: `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`,
        mapsEmbed: `https://maps.google.com/maps?q=${mapsQuery}&z=16&output=embed`,
        cookieDays: String(site.cookies.dureeConsentementJours),
        cookieBanner: site.cookies.bandeau ? partials['cookie-banner'] : '',
    };
    ctx.blocks.cookieBanner = render(ctx.blocks.cookieBanner, ctx);
    const content = render(body, ctx);
    let html = render(partials.layout, { ...ctx, blocks: { ...ctx.blocks, content } });
    html = markTodos(html);

    // contrôles SEO / accessibilité
    const rel = path.relative(ROOT, file);
    const h1 = (html.match(/<h1\b/g) || []).length;
    if (h1 !== 1) report.warnings.push(`${rel} : ${h1} balise(s) H1 (il en faut exactement une)`);
    if (page.title.length > 62) report.warnings.push(`${rel} : title de ${page.title.length} caractères (> 62)`);
    if (page.description.length > 160 || page.description.length < 110) report.warnings.push(`${rel} : meta description de ${page.description.length} caractères (idéal 110–160)`);
    if (!/podologue paris 16/i.test(page.title)) report.warnings.push(`${rel} : « podologue Paris 16 » absent du title`);
    for (const img of html.match(/<img\b[^>]*>/g) || []) if (!/\balt=/.test(img)) report.warnings.push(`${rel} : image sans attribut alt`);
    if (titles.has(page.title)) report.warnings.push(`${rel} : title identique à ${titles.get(page.title)}`);
    if (descs.has(page.description)) report.warnings.push(`${rel} : description identique à ${descs.get(page.description)}`);
    titles.set(page.title, rel); descs.set(page.description, rel);
    const todoCount = (html.match(/class="todo"/g) || []).length;
    const attrTodo = (html.match(/="[^"]*À COMPLÉTER[^"]*"/g) || []).length;
    if (todoCount || attrTodo) report.todos.push(`${page.path} : ${todoCount} élément(s) à compléter${attrTodo ? ` (+${attrTodo} dans des attributs)` : ''}`);

    const out = path.join(DIST, page.path, page.path.endsWith('.html') ? '' : 'index.html');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html);
    report.pages.push(page);
  }

  // liens internes cassés (pages et ancres)
  const htmlFiles = walk(DIST).filter((f) => f.endsWith('.html'));
  const idsOf = new Map(htmlFiles.map((f) => [f, new Set([...fs.readFileSync(f, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]));
  for (const f of htmlFiles) {
    const src = fs.readFileSync(f, 'utf8');
    for (const [, href] of src.matchAll(/\shref="((?:\/(?!\/)|#)[^"]*)"/g)) {
      const [p, frag] = href.split('#');
      let target = f;
      if (p) {
        const clean = p.split('?')[0];
        target = path.join(DIST, clean, clean.endsWith('/') ? 'index.html' : '');
        if (!fs.existsSync(target)) { report.warnings.push(`lien cassé dans ${path.relative(DIST, f)} : ${href}`); continue; }
      }
      if (frag && idsOf.has(target) && !idsOf.get(target).has(frag)) report.warnings.push(`ancre introuvable dans ${path.relative(DIST, f)} : ${href}`);
    }
  }

  // sitemap.xml et robots.txt
  const today = new Date().toISOString().slice(0, 10);
  const urls = report.pages.filter((p) => !p.noindex && !p.path.endsWith('.html'))
    .sort((a, b) => (b.priority ?? 0.5) - (a.priority ?? 0.5))
    .map((p) => `  <url><loc>${baseUrl}${p.path}</loc><lastmod>${today}</lastmod><priority>${(p.priority ?? 0.5).toFixed(1)}</priority></url>`);
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(DIST, 'robots.txt'), placeholderDomain
    ? '# Aperçu : indexation bloquée tant que le nom de domaine définitif n\'est pas renseigné\nUser-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`);

  // rapport
  report.warnings = [...new Set(report.warnings)];
  console.log(`\n✔ ${report.pages.length} page(s) générée(s) dans dist/`);
  if (placeholderDomain) report.warnings.unshift(`siteUrl provisoire (${site.siteUrl}) : pages en noindex, robots.txt bloquant`);
  if (report.warnings.length) console.log('\n⚠ Contrôles :\n  - ' + report.warnings.join('\n  - '));
  if (report.todos.length) console.log('\n✎ Informations à compléter :\n  - ' + report.todos.join('\n  - '));
  if (site.aConfirmer?.length) console.log('\n? À confirmer :\n  - ' + site.aConfirmer.join('\n  - '));
  if (PROD && (report.todos.length || placeholderDomain || site.aConfirmer?.length)) {
    console.error('\n✘ Mise en production refusée : complétez site.config.json (voir ci-dessus).');
    process.exit(1);
  }
}

build();

/* Aperçu autonome du site entier : un seul fichier HTML (styles, polices, images et toutes les pages
   intégrés), navigable sans serveur — à ouvrir sur un téléphone ou à envoyer pour validation. */
if (args.has('--apercu')) {
  const mime = { '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png' };
  const dataUri = (file) => `data:${mime[path.extname(file)]};base64,${fs.readFileSync(file).toString('base64')}`;
  const css = fs.readFileSync(path.join(DIST, 'assets/css/site.css'), 'utf8')
    .replace(/url\("\.\.\/(fonts|img)\/([^"]+)"\)/g, (_, dir, f) => `url("${dataUri(path.join(DIST, 'assets', dir, f))}")`);
  const js = fs.readFileSync(path.join(DIST, 'assets/js/site.js'), 'utf8');
  const spriteRe = /<!-- Icônes[^>]*-->\s*<svg[^>]*class="svg-sprite"[\s\S]*?<\/svg>/;
  const files = walk(DIST).filter((f) => /(^|\/)(index|404)\.html$/.test(path.relative(DIST, f)));
  let sprite = '';
  const templates = files.map((f) => {
    const rel = path.relative(DIST, f).split(path.sep).join('/');
    const route = rel === '404.html' ? '/404.html' : `/${rel.replace(/index\.html$/, '')}`;
    const src = fs.readFileSync(f, 'utf8');
    const title = (src.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    const bodyClass = (src.match(/<body class="([^"]*)"/) || [])[1] || '';
    let body = src.slice(src.indexOf('>', src.indexOf('<body')) + 1, src.lastIndexOf('</body>'));
    sprite = sprite || (body.match(spriteRe) || [''])[0];
    body = body.replace(spriteRe, '').replace(/\s+srcset="[^"]*"/g, '')
      .replace(/src="\/assets\/img\/([^"]+)"/g, (_, img) => `src="${dataUri(path.join(DIST, 'assets/img', img))}"`);
    return `<template data-path="${esc(route)}" data-title="${title}" data-class="${esc(bodyClass)}">${body}</template>`;
  });
  const router = `
(function () {
  var root = document.getElementById('apercu-root'), pages = {}, current = null;
  document.querySelectorAll('template[data-path]').forEach(function (t) { pages[t.getAttribute('data-path')] = t; });
  function show(route) {
    var parts = route.split('#'), p = parts[0] || '/', anchor = parts[1];
    if (!pages[p]) p = pages[p + '/'] ? p + '/' : '/404.html';
    if (p !== current) {
      var t = pages[p];
      root.replaceChildren(t.content.cloneNode(true));
      document.title = t.getAttribute('data-title');
      document.body.className = t.getAttribute('data-class');
      current = p;
      runSite();
    }
    var el = anchor && document.getElementById(anchor);
    if (el) el.scrollIntoView({ behavior: 'instant' }); else window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function hashRoute() { var h = decodeURIComponent(location.hash.slice(1)); return h.charAt(0) === '/' ? h : '/'; }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (href.charAt(0) === '#') {
      e.preventDefault();
      var el = document.getElementById(href.slice(1));
      if (el) { el.scrollIntoView(); if (el.tabIndex === -1) el.focus(); }
    } else if (href.charAt(0) === '/' && href.charAt(1) !== '/') {
      e.preventDefault();
      if (decodeURIComponent(location.hash.slice(1)) === href) show(href); else location.hash = href;
    }
  });
  window.addEventListener('hashchange', function () { show(hashRoute()); });
  show(hashRoute());
})();`;
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#FBF8F3">
<title>Aperçu – ${esc(site.nomSite)}</title>
<style>
${css}
</style>
</head>
<body>
${sprite}
<div id="apercu-root"></div>
${templates.join('\n')}
<script>
function runSite() {
${js}
}
${router}
</script>
</body>
</html>
`;
  fs.writeFileSync(path.join(DIST, 'apercu-site.html'), html);
  console.log(`\n→ Aperçu autonome du site (${templates.length} pages) : dist/apercu-site.html (${Math.round(html.length / 1024)} Ko)`);
}

if (args.has('--serve')) {
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json' };
  http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = path.join(DIST, p);
    if (!f.startsWith(DIST)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) { res.writeHead(404, { 'content-type': types['.html'] }); res.end(fs.existsSync(path.join(DIST, '404.html')) ? fs.readFileSync(path.join(DIST, '404.html')) : 'Page non trouvée'); return; }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  }).listen(8080, () => console.log('\n→ Aperçu : http://localhost:8080'));
}
