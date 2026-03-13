# Refonte UI complète MCG (2026)

## 1) Résumé technique et produit
- **Vision produit**: MCG reste centré sur la boucle `packs -> collection -> contests -> rewards/quests`, avec une expérience utilisateur plus chaleureuse et ludique.
- **Surfaces principales user**: Home, Packs, Collection, Contests (liste + détail), Rewards/Quests, Compte.
- **Surfaces principales admin**: Dashboard, contests, quests/modération, rewards, users, analytics.
- **Architecture UI existante conservée**: `SiteShell` (shell public) et `AdminShell` (shell admin), composants UI réutilisables (`Button`, `Modal`, `ProgressBar`) et pages App Router.
- **Contraintes respectées**: aucune modification du backend (`app/api/**`), domaine (`lib/domain/**`), Prisma, flux métier, ni du composant de carte (`components/ui/MvpCardTile.tsx`).

## 2) UI Audit (avant refonte)
### Faiblesses identifiées
1. **Direction artistique très dark**: dominance noir/carbone, saturation rouge/or élevée, peu alignée avec une DA sketch légère.
2. **Hiérarchie visuelle dense**: ombres lourdes et glow forts, fatigue visuelle sur pages longues (packs/admin).
3. **Lisibilité contrastes secondaires**: certains textes `--text-3` sont trop faibles sur fonds sombres.
4. **Incohérence tonale**: UX « premium dashboard » côté admin et landing agressive côté home, moins « jeu de cartes fun ».
5. **Responsive**: certaines sections multi-colonnes denses (admin tables, zones packs) demandent des surfaces plus aérées.

### Composants/patterns observés
- Navigation et structure: `SiteShell`, `AdminShell`.
- Composants UI transverses: boutons (`.btn-*`), modales, cartes de surface, tableaux admin.
- Pages gameplay: pack stage + reveal modal, grilles de collection, cards de contests, panneaux rewards.

## 3) Nouveau Design System (sketch-light)
### Palette
- **Base claire**: `--bg-base #f7f2e8`, `--bg-1 #fffaf1`, `--bg-2 #f0e5d4`.
- **Texte**: `--text #3b2d26`, `--text-2 #665246`, `--text-3 #8c7569`.
- **Accents**: `--red #ef6f65`, `--gold #f2b95f`, `--arc-blue #6d92ff`, `--emerald #5eb59e`.

### Typographie
- Titres: `Baloo 2` / `Poppins`.
- Texte courant: `Nunito` + `Inter` fallback.
- Données techniques: `JetBrains Mono`.

### Règles visuelles
- Radius augmenté (`16/12/8`) et bordures visibles façon tracé manuel.
- Ombres douces papier (`--paper-shadow`).
- Surfaces ivoire/cream, suppression des noirs purs.
- Boutons et badges avec contours apparents et gradients modérés.

### Icônes
- Conservation des pictos simples déjà présents (glyphes + emojis) mais intégrés dans un style plus clair et lisible.

## 4) Architecture UI/UX proposée
- **Header** allégé: ambiance jeu illustré, CTA d’authentification plus friendly.
- **Home**: ton onboarding chaleureux et CTA clairs vers packs/collection.
- **Packs**: conserve le flux d’ouverture, mais surface enveloppante claire et moins « néon ». 
- **Collection/Contests/Rewards/Compte/Admin**: homogénéisation via les mêmes tokens de surface, bordures et typographies.

## 5) Implémentation réalisée
- Refonte des tokens globaux et overrides visuels dans `app/globals.css`.
- Mise à jour des polices et metadata dans `app/layout.tsx`.
- Mise à jour du ton UX de la home (`app/page.tsx`) et des libellés du shell (`components/layout/SiteShell.tsx`, `components/admin/AdminShell.tsx`).
- Aucune modification des routes API, logique métier, ni rendu interne des cartes.
