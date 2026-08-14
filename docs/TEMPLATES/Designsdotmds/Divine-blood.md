# Divine Blood — Responsive & Adaptive Design System

> Golden light meets sacred crimson. One visual bloodline, adaptive across every screen.

---

## 1. Core Responsive Principle

Divine Blood is one adaptive interface, not separate mobile, tablet, foldable, and desktop designs. The visual identity remains consistent while the layout architecture responds to available viewport space.

### Supported Devices
* Mobile phones
* Flip phones
* Foldable phones
* Tablets
* Desktop laptops
* Desktop monitors
* Wide / ultrawide displays
* Portrait orientation
* Landscape orientation

### Responsive Triggers
The interface responds primarily to:
* Viewport width
* Viewport height
* Aspect ratio
* Orientation
* Touch/pointer capability
* Safe-area insets
* Fold/hinge geometry (where available)

> **Core Rule:** Never design exclusively around a specific device brand or model.

---

## 2. Responsive Breakpoints

```css
:root {
  --breakpoint-mobile: 0px;
  --breakpoint-tablet: 640px;
  --breakpoint-desktop: 1024px;
  --breakpoint-wide: 1440px;
}

| Breakpoint Tier | Range | Target Devices & Context |
|---|---|---|
| Mobile | 0–639px | Phones, Flip cover displays, Small foldable outer displays |
| Tablet / Fold Inner Portrait | 640–1023px | Tablets, Foldables opened in portrait, Small landscape devices |
| Desktop | 1024–1439px | Laptops, Desktop monitors, Foldables opened in landscape |
| Wide | 1440px+ | Large monitors, Ultrawide displays |
Breakpoints describe available space rather than device identity.
3. Device Architecture
| Device Frame | Navigation | Main Content | Right Rail |
|---|---|---|---|
| Mobile | Edge-to-edge | Bottom nav / drawer | 1 column |
| Flip Cover | Edge-to-edge | Bottom nav / compact rail | 1 column |
| Flip Open | Adaptive | Bottom nav or compact rail | 1–2 columns |
| Fold Cover | Edge-to-edge | Bottom nav / icon rail | 1 column |
| Fold Inner Portrait | 8–12px inset | Icon rail / collapsible sidebar | 1–2 columns |
| Fold Inner Landscape | 8–16px inset | Sidebar / icon rail | 2 columns |
| Tablet | 8–16px inset | Collapsible sidebar | 1–2 columns |
| Desktop | 16–24px inset | Full sidebar | 2–3 columns |
| Wide | 24px+ inset | Full sidebar | Expanded 3-column |
4. Mobile
 * Width: 0–639px
 * Frame:
   * Full viewport width
   * No wallpaper margin
   * border-radius: 0
   * No desktop floating-frame treatment
   * Note: The wallpaper may remain visually present through the app background, but the application itself should occupy the full viewport.
Navigation
Desktop sidebar becomes:
 * Bottom navigation, or
 * Hamburger drawer
Bottom Navigation Specifications:
 * 56–64px height
 * Minimum 44×44px touch targets
 * 4–5 primary destinations
 * Secondary destinations move into the drawer
Top Bar
 * Sticky
 * Compact
 * Breadcrumb truncates
 * Theme toggle remains accessible
 * Search may become an icon/button
 * "Ask ReprAI" becomes a 56px Floating Action Button (FAB)
Content Layout
 * Single-column layout
 * Cards: padding: 12px–16px;
 * Grid gap: 8px–12px;
 * Section gap: 12px–16px;
Hero Section
Stack vertically:
 * Image / atmosphere
 * Tags
 * Title
 * Supporting information
 * CTA
KPI Section
Use either:
 * Horizontal scrolling strip, or
 * 2×3 grid
Do not force six narrow columns onto a phone.
Right Rail
Convert to:
 * Bottom sheet
 * Accordion
 * Expandable card
Never squeeze the desktop right rail into the mobile viewport.
5. Flip Phones
Flip devices must support both the cover display and the unfolded display.
Closed / Cover Display
Treat the cover display as a compact mobile device.
 * Characteristics:
   * Edge-to-edge
   * Bottom navigation
   * Compact top bar
   * Single-column cards
   * Horizontal KPI scrolling
   * FAB for ReprAI
   * Reduced typography scale
 * Do not attempt to render the desktop sidebar.
Open Flip
Use available viewport width.
 * Below 640px: Apply Mobile architecture
 * Reaches Tablet width: Apply Tablet architecture
 * Reaches Desktop width: Apply Desktop architecture
The device itself must never dictate a fixed layout.
6. Foldable Devices
Foldables have two fundamentally different layouts.
Fold Cover
Treat as mobile.
 * Edge-to-edge
 * Bottom navigation
 * Single column
 * Compact hero
 * Horizontal KPI scrolling
 * Bottom-sheet right rail
Fold Inner Portrait
Treat as compact tablet.
 * Frame Inset: 8–12px
 * Frame Radius: 16–20px
 * Navigation Rail: 64–72px collapsible
 * Layout: 1–2 content columns
 * KPI: 2×3 grid
 * Right Rail: Narrow / collapsible
 * Hero: May become horizontal
Fold Inner Landscape
Treat as compact desktop.
 * Frame Inset: 8–16px
 * Frame Radius: 16–20px
 * Navigation: Sidebar or icon rail
 * Layout: Main content + right rail (2-column primary content)
 * Hero: Horizontal
 * KPI Grid: May return to six columns when space permits
7. Hinge / Fold Awareness
Foldable interfaces must not place important controls underneath a hinge or unsafe display region. Where supported, use viewport segment information.
/* Pseudocode / progressive enhancement */
@media (horizontal-viewport-segments: 2) {
  /* Treat each display segment as a layout region. */
}

When hinge information is unavailable:
 * Prefer generous gutters.
 * Avoid placing critical controls exactly at the visual center.
 * Allow the layout to gracefully collapse into a single-column mode.
 * Never assume a foldable has a perfectly usable rectangular canvas.
 * Important content should remain accessible even when the device is partially folded.
8. Tablet
 * Width: 640–1023px
 * Tablet uses a hybrid architecture.
Navigation
Either:
 * 64–72px icon rail, or
 * Collapsible sidebar
Main Content
 * Use 1 column when space is constrained.
 * Use 2 columns when enough horizontal space exists.
Right Rail
The desktop 320–360px rail becomes:
 * 240–280px narrow panel
 * Tab toggle
 * Collapsible section
 * Bottom sheet when necessary
Components
 * Hero: Prefer horizontal layout when width allows.
 * KPI: Use 3 × 2 layout rather than six narrow columns.
9. Desktop
 * Width: 1024–1439px
 * Use the full Divine Blood terminal architecture.
┌───────────────────────────────────────────────────────────┐
│                          TOP BAR                          │
├──────────────┬──────────────────────────────┬───────────────┤
│              │                              │               │
│   SIDEBAR    │         MAIN CONTENT         │  RIGHT RAIL   │
│  260–280px   │                              │   320–360px   │
│              │                              │               │
└──────────────┴──────────────────────────────┴───────────────┘

Specifications
 * Frame:
   * 16–24px viewport inset
   * 20–24px radius
   * Wallpaper visible around the frame
   * Soft atmospheric elevation
 * Sidebar: width: 260px–280px;
 * Right Rail: width: 320px–360px;
 * Main Content: Flexible (Use CSS Grid rather than fixed pixel positioning).
10. Wide Desktop
 * Width: 1440px+
 * Do not allow the application to become excessively stretched.
Specifications
.app-container {
  max-width: 1800px;
  margin-inline: auto;
}

 * Wallpaper remains visible around the frame.
 * Right Rail: May grow slightly (320px–380px).
 * Main Content: Receives additional breathing room rather than indefinitely increasing card widths.
11. Orientation
Orientation must be handled independently from breakpoint.
Portrait
Prioritize:
 * Vertical hierarchy
 * Single/dual column layouts
 * Bottom navigation
 * Compact headers
Landscape
Prioritize:
 * Horizontal hero layouts
 * Additional columns
 * Side navigation
 * Right rail
 * Wider KPI layouts
@media (orientation: landscape) {
  .hero {
    grid-template-columns: 1.2fr 0.8fr;
  }
}

Do not simply rotate the portrait layout.
12. Touch Adaptation
When a coarse pointer is detected:
@media (pointer: coarse) {
  button, a, input, [role="button"] {
    min-width: 44px;
    min-height: 44px;
  }
}

Touch Target Minimum Sizes
 * Mobile: 44–48px
 * Fold cover: 44–48px
 * Fold inner: 40–44px
 * Tablet: 40–44px
 * Desktop: minimum 40px
Increase spacing between adjacent interactive controls on touch devices.
13. Safe Areas
Support devices with camera cutouts, rounded corners, and gesture navigation.
.app {
  padding-top: max(16px, env(safe-area-inset-top));
  padding-right: max(16px, env(safe-area-inset-right));
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  padding-left: max(16px, env(safe-area-inset-left));
}

.bottom-nav {
  padding-bottom: max(8px, env(safe-area-inset-bottom));
}

Never position essential controls flush against unsafe viewport edges.
14. Responsive Typography
Typography scales smoothly rather than jumping dramatically. Typography remains visually consistent across modes—only scale changes.
| Text Element | Mobile Scale | Tablet / Fold Inner | Desktop Scale |
|---|---|---|---|
| Hero | 22–24px | 24–26px | 28–30px |
| Metric XL | 20–22px | 22–24px | 26–28px |
| Metric L | 18–20px | 20–22px | 22–24px |
| Card Title | 14px | 15px | 15–16px |
| Body | 13px | 13–14px | 13–14px |
| Caption | 11px | 12px | 12px |
15. Responsive Spacing
/* Mobile */
:root {
  --frame-padding: 0px;
  --card-padding: 12px 16px;
  --section-gap: 12px 16px;
  --grid-gap: 8px 12px;
}

/* Tablet / Fold */
@media (min-width: 640px) {
  :root {
    --frame-padding: 8px 12px;
    --card-padding: 16px 20px;
    --section-gap: 16px 20px;
    --grid-gap: 12px 16px;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  :root {
    --frame-padding: 16px 24px;
    --card-padding: 20px 24px;
    --section-gap: 20px 24px;
    --grid-gap: 16px 24px;
  }
}

16. Responsive Component Rules
Every component must have a defined compact state.
 * Sidebar
   * Desktop: Full sidebar
   * Tablet: Icon rail / drawer
   * Mobile: Bottom navigation / drawer
 * Hero
   * Desktop: Horizontal
   * Tablet: Horizontal when space allows
   * Mobile: Vertical
 * KPI
   * Desktop: 6 columns
   * Tablet: 3 × 2
   * Mobile: 2 × 3 or horizontal scroll
 * Right Rail
   * Desktop: Fixed 320–360px
   * Tablet: 240–280px / toggle
   * Mobile: Bottom sheet / accordion
 * Ask ReprAI
   * Desktop: Top-bar pill
   * Tablet: Top-bar pill
   * Mobile: 56px FAB
   * Fold cover: 56px FAB
   * Fold inner: Pill when space permits
17. Grid Architecture
Use CSS Grid and flexible tracks.
/* Preferred Desktop Setup */
.dashboard {
  display: grid;
  grid-template-columns: minmax(240px, 280px) minmax(0, 1fr) minmax(300px, 360px);
}

/* Tablet Breakdown */
@media (max-width: 1023px) {
  .dashboard {
    grid-template-columns: minmax(64px, 72px) minmax(0, 1fr);
  }
  .right-rail {
    display: none;
  }
}

/* Mobile Breakdown */
@media (max-width: 639px) {
  .dashboard {
    display: block;
  }
  .sidebar {
    display: none;
  }
}

Avoid fixed absolute positioning for primary layout regions.
18. Desktop Floating Frame
Desktop Frame
Wallpaper Background
  ↓
┌──────────────────────────────────────┐
│ Divine Blood App Frame               │
│                                      │
│  Sidebar   Main Content   Right Rail │
│                                      │
└──────────────────────────────────────┘

Mobile Layout
┌─────────────────────┐
│ Divine Blood Header │
│                     │
│ Main Content        │
│                     │
├─────────────────────┤
│ Bottom Navigation   │
└─────────────────────┘

The floating frame progressively disappears as viewport width decreases.
19. Mode + Responsive Behavior
Responsive behavior must never change the color hierarchy.
Gold Light
WHITE / WARM NEUTRAL (Dominant) ──► GOLD ──► CRIMSON (Supporting)

Gold remains dominant. Crimson remains supporting.
Crimson Dark
BLACK / CRIMSON-BLACK (Dominant) ──► CRIMSON ──► GOLD (Supporting)

Crimson remains dominant. Gold remains supporting.
> Universal Application: This hierarchy remains true across Mobile, Flip, Fold, Tablet, Desktop, and Wide Desktop.
> 
20. Motion Across Devices
Desktop
 * Hover interactions enabled
 * Subtle card lift
 * Chart animation
 * Theme transition
Touch
 * Remove hover-dependent functionality
 * Use pressed states
 * Shorter feedback animations
Theme Transitions
.theme-transition {
  transition: 
    background-color 300ms ease-in-out,
    color 300ms ease-in-out,
    border-color 300ms ease-in-out,
    box-shadow 300ms ease-in-out;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

21. Accessibility
Responsive design must remain accessible.
 * Minimum 44×44px touch targets
 * Keyboard navigation on desktop
 * Visible focus states
 * Screen-reader labels
 * Charts accompanied by text summaries
 * Status communicated through text and iconography, not color alone
 * Sufficient contrast
 * Reduced-motion support
 * Safe-area support
 * No essential information hidden exclusively behind hover
 * No critical action dependent on precise pointer positioning
22. Responsive QA Matrix
Every release must be checked at minimum at the following target resolutions:
 * Mobile:
   * 320×568
   * 375×667
   * 390×844
   * 430×932
 * Flip / Fold Cover:
   * Narrow cover viewport
   * Portrait cover
   * Landscape cover (where supported)
 * Fold Inner:
   * Portrait
   * Landscape
   * Dual-segment / hinge configuration (where available)
 * Tablet:
   * 768×1024
   * 820×1180
   * 1024×768
 * Desktop:
   * 1280×720
   * 1366×768
   * 1440×900
   * 1920×1080
 * Wide:
   * 2560×1440
   * Ultrawide aspect ratios
23. Final Adaptive Rule
Divine Blood is not:
> Desktop design + smaller desktop design + mobile design
> 
It is:
ONE DESIGN SYSTEM
  ↓
AVAILABLE SPACE
  ↓
LAYOUT RESOLUTION
  ↓
Mobile / Flip / Fold / Tablet / Desktop / Wide

The interface should feel native to every form factor while remaining recognizably Divine Blood.
 * The layout adapts.
 * The typography scales.
 * The navigation transforms.
 * The columns collapse.
 * The right rail relocates.
 * The hero reflows.
 * The cards resize.
 * The wallpaper/frame treatment changes with available space.
Immutable Brand Language
 * Gold Light → White + Gold lead, Crimson supports.
 * Crimson Dark → Black + Crimson lead, Gold supports.
One Divine Blood system across every screen.

