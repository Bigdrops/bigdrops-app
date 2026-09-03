# Capacitor Native Layer

> Status: Established
> Last updated: 2026-08-28

---

## Purpose

Define the native-mobile layer for BIGDROPS running through Capacitor. Ensure the web app feels like a real mobile business application when installed on a device.

---

## Goal

The web app should feel like a native mobile business application. It must NOT feel like a browser tab wrapped in a native shell.

---

## Safe Area Handling

### Required Insets

| Area | CSS | When |
|------|-----|------|
| Top (notch/status bar) | `env(safe-area-inset-top)` | All views |
| Bottom (home indicator) | `env(safe-area-inset-bottom)` | All views |
| Left (foldable hinge) | `env(safe-area-inset-left)` | Foldable devices |
| Right | `env(safe-area-inset-right)` | Foldable devices |

### Implementation Rules

1. Always use `env()` values, never hardcode safe area pixels
2. Bottom padding for fixed elements: `calc(8px + env(safe-area-inset-bottom))`
3. Top padding for sticky elements: `calc(8px + env(safe-area-inset-top))`
4. The `<meta name="viewport">` must include `viewport-fit=cover`
5. Test on notched devices (iPhone X+, modern Android)

### Viewport Configuration

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
```

---

## Status Bar

### Configuration

| Property | Value |
|----------|-------|
| Style | `dark` or `light` (match theme) |
| Background | Transparent (content behind) |
| Overlays web content | No — content pushes below |

### Theme-Aware Status Bar

| Theme Mode | Status Bar Style |
|------------|-----------------|
| Light | Dark text (visible on light background) |
| Dark | Light text (visible on dark background) |

### Implementation

Use `@capacitor/status-bar` plugin:
- Set style based on current theme
- Update on theme toggle
- Ensure contrast against page background

---

## Navigation Bar (Android)

### Configuration

| Property | Value |
|----------|-------|
| Style | `dark` or `light` (match theme) |
| Background | Match bottom nav or theme background |
| Overlays content | No |

### Rules

- Android navigation bar color should match or complement the bottom tab bar
- On theme toggle, update navigation bar color
- Ensure buttons are visible against the bar background

---

## Viewport Sizing

### The 100dvh Solution

```css
.app {
  width: 100%;
  max-width: 430px;
  height: 100dvh; /* dynamic viewport height — handles mobile browser chrome */
  position: relative;
  margin: 0 auto;
  overflow: hidden;
}
```

### Why dvh

- `100vh` includes the URL bar area on mobile browsers → content is hidden behind the bar
- `100dvh` adjusts when the URL bar shows/hides → correct height always
- Capacitor has no URL bar, but `dvh` still works correctly

### Desktop Preview (≥ 560px)

```css
@media (min-width: 560px) {
  .app {
    height: 880px;
    margin-top: 22px;
    border: 1px solid rgba(30, 28, 24, .13);
    border-radius: 40px;
    box-shadow: 0 28px 68px rgba(30, 28, 24, .26);
  }
}
```

This shows a phone frame on desktop browsers. On Capacitor (always mobile), this breakpoint does not apply.

---

## Keyboard Behavior

### iOS

| Property | Value |
|----------|-------|
| Keyboard resize | `reserve` (content resizes) |
| Scroll into view | Automatic for focused input |
| Toolbar above keyboard | Optional — dismiss button |

### Android

| Property | Value |
|----------|-------|
| Keyboard resize | `resize` (WebView resizes) |
| Scroll into view | Automatic |
| Adjustment pan | Content pans to keep input visible |

### Rules

1. When keyboard opens, the bottom nav should hide or scroll out of view
2. Focused input must be visible above the keyboard
3. Form pages must scroll to keep the active field visible
4. The "Done" or "Next" action on the keyboard should advance to the next field
5. When keyboard closes, restore original layout

---

## Splash / Loading Transition

### First Load

| Phase | Duration | What Shows |
|-------|----------|-----------|
| Capacitor splash | 0–1.5s | App icon + brand color |
| Web load | 1–3s | Loading indicator or cached shell |
| App ready | — | Full UI visible |

### Rules

1. Capacitor splash screen shows immediately on launch
2. Web content loads behind the splash
3. Splash hides when web content is ready (or after max 2s)
4. No blank white screen between splash and app
5. Loading skeleton can show while data fetches

### Splash Configuration

- Background: match theme primary or dark background
- Brand mark: centered
- No animation (static splash)
- Auto-hide after webview fires `ready` event

---

## Touch Interaction

### Native-Like Behaviors

| Behavior | Implementation |
|----------|---------------|
| Tap feedback | `button:active { transform: scale(0.965) }` |
| Pull to refresh | Native overscroll or custom pull-to-refresh |
| Swipe back | Navigate back on swipe from left edge |
| Long press | Context menu or multi-select |
| Haptic feedback | `@capacitor/haptics` for critical actions |

### Haptic Feedback Points

| Action | Haptic Type |
|--------|------------|
| Document finalized | Impact (medium) |
| Payment recorded | Impact (heavy) |
| Error occurred | Notification (error) |
| Success action | Selection (light) |

### Pull to Refresh

- On dashboard: refresh reloads data
- On document list: refresh reloads list
- Visual: custom loading indicator (see [10-loading-and-refresh.md](./10-loading-and-refresh.md))

---

## System Back Behavior

### Android

| Context | Back Button Action |
|---------|-------------------|
| Sheet/drawer open | Close sheet/drawer |
| Search open | Close search |
| AI sheet open | Close AI sheet |
| On a document view | Navigate to list |
| On a form page | Confirm discard if unsaved, then navigate back |
| On main dashboard | Minimize app (or confirm exit) |

### iOS

- No system back button (swipe from left edge = back)
- Same behavior as Android back, triggered by swipe

### Rules

1. Back never discards data without confirmation
2. Back always returns to the previous meaningful screen
3. Back closes overlays before navigating
4. Back on root page offers to exit or minimize

---

## Native-Feeling Transitions

### Page Transitions

| Transition | Duration | Easing |
|------------|----------|--------|
| Push (forward) | 0.3s | cubic-bezier(.2, .9, .24, 1) |
| Pop (back) | 0.25s | ease-out |
| Sheet present | 0.3s | cubic-bezier(.2, .9, .24, 1) |
| Sheet dismiss | 0.25s | ease-out |
| Drawer open | 0.3s | cubic-bezier(.2, .9, .24, 1) |
| Drawer close | 0.25s | ease-out |

### Transition Direction

| Action | Direction |
|--------|-----------|
| Open document | Slide from right |
| Back to list | Slide from left |
| Open sheet | Slide from bottom |
| Close sheet | Slide to bottom |
| Open drawer | Slide from left |
| Close drawer | Slide to left |

All transitions respect `prefers-reduced-motion`.

---

## Capacitor Plugin Requirements

| Plugin | Purpose |
|--------|---------|
| `@capacitor/status-bar` | Status bar style and color |
| `@capacitor/keyboard` | Keyboard resize behavior |
| `@capacitor/haptics` | Haptic feedback |
| `@capacitor/splash-screen` | Launch splash |
| `@capacitor/app` | App state (foreground/background) |
| `@capacitor/device` | Device info for platform-specific behavior |
| `@capacitor/preferences` | Local storage (alternative to localStorage) |

---

## Testing Checklist

- [ ] App launches with correct splash screen
- [ ] Status bar matches theme (light/dark)
- [ ] Safe areas respected on notched devices
- [ ] Keyboard does not obscure form inputs
- [ ] Bottom nav hides when keyboard is open
- [ ] Back button closes overlays before navigating
- [ ] Pull to refresh works on dashboard
- [ ] Haptics fire on critical actions
- [ ] Transitions feel native (not janky)
- [ ] No white flash between splash and app
- [ ] App handles background/foreground transitions
- [ ] Orientation changes do not break layout
