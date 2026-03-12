# MCG Contest Create UI Architecture

## 1. Executive summary

Le flow actuel de création de contest existe et fonctionne, mais il reste difficile à opérer à grande échelle admin ops:
- Le CTA de création est présent mais pas dominant dans le catalogue.
- Le wizard mélange setup, détails techniques et rewards dans une densité trop élevée.
- La configuration rewards reste trop “preset/primitive” et n’exprime pas clairement des stratégies de distribution multi-règles.

Architecture cible recommandée (MVP réaliste):
1. **Catalogue orienté action**: un bloc principal “Create new contest” en haut (action canonique), puis liste des contests.
2. **Wizard en 2 colonnes**: éditeur principal à gauche, summary + validations à droite.
3. **Reward Distribution Builder card-based**: règles multiples, éditables, réordonnables, avec aperçu humain instantané.
4. **Review final lisible**: “what will happen” avant validate/publish, pas un dump technique.

---

## 2. Current UI problems

## 2.1 Contest catalog
Constats:
- Le CTA “New contest setup” est rendu comme badge/lien dans la zone actions, visuellement au même niveau que “Refresh catalog”.
- Le message canonique existe, mais la hiérarchie d’attention reste faible.
- Le legacy est signalé, mais la page principale reste surtout perçue comme table opérationnelle.

Impact ops:
- Un admin pressé peut manquer le chemin canonique de création.
- Le catalogue est perçu comme “liste + actions”, pas comme “hub create/run/review”.

## 2.2 Contest create wizard
Constats:
- Densité forte des champs et sections.
- Progression perçue comme linéaire technique, pas comme guidance produit.
- Rewards encore trop proches d’entrées primitives backend.

Impact ops:
- Charge cognitive élevée.
- Risque de mauvaise configuration (ou de publication de contest mal compris).
- Faible confiance pour opérateur non-technique.

## 2.3 Rewards model UX
Constats:
- Le modèle UX actuel n’est pas pensé pour des distributions riches multi-règles.
- Les formulations ne traduisent pas assez clairement “qui reçoit quoi”.

Impact produit:
- Difficulté à configurer des stratégies telles que:
  - packs par participant top N,
  - budget total réparti sur top %,
  - cumuls XP + points + packs.

---

## 3. Target catalog CTA hierarchy

## 3.1 Page structure (top-down)
1. **Header compact**
   - Titre: “Contests”
   - Sous-titre: “Create, run and settle contests from one canonical workflow.”
2. **Primary action strip (hero card)**
   - Gros bouton primaire: `Create New Contest`
   - Bouton secondaire: `Open Drafts`
   - Lien tertiaire: `Legacy contests (deprecated)`
3. **Operational list section**
   - Filtres + recherche
   - Table contests

## 3.2 CTA placement and hierarchy
- `Create New Contest` doit être l’action primaire la plus visible (bouton plein, taille > boutons secondaires).
- `Refresh` doit devenir action de contexte dans la section table, pas concurrente du CTA create.
- `Legacy` doit être relégué en lien discrètement encadré “deprecated”.

## 3.3 Canonical flow framing
Ajouter une mini-frise textuelle en haut:
`Create draft → Validate policy → Publish → Run contest → Generate settlement plan`.

---

## 4. Target contest create wizard layout

## 4.1 Layout global
**Desktop: 2-column layout (70/30)**
- **Colonne gauche (éditeur principal)**: étape active.
- **Colonne droite (sticky summary)**:
  - contest snapshot (code, dates, status),
  - rewards summary (phrases lisibles),
  - validation blockers/warnings,
  - quick links step errors.

**Mobile/tablette:**
- Step content full-width,
- summary collapsible accordion au-dessus des CTA.

## 4.2 Header + stepper
Header:
- Titre: “Create Contest”
- Sous-texte clair: “Configure basics, scoring and reward distribution before publishing.”
- Badge draft status: `Draft / Validation passed / Ready to publish`.

Stepper:
1. Basics
2. Schedule
3. Participation rules
4. Reward distribution
5. Review
6. Publish

Le stepper doit afficher:
- état de chaque étape (todo / in progress / complete / blocked)
- nombre d’erreurs par étape si applicable.

## 4.3 CTA model
Barre CTA sticky en bas:
- Gauche: `Back`
- Centre: `Save draft` (secondaire)
- Droite: `Continue` (primaire)
- Sur Review/Publish:
  - `Validate draft` (primaire)
  - `Publish contest` (danger-protected, activé seulement si validation OK)

## 4.4 Validation surfaces
- Inline messages au niveau champ.
- Panneau “Blocking issues” au-dessus des CTA.
- Sur le summary panel, section “Must fix before publish” cliquable.

---

## 5. Reward distribution builder architecture

## 5.1 Core UX choice
**Choix recommandé: card-based rule builder + split preview**.

Pourquoi:
- Plus lisible qu’un tableau brut pour admin ops.
- Permet d’exprimer la règle comme objet produit (“Reward rule”) et pas comme ligne technique.
- Facilite édition incrémentale, reorder, suppression.

