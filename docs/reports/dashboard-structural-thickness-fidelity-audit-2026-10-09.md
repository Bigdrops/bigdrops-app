# Dashboard Structural Thickness Fidelity Audit

Identity: BIGDROPS / BOURXE dashboard visual fidelity audit.  
Date: 2026-10-09.  
Mode: Strict zero-code static investigation.  
Report path: `docs/reports/dashboard-structural-thickness-fidelity-audit-2026-10-09.md`.

## 1. Executive Finding

The live mobile dashboard does not lose depth because of one palette defect. The strongest evidence shows a combined structural and CSS presentation gap.

The approved HTML uses a layered visual system. It has a canvas gradient, an app shell, a scroll layer, raised surfaces, inset highlights, large clipped decorative overlays, masked rings, floating shadows, and active navigation gradients. The live React dashboard preserves some of this structure, especially the payment reminder and recent-alert card surfaces. But several depth-critical layers are missing, weakened, or mapped to the wrong token names.

The most important confirmed defect is invalid dashboard token usage. Some live dashboard decorative layers use `--bd-primary` and `--bd-secondary`. The project theme registry defines `--primary`, `--secondary`, `--bd-brand`, and `--bd-accent`, but it does not define `--bd-primary` or `--bd-secondary`. Those declarations are therefore not reliable CSS. This affects KPI card overlays and the dashboard AI button. The likely visual effect is flatter cards and weaker accent depth across all themes.

The second important cause is that the live dashboard does not reproduce the full reference canvas and elevation model. The approved HTML uses specific `--shadow`, `--shadow-sm`, `--shadow-float`, and `--inset-highlight` layers. The live implementation uses a mix of ad hoc shadows, Tailwind shadows, shared component styles, and two token namespaces. Theme switching can change colors, but it cannot restore missing shadow geometry, clipped overlays, or invalid gradient declarations.

The working hypothesis is partly correct. The live dashboard lacks enough structural thickness in key areas. The cause is not only missing DOM nesting. Much of the approved appearance can be restored through CSS presentation layers and semantic token alignment inside the existing React structure.

## 2. Reference Files Examined

Primary approved HTML:

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/dashboard/mobile-dashboard-v6.2.html`

Approved screenshot:

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/dashboard/beta/html good screenshot.png`

Theme reference directory:

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/dashboard/themes/mobile-dashboard-v7.html`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/dashboard/themes/mobile-dashboard-v5.html`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/dashboard/themes/mobile-dashboard-v4.html`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/dashboard/themes/mobile-dashboard-v3.html`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/dashboard/themes/mobile-dashboard-v2.html`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/dashboard/themes/mobile-dashboard-slate-amber-glass-candidate.html`

Live implementation files inspected:

- `src/components/app/AppShell.tsx`
- `src/pages/Dashboard.tsx`
- `src/components/Layout.tsx`
- `src/components/dashboard/DashboardOverview.tsx`
- `src/components/dashboard/KpiGrid.tsx`
- `src/components/dashboard/PaymentReminderBanner.tsx`
- `src/components/dashboard/RecentAlertsCarousel.tsx`
- `src/components/layout/MobileBottomNav.tsx`
- `src/components/layout/GlobalSearch.tsx`
- `src/components/notifications/NotificationBell.tsx`
- `src/lib/themeTokens.ts`
- `src/lib/themePresets.ts`
- `src/styles/formTheme.css`
- `src/index.css`
- `tailwind.config.js`

Project instructions and standards inspected:

- `AGENTS.md`
- `docs/PROJECTSKILLINDEX.md`
- `.claude/agent-instructions/concurrent-agent-safety.md`
- `.claude/agent-instructions/core-guardrails.md`
- `.claude/agent-instructions/execution-rules.md`
- `.claude/agent-instructions/verification-gate.md`
- `.claude/agent-instructions/documentation.md`
- `.claude/agent-instructions/agent-system.md`

Skills used:

- Systematic debugging
- Frontend design and visual fidelity
- Existing-project redesign analysis
- React component architecture
- Tailwind CSS
- Theme and semantic token systems
- Mobile and Android presentation
- Accessibility
- Verification before completion

Documentation standard:

- ASD-STE100 style was used where practical. Sentences are short. Findings are evidence-first.

## 3. Live Implementation Map

Route and entry:

- `src/components/app/AppShell.tsx`
  - Lazy-loads `Dashboard` at line 27.
  - Mounts the dashboard route at `/`.
  - Applies theme bundles through `AppThemeManager`.

Dashboard route:

- `src/pages/Dashboard.tsx`
  - Imports `DashboardOverview` at line 7.
  - Wraps the dashboard in `Layout` at line 71.
  - Passes `contentClassName="bg-background"` at line 76.
  - Sets `data-bd-page="dashboard"` at line 77.
  - Renders `DashboardOverview` at line 79.
  - Defines the floating create button with `hsl(var(--primary))` and `hsl(var(--secondary))` at lines 140-141.

