# AI PM Interview Portfolio Redesign

## Visual Anchor

- Reference synthesis: industrial editorial grids, monochrome photography language, oversized compressed type, hard section cuts, and one signal-red action color.
- ReactBits template grammar: `wireframe` for the framed grid, section borders, numbered ledger rows, and technical clarity.
- Taste anchor: `monopo-saigon` for alternating paper and near-black full-bleed stages, square surfaces, giant display type, and no decorative shadows.
- Design DNA: `advanced-team` (`lane-a-motion-webgl`) for the near-black field, stable red accent, living canvas, sparse copy, and poster-stacked rhythm.

## Locked Tokens

- Near black: `#060606`
- Paper: `#F2EEE6`
- Paper high: `#F8F5EF`
- Signal red: `#E23A35`
- Muted ink: `rgba(6, 6, 6, 0.58)`
- Border: `rgba(6, 6, 6, 0.82)`
- Display weight: `600`; Chinese title tracking: `0`; Latin display tracking: `-0.03em`
- Chinese heading line height: `1.12`; Chinese body line height: `1.82`
- Motion easing: `cubic-bezier(0.22, 1, 0.36, 1)`
- Route motion: `400ms` hierarchical forward/back transition

## Homepage Assembly

1. Hero: `RadialLiquid` full bleed on `#060606`, centered-right, cursor reactive. `StaggeredText` reveals `AI PRODUCT / MANAGER` on first paint. One primary CTA routes to `/case-study`; no second CTA, no chatbot, no proof strip in the hero.
2. Evidence index: paper field with one featured anonymized case and three responsibility rows. `AnimatedList` provides the interview-question panel; each question reveals a concise answer.
3. Working method: retrofitted `HowItWorks5`, signal red accent, four real stages: frame the problem, prototype, evaluate, ship.
4. Footer: retrofitted `Footer8` with a giant `AI PRODUCT` wordmark and real internal links.

## Case Study Assembly

1. Case cover: paper field, `HalftoneWave` as a restrained technical texture, hand-broken Chinese title, clear anonymized-case label.
2. Problem and role: hard grid with context, responsibility, constraints, and scope. No fabricated metrics.
3. Product judgment: full signal-red section with three explicit product decisions.
4. Evaluation console: near-black section; clickable evaluation dimensions update a real `AnimatedList` evidence panel.
5. Retrospective: `ClickStack` cards for trade-offs, lessons, and next iteration.
6. Footer: shared retrofitted `Footer8`, back route uses `nav-back`.

## Interaction Contract

- Full-bleed shader remains alive at idle and responds to cursor position. The hero uses a hard-cut handoff so the WebGL surface never paints over interview content while scrolling.
- Custom cursor morphs around primary links and buttons on pointer devices only.
- Hover treatment is one move per element: underline wipe, image/content shift, or red fill.
- Homepage CTA performs hierarchical `nav-forward`; case page return performs `nav-back`.
- Reduced-motion disables route and entrance animation without hiding content.
- Desktop and `390 x 844` mobile must have zero horizontal overflow and no split Chinese words.

## Content Honesty

- The case is labeled `脱敏案例`; no company name, revenue, conversion percentage, or unverified result is invented.
- The site demonstrates decision quality, evaluation discipline, and communication clarity rather than claiming anonymous business metrics.
