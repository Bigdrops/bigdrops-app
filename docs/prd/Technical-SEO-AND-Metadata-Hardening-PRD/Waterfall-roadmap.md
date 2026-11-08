# Waterfall Roadmap - BigDrops ERP Site Features

## Implementation Sequence

This roadmap follows a waterfall approach where each phase must be completed before the next begins. Dependencies are noted for each phase.

### Phase 1: Critical SEO Foundation
**Duration**: Weeks 1-2  
**Dependencies**: None (can start immediately)  
**Success Criteria**: All Phase 1 items verified in preview deployment

#### Week 1 Tasks
- [ ] Create favicon assets
  - `public/favicon.svg` (vector)
  - `public/apple-touch-icon.png` (iOS icon)
- [ ] Update `index.html` with meta tags and favicon links
  - Add `<title>BigDrops ERP</title>`
  - Add `<meta name="description">`
  - Add `<link rel="icon">` and `<link rel="apple-touch-icon">`
- [ ] Create `src/lib/seo.ts` utility for meta tags
- [ ] Update `src/components/Layout.tsx` to render `<title>` and `<meta name="description">` in `<head>`

#### Week 2 Tasks
- [ ] Add default og:image to Layout component
- [ ] Create `public/robots.txt` with crawler directives
- [ ] Create `public/sitemap.xml` with all route URLs
- [ ] Verify all pages render correct meta tags via build preview
- [ ] Run `bun run typecheck` - no new errors
- [ ] Run `bun run lint` - no new warnings

**Phase 1 Exit Criteria**:
- ✅ Favicon displayed in browser tab
- ✅ Meta title and description on all pages
- ✅ og:image default set
- ✅ robots.txt allows `/`, disallows `/api/`, has sitemap URL
- ✅ sitemap.xml valid XML with all routes
- ✅ No TypeScript or lint errors

---

### Phase 2: UX & Accessibility Enhancement
**Duration**: Weeks 3-4  
**Dependencies**: Phase 1 complete (meta tags and SEO foundation)  
**Success Criteria**: All Phase 2 items tested and working

#### Week 3 Tasks
- [ ] Create `src/pages/404.tsx` with branding and CTA
- [ ] Add `*` catch-all route to react-router-dom for 404
- [ ] Audit all `<img>` elements for alt text
  - Add `alt=""` to decorative images
  - Ensure all informative images have descriptive alt text
- [ ] Run automated accessibility scan (axe/lighthouse)

#### Week 4 Tasks
- [ ] Ensure CTA above fold on key pages:
  - Login page
  - Dashboard page
  - Clients page
  - Invoices page
- [ ] Add skeleton loading states to all data-fetching pages
- [ ] Verify loading states don't break layout on mobile
- [ ] Run `bun run dev` on all pages - no layout breaks

**Phase 2 Exit Criteria**:
- ✅ 404 page renders at wrong URL with status code 404
- ✅ CTA visible without scrolling on key pages
- ✅ All images have alt text (lint passes)
- ✅ Skeleton/spinner shows during data fetch
- ✅ Mobile viewport renders correctly

---

### Phase 3: Compliance & Tracking
**Duration**: Weeks 5-6  
**Dependencies**: Phase 2 complete (UX and accessibility foundation)  
**Success Criteria**: Compliance features live and tested

#### Week 5 Tasks
- [ ] Create `src/pages/PrivacyPolicy.tsx`
- [ ] Add route `/privacy-policy` to react-router-dom
- [ ] Link in footer and auth pages
- [ ] Write plain-language privacy content appropriate for Nigeria SME context

#### Week 6 Tasks
- [ ] Install Plausible Analytics (or equivalent)
- [ ] Add cookie consent banner component
- [ ] Add opt-out link in footer
- [ ] Configure anonymized IP and do-not-track respect
- [ ] Test consent flow: accept, reject, and opt-out

**Phase 3 Exit Criteria**:
- ✅ `/privacy-policy` route works and is linked in footer
- ✅ Analytics shows data after user consent
- ✅ Cookie banner appears on first visit
- ✅ Opt-out link works and remembers preference

---

### Phase 4: Final Verification & Polish
**Duration**: Week 7 (optional, after all phases)  
**Dependencies**: Phases 1-3 complete  
**Success Criteria**: Full audit passed

- [ ] User testing completes for: 404 page, privacy policy, cookie consent flow
- [ ] Mobile viewport renders all new pages/components correctly
- [ ] Social media sharing test (LinkedIn/Twitter) shows correct preview
- [ ] Final `bun run typecheck` passes with no errors
- [ ] Final `bun run lint` passes with no warnings
- [ ] PRD marked as implemented, new files documented
- [ ] All 12 items status updated in tracking document

---

## Roadmap Dependencies Graph

```
Phase 1 (SEO Foundation)
    ↓
Phase 2 (UX & Accessibility)
    ↓
Phase 3 (Compliance & Tracking)
    ↓
Phase 4 (Final Verification)
```

## Phase Gates

| Gate | Required Before | Checklist |
|------|----------------|-----------|
| Gate 1 | Start Phase 2 | All Phase 1 success metrics met |
| Gate 2 | Start Phase 3 | All Phase 2 success metrics met |
| Gate 3 | Mark PRD complete | All Phase 3 success metrics met + Phase 4 verification |

## Notes

- This waterfall approach ensures each phase has clear entry and exit criteria
- Phases can overlap if team capacity allows, but entry gates must be met
- All code changes must pass `bun run typecheck` and `bun run lint` before advancing
- Preview deployment must show correct meta tags after each phase