Application shell:

- `src/components/Layout.tsx`
  - Main shell uses `data-bd-shell="app"` and `app-ambient` at line 196.
  - Main content wrapper uses `data-bd-shell="main"` at line 211.
  - Content wrapper uses `data-bd-layout="content"` and `data-bd-shell="content"` at lines 259-260.
  - Mobile bottom navigation is integrated from the layout.

Dashboard body:

- `src/components/dashboard/DashboardOverview.tsx`
  - Component starts at line 149.
  - Header background is `hsl(var(--bd-app-bg))` at line 204.
  - Menu and theme buttons use `--bd-surface-raised` at lines 211 and 238.
  - Search wrapper uses `--bd-surface-raised` at line 247.
  - AI button uses `--bd-primary` and `--bd-secondary` at line 255.
  - Recent Activity card uses `--bd-surface` and custom shadows at line 284.

Finance Pulse:

- `src/components/dashboard/KpiGrid.tsx`
  - The metric grid is the live Finance Pulse card system.
  - Default metric cards use `hsl(var(--surface))` and custom shadow strings at lines 125-130.
  - Decorative circles use `--bd-secondary` and `--bd-primary` at lines 142-143.
  - The small top ring uses `--bd-primary` at line 148.

Payment Reminder:

- `src/components/dashboard/PaymentReminderBanner.tsx`
  - Main surface uses `hsl(var(--surface))` and a custom shadow at line 38.
  - Decorative masked ring uses valid `--primary` and `--secondary` tokens at lines 60-64.
  - Icon and button gradients use valid `--primary` and `--secondary` tokens.

Recent Alerts:

- `src/components/dashboard/RecentAlertsCarousel.tsx`
  - Section surface uses `hsl(var(--surface))` and custom shadow at line 79.
  - Alert items use `hsl(var(--surface-raised))` at lines 146 and 151.

Bottom navigation:

- `src/components/layout/MobileBottomNav.tsx`
  - Uses fixed bottom positioning and `z-40` at line 22.
  - Uses `bg-[hsl(var(--nav))]`, `border-[hsl(var(--line-strong))]`, and `shadow-lg` at line 22.
  - Active item uses `--bd-nav-active-bg` and `--bd-nav-active-text`, not the exact reference active gradient.

Theme system:

- `src/lib/themeTokens.ts`
  - Defines project color tokens at line 13.
  - Does not define `bd-primary` or `bd-secondary`.
- `src/lib/themePresets.ts`
  - Defines PRD semantic tokens at lines 169-210.
  - Maps theme bundles at line 272.
  - Defines `bd-brand` and `bd-accent` at lines 384-387.
- `src/styles/formTheme.css`
  - Defines `--bd-app-bg` at line 6.
  - Defines fallback `--bd-nav-active-bg` as `--bd-surface-muted` at line 61.
  - Defines generic `--bd-shadow-*` tokens at lines 183-185.
- `src/index.css`
  - Sets global body radial background at lines 199-206.
  - Adds `.app-ambient` overlays at lines 215-248.

## 4. HTML Structural Anatomy

### Outer Canvas And App Shell

Reference construction:

- `body` uses a radial gradient canvas at line 82.
- `.app` sets `max-width: 430px`, `height: 100dvh`, `overflow: hidden`, and `background: var(--bg)` at line 86.
- `.grain` adds a full-screen, low-opacity noise overlay at line 87.
- `.shell` creates the content stacking layer with `z-index: 1` at line 88.
- `.scroll` creates the scroll layer and bottom-safe padding at line 89.

Structural effect:

- The reference separates viewport canvas, app canvas, noise texture, content shell, and scroll surface.
- The grain layer is decorative, but it is also depth-relevant because it prevents large surfaces from looking flat.
- The scroll layer is structural.

### Header And Workspace Identity

Reference construction:

- `.topbar` is sticky and uses a transparent-to-background gradient fade at line 91.
- `.top-btn` and `.avatar-btn` use raised surfaces, `var(--shadow-sm)`, and `var(--inset-highlight)` at line 94.
- The notification affordance is a small red dot in the top button.

Structural effect:

- The header is not just a row of controls.
- It has a fade layer, raised buttons, inset highlights, and edge contrast.

### Finance Pulse Metric Cards

Reference construction:

- `.metric-grid` creates a 2-column grid at line 109.
- `.metric` uses `background: var(--surface)`, `box-shadow: var(--shadow), var(--inset-highlight)`, and `overflow: hidden` at line 110.
- `.metric:after` adds a large decorative circle at line 111.
- `.metric:before` adds a smaller top ring at line 112.
- `.metric.collect` uses the primary gradient at line 114.
- `.metric.collect .tick-*` elements add white rule overlays at lines 115-119 and 127-128.

Structural effect:

