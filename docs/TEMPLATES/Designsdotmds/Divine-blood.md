# Divine Blood — Responsive & Adaptive Design System

> Golden light meets sacred crimson. One visual bloodline, adaptive across every screen.

## 1. Core Responsive Principle

Divine Blood is one adaptive interface, not separate mobile, tablet,
foldable, and desktop designs.

The visual identity remains consistent while the layout architecture
responds to available viewport space.

The system must support:

- Mobile phones
- Flip phones
- Foldable phones
- Tablets
- Desktop laptops
- Desktop monitors
- Wide / ultrawide displays
- Portrait orientation
- Landscape orientation

The interface responds primarily to:

- Viewport width
- Viewport height
- Aspect ratio
- Orientation
- Touch/pointer capability
- Safe-area insets
- Fold/hinge geometry where available

Never design exclusively around a specific device brand or model.

---

# 2. Responsive Breakpoints

```css
--breakpoint-mobile: 0px;
--breakpoint-tablet: 640px;
--breakpoint-desktop: 1024px;
--breakpoint-wide: 1440px;

Mobile

0–639px

Target:

Phones

Flip cover displays

Small foldable outer displays


Tablet / Fold Inner Portrait

640–1023px

Target:

Tablets

Foldables opened in portrait

Small landscape devices


Desktop

1024–1439px

Target:

Laptops

Desktop monitors

Foldables opened in landscape


Wide

1440px+

Target:

Large monitors

Ultrawide displays


Breakpoints describe available space rather than device identity.


---

3. Device Architecture

Device	Frame	Navigation	Main Content	Right Rail

Mobile	Edge-to-edge	Bottom nav / drawer	1 column	Bottom sheet
Flip Cover	Edge-to-edge	Bottom nav / compact rail	1 column	Bottom sheet
Flip Open	Adaptive	Bottom nav or compact rail	1–2 columns	Collapsible
Fold Cover	Edge-to-edge	Bottom nav / icon rail	1 column	Bottom sheet
Fold Inner Portrait	8–12px inset	Icon rail / collapsible sidebar	1–2 columns	Narrow/collapsible
Fold Inner Landscape	8–16px inset	Sidebar / icon rail	2 columns	Narrow rail
Tablet	8–16px inset	Collapsible sidebar	1–2 columns	Toggle/narrow panel
Desktop	16–24px inset	Full sidebar	2–3 columns	320–360px
Wide	24px+ inset	Full sidebar	Expanded 3-column	360px+



---

4. Mobile

Width

0–639px

Frame

Full viewport width

No wallpaper margin

border-radius: 0

No desktop floating-frame treatment


The wallpaper may remain visually present through the app background, but the application itself should occupy the full viewport.

Navigation

Desktop sidebar becomes:

1. Bottom navigation, or


2. Hamburger drawer



Bottom navigation:

56–64px height

Minimum 44×44px touch targets

4–5 primary destinations

Secondary destinations move into the drawer


Top Bar

Sticky

Compact

Breadcrumb truncates

Theme toggle remains accessible

Search may become an icon/button

"Ask ReprAI" becomes a 56px FAB


Content

Single-column layout.

Cards:

padding: 12px–16px;

Grid gap:

8px–12px;

Section gap:

12px–16px;

Hero

Stack vertically:

1. Image / atmosphere


2. Tags


3. Title


4. Supporting information


5. CTA



KPI

Use either:

Horizontal scrolling strip, or

2×3 grid


Do not force six narrow columns onto a phone.

Right Rail

Convert to:

Bottom sheet

Accordion

Expandable card


Never squeeze the desktop right rail into the mobile viewport.


---

5. Flip Phones

Flip devices must support both the cover display and the unfolded display.

Closed / Cover Display

Treat the cover display as a compact mobile device.

Characteristics:

Edge-to-edge

Bottom navigation

Compact top bar

Single-column cards

Horizontal KPI scrolling

FAB for ReprAI

Reduced typography scale


Do not attempt to render the desktop sidebar.

Open Flip

Use available viewport width.

If the unfolded viewport remains below 640px:

Mobile architecture

If it reaches tablet width:

Tablet architecture

If it reaches desktop width:

Desktop architecture

The device itself must never dictate a fixed layout.


---

6. Foldable Devices

Foldables have two fundamentally different layouts.

Fold Cover

Treat as mobile.

Edge-to-edge

Bottom navigation

Single column

Compact hero

Horizontal KPI scrolling

Bottom-sheet right rail


Fold Inner Portrait

Treat as compact tablet.

Recommended:

8–12px frame inset

16–20px frame radius

64–72px collapsible navigation rail

1–2 content columns

2×3 KPI grid

Narrow/collapsible right rail

Hero may become horizontal


Fold Inner Landscape

Treat as compact desktop.

Recommended:

8–16px frame inset

16–20px radius

Sidebar or icon rail

Main content + right rail

2-column primary content

Horizontal hero

KPI grid may return to six columns when space permits



---

7. Hinge / Fold Awareness

Foldable interfaces must not place important controls underneath a hinge or unsafe display region.

Where supported, use viewport segment information.

Conceptually:

/* Pseudocode / progressive enhancement */

@media (horizontal-viewport-segments: 2) {
  /* Treat each display segment as a layout region. */
}

When hinge information is unavailable:

Prefer generous gutters

Avoid placing critical controls exactly at the visual center

Allow the layout to gracefully collapse into a single-column mode

Never assume a foldable has a perfectly usable rectangular canvas


Important content should remain accessible even when the device is partially folded.


---

8. Tablet

Width

640–1023px

Tablet uses a hybrid architecture.

Navigation

Either:

64–72px icon rail, or

Collapsible sidebar


Main Content

Use:

1 column

when space is constrained.

Use:

2 columns

when enough horizontal space exists.

Right Rail

The desktop 320–360px rail becomes:

240–280px narrow panel

Tab toggle

Collapsible section

Bottom sheet when necessary


Hero

Prefer horizontal layout when width allows.

KPI

Use:

3 × 2

rather than six narrow columns.


---

9. Desktop

Width

1024–1439px

Use the full Divine Blood terminal architecture.

┌───────────────────────────────────────────────────────────┐
│                       TOP BAR                              │
├──────────────┬──────────────────────────────┬───────────────┤
│              │                              │               │
│   SIDEBAR    │        MAIN CONTENT          │   RIGHT RAIL  │
│  260–280px   │                              │   320–360px   │
│              │                              │               │
│              │                              │               │
└──────────────┴──────────────────────────────┴───────────────┘

Frame

16–24px viewport inset

20–24px radius

Wallpaper visible around the frame

Soft atmospheric elevation


Sidebar

Approximately:

width: 260px–280px;

Right Rail

Approximately:

width: 320px–360px;

Main Content

Flexible.

Use CSS Grid rather than fixed pixel positioning.


---

10. Wide Desktop

Width

1440px+

Do not allow the application to become excessively stretched.

Recommended:

max-width: 1800px;
margin-inline: auto;

The wallpaper remains visible around the frame.

The right rail may grow slightly:

320px–380px;

Main content receives additional breathing room rather than indefinitely increasing card widths.


---

11. Orientation

Orientation must be handled independently from breakpoint.

Portrait

Prioritize:

Vertical hierarchy

Single/dual column layouts

Bottom navigation

Compact headers


Landscape

Prioritize:

Horizontal hero layouts

Additional columns

Side navigation

Right rail

Wider KPI layouts


Example:

@media (orientation: landscape) {
  .hero {
    grid-template-columns: 1.2fr 0.8fr;
  }
}

Do not simply rotate the portrait layout.


---

12. Touch Adaptation

When a coarse pointer is detected:

@media (pointer: coarse) {
  button,
  a,
  input,
  [role="button"] {
    min-width: 44px;
    min-height: 44px;
  }
}

Touch targets:

Mobile: 44–48px

Fold cover: 44–48px

Fold inner: 40–44px

Tablet: 40–44px

Desktop: minimum 40px


Increase spacing between adjacent interactive controls on touch devices.


---

13. Safe Areas

Support devices with camera cutouts, rounded corners, and gesture navigation.

.app {
  padding-top: max(16px, env(safe-area-inset-top));
  padding-right: max(16px, env(safe-area-inset-right));
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  padding-left: max(16px, env(safe-area-inset-left));
}

For mobile bottom navigation:

.bottom-nav {
  padding-bottom: max(
    8px,
    env(safe-area-inset-bottom)
  );
}

Never position essential controls flush against unsafe viewport edges.


---

14. Responsive Typography

Typography scales smoothly rather than jumping dramatically.

Mobile

Hero: 22–24px

Metric XL: 20–22px

Metric L: 18–20px

Card title: 14px

Body: 13px

Caption: 11px


Tablet / Fold Inner

Hero: 24–26px

Metric XL: 22–24px

Metric L: 20–22px

Card title: 15px

Body: 13–14px

Caption: 12px


Desktop

Hero: 28–30px

Metric XL: 26–28px

Metric L: 22–24px

Card title: 15–16px

Body: 13–14px

Caption: 12px


Typography remains visually consistent across modes.

Only scale changes.


---

15. Responsive Spacing

Mobile

--frame-padding: 0px;
--card-padding: 12px–16px;
--section-gap: 12px–16px;
--grid-gap: 8px–12px;

Tablet / Fold

--frame-padding: 8px–12px;
--card-padding: 16px–20px;
--section-gap: 16px–20px;
--grid-gap: 12px–16px;

Desktop

--frame-padding: 16px–24px;
--card-padding: 20px–24px;
--section-gap: 20px–24px;
--grid-gap: 16px–24px;


---

16. Responsive Component Rules

Every component must have a defined compact state.

Sidebar

Desktop:

Full sidebar

Tablet:

Icon rail / drawer

Mobile:

Bottom navigation / drawer

Hero

Desktop:

Horizontal

Tablet:

Horizontal when space allows

Mobile:

Vertical

KPI

Desktop:

6 columns

Tablet:

3 × 2

Mobile:

2 × 3 or horizontal scroll

Right Rail

Desktop:

Fixed 320–360px

Tablet:

240–280px / toggle

Mobile:

Bottom sheet / accordion

Ask ReprAI

Desktop:

Top-bar pill

Tablet:

Top-bar pill

Mobile:

56px FAB

Fold cover:

56px FAB

Fold inner:

Pill when space permits


---

17. Grid Architecture

Use CSS Grid and flexible tracks.

Preferred:

.dashboard {
  display: grid;
  grid-template-columns:
    minmax(240px, 280px)
    minmax(0, 1fr)
    minmax(300px, 360px);
}

Tablet:

@media (max-width: 1023px) {
  .dashboard {
    grid-template-columns:
      minmax(64px, 72px)
      minmax(0, 1fr);
  }

  .right-rail {
    display: none;
  }
}

Mobile:

@media (max-width: 639px) {
  .dashboard {
    display: block;
  }

  .sidebar {
    display: none;
  }
}

Avoid fixed absolute positioning for primary layout regions.


---

18. Desktop Floating Frame

Desktop:

Wallpaper
    ↓
┌──────────────────────────────────────┐
│        Divine Blood App Frame        │
│                                      │
│  Sidebar   Main Content   Right Rail │
│                                      │
└──────────────────────────────────────┘

Mobile:

┌─────────────────────┐
│ Divine Blood        │
│                     │
│ Main Content        │
│                     │
│                     │
├─────────────────────┤
│ Bottom Navigation   │
└─────────────────────┘

The floating frame progressively disappears as viewport width decreases.


---

19. Mode + Responsive Behavior

Responsive behavior must never change the color hierarchy.

Gold Light

Always:

WHITE / WARM NEUTRAL
        ↓
       GOLD
        ↓
     CRIMSON

Gold remains dominant.

Crimson remains supporting.

Crimson Dark

Always:

BLACK / CRIMSON-BLACK
        ↓
     CRIMSON
        ↓
       GOLD

Crimson remains dominant.

Gold remains supporting.

This hierarchy remains true on:

Mobile

Flip

Fold

Tablet

Desktop

Wide desktop



---

20. Motion Across Devices

Desktop:

Hover interactions enabled

Subtle card lift

Chart animation

Theme transition


Touch:

Remove hover-dependent functionality

Use pressed states

Shorter feedback animations


Theme transition:

transition:
  background-color 300ms ease-in-out,
  color 300ms ease-in-out,
  border-color 300ms ease-in-out,
  box-shadow 300ms ease-in-out;

Respect:

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}


---

21. Accessibility

Responsive design must remain accessible.

Requirements:

Minimum 44×44px touch targets

Keyboard navigation on desktop

Visible focus states

Screen-reader labels

Charts accompanied by text summaries

Status communicated through text and iconography, not color alone

Sufficient contrast

Reduced-motion support

Safe-area support

No essential information hidden exclusively behind hover

No critical action dependent on precise pointer positioning



---

22. Responsive QA Matrix

Every release must be checked at minimum at:

Mobile

320×568

375×667

390×844

430×932


Flip / Fold Cover

Narrow cover viewport

Portrait cover

Landscape cover where supported


Fold Inner

Portrait

Landscape

Dual-segment / hinge configuration where available


Tablet

768×1024

820×1180

1024×768


Desktop

1280×720

1366×768

1440×900

1920×1080


Wide

2560×1440

Ultrawide aspect ratios



---

23. Final Adaptive Rule

Divine Blood is not:

Desktop design
+
smaller desktop design
+
mobile design

It is:

ONE DESIGN SYSTEM
       ↓
AVAILABLE SPACE
       ↓
LAYOUT RESOLUTION
       ↓
Mobile / Flip / Fold / Tablet / Desktop / Wide

The interface should feel native to every form factor while remaining recognizably Divine Blood.

The layout adapts.

The typography scales.

The navigation transforms.

The columns collapse.

The right rail relocates.

The hero reflows.

The cards resize.

The wallpaper/frame treatment changes with available space.

But the brand language never breaks:

Gold Light → White + Gold lead, Crimson supports.

Crimson Dark → Black + Crimson lead, Gold supports.

One Divine Blood system across every screen.