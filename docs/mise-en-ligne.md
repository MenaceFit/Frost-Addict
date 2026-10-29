# Étapes restantes avant la mise en ligne

Le thème **FROST DISTRICT — v4 (audit design, a11y, SEO)** est installé sur la boutique comme thème **non publié**. Le thème en ligne n'a pas été modifié.

- Aperçu : https://fvmz0j-wy.myshopify.com/?preview_theme_id=209954701637
- Éditeur : https://admin.shopify.com/store/fvmz0j-wy/themes/209954701637/editor
- Les anciennes versions (v1 à v3) peuvent être supprimées dans Thèmes une fois la v4 validée.

## Rendus 3D
Les 13 rendus (`fd3d-*`) sont dans Contenu → Fichiers. Ils sont générés par `dev/renders/` (three.js) et peuvent être recalculés :
```bash
cd dev && npm install && cd ..
node dev/renders/render.mjs          # → dev/renders/out/*.png
```
Pour poser **ta vraie photo produit** sur un podium : détoure-la (Produits → image → Modifier → Supprimer l'arrière-plan), enregistre-la en PNG, puis choisis-la dans « Photo produit détourée » (hero 3D ou carte catégorie). Elle remplace l'objet 3D.

## Photos produits (à faire toi-même)
Les photos officielles des marques (Dior, Moncler, Burberry…) trouvées sur Google sont protégées : ne les utilise pas sans autorisation écrite de la marque, Shopify peut retirer les fiches signalées. Et en revente, la photo doit montrer la pièce réellement vendue.
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