- The cards get depth from surface, shadow, inset highlight, clipped overlays, and small decorative rings.
- The overlays are decorative, but they contribute to structural thickness because they are clipped inside the card and create foreground/background separation.

### Shared Card Surfaces

Reference construction:

- `.card` uses `background: var(--surface)` and `box-shadow: var(--shadow), var(--inset-highlight)` at line 137.
- `.activity-row + .activity-row` adds internal separators at line 138.

Structural effect:

- The card layer is a reusable elevation layer.
- The internal separators are content structure, not decoration.

### Payment Reminder

Reference construction:

- `.reminder` uses `position: relative`, `overflow: hidden`, and higher minimum height at line 153.
- `.reminder:after` adds a conic masked ring at line 154.
- Payment icon and CTA use accent gradients.

Structural effect:

- This section depends on a large clipped decorative overlay and a raised card shell.
- The decorative ring is depth-relevant because it anchors the right side of the surface.

### Recent Alerts

Reference construction:

- `.alert-item` uses `background: var(--surface-raised)` and `box-shadow: var(--shadow-sm)` at line 175.
- `.audit-dot` and `.audit-dot:after` use rings and shadows at lines 187-188.

Structural effect:

- Alerts are nested raised surfaces inside the larger card.
- The audit dot is a status marker and a micro-elevation element.

### Bottom Navigation And FAB

Reference construction:

- `.bottom` is absolute, rounded, borderless, and uses `background: var(--nav)`, `var(--shadow-float)`, and `var(--inset-highlight)` at line 191.
- `.tab.active` uses a gradient and shadow at line 194.
- `.fab` uses a gradient and strong shadow at line 195.
- `.fab:after` adds a pulsing ring when open at line 196.

Structural effect:

- The bottom bar floats above the canvas. It is not a flat fixed strip.
- The active tab and FAB have independent elevation.

### Responsive Behaviour

Reference construction:

- The app is mobile-first with `max-width: 430px`.
- On wider screens, a media query adds a centered phone-like frame at line 257.
- The bottom navigation is positioned inside the app container, not the full browser viewport.

Structural effect:

- The reference controls the presentation boundary. This is part of the approved visual anatomy.

## 5. Reference vs Live Comparison Matrix

| Area | Reference construction | Live construction | Difference | Likely effect |
|---|---|---|---|---|
| Canvas | `body` radial gradient, `.app`, `.grain`, `.shell`, `.scroll` | Global `body` radial background, `app-ambient`, layout wrappers, `contentClassName="bg-background"` | Reference grain and app-contained canvas are not preserved as dashboard-specific layers | Lower depth across all themes |
| Header | Sticky topbar with gradient fade and raised controls | Solid `bd-app-bg` header, raised wrappers, shared search and notification internals | Header fade is missing. Shared components add different borders and backgrounds | Controls can look flatter or inconsistent |
| Finance Pulse cards | Surface + reference shadow + inset + clipped pseudo overlays | Surface + custom shadow + clipped DOM overlays | Several overlays use invalid `--bd-primary` and `--bd-secondary` tokens | Strong contributor to washed-out card depth |
| Collect card | Gradient card + white rule overlays + shadow/inset | Gradient card + rule overlays + `shadow-lg` | Generic shadow replaces reference shadow/inset stack | Less precise elevation |
| Recent Activity | Shared card surface + shadow + inset + separators | `bd-surface` card + custom shadow + inset + live rows | Mostly preserved, but token namespace differs | Medium risk only |
| Payment Reminder | Surface + shadow + inset + masked ring | Surface + custom shadow + inset + masked ring | Mostly preserved with valid tokens | Not a primary cause |
| Recent Alerts | Raised alert surfaces inside card | Raised alert surfaces inside card | Mostly preserved | Low contribution |
| Bottom nav | Floating pill, no border, float shadow, inset, gradient active tab | Fixed pill, border, `shadow-lg`, token active state | Float shadow and inset are weaker. Active state is less faithful | Medium contribution |
| FAB | Gradient button, strong shadow, pulse ring when open | Gradient button, strong shadow | No static evidence of reference pulse ring preservation | Low to medium contribution |
| Theme behavior | Separate semantic tiers for canvas, base, raised, muted, strong, nav, shadows | Multiple tiers exist, but some theme presets collapse tiers and live code mixes namespaces | Color changes do not guarantee depth changes | Explains cross-theme flatness |

## 6. Theme System Findings

### Finding T1: Invalid Dashboard Token Names

Severity: High.  
Root-cause classification: C. Incorrect semantic token mapping. B. Missing CSS presentation layer.  
Confidence: High.

Evidence:

- `src/components/dashboard/KpiGrid.tsx` uses `--bd-secondary` and `--bd-primary` for decorative card overlays at lines 142-143.
- `src/components/dashboard/KpiGrid.tsx` uses `--bd-primary` for the small top ring at line 148.
- `src/components/dashboard/DashboardOverview.tsx` uses `--bd-primary` and `--bd-secondary` in the AI button gradient at line 255.
- `src/lib/themeTokens.ts` starts the color token registry at line 13 and does not define `bd-primary` or `bd-secondary`.
- `src/lib/themePresets.ts` maps `bd-brand` and `bd-accent` at lines 384-387, not `bd-primary` or `bd-secondary`.
- `tailwind.config.js` includes `bd-brand`, `bd-accent`, and related `bd-*` tokens, but not `bd-primary` or `bd-secondary`.

Effect:

- The live decorative declarations are not backed by the theme system.
- KPI overlays can become invalid or visually ineffective.
- The defect is theme-independent because changing theme presets does not define the missing variables.

Recommended correction:

- Use existing semantic tokens consistently.
- Prefer `--primary` and `--secondary` for PRD dashboard accents, or map central aliases if the design system requires `bd-*` names.
- Do not hardcode theme-specific colors.

### Finding T2: Surface Tiers Exist But Are Not Always Visually Separate

Severity: Medium.  
Root-cause classification: C. Incorrect semantic token mapping. E. Opacity/transparency issue. K. Insufficient runtime evidence for computed contrast.  
Confidence: Medium.

Evidence:

- Reference themes define distinct `--bg`, `--surface`, `--surface-raised`, `--surface-muted`, `--surface-strong`, `--line`, `--line-strong`, `--shadow`, `--shadow-float`, and `--nav` tokens.
- `src/lib/themePresets.ts` defines PRD semantic tokens at lines 169-210.
- Some shipped preset data maps several surface tiers to identical or near-identical values. For example, the shadcn-derived light and dark presets define very close canvas and surface tiers around lines 1141-1174.
- `src/styles/formTheme.css` defines fallback navigation active background as `--bd-surface-muted` at line 61.

Effect:

- Theme switching can change hue without improving elevation contrast.
- If base surface, raised surface, and muted surface are nearly identical, the dashboard remains flat even when the palette changes.

Recommended correction:

- Keep the existing theme presets, but ensure dashboard elevation uses tokens whose role is depth, not only color.
- Restore or introduce central semantic elevation tokens instead of increasing saturation.

### Finding T3: Dashboard Uses Mixed Token Namespaces

Severity: Medium.  
Root-cause classification: C. Incorrect semantic token mapping. D. CSS cascade or specificity conflict risk.  
Confidence: Medium.

Evidence:

- `src/components/dashboard/KpiGrid.tsx` uses `--surface`.
- `src/components/dashboard/PaymentReminderBanner.tsx` uses `--surface`.
- `src/components/dashboard/RecentAlertsCarousel.tsx` uses `--surface` and `--surface-raised`.
- `src/components/dashboard/DashboardOverview.tsx` uses `--bd-app-bg`, `--bd-surface-raised`, and `--bd-surface`.
- `src/pages/Dashboard.tsx` uses `bg-background` at line 76.

Effect:

- The live dashboard depends on several token layers at the same time.
- The theme engine sets many of these variables, but static inspection shows no single dashboard elevation contract.
- This increases the risk that some layers change by theme while others remain tied to global or fallback tokens.

Recommended correction:

- Centralize dashboard surface roles.
- Use one semantic contract for app canvas, base surface, raised surface, inset surface, borders, foreground text, and shadows.

## 7. Structural Thickness Assessment

Structural thickness was assessed as the combined effect of surface hierarchy, layer separation, tonal depth, edge definition, elevation, internal contrast, decorative integration, and foreground/background separation.

The live dashboard partially preserves structural thickness:

- Main metric cards exist.
- Several surfaces have shadows and inset highlights.
- Payment Reminder preserves its large decorative ring.
- Recent Alerts preserves nested raised surfaces.
- Bottom navigation exists as a floating pill.

The live dashboard loses structural thickness in important areas:

- The reference canvas and grain layer are not reproduced as dashboard-specific layers.
- Header fade and topbar depth are weaker.
- KPI decorative overlays use invalid token names.
- Reference shadow tokens are replaced by ad hoc shadows or Tailwind `shadow-*`.
- Bottom navigation lacks the exact float shadow and inset highlight model.
- Some theme presets collapse surface tiers, so theme switching does not restore depth.

The audit does not support a blanket recommendation to add more DOM wrappers. Most missing depth is CSS presentation and token alignment. The existing React structure can support the approved look if the CSS layers and semantic tokens are restored carefully.

## 8. Section-by-Section Findings

### 8.1 Header And Workspace Identity

Severity: Medium.  
Root-cause classification: B. Missing CSS presentation layer. D. CSS cascade or specificity conflict. J. Intentional implementation difference.  
Confidence: Medium.

Reference visual construction:

