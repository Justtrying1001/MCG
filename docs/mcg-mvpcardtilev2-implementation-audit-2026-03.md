# Audit d’implémentation avant création de `MvpCardTileV2` (MCG)

## Scope & méthode

### Faits observés (code/runtime)
- Audit des composants/pages/styles/runtime mapping réels: `MvpCardTile`, `mvpCardTheme`, `types/cards`, `/collection`, `/packs`, token-master mapping, serializers auth/guest.
- Vérification de la couverture réelle des champs `token-master-50`.
- Vérification de la nature réelle des images (`Content-Type`, dimensions, ratio) sur les 50 URLs de `imageUrl`.

### Inférences (explicites)
- Les risques de rendu premium sont évalués à partir des dimensions/ratios et du type d’asset (icône token majoritairement carrée), pas d’une hypothèse “hero art complet”.

### Recommandations
- Orientées “création V2 progressive” sans toucher backend ni DTO.

---

## 1) Diagnostic d’implémentation (réponse courte)

**Verdict: GO avec réserves.**

On peut lancer `MvpCardTileV2` maintenant **sans angle mort majeur runtime** car:
- Le contrat pivot est stable (`MvpCardView`) et déjà alimenté de bout en bout (auth + guest) par les routes actuelles.
- `/collection` et `/packs` consomment le même composant carte avec une API simple (`card`, `variant`, `quantity`).
- Le composant actuel est UI-centric (pas de logique métier mutative), donc remplaçable avec adaptation stricte des conventions implicites.

Réserves majeures à cadrer avant implémentation:
1. Qualité asset: les 50 images sont majoritairement des icons/logo carrés low-res (~250px), pas des hero arts premium.
2. `claudeui` n’est pas branchable tel quel (champs DTO inexistants + enums partiellement désalignées + styles globaux).
3. `/packs` impose une contrainte géométrique forte (`slot-width` + flip 3D) qui doit rester compatible.

---

## 2) Points bloquants réels (à traiter avant/pendant V2)

1. **Mismatch DTO dans `claudeui/MvpCardTile.tsx`**
   - Références à `card.flavorText`, `card.editionNumber`, `card.rarity?.code`, `card.edition?.code` non garanties par `MvpCardView`.  
2. **Mismatch enum édition/rareté (`claudeui`)**
   - `HOLOGRAPHIQUE`/`MCG_ART` côté claudeui vs `HOLO`/`FULL_ART` runtime.
3. **Asset quality risk**
   - Si V2 passe en `cover` avec grande zone art, rendu perçu peut régresser (assets iconiques, carrés et petits).
4. **Contrat implicite `variant` à préserver**
   - `/packs` dépend du rendu compatible avec slot reveal (`height = 1.4 * width`, flip front/back).
5. **Perf potentiellement fragile sur collection dense**
   - Eviter animations continues + blur lourds sur toutes les cartes de grille.

---

## 3) Table de fiabilité des données d’affichage

## 3.1 Fiabilité structurelle DTO/runtime

| Champ affichage carte | Statut | Source runtime | Fiabilité | Notes V2 |
|---|---|---|---|---|
| `displayName` | Toujours présent | `MvpCardView.displayName` | Élevée | Header sûr |
| `symbol` | Toujours présent | `MvpCardView.symbol` | Élevée | Header sûr |
| `imageUrl` | Toujours présent dans token-master actuel | `MvpCardView.imageUrl` | Élevée (dataset actuel) | Conserver fallback visuel si null futur |
| `cardText` | Toujours présent dans dataset actuel | `MvpCardView.cardText` | Élevée (dataset actuel), optionnelle au type | Garder fallback texte |
| `cardNumber` | Toujours présent dataset actuel | `MvpCardView.cardNumber` | Élevée (dataset actuel), optionnelle au type | Garder fallback `setOrder` |
| `setCode` | Toujours présent dataset actuel | `MvpCardView.setCode` | Élevée (dataset actuel), optionnelle au type | Garder fallback `GENESIS` |
| `setEditionLabel` | Toujours présent dataset actuel | `MvpCardView.setEditionLabel` | Élevée (dataset actuel), optionnelle au type | Garder fallback `Edition 1` |
| `setOrder` | Toujours présent dataset actuel | `MvpCardView.setOrder` | Élevée | Fallback numéro |
| `plannedSupply` | Toujours présent DTO | DB (auth), `0` en guest | Élevée auth, simulée guest | Affichage différent guest/auth acceptable |
| `issuedSupply` | Toujours présent DTO | DB (auth), `0` en guest | Élevée auth, simulée guest | Idem |
| `instanceCount` | Toujours présent DTO | Agg auth + guest state | Élevée | Disponible mais non affichée carte |

