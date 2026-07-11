# Design QA

## Comparison Target

- Source visual truth:
  - `/Users/a77/Desktop/fe3f996767625ffeb3e254cb5e298501.jpg`
  - `/Users/a77/Desktop/7ae0da44f70ce4da88253b49c9315acc.jpg`
  - `/Users/a77/Desktop/638751005762325bb570e9f70beab88a.jpg`
  - `/Users/a77/Desktop/68980759d1e80f6ad7480a5dd88fb045.jpg`
  - `/Users/a77/Desktop/0de329e76f88fae695186eb5355d4248.jpg`
  - `/Users/a77/Desktop/07c9100aec1a08fa85b0b7e7a609676e.jpg`
- Implementation:
  - `http://localhost:3127/`
  - `http://localhost:3127/case-study`
- Implementation screenshots:
  - `/Users/a77/Documents/Codex/2026-07-10/reactbits/outputs/ai-pm-home-desktop.png`
  - `/Users/a77/Documents/Codex/2026-07-10/reactbits/outputs/ai-pm-case-desktop.png`
  - `/Users/a77/Documents/Codex/2026-07-10/reactbits/outputs/ai-pm-home-mobile.png`
  - `/Users/a77/Documents/Codex/2026-07-10/reactbits/outputs/ai-pm-case-mobile.png`
- Viewports: `1440 x 900` desktop and `390 x 844` mobile.
- State: settled first paint; homepage CTA visible; case page at top; evaluation tabs also tested in the selected state.

## Comparison Evidence

- Full-view home comparison: `/Users/a77/Documents/Codex/2026-07-10/reactbits/work/landing/qa/home-reference-comparison.png`
  - Source and implementation are normalized to `840 x 1904` panels.
- Focused case-cover comparison: `/Users/a77/Documents/Codex/2026-07-10/reactbits/work/landing/qa/case-reference-comparison.png`
  - Source and implementation are both `675 x 1200`.
- Focused interaction evidence: `/Users/a77/Documents/Codex/2026-07-10/reactbits/work/landing/qa/evaluation-desktop.png` and `/Users/a77/Documents/Codex/2026-07-10/reactbits/work/landing/qa/mobile-menu.png`.

The references are style targets rather than one exact mockup. The comparison therefore checks the shared visual grammar: red/near-black/paper palette, oversized condensed typography, hard grid lines, square surfaces, poster-like section cuts, and sparse action chrome.

## Required Fidelity Surfaces

- Fonts and typography: passed. Latin display type is condensed, monumental, and tightly led; Chinese headings use manual semantic line breaks, zero negative tracking, and a `1.12` line height. Body copy remains at least `15px` with `1.82` line height.
- Spacing and layout rhythm: passed. Desktop uses hard editorial bands and asymmetric grids; mobile collapses to one column with full-width controls. Hero and case cover preserve a visible next-section edge at desktop.
- Colors and tokens: passed. The implementation stays within near-black `#060606`, paper `#F2EEE6`, and signal red `#E23A35`, without blue-purple gradients or decorative secondary accents.
- Image quality and asset fidelity: passed with an intentional deviation. No fake portrait or stock identity image was introduced. The homepage uses a real cursor-reactive ReactBits liquid field as the visual subject, preserving the references' motion/photography impact without inventing a candidate identity.
- Copy and content: passed. The site is framed as an AI product-manager interview portfolio; the case is explicitly anonymized and contains no fabricated company names or performance metrics.
- Icons: passed. Visible action icons use one consistent line-icon family and remain aligned at desktop/mobile sizes.
- Responsiveness: passed. Browser measurements report `scrollWidth === clientWidth` at `1440px` and `390px` on both routes.
- Accessibility: passed. Semantic headings, navigation labels, tabs, `aria-selected`, menu expanded state, visible focusable controls, sufficient contrast, and reduced-motion CSS are present.

## Interaction Checks

- Homepage `进入案例` CTA navigates to `/case-study` with the forward route transition.
- Case page opens at scroll position `0` after navigation.
- Evaluation tab `引用完整度` updates the selected tab, heading, question, test method, and release gate.
- Mobile menu opens with `aria-expanded=true` and displays all three destinations.
- Hash links resolve after layout and move to the requested section.
- Console check: no runtime errors. A non-blocking Three.js deprecation warning is emitted by the rendering dependency.
- Hero liveness: two settled frames taken `1.1s` apart changed `38.31%` of pixels above the threshold, confirming continuous motion.

## Comparison History

### Iteration 1

- Earlier P1: the sticky WebGL hero could paint over later content in browser captures.
- Fix: removed sticky compositing and used a deliberate hard-cut section handoff.
- Post-fix evidence: desktop and mobile page captures show later content correctly above its own opaque field.

- Earlier P2: the animated evidence list recycled items and retained rounded demo shells.
- Fix: disabled automatic recycling, added initial stagger support, and exposed item/content classes for square editorial surfaces.
- Post-fix evidence: DOM snapshots contain each evidence item once; the comparison screenshot shows sharp, non-nested panels.

### Iteration 2

- Earlier P2: route navigation could retain an intermediate scroll offset.
- Fix: added a route-aware scroll reset that runs after layout and preserves explicit hash navigation.
- Post-fix evidence: the homepage-to-case flow lands with `scrollTop=0`.

- Earlier P2: offscreen horizontal entrance motion expanded the mobile scroll width by `8px`.
- Fix: clipped overflow at the animated method block boundary.
- Post-fix evidence: both routes report `390 / 390` and `1440 / 1440` scroll/client widths.

## Findings

No actionable P0, P1, or P2 issues remain.

Accepted deviations:

- The references use fashion/architecture photography. The implementation uses a live shader and product evidence because a fabricated portrait would weaken interview credibility.
- The current copy is a polished anonymized case framework. Replacing it with the candidate's real case details is a content-customization step, not a visual or interaction defect.

## Follow-up Polish

- P3: replace `WENWO.STUDIO` and the anonymized case copy with the candidate's real name, role history, and evidence when available.

final result: passed
