# Design Vision — BIGDROPS

> Status: Established
> Last updated: 2026-08-28

---

## What BIGDROPS Is

BIGDROPS is a premium business management application for Nigerian SMEs. It handles invoices, quotations, waybills, CSR, BOQ, RFQ, and letters. It runs on phones, tablets, and desktops through Capacitor.

The application must feel like a professional tool, not a consumer social app.

---

## Design Principles

### 1. Premium Business Application

BIGDROPS serves business owners and operators. The visual language communicates professionalism and trust. The application should feel worth the subscription.

- Clean surfaces with purposeful whitespace
- restrained color usage — color signals status, not decoration
- Typography that reads as authoritative, not playful
- Consistent visual rhythm across all screens

### 2. Strong Mobile Feeling

The application must feel native on mobile. It should not feel like a desktop website shrunk to a phone.

- Touch-first interaction on all surfaces
- Bottom navigation within thumb reach
- Gestures that feel natural (swipe, pull, tap)
- Safe area respect on notched devices
- Content that fits the viewport without horizontal scroll

### 3. Operational Efficiency

BIGDROPS exists to save time. Every screen should reduce the number of steps to complete a task.

- One primary action per screen
- Quick access to frequently used functions
- Smart defaults that reduce input
- Bulk operations where appropriate
- Minimal navigation depth

### 4. Dense but Readable Information

Business users need to see a lot of data. The application presents dense information without feeling cluttered.

- Clear visual hierarchy through size, weight, and color
- Compact spacing that maintains readability
- Monospace numbers for financial data
- Status indicators that communicate at a glance
- Progressive disclosure — show summary first, detail on demand

### 5. Touch-First Interaction

Every interactive element must be comfortable to use with a finger.

- Minimum 44×44px touch targets
- Adequate spacing between interactive elements
- Feedback on every tap (visual state change)
- No hover-dependent interactions
- Press-and-hold for secondary actions

### 6. Professional, Not Consumer-Social

BIGDROPS is not Instagram or TikTok. The visual language is business-appropriate.

- No rounded-everything — use selective radius
- No gradient-everything — use gradient sparingly for emphasis
- No animation-everything — motion is functional, not decorative
- No emoji as icons — use proper iconography
- No playful mascots or illustrations in production

### 7. Visual Hierarchy

Every screen must guide the eye to the most important element first.

- Primary action or data point is largest/boldest
- Secondary information is smaller and muted
- Tertiary details are visible but not prominent
- Color draws attention to status and action
- Whitespace separates logical groups

### 8. Predictable Interactions

Users should never wonder what will happen when they tap something.

- Same action produces same result everywhere
- Navigation patterns are consistent across modules
- Sheets and drawers behave the same on every page
- Error states follow the same pattern
- Success feedback is consistent

### 9. Responsive Adaptation

The application adapts to screen size without breaking its core identity.

- Phone: single column, bottom nav, focused views
- Foldable: expanded phone layout with optional side-by-side
- Tablet: multi-column content, bottom nav (phone pattern, expanded) — locked per `00-index.md`
- Desktop: sidebar navigation, full data tables, maximum density

The adaptation unlocks space. It does not redesign the experience.

---

## What BIGDROPS Is Not

- Not a social platform
- Not a consumer fintech app
- Not a desktop-first application
- Not a design system library
- Not a white-label template

---

## Visual Direction Summary

The current visual direction is defined by:
- **Structure:** `Design-direction/dashboard/mobile-dashboard-v6.html`
- **Palette:** Slate Navy — **locked final palette** (light `#f0f4f8`/`#1e3a5f`, dark `#0f172a`/`#60a5fa`) per `00-index.md`
- **Typography:** Manrope (body) + DM Mono (numbers)
- **Radius:** 12–18px on cards, 10–12px on buttons, 50% on avatars
- **Elevation:** Subtle shadows with primary-tinted color
- **Motion:** Functional transitions (< 0.3s), reduced motion respected

See [03-design-system.md](./03-design-system.md) for structural tokens.
See [04-theme-system.md](./04-theme-system.md) for color tokens.