## 3.2 Mesure dataset canonique (50 tokens)

Résultats observés via audit script sur `data/token-master-50.json`:
- `imageUrl`: 50/50
- `editorial.flavorText`: 50/50
- `editorial.cardNumber`: 50/50
- `editorial.collectionCode`: 50/50
- `editorial.editionLabel`: 50/50
- `setOrder`: 50/50

Conclusion fiabilité:
- **Aujourd’hui**: “carte complète” est la norme dans le dataset MVP 50.
- **Conception V2**: doit quand même conserver les fallbacks existants car le type permet l’absence et le runtime pourrait évoluer.

---

## 4) Diagnostic qualité des images réelles

## 4.1 Faits mesurés

Sur les 50 `imageUrl`:
- `Content-Type`: 31 PNG, 19 JPEG.
- Dimensions top: **42 images en 250×250**.
- Forme: 47 quasi carrées (dont 47 “icon-like square”), 1 portrait, 2 paysage.
- Quelques outliers non carrés:
  - `tok_melania-meme`: 222×250
  - `tok_the-doge-nft`: 250×188
  - `tok_central-african-republic-meme`: 250×167

## 4.2 Conclusion franche

- Ce ne sont **pas** des hero arts premium homogènes type TCG full-art; c’est majoritairement de l’asset logo/token icon.
- Une zone art trop grande + `cover` agressif risque de rendre le produit moins qualitatif (crop/pixelisation/vides perçus).
- Pour V2, `contain` + cadre/halo/texture reste le mode sûr en collection dense.
- Les effets “full-art” doivent être **subtils** tant qu’il n’existe pas de pipeline d’illustrations dédiées.

---

## 5) Audit composant actuel + dépendances implicites

`MvpCardTile` n’est pas qu’un “markup simple”; il embarque des conventions à préserver:

1. **Fallbacks métier d’affichage**
- Numéro imprimé: `cardNumber` sinon `setOrder` sinon fallback TMP index.
- Texte: `cardText` sinon phrase fallback.
- Footer set: fallback `GENESIS` + `Edition 1`.
- Supply: si `plannedSupply<=0`, affiche `Unnumbered test mint`.

2. **Convention visuelle cross-context**
- `variant` (`collection` vs `reveal`) pilote min-height/padding/gap.
- `FULL_ART` ajoute une classe qui augmente l’échelle visuelle de l’art.

3. **Dépendance theme tokens**
- Rareté/édition/faction/chain injectent des CSS variables attendues par le CSS module.

4. **Comportements interactifs implicites**
- Hover: lift + shimmer foil + gloss/noise intensification.
- Le composant s’intègre dans le flip reveal parent, mais ne gère pas lui-même le 3D flip.

Conclusion:
- `MvpCardTile` est remplaçable, **mais** V2 doit reprendre ses conventions de fallback + compatibilité `variant` + gabarit ratio.

---

## 6) Audit concret des layouts où la carte vit

## 6.1 `/collection`

Observations:
- Grille: `repeat(auto-fill, minmax(160px,1fr))`, gap `0.8rem`; mobile `148px`, très petit `138px`.
- Carte actuelle occupe `width:100%`, ratio 63/88 + `min-height` 320/342 selon variant.

Implications V2:
- Une carte plus riche peut tenir si largeur reste fluide à 100% et ratio conservé.
- Risque de casse si V2 force une largeur fixe (ex `196px`) en collection.
- Texte/footer doivent tolérer densité mobile (138px col) -> line-clamp et simplification des badges.

## 6.2 `/packs` reveal

Observations:
- Slot reveal fixe: `--slot-width clamp(168px,18vw,208px)` puis `height = slot-width * 1.4`.
- Flip 3D dépend de `reveal-slot-inner` + front/back absolute + `backface-visibility`.
- Sur mobile reveal: slot-width réduit (`136..172`).

Implications V2:
- Le composant carte doit remplir le front (`width:100%; height:100%` ou ratio compatible) sans overflow.
- Les effets lourds (blur/animations multiples) dans 5 slots simultanés peuvent coûter cher, mais restent maîtrisables si animations limitées.

---

## 7) Audit opérationnel `claudeui` (portage réel)

