# Design QA

## Evidence

- Source visual truth: `C:\Users\Administrator\Desktop\dgcu-library\site\design-reference.png`
- Implementation screenshot: `C:\Users\Administrator\Desktop\dgcu-library\site\implementation-desktop-final.png`
- Full-view comparison: `C:\Users\Administrator\Desktop\dgcu-library\site\design-comparison-final.png`
- Focused hero comparison: `C:\Users\Administrator\Desktop\dgcu-library\site\design-comparison-hero.png`
- Mobile evidence: `C:\Users\Administrator\Desktop\dgcu-library\site\implementation-mobile-final.png`
- Desktop viewport and CSS size: 1536 × 1024 at deviceScaleFactor 1.
- Source pixels: 1536 × 1024. Implementation pixels: 1536 × 1024. No density normalization was required.
- State: desktop homepage, default 馆藏 tab; separate interaction test switched to 数据库 and submitted “人工智能”.
- Browser-rendered evidence: captured from `http://127.0.0.1:4321/` in the Codex in-app browser.

## Findings

- No actionable P0, P1, or P2 differences remain.
- Typography: Noto Sans SC is bundled locally. Heading weight, body size, line height, wrapping, and compact information density match the selected visual. The implementation uses the actual legacy library lockup, so its header lettering is slightly more condensed than the generated reference; this is an acceptable brand-fidelity choice.
- Spacing and layout: header 110px, hero 229px, service band 82px, information area 206px, lower area 179px, and footer start at 850px match the selected 1536 × 1024 composition. No horizontal overflow is present.
- Colors and tokens: deep green, off-white surfaces, pale green borders, dark ink text, and restrained gold focus outlines are consistent with the reference and school brand.
- Image quality: the hero is a dedicated raster asset with its green/white edge treatment baked in. News photography and the original library QR artwork are real raster assets. Material Symbols are supplied by an icon font; no custom SVG, CSS icon drawings, or placeholder images are used.
- Copy and content: the selected navigation, search modes, service actions, opening hours, notice list, resource access labels, learning support, news and footer contact details are present.
- Accessibility: landmark structure, skip link, labels, focus-visible styling, reduced-motion support, 44px navigation targets and responsive mobile navigation are included.

## Interaction and Runtime Checks

- Search tabs update `aria-selected` and the search placeholder.
- Submitting “人工智能” on the 数据库 tab produces the expected live status message.
- Empty search focuses the input and produces validation feedback.
- Mobile menu opens, updates `aria-expanded` and changes its accessible label to 关闭导航.
- Mobile viewport 390 × 844 has no horizontal overflow.
- Browser console warnings/errors checked: none.
- Astro production build checked successfully.

## Comparison History

1. Initial implementation (`implementation-01.png`): page height was 1251px at the initial browser viewport, the logo asset was invisible, the hero lacked the reference chevron treatment, and middle sections were too tall.
2. Fixes: replaced the invisible asset with the original library logo lockup; generated and installed the dedicated hero image; removed CSS-drawn decorative geometry; fixed hero intrinsic sizing; compressed section rows; aligned all section boundaries to the reference; added the bordered quick-resource strip; fixed the mobile menu accessible label.
3. Post-fix evidence: `implementation-desktop-final.png` and both combined comparison images show equal 1536 × 1024 dimensions and matching section boundaries. Mobile evidence confirms the responsive variant and menu state.

## Follow-up Polish

- P3: When the second QR code or official database logo assets are supplied during content migration, they can replace the current single original QR block and text-only quick links.

## Phase 2: Inner pages, CMS, and migration

