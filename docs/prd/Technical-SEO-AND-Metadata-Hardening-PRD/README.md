# BigDrops ERP Site Features PRD

**Product Requirements Document for SEO, Metadata, and "Real Site" Criteria**

This PRD documents the audit and implementation plan for adding essential "real site" features to the BigDrops ERP web application. The site was vibe-coded and lacked critical production readiness features.

## Overview

- **Project**: BigDrops ERP - B2B business management suite
- **Stack**: React 19, TypeScript 5.9, Tailwind CSS 3.4, Vite 7, Bun, Supabase
- **Purpose**: Audit against 12 "real site" criteria and implement missing features
- **Status**: PRD approved for implementation

## Audit Summary

| Metric | Value |
|--------|-------|
| Total Criteria | 12 |
| Fully Missing | 9 |
| Partially Present | 3 |
| Completion Target | 100% |

## Criteria Breakdown

| # | Feature | Status | Priority |
|---|---------|--------|----------|
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

## Implementation Phases

### Phase 1: Critical SEO (Weeks 1-2)
**Focus**: Items 3-8 (meta titles, descriptions, og:image, favicon, robots.txt, sitemap)

- Add favicon files to public/
- Update index.html with `<link>` tags
- Create `src/lib/seo.ts` utility
- Add `<title>` and `<meta name="description">` to Layout component
- Create robots.txt in public/
- Create sitemap.xml in public/ with all routes

### Phase 2: UX & Accessibility (Weeks 3-4)
**Focus**: Items 1, 2, 9, 10 (404 page, CTA, alt text, loading states)

- Create 404 page with branding and CTA
- Audit all `<img>` elements for alt text
- Add skeleton loading states to data-fetching pages

### Phase 3: Compliance & Tracking (Weeks 5-6)
**Focus**: Items 11-12 (privacy policy, analytics)

- Create PrivacyPolicy page at `/privacy-policy`
- Install Plausible Analytics
- Add cookie consent banner component

## Success Metrics

- ✅ Google Search Console: sitemap submitted, no crawl errors
- ✅ Social share preview: correct title, description, image on any page URL
- ✅ Browser tab: BigDrops favicon displayed
- ✅ PageSpeed Insights SEO score ≥ 80/100
- ✅ Accessibility score ≥ 90/100 (axe/lighthouse)
- ✅ No console errors related to missing assets or meta tags

## Files in this Directory

| File | Description |
|------|-------------|
| `site-features-prd.md` | Full PRD with audit findings, roadmap, and acceptance criteria |
| `README.md` | This file - PRD overview and summary |
| `Waterfall-roadmap.md` | Waterfall-style implementation roadmap |
| `Waterfall-roadmap.html` | HTML visualization of the waterfall roadmap |

## Getting Started

1. Review the full PRD in `site-features-prd.md`
2. Begin Phase 1 implementation following the roadmap
3. Run `bun run dev` to verify changes locally
4. Run `bun run typecheck` and `bun run lint` to ensure code quality
5. Deploy and verify meta tags render correctly

## Related Documentation

- `docs/standard/` - Project standards and guidelines
- `docs/PROJECTSKILLINDEX.md` - Available skills for this project