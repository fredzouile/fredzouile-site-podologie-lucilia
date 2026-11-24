# Site vitrine — Lucilia Afonso, pédicure-podologue à Paris 16e

Site statique, léger et sans dépendance : HTML, CSS et un peu de JavaScript, hébergeable partout.

**État : site complet (17 pages), en attente des informations à compléter** avant mise en ligne.

| Document | Contenu |
|---|---|
| [`docs/01-structure-et-seo.md`](docs/01-structure-et-seo.md) | arborescence, titles, meta descriptions, H1, données structurées |
| [`docs/02-google-business-profile.md`](docs/02-google-business-profile.md) | fiche Google prête à copier (description, catégories, services, règles pour les avis) |
| [`docs/03-mise-en-ligne.md`](docs/03-mise-en-ligne.md) | mise en ligne pas à pas (Netlify ou FTP), Search Console, mises à jour |

Pages : accueil, le cabinet, prestations (+ 7 pages de soins), semelles orthopédiques, tarifs et
remboursements, FAQ, contact et accès, mentions légales, confidentialité et cookies, page 404.

## Compléter les informations du cabinet

Tout se trouve dans **`site.config.json`** : téléphone, adresse, lien Doctolib, horaires, accès,
RPPS, tarifs, moyens de paiement, liste des prestations, hébergeur, etc. Chaque valeur contenant `À COMPLÉTER` apparaît surlignée en jaune sur le site et est
listée à chaque génération.

Format des horaires (un jour absent = fermé) :

```json
"horaires": [
  { "jour": "Mo", "creneaux": [["09:00", "12:30"], ["14:00", "19:00"]] },
  { "jour": "Sa", "creneaux": [["09:00", "13:00"]] }
]
```

Jours : `Mo` lundi, `Tu` mardi, `We` mercredi, `Th` jeudi, `Fr` vendredi, `Sa` samedi, `Su` dimanche.

Pour **retirer un soin** que le cabinet ne pratique pas, supprimez-le de la liste `prestations` :
sa page, sa carte, sa ligne de tarif et ses liens automatiques disparaissent ; le générateur
signale les éventuels liens écrits à la main à retoucher.

La **FAQ** est rédigée une seule fois dans `src/data/faq.json` et réutilisée sur l'accueil, la
page FAQ et les pages de soins (champ `sur`). Le balisage FAQPage pour Google n'est posé que sur
la page FAQ, et seulement pour les réponses complètes.

## Commandes

Il suffit d'avoir Node.js 18 ou plus récent ; il n'y a rien à installer.

| Commande | Effet |
|---|---|
| `npm run dev` | génère le site et l'affiche sur http://localhost:8080 |
| `npm run build` | génère le site dans `dist/` |
| `npm run apercu` | crée en plus `dist/apercu-site.html` : tout le site en un seul fichier navigable, à ouvrir sur un téléphone ou à envoyer pour validation |
| `npm run build:prod` | génération finale : échoue s'il reste une information à compléter ou à confirmer |

Tant que `siteUrl` contient le domaine provisoire (`.example`), les pages sont en `noindex` et
le `robots.txt` bloque l'indexation. C'est voulu, pour qu'aucun aperçu ne soit référencé par erreur.

## Organisation

```
site.config.json     informations du cabinet (seul fichier à modifier au quotidien)
build.mjs            générateur (gabarits, sitemap, robots.txt, JSON-LD, contrôles SEO)
src/pages/           une page = un fichier HTML avec un en-tête JSON (title, description, H1…)
src/partials/        en-tête, pied de page, barre de RDV mobile, bandeau cookies, icônes…
src/data/faq.json    questions fréquentes (source unique)
src/assets/          css, js, polices, images
src/static/          favicon, image de partage, icône d'écran d'accueil, .htaccess (Apache)
docs/                documents de travail (structure, SEO, Google Business Profile…)
netlify.toml         configuration d'hébergement et en-têtes de sécurité
```

## Mise en ligne (résumé)

Instructions détaillées : [`docs/03-mise-en-ligne.md`](docs/03-mise-en-ligne.md).

- **Netlify** (par défaut) : relier ce dépôt GitHub. `netlify.toml` est déjà prêt (commande
  `node build.mjs`, dossier `dist`).
- **Autre hébergeur (OVH, o2switch…)** : lancer `npm run build:prod`, puis déposer le contenu de
  `dist/` (y compris `.htaccess`) à la racine du site par FTP.

## Crédits et licences

- Polices Cormorant Garamond, Source Sans 3 et Ephesis : SIL Open Font License 1.1 (textes de
  licence dans `src/assets/fonts/`).
- Icônes d'interface : [Lucide](https://lucide.dev), licence ISC. Logo et pictogrammes
  (semelle, ongle, pied, chaussure) dessinés pour ce site.
- Portrait : **provisoire**, recadré depuis le visuel fourni. À remplacer par la photo HD.
