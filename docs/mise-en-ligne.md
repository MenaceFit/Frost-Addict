# Étapes restantes avant la mise en ligne

Le thème **FROST DISTRICT — v6 Winter Motion** est installé sur la boutique comme thème **non publié**. Le thème en ligne n'a pas été modifié.

- Aperçu : https://fvmz0j-wy.myshopify.com/?preview_theme_id=209999659333
- Éditeur : https://admin.shopify.com/store/fvmz0j-wy/themes/209999659333/editor
- Les anciennes versions (v1 à v5) peuvent être supprimées dans Thèmes une fois la v6 validée.

## v6 — Produits réels (24 fiches en brouillon)

Créées depuis les photos envoyées : 6 sneakers (Dior B22, Chanel CC, Nike Air Max 95, Nike × NOCTA,
Lanvin Curb, UGG) et 18 doudounes / vestes (Moncler, Canada Goose, Burberry, Ralph Lauren, C.P. Company,
Parajumpers, Arc'teryx, Nike). Chaque fiche a :

- 2 visuels détourés : fond studio clair + produit posé sur la box FROST dans le ciel ;
  les sneakers ont en plus la photo d'origine ;
- tailles S → XXL (vestes) ou 39 → 45 (sneakers), stock suivi, **0 en stock**, **prix 0 €** ;
- tags pour les collections automatiques (doudoune, sans-manches, premium, noir…), « nouveau » sur les sneakers.

Avant d'activer une fiche (Produits → statut **Actif**) :

1. mettre le **vrai prix** (et le prix barré si promo) ;
2. garder seulement les **tailles réellement en stock** et saisir les quantités ;
3. vérifier le **titre** (modèle exact) et compléter la description (matière, état, coupe) ;
4. ajouter le tag `best-seller` uniquement sur les pièces qui se vendent vraiment le mieux.

Les fiches sont déjà publiées sur le canal Boutique en ligne : elles apparaissent dès qu'elles passent en Actif.
Les sections « Nouveautés » et « Best-sellers » se remplissent automatiquement (règle : prix > 0).

**Photos.** Les 18 vestes viennent d'une planche en petite résolution (~150 px par article) : les visuels
sont nets en vignette mais doux en grand. L'épaule droite de la veste Arc'teryx était masquée par une
autre veste sur la planche : elle a été reconstruite par symétrie. Remplace ces images par tes propres
photos dès que possible (outil : `dev/tools/product_cut.py` puis `dev/tools/product_visuals.py`).
Assure-toi de détenir les droits sur chaque photo et qu'elle montre bien l'article vendu.

## v6 — Animations (motion.dev)

- Motion 12.43.0 (MIT) intégré en asset (`assets/motion.min.js`, 27 Ko gzip, servi par le CDN Shopify) ;
  `assets/frost-motion-pro.js` ajoute : apparitions au scroll en ressort, entrée du hero en cascade,
  sortie du hero liée au scroll, retour tactile sur les boutons, rebond du panier à l'ajout,
  lignes du panier en cascade. Sans Motion ou avec « réduire les animations », le site reste complet.
- Transitions entre pages natives (View Transitions, Chrome / Edge / Safari 18.2+).
- Barre d'annonce en défilement continu, avec bouton pause (WCAG 2.2.2).
- Neige légère sur la bannière « Prêt pour le grand froid » (réglage « Légère chute de neige »).
- Correctif : les apparitions CSS de secours ne se déclenchaient pas (sélecteur `.has-motion.js`).

## v6 — Plus aucun contenu de démonstration

Les sections sans produit réel se masquent sur la boutique (les cartes « démo » ne restent visibles que
dans l'éditeur). « Shop the look » est désactivé : sa photo ne montre pas tes articles.
Bandeau de marques = les 12 marques réellement au catalogue.

## Rendus 3D
Les 13 rendus (`fd3d-*`) sont dans Contenu → Fichiers. Ils sont générés par `dev/renders/` (three.js) et peuvent être recalculés :
```bash
cd dev && npm install && cd ..
node dev/renders/render.mjs          # → dev/renders/out/*.png
```
Pour poser **ta vraie photo produit** sur un podium : détoure-la (Produits → image → Modifier → Supprimer l'arrière-plan), enregistre-la en PNG, puis choisis-la dans « Photo produit détourée » (hero 3D ou carte catégorie). Elle remplace l'objet 3D.

## Détourer tes photos produits (outil fourni)
```bash
pip install rembg onnxruntime
python3 dev/tools/remove_bg.py dossier/photos dossier/detourees
```
Sortie : PNG carrés transparents, centrés, prêts pour « Photo produit détourée » (hero et cartes : la pièce se pose sur la boîte FROST, comme sur Drip Addict). Réglage « Hauteur du dessus du podium » dans la section des cartes si besoin d'ajuster.

## Photos produits (à faire toi-même)
Les photos officielles des marques (Dior, Moncler, Burberry…) trouvées sur Google ou Pinterest sont protégées (Pinterest ne fait que relayer des images, il n'en donne pas les droits) : ne les utilise pas sans autorisation écrite de la marque, Shopify peut retirer les fiches signalées. Et en revente, la photo doit montrer la pièce réellement vendue.
1. Photographie chaque pièce sur fond uni clair, lumière du jour, 3–5 vues (face, dos, détail logo/étiquette, semelle pour les sneakers).
2. Ajoute les photos au produit, puis Modifier → **Supprimer l'arrière-plan** (outil gratuit Shopify) et enregistre en PNG.
3. Pour la mise en avant 3D : choisis la photo détourée dans « Photo produit détourée » (hero 3D ou carte catégorie). Elle se pose sur le podium de glace à la place de l'objet 3D.

## Conversion : ce qui est déjà branché
- Jauge « livraison offerte dès 65 € » dans le panier (seuil réel de tes tarifs d'expédition France). Si tu changes ce seuil dans Paramètres → Expédition, change-le aussi dans Réglages du thème → Panier.
- Suggestions « Complète ton look » dans le panier (recommandations Shopify ; plus précises avec l'app Search & Discovery → produits complémentaires).
- Popup « Frost Club » (15 s ou intention de sortie, 1 fois / 14 jours). Pour offrir un code : crée-le dans Réductions puis renseigne-le dans la section Popup.
- Fiche produit : paiement en plusieurs fois (s'affiche si Shop Pay Paiement échelonné est activé), logos de paiement, rappel livraison offerte. L'estimation de date de livraison est prête mais masquée : renseigne tes délais réels dans le bloc « Livraison et paiement ».
- Compte à rebours : section prête mais désactivée. À activer uniquement pour une vraie offre avec une vraie date de fin (elle disparaît seule après).
- « Shop the look » : choisis 2–3 produits de la tenue dans l'éditeur ; masqué tant qu'aucun produit n'est choisi.

## À faire dans Shopify
1. **Ajouter les produits** (aucun produit dans la boutique au 29/10/2026). Pour chaque produit : photos réelles sur fond clair, marque (champ « Fournisseur »), tailles en variantes, tags (`doudoune`, `nouveau`, `courte`…) pour remplir les collections automatiques.
2. **Section « Nos B30 »** : dans l'éditeur, choisir le produit de chaque coloris (noir, beige, clair/bleu, bleu marine). Les cartes « Démo » disparaissent alors.
3. **Collections Sneakers et Accessoires** : ce sont des collections manuelles, il faut y ajouter les produits.
4. **Cartes démo** : quand le catalogue est prêt, décocher « Afficher des cartes de démonstration si la collection est vide » dans chaque section « Collection en avant ».
5. **Avis clients** : installer une app d'avis (ex. Judge.me) et ajouter son bloc dans la section « Avis clients ». Elle reste invisible tant qu'elle est vide.
6. **Filtres** : installer/configurer l'app Search & Discovery (taille, marque, couleur, prix, disponibilité).
7. **Pages légales** : Paramètres → Politiques (CGV, remboursement, confidentialité, livraison, mentions légales). Elles s'affichent automatiquement dans le pied de page.
8. **Page Contact** : créer une page « Contact » avec le modèle `page.contact`.
9. **Logo** : Réglages du thème → Logo et identité (sinon le logo texte FROST DISTRICT est utilisé).
10. **Réseaux sociaux** : Réglages du thème → Réseaux sociaux.
11. **Authenticité** : la bande de réassurance affiche « Pièces authentiques ». Garde les factures/preuves d'achat de chaque pièce ; ne l'affiche que si tu peux le prouver.
12. **Publier** : quand tout est vérifié dans l'aperçu, Thèmes → … → Publier.

## Non testé faute d'accès
La boutique est protégée par mot de passe et n'est pas joignable depuis l'environnement de développement. Le rendu a été vérifié sur une prévisualisation locale qui exécute le même code Liquid avec des données de démonstration. À vérifier dans l'aperçu Shopify : paiement express, filtres réels, recherche prédictive, recommandations produits, formulaires (contact, newsletter, compte).

## Audits v4 (skills design, accessibilité, animations, SEO)
- **Accessibilité (axe-core, WCAG 2.1 AA)** : 0 erreur hors logo (les logos sont exemptés). Prix soldé assombri à #0B7C7F (5:1), onglets inactifs lisibles, double anneau de focus visible sur fond clair et sombre, zones cliquables ≥ 24 px, focus enfermé dans le popup. Script : `node dev/preview/a11y.mjs`.
- **Animations** : uniquement transform/opacity, courbes fortes, survols réservés aux souris, rien d'animé au clavier, mode « réduire les animations » qui garde les fondus.
- **SEO** : Organization (+ réseaux sociaux), Product (Shopify), BreadcrumbList sur produits et collections, et emplacement pour du JSON-LD complémentaire dans le metafield produit/collection/page `custom.json` (texte multiligne). À tester avec https://search.google.com/test/rich-results une fois la boutique ouverte.
