# BOUXRE ERP Site Features — PRD v1.0

**Status:** Approved for implementation  
**Date:** 2026-11-07  
**Author:** Codebuff (Buffy)  
**Repository path:** `"C:\Users\DELL\Desktop\bigdrops-app\docs\prd\Technical-SEO-AND-Metadata-Hardening-PRD\site-features-prd.md"  

---

## Executive Summary

**Current State:** Audit of the vibe-coded BigDrops ERP site against 12 "real site" criteria identified **9 fully missing** and **3 partially present** features critical for production readiness, SEO, accessibility, and professional polish.

**Target State:** All 12 items fully implemented with production-quality code, proper TypeScript types, and consistent design patterns aligned with the existing React 19 + TypeScript 5.9 + Tailwind CSS 3.4 codebase.

**Success Metrics:**
- ✅ All 12 items checked as complete in tracking document
- ✅ Google Search Console: sitemap submitted, no crawl errors
- ✅ Social share preview: correct title, description, image on any page URL
- ✅ Browser tab: BigDrops favicon displayed
- ✅ PageSpeed Insights SEO score ≥ 80/100
- ✅ Accessibility score ≥ 90/100 (axe/lighthouse)
- ✅ No console errors related to missing assets or meta tags

---

## 1. Audit Findings

| # | Item | Status | Priority |
|---|------|--------|----------|
| 1 | Custom 404 page | ❌ Missing | High |
| 2 | CTA above the fold | ⚠️ Partial | Medium |
| 3 | Meta title per page | ⚠️ Partial | High |
| 4 | Meta description per page | ❌ Missing | High |
| 5 | Open Graph image | ❌ Missing | High |
| 6 | Favicon set | ❌ Missing | High |
| 7 | robots.txt | ❌ Missing | High |
| 8 | sitemap.xml | ❌ Missing | High |
| 9 | Alt text on every image | ⚠️ Partial | Medium |
| 10 | Loading states | ⚠️ Partial | Medium |
| 11 | Privacy policy page | ❌ Missing | High |
| 12 | Analytics installed | ❌ Missing | High |

**Total: 9 fully missing, 3 partially present**

---

## 2. Technical Specifications

### Stack & Constraints
- **Framework**: React 19 + TypeScript 5.9 + Vite 7 + Bun
- **Routing**: react-router-dom (v7+)
- **UI**: Tailwind CSS 3.4, shadcn/ui components
- **Database**: Supabase/Postgres
- **Deployment**: Cloudflare Sites

### New Files to Create
| File | Purpose |
|------|---------|
| `public/favicon.ico` | Classic favicon |
| `public/favicon.svg` | Vector favicon |
| `public/apple-touch-icon.png` | iOS home screen icon |
| `public/robots.txt` | Crawler directives |
| `public/sitemap.xml` | SEO sitemap |
| `src/lib/seo.ts` | SEO meta tag utilities |
| `src/pages/404.tsx` | 404 page component |
| `src/pages/PrivacyPolicy.tsx` | Privacy policy page |
| `src/components/Loading/LoadingStates.tsx` | Extended loading states |
| `src/hooks/usePageMetadata.ts` | Per-page metadata hook |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/Layout.tsx` | Add `<title>` tag, og:image, meta description to `<head>` |
| `src/pages/*.tsx` | Add metadata per page via hook or component props |
| `src/index.html` | Add `<link>` tags for favicons, apple-touch-icon |
| `src/router.ts` | Add `*` catch-all route for 404 |

---

## 3. Implementation Roadmap

### Phase 1: Critical SEO (Weeks 1-2)
**Focus**: Items 3-8 (meta titles, descriptions, og:image, favicon, robots.txt, sitemap)

- **Week 1**: Add favicon files to public/, update index.html with `<link>` tags, create `src/lib/seo.ts`, add `<title>` and `<meta name="description">` to Layout component
- **Week 2**: Add og:image default to Layout, create robots.txt in public/, create sitemap.xml in public/ with all routes, verify all pages render correct meta tags via build preview

**Success Metrics**: Search engine can read meta tags; browser tab shows favicon; social shares preview correctly.

### Phase 2: UX & Accessibility (Weeks 3-4)
**Focus**: Items 1, 2, 9, 10 (404 page, CTA, alt text, loading states)