- `.topbar` uses sticky positioning and a gradient fade at line 91.
- `.top-btn` and `.avatar-btn` use raised surfaces, `var(--shadow-sm)`, and `var(--inset-highlight)` at line 94.

Live visual construction:

- `DashboardOverview.tsx` sets the header to solid `hsl(var(--bd-app-bg))` at line 204.
- Menu and theme controls use raised surfaces at lines 211 and 238.
- The search wrapper uses a raised surface at line 247.
- `GlobalSearch.tsx` internally uses hardcoded slate border and hover utilities around its button.
- `NotificationBell.tsx` brings its own button, border, and notification presentation.

Exact structural differences:

- The header fade layer is missing.
- Shared components partly replace the approved simple top-button model.
- Header controls are structurally present, but their internal presentation differs from the reference.

Theme interaction:

- Header background changes through `--bd-app-bg`.
- The missing fade and shared-component internal styling do not improve simply by changing theme.

Likely effect on perceived depth:

- Medium. The first viewport loses some top-layer depth and polish.

Recommended correction:

- Restore the topbar fade and align all header controls to the same raised-control contract.
- Keep shared search and notification behavior intact.

### 8.2 Finance Pulse Section

Severity: High.  
Root-cause classification: B. Missing CSS presentation layer. C. Incorrect semantic token mapping. F. Elevation/shadow issue.  
Confidence: High.

Reference visual construction:

- `.metric-grid` uses a two-column grid at line 109.
- `.metric` uses the shared surface, reference shadow, and inset highlight at line 110.
- `.metric:after` and `.metric:before` add clipped decorative layers at lines 111-112.

Live visual construction:

- `KpiGrid.tsx` preserves the grid and card structure.
- Cards use `hsl(var(--surface))` and custom shadows at lines 125-130.
- Decorative DOM overlays are present at lines 136-148.
- Several overlay colors use undefined `--bd-primary` and `--bd-secondary` tokens at lines 142-143 and 148.

Exact structural differences:

- The live implementation uses DOM overlay spans rather than pseudo-elements. That is acceptable because they can render the same visual layer.
- The layer colors are not reliably connected to the theme system.
- The collect card uses `shadow-lg`, not the reference `var(--shadow), var(--inset-highlight)` stack.

Theme interaction:

- The invalid token names are not fixed by theme switching.
- The affected overlays are likely absent or ineffective in every theme.

Likely effect on perceived depth:

- High. These cards dominate the first mobile viewport.

Recommended correction:

- Replace invalid token consumption with existing semantic tokens.
- Restore reference-like shadow and inset semantics for all metric cards.
- Do not add extra wrappers unless a visual layer cannot be created with the existing card structure.

### 8.3 Finance Metric Cards

Severity: High.  
Root-cause classification: C. Incorrect semantic token mapping. F. Elevation/shadow issue.  
Confidence: High.

Reference visual construction:

- Normal metric cards depend on surface, shadow, inset highlight, large clipped circle, and top ring.
- The collect card depends on gradient, white internal rules, and elevation.

Live visual construction:

- Metric card shells and clipped overlays are present.
- The white rule overlays for the collect card are present.
- The normal-card decorative color declarations use undefined `bd-*` variables.

Exact structural differences:

- Missing DOM structure is not the main problem.
- Missing or invalid CSS presentation is the main problem.

Theme interaction:

- Because the invalid variable names are outside the defined token system, all themes can inherit the same flatness.

Likely effect on perceived depth:

- High.

Recommended correction:

- Make metric decorative layers consume valid PRD semantic tokens.
- Preserve functional KPI data and calculations.

### 8.4 Recent Activity

Severity: Medium.  
Root-cause classification: C. Incorrect semantic token mapping. F. Elevation/shadow issue.  
Confidence: Medium.

Reference visual construction:

- `.card` uses `var(--surface)`, `var(--shadow)`, and `var(--inset-highlight)` at line 137.
- Rows use internal dividers at line 138.

Live visual construction:

- `DashboardOverview.tsx` Recent Activity card uses `hsl(var(--bd-surface))`, a custom shadow, and an inset highlight at line 284.
- Live rows are data-driven and include status and action presentation.

Exact structural differences:

- The live card surface is close to the reference.
- The token namespace differs from adjacent dashboard sections.
- The exact reference shadow token is not used.

Theme interaction:

- The section can remain flat if `--bd-surface` and the page background are close in a given theme.

Likely effect on perceived depth:

- Medium. It contributes to the overall feel, but it is not the strongest defect.

Recommended correction:

- Align this card with the same dashboard surface and elevation contract used by metric cards.
- Preserve live activity data and row behavior.

### 8.5 Payment Reminder

Severity: Low.  
Root-cause classification: J. Intentional implementation difference. K. Insufficient evidence for a defect.  
Confidence: Medium-high.

Reference visual construction:

- `.reminder` uses a raised card shell and clipped decorative ring at lines 153-154.

