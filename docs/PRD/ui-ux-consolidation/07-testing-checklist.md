# UI/UX Consolidation — Testing Checklist

**Purpose:** Ensure every module meets consistency, accessibility, and responsive standards before and after consolidation changes.

---

## 🎯 Testing Matrix

| Module | Desktop | Tablet | Mobile | Keyboard | Screen Reader | Dark Mode | Light Mode | Status |
|--------|---------|--------|--------|----------|--------------|-----------|------------|--------|
| Dashboard | Not Yet Verified | Not Yet Verified | Requires Validation | Not Yet Verified | Not Yet Verified | Not Yet Verified | Not Yet Verified | Pending Audit |
| Invoice (New) | Not Yet Verified | Not Yet Verified | Requires Validation | Not Yet Verified | Not Yet Verified | Not Yet Verified | Not Yet Verified | Pending Audit |
| Invoice (Edit) | Not Yet Verified | Not Yet Verified | Requires Validation | Not Yet Verified | Not Yet Verified | Not Yet Verified | Not Yet Verified | Pending Audit |
| Invoice (View) | Not Yet Verified | Not Yet Verified | Requires Validation | Not Yet Verified | Not Yet Verified | Not Yet Verified | Not Yet Verified | Pending Audit |
| Quotation (New) | Not Yet Verified | Not Yet Verified | Requires Validation | Not Yet Verified | Not Yet Verified | Not Yet Verified | Not Yet Verified | Pending Audit |
| Quotation (Edit) | Not Yet Verified | Not Yet Verified | Requires Validation | Not Yet Verified | Not Yet Verified | Not Yet Verified | Not Yet Verified | Pending Audit |
| Quotation (View) | Not Yet Verified | Not Yet Verified | Requires Validation | Not Yet Verified | Not Yet Verified | Not Yet Verified | Not Yet Verified | Pending Audit |
| Waybill (New) | Not Yet Verified | Requires Validation | Requires Validation | Not Yet Verified | Not Yet Verified | Not Yet Verified | Not Yet Verified | Pending Audit |
| Waybill (Edit) | Not Yet Verified | Requires Validation | Requires Validation | Not Yet Verified | Not Yet Verified | Not Yet Verified | Not Yet Verified | Pending Audit |
| Waybill (View) | Not Yet Verified | Not Yet Verified | Requires Validation | Not Yet Verified | Not Yet Verified | Not Yet Verified | Not Yet Verified | Pending Audit |
| CSR | Not Yet Verified | Not Yet Verified | Not Yet Verified | Not Yet Verified | Not Yet Verified | Not Yet Verified | Not Yet Verified | Pending Audit |
| RFQ | Not Yet Verified | Not Yet Verified | Requires Validation | Not Yet Verified | Not Yet Verified | Not Yet Verified | Not Yet Verified | Pending Audit |
| Settings | Not Yet Verified | Not Yet Verified | Requires Validation | Not Yet Verified | Not Yet Verified | Not Yet Verified | Not Yet Verified | Pending Audit |
| Clients | Not Yet Verified | Not Yet Verified | Requires Validation | Not Yet Verified | Not Yet Verified | Not Yet Verified | Not Yet Verified | Pending Audit |
| Suppliers | Not Yet Verified | Not Yet Verified | Requires Validation | Not Yet Verified | Not Yet Verified | Not Yet Verified | Not Yet Verified | Pending Audit |

**Legend:**
- ✅ Verified
- ⚠️ Requires Validation
- ❓ Not Yet Verified

---

## ✅ Per-Module Validation Checklist

### For Every Module After Consolidation:

#### **Functional Testing**
- [ ] All existing features work identically
- [ ] No broken interactions (clicks, hovers, drags)
- [ ] Form submissions succeed
- [ ] Data persists correctly
- [ ] Error states display properly
- [ ] Loading states are visible

#### **Visual Consistency**
- [ ] Matches reference template (richtextform.tsx, sidebar.tsx, etc.)
- [ ] Spacing matches design tokens
- [ ] Typography matches system
- [ ] Colors match palette
- [ ] Borders/radii match system
- [ ] Shadows match system
- [ ] No visual regressions from before consolidation

#### **Accessibility (WCAG 2.2 AA)**
- [ ] Touch targets ≥ 44×44px (mobile)
- [ ] Keyboard navigation works (Tab, Shift+Tab, Enter, Space, Escape)
- [ ] Focus indicators visible (focus-visible)
- [ ] ARIA labels present on interactive elements
- [ ] ARIA live regions for dynamic content
- [ ] Color contrast ≥ 4.5:1 for text
- [ ] Color contrast ≥ 3:1 for UI components
- [ ] Form inputs have associated labels
- [ ] Dialogs trap focus
- [ ] Skip links present (if applicable)
- [ ] Respects `prefers-contrast`
- [ ] Respects `zoom` at 200%
- [ ] Respects browser text scaling
- [ ] Respects `prefers-reduced-transparency` (if supported)

#### **Responsive Behavior**
- [ ] Desktop (≥1024px): Full layout
- [ ] Tablet (768px-1023px): Adaptive layout
- [ ] Mobile (<768px): Mobile-optimized
- [ ] Landscape mobile: Works correctly
- [ ] Large monitors (≥1440px): No overflow/breakage
- [ ] Safe area insets respected (mobile)

#### **Motion & Animation**
- [ ] Respects `prefers-reduced-motion` (media query)
- [ ] Transitions ≤ 200ms
- [ ] Easing consistent (`cubic-bezier(0.4, 0, 0.2, 1)`)
- [ ] Spring animations consistent (stiffness: 300, damping: 20)
- [ ] No motion sickness triggers (excessive parallax, etc.)

#### **Performance Targets**
- Target LCP < 2.5s
- Target CLS < 0.1
- Target FID < 100ms

#### **Cross-Cutting**
- [ ] Dark mode works
- [ ] Light mode works
- [ ] Print styles (if applicable)

---
## 📸 Screenshot Verification

**Reference:** `assets/screenshots.md` (13 spec sheets)

### Post-Phase Capture List
After each consolidation phase, capture:

1. **Desktop:**
   - Full page (1440px)
   - Zoom 100%
   - Zoom 125%

2. **Tablet:**
   - 768px width
   - Portrait orientation

3. **Mobile:**
   - 375px width (iPhone SE)
   - 414px width (iPhone 13)
   - Portrait + Landscape

4. **Accessibility:**
   - Keyboard-only navigation (screenshot of focus states)
   - Screen reader output (NVDA/VoiceOver)
   - High contrast mode

5. **Edge Cases:**
   - Empty states
   - Loading states
   - Error states
   - Overflow conditions (long text, many items)

---
## 🔄 Regression Testing

### Before/After Comparison
For every consolidated component:
1. Capture **before** screenshots (current state)
2. Implement change
3. Capture **after** screenshots
4. Verify:
   - [ ] No unintended visual changes
   - [ ] No broken functionality
   - [ ] Performance unchanged or improved

### Automated Checks
Run the project's existing commands:
```bash
bun run audit\:load
bun run typecheck
bun run build