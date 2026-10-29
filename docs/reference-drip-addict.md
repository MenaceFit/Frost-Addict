# Référence visuelle — Drip Addict → FROST DISTRICT Winter

Analyse faite le 29/10/2026 à partir du site en ligne (captures ordinateur 1440 px et mobile 360 px, contenu de la page d'accueil).

## 1. Principes visuels repris
| Drip Addict | Repris dans FROST DISTRICT |
|---|---|
| Barre d'annonce turquoise, texte gras italique en capitales, flèches de navigation | `announcement-bar` : turquoise `#31C9CC`, texte noir (contraste AA), rotation lente, pause au survol et au focus, aucune rotation si l'utilisateur réduit les animations |
| Logo à gauche, menu horizontal en capitales italiques, icônes compte / recherche / panier à droite | `header` : même structure, en-tête fixe, sous-menus déroulants, menu tiroir sur mobile |
| Grand visuel panoramique sous l'en-tête | `hero` : photo hiver, texte à gauche, 2 visuels max, navigation manuelle (pas de défilement automatique par défaut) |
| Défilé de logos de marques | `brand-marquee` : noms de marques en texte (pas de logos déposés par défaut), pause au survol |
| Petit marqueur « ■ ✦ Sélection » + très grand titre compact | `section-head` : carré turquoise + étiquette italique, titre Inter Black serré |
| Grandes cartes de catégories blanches arrondies, image dominante, titre italique, bouton rond turquoise avec flèche | `category-cards` : identique dans le principe, zoom léger de l'image et flèche qui glisse au survol |
| Cartes produits sur fond gris très clair, étiquette verticale « ÉCONOMISEZ X % », titre italique, prix, bouton pilule turquoise pleine largeur | `product-card` : idem ; l'étiquette n'apparaît que si un vrai prix barré existe |
| Carrousel avec barre de progression + bouton « VOIR TOUT » contouré | `product-list` (carrousel) : flèches, barre de progression, clavier, défilement tactile natif |
| Best-sellers à onglets (« → ON  ENSEMBLE  OUTFIT… ») | `collection-tabs` : onglets par marque, onglet actif souligné turquoise avec flèche |

## 2. Composants reconstruits
Barre d'annonce, en-tête + menu mobile, hero, bande de réassurance, défilé de marques, cartes catégories, carte produit, carrousel, onglets, section « modèle phare » (B30), bannière éditoriale, avis clients, newsletter, pied de page, panier latéral, recherche instantanée, page collection avec filtres, fiche produit, panier, compte client.

## 3. Animations observées → appliquées
- Rotation de la barre d'annonce → conservée, plus lente (5 s).
- Défilé continu des marques → conservé, désactivé si « réduire les animations ».
- Survol des cartes → zoom léger + ombre + contour turquoise.
- Ajouts : apparition des sections au défilement (fondu + 24 px), parallaxe légère du hero, ouverture glissée du panier, pastille du panier qui « rebondit » à l'ajout.

## 4. Différences volontaires pour l'hiver
- Fini les visuels plage/palmiers et les promos « maillot offert » : photos de neige, de montagne et d'urbain hivernal.
- Le bleu glacier `#B9D8ED` reste discret (fonds de cartes vides, détails).
- Une bande noire de réassurance sous le hero et de grandes sections photo sombres (bannière, newsletter) pour l'ambiance hiver, tout en gardant les produits sur fond clair.
- Aucune fausse preuve sociale : pas de notes inventées (les étoiles n'apparaissent que si une app d'avis les fournit), section d'avis masquée tant qu'elle est vide, pas de prix barrés artificiels.