Live visual construction:

- `PaymentReminderBanner.tsx` uses `hsl(var(--surface))`, shadow, inset highlight, and `overflow-hidden` at line 38.
- The decorative masked ring uses valid `--primary` and `--secondary` tokens at lines 60-64.

Exact structural differences:

- The live structure is materially close to the reference.
- Any mismatch is likely in exact sizing, shadow values, or theme contrast, not in missing structure.

Theme interaction:

- The ring uses valid semantic accent tokens.

Likely effect on perceived depth:

- Low as a root cause. It is not the main source of the washed-out appearance.

Recommended correction:

- Keep this section largely intact.
- Only tune it if a centralized elevation update changes shared surface behavior.

### 8.6 Recent Alerts

Severity: Low to Medium.  
Root-cause classification: F. Elevation/shadow issue. J. Intentional implementation difference.  
Confidence: Medium.

Reference visual construction:

- Alert items use `var(--surface-raised)` and `var(--shadow-sm)` at line 175.
- Status dots use layered rings and shadow at lines 187-188.

Live visual construction:

- `RecentAlertsCarousel.tsx` uses a card surface at line 79.
- Alert items use `hsl(var(--surface-raised))` at lines 146 and 151.

Exact structural differences:

- Nested raised surfaces are preserved.
- Exact dot and micro-shadow treatment may differ.

Theme interaction:

- If `surface` and `surface-raised` are close in a preset, the nested surface will not read as raised.

Likely effect on perceived depth:

- Low to Medium.

Recommended correction:

- Let this section inherit a fixed shared elevation contract.
- Avoid section-specific color hardcoding.

### 8.7 Bottom Navigation

Severity: Medium.  
Root-cause classification: F. Elevation/shadow issue. B. Missing CSS presentation layer. J. Intentional implementation difference.  
Confidence: Medium.

Reference visual construction:

- `.bottom` uses `background: var(--nav)`, `box-shadow: var(--shadow-float), var(--inset-highlight)`, and no border at line 191.
- `.tab.active` uses a gradient and shadow at line 194.

Live visual construction:

- `MobileBottomNav.tsx` uses `bg-[hsl(var(--nav))]`, a border, and `shadow-lg` at line 22.
- Active state uses `--bd-nav-active-bg` and `--bd-nav-active-text`.

Exact structural differences:

- The nav shell exists.
- The reference float shadow and inset highlight are not preserved.
- The active tab is token-driven, but not the exact gradient construction from the reference.

Theme interaction:

- The nav background changes by theme.
- Missing float shadow and inset highlight do not come back through theme switching.

Likely effect on perceived depth:

- Medium. The bottom nav is always visible and strongly affects the mobile composition.

Recommended correction:

- Centralize bottom-nav elevation and active-tab depth.
- Preserve navigation routing and accessibility.

### 8.8 Floating Action Button Integration

Severity: Low to Medium.  
Root-cause classification: B. Missing CSS presentation layer. F. Elevation/shadow issue.  
Confidence: Medium.

Reference visual construction:

- `.fab` uses gradient and strong shadow at line 195.
- `.fab:after` adds a pulse ring when open at line 196.

Live visual construction:

- `Dashboard.tsx` uses valid `--primary` and `--secondary` gradient tokens at line 140.
- It sets a strong box shadow at line 141.

Exact structural differences:

- The main button is close.
- No static evidence was found for the reference open-state pulse ring.

Theme interaction:

- Main FAB color should respond to valid theme tokens.

Likely effect on perceived depth:

- Low to Medium.

Recommended correction:

- Add only the missing open-state visual layer if it is still desired.
- Keep existing create-menu behavior.

### 8.9 Overall Page Background And Transitions

Severity: High.  
Root-cause classification: A. Missing structural layer. B. Missing CSS presentation layer. C. Incorrect semantic token mapping.  
Confidence: Medium-high.

Reference visual construction:

- Body radial gradient, app background, grain overlay, shell, scroll layer, and sticky header fade combine into the base composition.

Live visual construction:

- `src/index.css` defines a global body background at lines 199-206.
- `.app-ambient` defines global overlay effects at lines 215-248.
- `Dashboard.tsx` passes `contentClassName="bg-background"` at line 76.
- `DashboardOverview.tsx` uses a solid header background at line 204.

Exact structural differences:

- The dashboard does not have the same local canvas anatomy as the reference.
- The content background can flatten the global ambient layer.
- The reference grain layer is absent from the live dashboard structure.

Theme interaction:

- Theme changes alter token values, but do not restore the missing local layering.

Likely effect on perceived depth:

- High. This affects every section at once.

Recommended correction:

- Restore the approved dashboard canvas and scroll-layer presentation in a scoped way.
- Avoid broad global CSS changes unless the issue is proven to be global.

## 9. Confirmed Root Causes

### Root Cause 1: Invalid Dashboard Accent Tokens

