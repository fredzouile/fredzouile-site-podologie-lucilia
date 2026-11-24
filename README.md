# Site vitrine — Lucilia Afonso, pédicure-podologue à Paris 16e

Site statique, léger et sans dépendance : HTML, CSS et un peu de JavaScript, hébergeable partout.

**État : étape 1 livrée** (structure, plan SEO et page d'accueil). Les pages intérieures
arrivent à l'étape 2, après validation de la maquette.

- Structure, titles, meta descriptions, plan des pages : [`docs/01-structure-et-seo.md`](docs/01-structure-et-seo.md)

## Compléter les informations du cabinet

Tout se trouve dans **`site.config.json`** : téléphone, adresse, lien Doctolib, horaires, accès,
RPPS, etc. Chaque valeur contenant `À COMPLÉTER` apparaît surlignée en jaune sur le site et est
listée à chaque génération.

Format des horaires (un jour absent = fermé) :

```json
"horaires": [
  { "jour": "Mo", "creneaux": [["09:00", "12:30"], ["14:00", "19:00"]] },
  { "jour": "Sa", "creneaux": [["09:00", "13:00"]] }
]
```

Jours : `Mo` lundi, `Tu` mardi, `We` mercredi, `Th` jeudi, `Fr` vendredi, `Sa` samedi, `Su` dimanche.

## Commandes

Il suffit d'avoir Node.js 18 ou plus récent ; il n'y a rien à installer.

| Commande | Effet |
|---|---|
| `npm run dev` | génère le site et l'affiche sur http://localhost:8080 |
| `npm run build` | génère le site dans `dist/` |
| `npm run apercu` | crée en plus `dist/apercu-accueil.html`, un fichier unique à envoyer pour validation |
| `npm run build:prod` | génération finale : échoue s'il reste une information à compléter ou à confirmer |

Tant que `siteUrl` contient le domaine provisoire (`.example`), les pages sont en `noindex` et
le `robots.txt` bloque l'indexation. C'est voulu, pour qu'aucun aperçu ne soit référencé par erreur.

## Organisation

```
site.config.json     informations du cabinet (seul fichier à modifier au quotidien)
build.mjs            générateur (gabarits, sitemap, robots.txt, JSON-LD, contrôles SEO)
src/pages/           une page = un fichier HTML avec un en-tête JSON (title, description…)
src/partials/        en-tête, pied de page, barre de RDV mobile, bandeau cookies, icônes
src/assets/          css, js, polices, images
src/static/          favicon, image de partage, icône d'écran d'accueil
docs/                documents de travail (structure, SEO, Google Business Profile…)
netlify.toml         configuration d'hébergement et en-têtes de sécurité
```

## Mise en ligne (résumé)

Les instructions détaillées seront livrées à l'étape 2.

- **Netlify** (par défaut) : relier ce dépôt GitHub. `netlify.toml` est déjà prêt (commande
  `node build.mjs`, dossier `dist`).
- **Autre hébergeur (OVH, o2switch…)** : lancer `npm run build:prod`, puis déposer le contenu de
  `dist/` à la racine du site par FTP.

## Crédits et licences

- Polices Cormorant Garamond, Source Sans 3 et Ephesis : SIL Open Font License 1.1 (textes de
  licence dans `src/assets/fonts/`).
- Icônes d'interface : [Lucide](https://lucide.dev), licence ISC. Logo et pictogrammes
  (semelle, ongle, pied, chaussure) dessinés pour ce site.
- Portrait : **provisoire**, recadré depuis le visuel fourni. À remplacer par la photo HD.
