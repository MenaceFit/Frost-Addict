# FROST DISTRICT — Winter Edition (thème Shopify)

Thème Shopify Online Store 2.0 écrit sur mesure : streetwear hiver, inspiré de la navigation de Drip Addict (barre turquoise, grandes cartes de catégories, cartes produits avec ajout rapide), sans dépendance JavaScript externe.

- `assets/` — `frost.css` (design system + composants) et `frost.js` (panier, carrousels, hero, onglets, variantes, recherche, animations)
- `config/` — réglages du thème (couleurs, polices, cartes produits, panier, réseaux)
- `sections/`, `snippets/`, `templates/`, `layout/`, `locales/` — structure standard Shopify
- `docs/` — référence Drip Addict et étapes de mise en ligne
- `dev/preview/` — prévisualisation locale avec données de démonstration (non envoyée à Shopify)

## Prévisualiser en local
```bash
cd dev && npm install && cd ..
PREVIEW_IMAGES=/chemin/vers/images node dev/preview/server.mjs
```
Puis http://localhost:4100. Captures : `node dev/preview/screens.mjs`. Parcours d'achat : `node dev/preview/flows.mjs`.

## Envoyer sur Shopify
Avec Shopify CLI : `shopify theme push --unpublished --store fvmz0j-wy`. Voir `docs/mise-en-ligne.md`.