Severity: High.  
Classification: C, B.  
Confidence: High.

Evidence:

- Undefined `--bd-primary` and `--bd-secondary` are used in `KpiGrid.tsx` and `DashboardOverview.tsx`.
- The token system defines `--primary`, `--secondary`, `--bd-brand`, and `--bd-accent`, not `--bd-primary` or `--bd-secondary`.

Likely contribution:

- Very high for Finance Pulse flatness.
- Medium for header action flatness.

Recommended correction:

- Map these declarations to defined semantic tokens.
- Keep the correction centralized or use existing tokens directly.

### Root Cause 2: Reference Canvas Layers Are Not Preserved

Severity: High.  
Classification: A, B.  
Confidence: Medium-high.

Evidence:

- Reference HTML uses `.app`, `.grain`, `.shell`, `.scroll`, and body radial gradient at lines 82 and 86-89.
- Live layout uses global `app-ambient`, layout wrappers, and `bg-background`.
- No dashboard-local grain layer was found in the live implementation.

Likely contribution:

- High across the whole dashboard.

Recommended correction:

- Restore dashboard-local canvas layers with scoped styles.
- Keep the global app shell stable.

### Root Cause 3: Elevation Tokens Are Replaced By Mixed Ad Hoc Shadows

Severity: Medium-high.  
Classification: F, B.  
Confidence: Medium-high.

Evidence:

- Reference HTML uses `--shadow`, `--shadow-sm`, `--shadow-float`, and `--inset-highlight`.
- Live components use a mix of custom shadow strings and Tailwind `shadow-lg` or `shadow-md`.
- `formTheme.css` defines generic `--bd-shadow-*`, but the dashboard does not consistently consume a reference-like elevation contract.

Likely contribution:

- Medium-high. It reduces consistent surface hierarchy.

Recommended correction:

- Define or reuse central elevation tokens for dashboard cards, controls, nav, and FAB.
- Avoid per-section shadow drift.

### Root Cause 4: Surface Tokens Can Collapse Across Some Themes

Severity: Medium.  
Classification: C, E.  
Confidence: Medium.

Evidence:

- Some theme presets define identical or near-identical canvas, surface, and raised values.
- Live sections rely on subtle surface differences and generic shadows.

Likely contribution:

- Medium. It explains why switching themes may not resolve the washed-out appearance.

Recommended correction:

- Preserve semantic depth relationships in each theme.
- Do not solve this by increasing saturation alone.

### Root Cause 5: Shared Controls Introduce Presentation Drift

Severity: Medium.  
Classification: D, J.  
Confidence: Medium.

Evidence:

- The reference top controls are simple raised buttons.
- Live header uses shared `GlobalSearch` and `NotificationBell` internals with their own borders, backgrounds, hover styles, and notification presentation.

Likely contribution:

- Medium in the header.

Recommended correction:

- Provide dashboard-specific visual wrappers or variants for shared controls.
- Preserve shared functionality.

## 10. Unverified Hypotheses

These items cannot be established by static inspection alone:

- Android WebView rendering defects. No runtime or device validation was performed. No evidence supports this as a primary cause.
- Exact computed color contrast for each active theme. Static token values show risk, but computed cascade was not measured.
- Exact shadow rendering differences in the live browser. Static CSS shows different declarations, but no runtime screenshots were taken.
- Exact z-index conflicts. Source inspection found different stacking models, but no runtime overlay conflict was proven.
- Exact screenshot-to-live pixel differences. The approved screenshot was considered visually, but no browser automation or pixel comparison was run.

Screenshot-only observations:

- The approved screenshot shows a pale blue and white canvas, soft but visible card elevation, strong clipped KPI overlays, a navy collect card, a large payment reminder ring, and a floating bottom nav.
- These observations support the structural analysis, but the screenshot alone does not prove the live computed cause.

## 11. Ranked Correction Recommendations

No corrections were implemented in this audit.

1. Fix invalid dashboard token usage.
   - Replace or centrally alias `--bd-primary` and `--bd-secondary`.
   - Use existing semantic tokens such as `--primary`, `--secondary`, `--bd-brand`, or `--bd-accent`.
   - This is the smallest high-impact correction.

2. Restore a dashboard-local canvas model.
   - Recreate the approved app canvas, scroll layer, and grain or texture layer in a scoped way.
   - Avoid broad global CSS changes unless later evidence proves they are needed.

3. Centralize dashboard elevation.
   - Use shared dashboard elevation tokens for cards, top controls, bottom nav, and FAB.
   - Preserve `box-shadow + inset highlight` pairing where the reference requires it.

4. Align Finance Pulse card layers.
   - Keep the existing React card structure.
   - Restore valid clipped overlays, top rings, inset highlights, and reference-like shadow geometry.