| Élément `claudeui` | Réutilisable tel quel ? | Adaptation requise ? | Remplacement requis ? | Pourquoi |
|---|---:|---:|---:|---|
| `claudeui/mvp-card.css` | Partiel | Oui | Non | Bonne base skin, mais attention largeur fixe `.mvp-card { width:196px }` + animations à moduler |
| `claudeui/MvpCardTile.tsx` | Non | Oui (forte) | Partiel | Champs DTO non alignés + pas de `variant` + logique demo |
| `claudeui/mvpCardTheme.ts` | Non | Oui | Partiel | Enum édition/rareté internes (`B/A/S/S+`, `HOLOGRAPHIQUE`, `MCG_ART`) à réaligner MCG |
| `claudeui/MCGCard.jsx` | Non | Non | Oui | Composant demo standalone, defaults mockés |
| `claudeui/mcg-card-v2.html` | Non (code runtime) | Oui (inspiration) | Non | Référence visuelle statique utile pour composition |
| `claudeui/mcg-editions*.html` | Non | Oui (inspiration) | Non | Démo des traitements édition, non branchable runtime |
| `claudeui/mcg-art-edition.html` | Non | Oui (inspiration) | Non | Idem |
| `claudeui/mcg-card-design-reference.html` | Non | Oui (inspiration) | Non | Idem |
| `claudeui/CODEX_PROMPT_MCG_CARDS.md` | Non (runtime) | Oui (brief) | Non | Document directionnel, pas source de vérité technique |

Synthèse:
- **À reprendre**: architecture visuelle, certaines couches CSS.
- **À adapter impérativement**: composant TS + thème + sizing responsive + enums.
- **À jeter pour prod**: composants/données demo-only.

---

## 8) Audit rareté / édition (rendu réel actuel)

## 8.1 Rareté (actuel)
- Différenciation réelle visible: accent/glow/border/badge/foil/ornament varient par rareté.
- Niveau de distinction:
  - COMMON/UNCOMMON: sobre.
  - RARE/EPIC/LEGENDARY: gradation nette surtout glow/badge.

## 8.2 Édition (actuel)
- Différenciation visible mais modérée: treatment/sheen/finish/art overlay/footer.
- `FULL_ART` a différenciation explicite (art scale up).
- Pas de pipeline shader ou animation continue par édition (actuellement safe perf).

## 8.3 Ce qu’il faut renforcer en V2
- Clarifier la lecture édition (badge + micro-traitement distinctif) sans “sur-vendre” visuellement des assets qui restent des icônes token.
- Garder une hiérarchie stable rareté > édition pour cohérence produit.

---

## 9) Audit quantity / collection state

Faits:
- `quantity` est passée par `/collection` et `/packs` vers `MvpCardTile`, mais n’est pas rendue dans le composant actuel.
- `instanceCount` est fiable en auth (agrégation serializer) et en guest (state update incrémentale).

Diagnostic:
- Absence de badge quantité = probablement choix UX actuel (ou dette non priorisée), pas absence de donnée.

Recommandation V2:
- Ajouter un badge quantité **optionnel** en `variant="collection"` seulement (coin discret), masqué en reveal.
- Si produit ne veut pas ce badge, garder tel quel mais expliciter la décision.

---

## 10) Perf / CSS / animation

## Effets sûrs (collection)
- Gradients statiques, ombres modérées, hover-only transitions courtes.
- 1–2 pseudo-elements non animés par carte.

## Effets risqués (collection dense)
- Animations continues par carte (holo sweep, glitter infini, multi-layers blend animés).
- Filtres lourds (`blur`, nombreux `mix-blend-mode`) en simultané sur toutes cartes.

## Règle d’implémentation V2 recommandée
- Collection: effets statiques + hover léger seulement.
- Reveal: autoriser effets plus riches (5 cartes max, contexte premium ritualisé).
- Prévoir `@media (prefers-reduced-motion: reduce)` + downgrade mobile.

---

## 11) Stratégie de migration réelle

Stratégie proposée par toi = **bonne**. Je recommande une version opérationnelle stricte:

1. Créer `MvpCardTileV2.tsx` + `MvpCardTileV2.module.css` (scoped, pas global leak).
2. Implémenter un `mvpCardThemeV2.ts` aligné strictement sur enums MCG runtime.
3. Garder API composant identique à V1 (`card`, `variant`, `quantity?`).
4. Reprendre tous fallbacks V1 (numéro, set, text, supply).
5. En collection, forcer mode art `contain` tant que pas de hero arts.
6. Activer V2 derrière flag UI local, tester `/collection` puis `/packs`.
7. Mesurer perf avant switch global (au moins en mobile + grille dense).
8. Conserver V1 rollbackable une release.

---

## 12) Go / No-Go

**Décision: GO avec réserves.**

Conditions exactes pour lancer maintenant:
1. Ne pas importer `claudeui` tel quel; créer V2 adaptée au DTO réel.
2. Préserver compatibilité géométrique `/packs` reveal slot.
3. Limiter animations riches au reveal, sobriété en collection.
4. Conserver mode art `contain` par défaut vu la qualité/typologie des images.
5. Garder fallback logique V1 au complet.

Si ces 5 conditions sont respectées, la construction de `MvpCardTileV2` peut démarrer immédiatement sans risque runtime majeur.