## 5.2 Rule data model (UI-level)
Chaque règle contient:
- `label` (optionnel mais recommandé, ex: “Top 10 booster”) 
- `rewardType`: POINTS | XP | PACK
- `amount` (points/xp) ou `quantity` (packs)
- `distributionType`: FIXED_RANKS | TOP_N | TOP_PERCENT
- `distributionValue` (ex: rank=1, N=10, percent=25)
- `allocationMode` (MVP explicite):
  - `PER_RECIPIENT` (chacun reçoit amount)
  - `TOTAL_POOL` (budget total à répartir) — option affichée seulement si support backend confirmé

## 5.3 Builder UI composition
Section “Reward Distribution Builder”:
1. **Rules list (cards)**
   - Card header: label + status chip
   - Card body: phrase preview + paramètres principaux
   - Card actions: Edit / Duplicate / Delete / Move up/down
2. **Add rule panel**
   - Bouton primaire `Add reward rule`
   - Ouvre un drawer/modal simple en 3 blocs:
     - Reward (type + amount/quantity)
     - Audience (distribution type + value)
     - Output sentence preview
3. **Conflict/overlap panel (MVP info)**
   - “Rules are currently stackable” (ou exclusive si décidé produit)
   - Warning si overlap fort détecté.

## 5.4 Stacking recommendation
Pour MCG (besoin exprimé multi-règles croisées), recommander **stackable by default** au niveau UX.
- Message explicite: “A player can receive rewards from multiple matching rules.”
- Si backend n’applique pas encore full stacking, afficher banner “Current execution policy: EXCLUSIVE/limited” pour éviter ambiguïté.

## 5.5 Examples represented in UI
- “Top 10 receive 2 packs each.”
- “Top 10% receive 30 packs total (distributed by rank order).”
- “Top 10 receive 1,000 XP each.”
- “Top 50% receive 100,000 XP each.”
- “Top 60% receive 1,000,000 points each.”

---

## 6. Preview and review UX

## 6.1 Live human-readable preview
Sous la liste des règles:
- bloc “Distribution Preview” généré automatiquement.
- affichage en langage naturel trié par priorité/ordre de règle.
- indicateurs agrégés:
  - total recipients estimate,
  - total points/xp exposure estimate,
  - total pack quantity estimate.

## 6.2 Review step structure
Review page en sections:
1. Contest identity (code/title)
2. Timeline
3. Participation rules
4. Reward rules (phrases lisibles)
5. Risk checks (blocking/warnings)

Puis actions:
- Validate draft
- Publish contest

## 6.3 Dangerous actions handling
`Publish contest`:
- bouton distinct + confirmation modal courte:
  - “Publishing locks reward policy for this contest phase.”
  - résumé de X règles, Y types de rewards.

---

## 7. Recommended interaction model

Modèle retenu:
- **Card-based rule builder** pour édition.
- **Split editor + preview** pour feedback immédiat.
- **Wizard 2-column** pour réduire charge cognitive.

Ce modèle est le plus adapté à MCG admin ops car:
- transforme des primitives backend en objets métiers compréhensibles,
- améliore lisibilité sans exploser la complexité frontend,
- permet une montée progressive vers des capacités avancées.

---

## 8. MVP scope vs future enhancements

## 8.1 MVP (à faire maintenant)
- CTA create contest dominant dans catalogue.
- Wizard 2 colonnes avec summary sticky.
- Reward builder multi-règles (add/edit/delete/reorder) avec card UI.
- Preview lisible en phrases + checks de base.
- Review step consolidée avant publish.

## 8.2 Future (phase suivante)
- Simulateur de distribution avec données ranking réelles.
- Visualisation “who gets what” par percentile/rank histogram.
- Rule templates library (community event, seasonal finals, etc.).
- Advanced policy modes (exclusive groups, caps, fallback rules).

---

## 9. Implementation guidance for frontend

## 9.1 Components to introduce/refactor
- `ContestCreateHeader`
- `ContestCreateStepper`
- `ContestSummaryPanel`
- `RewardRuleCard`
- `RewardRuleEditorDrawer`
- `RewardDistributionPreview`

## 9.2 State management
- Central draft state object (`useReducer` recommandé).
- Validation map par étape.
- Rule list local IDs pour reorder stable.

## 9.3 UX conventions
- Une action primaire dominante par vue.
- Labels courts, phrasing produit.
- Erreurs bloquantes regroupées + ancrées sur les champs.
- No raw JSON in primary flow.

---

## 10. File-by-file impact estimate

Cibles probables pour implémentation:
- `app/admin/(protected)/contests/page.tsx`
  - renforcer hiérarchie CTA create.
- `app/admin/(protected)/contests/create/page.tsx`
  - refonte layout wizard + builder rewards.
- `app/globals.css`
  - tokens/patterns pour cards builder, summary sticky, CTA footer.
- `components/admin/AdminShell.tsx` (optionnel léger)
  - ajustements de respiration/hierarchie si nécessaire.
- `lib/domain/contests/config-runtime.ts` (si requis)
  - alignements minimes payload reward rules multi-card.
- `tests/*contest*` + `tests/*admin*`
  - smoke tests wizard steps + rules builder interactions.

Risques d’implémentation:
- Mismatch UI builder vs contrat backend distribution rules.
- Ambiguïtés sur stacking réel en exécution.

Mitigation:
- figer explicitement le comportement MVP dans la UI (“stackable” ou “exclusive/limited”),
- ajouter validations contractuelles côté API avant publish.