5. Normalize dashboard surface token consumption.
   - Use one semantic contract for app canvas, base surface, raised surface, muted surface, inset surface, borders, shadows, and foreground text.
   - Avoid mixing `--surface`, `--bd-surface`, and `bg-background` without a clear role.

6. Reconcile header shared controls.
   - Keep shared search and notification behavior.
   - Add a dashboard visual variant if needed so top controls match the approved raised button model.

7. Restore bottom navigation depth.
   - Use a float shadow and inset highlight.
   - Keep route behavior and accessibility.
   - Do not hardcode theme-specific nav colors.

8. Verify with runtime only after an implementation task is approved.
   - The next phase should use controlled screenshots and computed styles.
   - That was intentionally excluded from this audit.

## 12. Implementation Risks and Guardrails

Preserve:

- Dashboard business data.
- Financial calculations.
- Navigation behavior.
- Create action behavior.
- Theme switching.
- User-selected themes.
- Responsive Mobile/Fold layouts.
- Accessibility behavior.
- Shared component contracts.

Avoid:

- Hardcoded theme-specific colors.
- Saturation-only fixes.
- New nested wrappers unless a visual layer cannot be expressed with the current structure.
- Global CSS changes before local dashboard causes are corrected.
- Rebuilding the dashboard.
- Treating Android WebView as defective without evidence.

Centralize:

- Token alias correction.
- Elevation tokens.
- Surface role mapping.
- Bottom navigation elevation if shared by other mobile screens.

Keep dashboard-specific:

- Finance Pulse decorative overlays.
- Header fade behavior if unique to the dashboard.
- Payment Reminder decorative ring if unique to the dashboard.
- Any screenshot-specific dashboard texture layer.

## 13. Static Verification And Git Status

Initial git status:

```text
## main...origin/main
```

Pre-existing modifications:

- None found before investigation.

Final git status observed after the report was written:

```text
## main...origin/main
 M AGENTS.md
MM README.md
 M "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/17-app-entry-and-onboarding.md"
 M src/App.tsx
 D src/components/app/SplashOverlay.tsx
 M src/components/app/TenantGate.tsx
 M src/components/app/UpdateBanner.tsx
 M src/components/app/UpdateGate.tsx
 M src/components/app/UpdateSheet.tsx
 M src/index.css
 M src/pages/ColdLaunchPreview.tsx
 M src/pages/PhotoHeroPreview.tsx
?? "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/dashboard/themes/mobile-dashboard-slate-amber-glass-candidate.html"
?? docs/reports/dashboard-structural-thickness-fidelity-audit-2026-10-09.md
?? docs/reports/general/2026-10-09-cold-launch-atmospheric-rescue.md
?? docs/reports/general/2026-10-09-onboarding-v2-light-mode-atmospheric-system.md
?? docs/reports/general/2026-10-10-cold-launch-v1-forensic-audit.md
?? docs/reports/general/2026-10-10-cold-launch-v1-production-repair.md
?? docs/reports/general/2026-10-10-cold-launch-v1-production-startup.md
?? src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx
?? src/components/onboarding/
?? src/tests/critical/coldLaunchPreviewAtmosphere.test.js
?? src/tests/critical/coldLaunchProductionStartup.test.js
?? src/tests/critical/photoHeroV2LightMode.test.js
```

Final git status note:

- The final workspace status contains unrelated changes.
- Those unrelated changes were not created, edited, or reverted by this audit.
- The only file created or modified by this audit is the dashboard fidelity report listed below.

Commands intentionally not run:

- No development server.
- No browser automation.
- No application execution.
- No `bun run build`.
- No `bun run typecheck`.
- No linting.
- No `bun run audit:load`.
- No runtime validation.

Files modified by this task:

- `docs/reports/dashboard-structural-thickness-fidelity-audit-2026-10-09.md`

Application source files modified:

- None.

Supabase status:

- No Supabase changes.
- No migrations.
- No database push.

Verification note:

- The standard verification gate was limited by the explicit strict audit exclusions. Static source inspection and git status were used instead.

## 14. Final Verdict

The live dashboard is flatter than the approved HTML for structural reasons and token reasons.

The highest-confidence cause is invalid semantic token usage in dashboard decorative layers. The Finance Pulse cards use accent variables that are not defined by the theme system. This can remove or weaken the visual layers that give the approved metric cards their thickness.

The broader cause is that the live implementation does not fully preserve the reference depth model. The approved HTML relies on canvas layering, clipped overlays, inset highlights, and purpose-built shadow tokens. The live implementation keeps some sections close, but it mixes token namespaces, uses ad hoc shadows, and relies on shared controls whose internal styles differ from the approved design.

Changing themes does not solve the problem because the missing or invalid layers remain missing or invalid. Some themes also have little separation between base and raised surfaces. The minimal correction strategy should first restore semantic token correctness and shared elevation behavior, then restore the dashboard-specific canvas and Finance Pulse presentation layers.