- Desktop news evidence: `C:\Users\Administrator\Desktop\dgcu-library\site\qa-news-desktop.png` at 1440 × 1024.
- Desktop resource evidence: `C:\Users\Administrator\Desktop\dgcu-library\site\qa-resources-desktop.png` at 1440 × 1024.
- Mobile service evidence: `C:\Users\Administrator\Desktop\dgcu-library\site\qa-services-mobile.png` at 390 × 844.
- News listing is paginated at 20 entries per page and exposes the full 494-entry content collection through list/detail routes.
- Resource keyword search correctly narrows “CNKI” to two matching cards; category filtering uses the same hidden-state path.
- A migrated legacy article (`/news/legacy/legacy-319/`) renders its title, original date, summary, full converted body, and source link.
- Keystatic loads at `/keystatic` with separate “新闻与公告” and “数据库与电子资源” collections; no browser console warnings or errors were observed.
- Mobile service cards remain single-column, the header does not overflow, and the navigation toggle opens successfully.
- Full production build completed with the Node standalone adapter and all migrated article detail routes prerendered.

## Phase 3: Production readiness

- Re-scanned 187 legacy list pages and repaired 16 generic legacy titles from their original list labels.
- Content audit covers all 494 entries: 489 legacy articles, 779 local assets, and zero missing local asset references.
- Five generic titles and 38 short/image-only entries remain explicitly flagged for librarian review; 64 unique failed external attachments come from retired third-party hosts and keep their source URLs.
- Production build passes with both supported CMS modes: default production disables unauthenticated local Keystatic routes; GitHub mode compiles when `PUBLIC_KEYSTATIC_GITHUB_REPO` is supplied.
- Standalone production smoke test returned 200 for homepage, news pagination, migrated article detail, resource listing, and `/api/health.json`; `/keystatic` correctly returned 404 in the secure default production mode.
- Local development `/keystatic` dashboard still loads with both content collections. Repaired legacy image content renders from the local asset directory.
- Docker, Compose, Nginx, health-check, and environment templates are present. Docker itself was not available in this workstation, so container execution remains an infrastructure-stage check.

## Phase 4: Image and news layout update

- Homepage hero now loads `/images/hall.png`; source size is 752 × 450 and the rendered slot is 377 × 226 at the 1280px QA viewport, preserving the same 1.671 aspect ratio.
- The previous 135% width and negative horizontal offset were removed. The Hero image now ends exactly at the page-shell boundary and the viewport reports no horizontal overflow.
- News hero now resolves `/images/bg.png` through the shared inner-page hero component.
- News list rows and the page viewport report no horizontal overflow at the 1280px QA viewport.
- Browser console contains no application warnings or errors, and the Astro production build passes.

## Phase 5: Full-width 02.jpg Hero background

- Source visual truth: `C:\Users\Administrator\Desktop\dgcu-library\site\public\images\02.jpg` (939 × 280 px).
- Implementation evidence: browser-rendered homepage capture inspected in the in-app Browser at a 1280px viewport; state is the default desktop homepage.
- Full-view comparison: the source panorama now spans the complete 1265 × 265px Hero region instead of appearing as a standalone right-side image. A left-to-right light overlay preserves the building and landscape on the right while keeping the search controls readable on the left.
- Focused Hero comparison: the standalone `.hero-visual` element is absent, the computed background resolves `/images/02.jpg`, and the page reports no horizontal overflow.
- Typography: heading hierarchy and search control labels remain unchanged and readable against the overlay.
- Spacing/layout: the Hero remains aligned with the existing 24px desktop page shell and does not create a detached image edge.
- Colors/tokens: the overlay uses the existing off-white and DGCU green palette; input/button contrast remains consistent with the established design system.
- Image quality: `02.jpg` is used directly as the raster source with `cover` sizing and no non-proportional stretching.
- Copy/content: all existing Hero search copy, tabs, shortcuts, and interactions are retained.
- Interaction evidence: submitting “人工智能” on the 馆藏 tab returns the expected live status message.
- Browser console warnings/errors checked: none. Astro production build completed successfully.
- Findings: no actionable P0/P1/P2 differences remain for this update.

## Phase 6: Proportional, page-bounded Hero correction