- **Week 3**: Create `src/pages/404.tsx` with branding and CTA, add `*` catch-all route to react-router-dom, audit all `<img>` elements for alt text, add empty-alt `alt=""` to decorative images
- **Week 4**: Ensure CTA above fold on login, dashboard, clients, invoices pages, add skeleton loading states to all data-fetching pages, verify loading states don't break layout on mobile

**Success Metrics**: 404 page renders at wrong URL; skeleton spinners show during data fetch; all images have alt text; lint passes.

### Phase 3: Compliance & Tracking (Weeks 5-6)
**Focus**: Items 11-12 (privacy policy, analytics)

- **Week 5**: Create `src/pages/PrivacyPolicy.tsx`, add route `/privacy-policy`, link in footer and auth pages, write plain-language privacy content
- **Week 6**: Install Plausible Analytics, add cookie consent banner component, add opt-out link in footer, configure anonymized IP and do-not-track respect, test consent flow

**Success Metrics**: Privacy page accessible at `/privacy-policy`; analytics shows data after consent; cookie banner dismisses and remembers preference.

---

## 4. Per-Item Acceptance Criteria

| Item | Done When |
|------|-----------|
| 1. 404 page | `git status` shows 404.tsx committed, route works, status code 404 verified |
| 2. CTA above fold | Visual inspection confirms CTA visible without scrolling on key pages |
| 3. Meta title | `<title>` tag present in `<head>` of every page, verified via `curl -I` |
| 4. Meta description | `<meta name="description">` on all pages, 150 chars or less |
| 5. og:image | `<meta property="og:image">` on all pages, 1200×630 ratio |
| 6. Favicon | All 3 icon types in public/, `<link>` tags in index.html, browser tab shows icon |
| 7. robots.txt | File exists at `/robots.txt`, allows `/`, disallows `/api/`, has sitemap URL |
| 8. sitemap.xml | File exists at `/sitemap.xml`, includes all route URLs, valid XML |
| 9. Alt text | `npm run lint` passes with no alt-text warnings, screen reader test passes |
| 10. Loading states | All data-fetching pages show skeleton/spinner during fetch, no blank screens |
| 11. Privacy policy | `/privacy-policy` route works, linked in footer and auth pages, legal content present |
| 12. Analytics | Plausible/GA4 script installed, consent banner appears on first visit, opt-out works |

---

## 5. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Layout changes break existing pages | Medium | High | Test all pages after each change; use component snapshot testing |
| TypeScript errors in new files | High | Medium | Run `bun run typecheck` after each addition; fix errors incrementally |
| Analytics implementation affects performance | Low | Medium | Defer analytics script loading; use async attribute |
| Privacy policy not legally sufficient for Nigeria | Medium | High | Consult legal counsel; use template but customize for BigDrops ERP context |
| Missing an image without alt text | Medium | Low (accessibility) | Run automated accessibility scan after changes |

---

## 6. Definition of Done (Team Sign-off)

This PRD is complete when:
- [ ] All 12 items audited and status updated in tracking document
- [ ] Code changes committed with descriptive messages
- [ ] `bun run dev` runs without errors on all pages
- [ ] `bun run typecheck` passes with no new errors
- [ ] `bun run lint` passes with no new warnings
- [ ] Preview deployment shows correct meta tags in `<head>`
- [ ] Social media sharing test (LinkedIn/Twitter) shows correct preview
- [ ] Mobile viewport renders all new pages/components correctly
- [ ] User testing completes for: 404 page, privacy policy, cookie consent flow
- [ ] Documentation updated: this PRD marked as implemented, new files documented

---

## 7. Priority Matrix

| Priority | Items | Why |
|----------|-------|-----|
| **Critical (Phase 1)** | 3, 4, 5, 6, 7, 8 | Affects SEO, discoverability, browser identity, and search engine crawlers |
| **High (Phase 2)** | 1, 9, 10 | Affects UX, accessibility, and perceived performance |
| **High (Phase 3)** | 11, 12 | Affects compliance, data privacy, and product intelligence |
| **Medium (as time allows)** | 2 | Affects conversion/usability but not fundamental functionality |

---

**PRD Owner**: Codebuff (Buffy)  
**Created**: November 7, 2026  
**Project**: BigDrops ERP - B2B business management suite  
**Stack**: React 19, TypeScript 5.9, Tailwind CSS 3.4, Vite 7, Bun, Supabase  
**Related**: Audit of 12 "real site" criteria for vibe-coded websites