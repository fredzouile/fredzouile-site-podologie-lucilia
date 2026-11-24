# Mise en ligne du site

Le site est un ensemble de fichiers statiques : n'importe quel hébergeur convient. Deux options
sont décrites ci-dessous, Netlify (par défaut, gratuit) et un hébergeur classique avec FTP.

---

## Étape 0 — Avant la mise en ligne

1. **Compléter `site.config.json`.** Lancez `npm run build` : la liste de tout ce qui manque
   s'affiche, page par page. Les principaux points :
   - lien Doctolib, horaires, accès (bus, stationnement, accessibilité) ;
   - numéros RPPS et Ordre, SIRET, forme d'exercice ;
   - tarifs et moyens de paiement (**obligatoires sur le site** d'un pédicure-podologue) ;
   - durées des soins, délai et technique des semelles ;
   - téléphone de l'hébergeur (et adresse à vérifier sur netlify.com).
2. **Retirer les soins non pratiqués.** Supprimez la prestation de la liste `prestations` dans
   `site.config.json` : sa page, sa carte, sa ligne de tarif et ses liens automatiques
   disparaissent. Le générateur signale ensuite les phrases à retoucher à la main (« lien cassé »).
3. **Compléter les textes surlignés** dans les pages (`src/pages/…`), par exemple le parcours de
   la praticienne.
4. **Remplacer les images provisoires** dans `src/assets/img/` :
   - portrait : deux fichiers WebP portant les mêmes noms, de 420 px et 600 px de large au format
     3:4 (conversion gratuite avec squoosh.app) ;
   - photos du cabinet : remplacer les emplacements « photo à venir » de la page Le cabinet.
5. **Vider la liste `aConfirmer`** une fois chaque point vérifié.
6. Lancez **`npm run build:prod`** : la commande échoue tant qu'il reste quelque chose à compléter.

## Étape 1 — Le nom de domaine

- Réservez un domaine en `.fr` (environ 10 € par an chez OVH, Gandi, Ionos…), par exemple sur le
  modèle *prénom-nom-podologue.fr*. Vérifiez sa disponibilité.
- Indiquez-le dans `site.config.json` → `"siteUrl": "https://www.votre-domaine.fr"`.
  Tant que l'adresse provisoire en `.example` est en place, le site reste volontairement invisible
  des moteurs de recherche.

## Étape 2a — Hébergement sur Netlify (par défaut)

1. Créez un compte sur netlify.com, puis *Add new site → Import an existing project → GitHub* et
   choisissez ce dépôt et la branche principale.
2. Les réglages sont lus dans `netlify.toml` (commande `node build.mjs`, dossier `dist`) : rien à
   saisir.
3. Une fois les informations complétées, remplacez dans `netlify.toml` la commande par
   `node build.mjs --prod`. Ainsi, une version incomplète ne sera jamais publiée.
4. **Domaine** : *Domain management → Add a domain*, puis suivez les indications de Netlify chez
   votre registraire (enregistrements DNS ou serveurs de noms). Le HTTPS est activé
   automatiquement.
5. Chaque modification poussée sur GitHub redéploie le site en une minute.

Astuce : dès l'import, Netlify fournit une adresse d'aperçu en `….netlify.app`, idéale pour faire
valider le site sur téléphone. Tant que le domaine est provisoire, cet aperçu n'est pas indexé.

> Netlify est une société américaine. Si vous préférez un hébergement en France (o2switch, OVH…),
> utilisez l'option 2b et mettez à jour le bloc `hebergeur` de `site.config.json` : il alimente les
> mentions légales et la politique de confidentialité.

## Étape 2b — Hébergeur classique (OVH, o2switch…) par FTP

1. Sur votre ordinateur, avec Node.js 18 ou plus récent : `npm run build:prod`.
2. Avec un logiciel FTP (FileZilla), envoyez **le contenu** du dossier `dist/` (et non le dossier
   lui-même) à la racine web (`www/` ou `public_html/`), **y compris le fichier caché
   `.htaccess`**. Il force le HTTPS, active la page 404, le cache et les en-têtes de sécurité.
3. Activez le certificat HTTPS gratuit (Let's Encrypt) dans l'espace client de l'hébergeur.

## Étape 3 — Après la mise en ligne

- [ ] **Informer le conseil régional de l'Ordre** de la mise en ligne du site (obligation
      déontologique).
- [ ] **Google Search Console** (search.google.com/search-console) : ajoutez le domaine, validez-le
      par DNS, puis envoyez `https://www.votre-domaine.fr/sitemap.xml`.
- [ ] Testez l'accueil et la FAQ avec l'outil de test des résultats enrichis
      (search.google.com/test/rich-results), et la vitesse avec PageSpeed Insights.
- [ ] **Fiche Google Business Profile** : suivez `docs/02-google-business-profile.md` et
      ajoutez-y l'adresse du site.
- [ ] Ajoutez le lien du site sur votre profil Doctolib si possible.
- [ ] Vérifiez sur téléphone : boutons « Appeler » et « Rendez-vous », menu, carte.

## Mettre à jour le site ensuite

| Je veux… | Fichier à modifier |
|---|---|
| changer les horaires, le téléphone, un tarif | `site.config.json` |
| ajouter ou retirer une prestation | `site.config.json` (liste `prestations`) + la page `src/pages/prestations/…` |
| modifier une question de la FAQ | `src/data/faq.json` (elle se met à jour partout où elle apparaît) |
| modifier un texte | la page concernée dans `src/pages/` |

Puis lancez `npm run build` pour vérifier, et poussez sur GitHub (Netlify) ou renvoyez `dist/`
par FTP.

## À ne pas faire

- Pas de **référencement payant** (Google Ads, annonces locales) : il est interdit aux
  pédicures-podologues.
- Pas d'outil de **mesure d'audience avec cookies** (Google Analytics) sans adapter le bandeau et
  la politique de confidentialité. Si besoin, préférez un outil sans cookie (Plausible,
  GoatCounter).
- Pas de **témoignages, d'avis patients ni de photos « avant / après »** sur le site.