- Earlier P2 finding: the full-viewport `cover` treatment visually cropped the panorama and extended beyond the site's content boundary.
- Fix: moved the `02.jpg` background from the full-width `.hero` section to `.hero-inner`, removed desktop `cover`, and set the container and image to the source ratio of 939:280.
- Post-fix evidence at the 1280px desktop viewport: source ratio 3.354; rendered Hero ratio 3.354; rendered content bounds are x=24–1241, exactly matching the service-card page shell; document horizontal overflow is false.
- Image quality: the background uses `100% auto`, so scaling is proportional and the full panorama is retained without non-uniform stretching.
- Spacing/layout: the Hero now has visible left and right boundaries and no longer extends to the viewport edges.
- Typography, colors, and copy remain unchanged; search controls remain legible over the left-side overlay.
- Findings: no remaining actionable P0/P1/P2 issue for the reported stretching or boundary problem.

## Phase 7: hall.png integrated background trial

- Source visual truth: `C:\Users\Administrator\Desktop\dgcu-library\site\public\images\hall.png` (752 × 450 px, ratio 1.671).
- Implementation evidence: default homepage captured and inspected in the in-app Browser at a 1280px viewport.
- Image adaptation: the 300px Hero height produces an approximately 501 × 300px background image using `auto 100%`; width is derived from the source ratio, so no non-uniform stretching occurs.
- Layout evidence: the image is right-aligned and blended into the left search region with an overlay; the Hero bounds remain x=24–1241 and exactly match the content shell below.
- Typography/colors/copy: existing hierarchy, DGCU green tokens, labels, tabs, and shortcuts remain unchanged and readable.
- Viewport horizontal overflow: false. No standalone `.hero-visual` element was reintroduced.
- Findings: no actionable P0/P1/P2 issue remains for this trial.

## Phase 8: Full-width hall.png Hero treatment

- Earlier P2 finding: height-based right alignment made `hall.png` read as a separate image block rather than one continuous Hero background.
- Fix: the background now spans the entire `.hero-inner` from left to right using proportional `100% auto` sizing and centered vertical cropping; no non-uniform scaling is used.
- Post-fix desktop evidence at 1280px: Hero bounds remain x=24–1241, background resolves `hall.png`, background size is 100%, and document horizontal overflow is false.
- Full-view inspection confirms visible library architecture continues behind both the search region and the right side, with a left-to-right overlay maintaining text and control contrast.
- Typography, spacing, color tokens, and copy remain consistent with the existing homepage design.
- Findings: no actionable P0/P1/P2 issue remains for the requested continuous background treatment.

## Phase 9: Source-ratio Hero layout

- Earlier P2 finding: a fixed 300px Hero required vertical cropping of the 752 × 450 image and could be perceived as stretching.
- Fix: changed the desktop Hero container itself to the source ratio of 752:450 and switched the image layer to `contain`; layout height is now derived from the image rather than imposed on it.
- Post-fix evidence at 1280px: Hero is 1217 × 728 (ratio 1.671), exactly matching the source ratio of 1.671; background size is `contain`; the complete image is visible with no crop or non-uniform scaling.
- Page boundaries remain x=24–1241, matching the content shell, and viewport horizontal overflow is false.
- Mobile keeps `100% auto` proportional sizing and reserves additional vertical space for the search controls.
- Typography, colors, and copy remain readable and unchanged over the adjusted image-led layout.
- Findings: no actionable P0/P1/P2 issue remains for image stretching, cropping, or boundary overflow.

## Phase 10: Restore 02.jpg

- Decision: restored `C:\Users\Administrator\Desktop\dgcu-library\site\public\images\02.jpg` because its 939:280 panorama better fits a compact homepage Hero.
- Desktop evidence at 1280px: rendered Hero is 1217 × 363, ratio 3.354, exactly matching the source ratio; background size is `contain` with no stretching or cropping.
- The complete image spans the Hero from left to right within x=24–1241, matching the lower content shell; viewport horizontal overflow is false.
- The reduced height restores quick services and information panels to the initial desktop viewport while preserving search legibility.
- Findings: no actionable P0/P1/P2 issue remains after restoring the panoramic source.

## Phase 11: bg.png Hero trial

- Source visual truth: `C:\Users\Administrator\Desktop\dgcu-library\site\public\images\bg.png` (772 × 279 px, ratio 2.767).
- Desktop implementation at 1280px is 1217 × 440, ratio 2.767, exactly matching the source; background size is `contain`, so the full image is displayed without stretching or cropping.
- Hero remains bounded to x=24–1241, matching the content shell below, and document horizontal overflow is false.
- Full-view inspection confirms the campus façade remains visible across the complete Hero while the left overlay preserves search readability.
- Findings: no actionable P0/P1/P2 issue remains for this image trial.

## Phase 12: bg2.png Hero adaptation

- Source visual truth: `C:\Users\Administrator\Desktop\dgcu-library\site\public\images\bg2.png` (2186 × 672 px, ratio 3.253).
- Desktop implementation at 1280px is 1217 × 374, ratio 3.253, exactly matching the source; background size is `contain`, so the complete image is shown without stretching or cropping.
- Hero remains inside x=24–1241, aligned to the lower content shell, and document horizontal overflow is false.
- Full-view inspection confirms the centered library façade and surrounding landscape remain intact while the left overlay preserves search contrast.
- Findings: no actionable P0/P1/P2 issue remains for this source-led adaptation.

## Phase 13: Unified inner-page bg2.png Heroes

- Source visual truth: `C:\Users\Administrator\Desktop\dgcu-library\site\public\images\bg2.png` (2186 × 672 px, ratio 3.253).
- Shared implementation covers `/news/`, `/resources/`, `/services/`, and `/about/` through `InnerHero`.
- Desktop evidence at 1280px: each Hero is 1217 × 374, ratio 3.253, exactly matching the source; background size is `contain`, so the complete image is shown without stretching or cropping.
- News Hero bounds x=24–1241 exactly match the article list shell; all verified routes report no horizontal overflow.
- Typography, iconography, copy, and the dark green overlay remain consistent and readable across all inner pages.
- Findings: no actionable P0/P1/P2 issue remains for inner-page background stretching or inconsistency.

## Phase 14: Shorter bg3.png inner-page Heroes

- Source visual truth: `C:\Users\Administrator\Desktop\dgcu-library\site\public\images\bg3.png` (1602 × 325 px, ratio 4.929).
- Browser-rendered implementation screenshot: `C:\Users\Administrator\Desktop\dgcu-library\site\qa-bg3-news.png`; normalized comparison: `C:\Users\Administrator\Desktop\dgcu-library\site\qa-bg3-comparison.png`.
- Viewport: 1280 × 720 CSS px at device scale factor 1; source is 1602 × 325 px and the rendered Hero is 1216.67 × 246.82 CSS px, both ratio 4.929.
- State: default desktop view on `/news/`; the same shared `InnerHero` state was checked on `/resources/`, `/services/`, and `/about/`.
- Full-view evidence: the Hero is substantially shorter than the previous bg2 version, remains aligned to the page shell, and has no horizontal overflow.
- Focused comparison evidence: the vertically stacked source/implementation comparison confirms the whole bg3 panorama retains its original geometry; the only intentional difference is the existing green readability overlay and page copy.
- Typography: existing hierarchy, line height, and wrapping remain readable within the shorter Hero.
- Spacing/layout: all four routes render at 1216.67 × 246.82 with no overflow.
- Colors/tokens: the established dark-green overlay and white foreground content remain consistent.
- Image quality: `contain` plus the exact source aspect ratio avoids stretching and desktop cropping.
- Copy/content: unchanged.
- Findings: no actionable P0/P1/P2 mismatch remains.
- Comparison history: Phase 13 used bg2 at 1217 × 374; Phase 14 replaces it with the wider bg3 source and reduces the rendered height to about 247 px while preserving its ratio.

## Phase 15: Remove inner-page photography

- Scope: `/news/`, `/resources/`, `/services/`, and `/about/`; the homepage Hero is explicitly excluded.
- All four inner-page Heroes now use a flat `rgb(11, 104, 70)` background with `background-image: none`, a 220 px desktop height, and no horizontal overflow.
- The homepage `.hero-inner` remains unchanged and continues to use `/images/bg2.png`.
- Browser console check: no errors or warnings on `/news/`.
- Findings: no actionable P0/P1/P2 issue remains.

final result: passed
