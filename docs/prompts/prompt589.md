Here is the updated prompt with all GitHub links replaced by their clean file paths:
Revised Agent Prompt
We are revising the Divine Blood interface. Use the existing design.md as the visual source of truth. Do not dilute or redesign it.
The previous implementation became too cream/beige and the gold essentially disappeared. This iteration must correct that.
CRITICAL VISUAL HIERARCHY
Light Mode Must Visibly Read:
WHITE + GOLD + restrained CRIMSON
 * White is the environment.
 * Gold is a major identity color, not a tiny decorative accent.
Dark Mode Must Visibly Read:
BLACK + CRIMSON + restrained GOLD
 * Do not let Light become cream-heavy.
 * Do not let Gold disappear into pale champagne tones.
 * Use the existing Divine Blood tokens from design.md rather than inventing a new palette.
1. CREATE THREE HTML FILES — ALL THREE ARE DASHBOARDS
Create exactly three complete HTML dashboard pages representing three different dashboard experiences within the same application.
Do NOT make them:
 * Dashboard
 * Transactions
 * Settings
Instead, all three should be dashboards with different purposes/content:
 * Dashboard 1 — Financial Overview: A primary executive/financial dashboard containing total balance, available balance, income/outflow, important financial KPIs, financial chart, recent activity, account summary, and relevant quick actions.
 * Dashboard 2 — Invoice / Revenue Dashboard: A dashboard focused on invoices and revenue containing invoice metrics, outstanding invoices, paid invoices, overdue invoices, revenue trend, invoice activity, customer/revenue information, and an invoice list preview. The invoice list on this dashboard must actually show content (do not leave it as an empty placeholder). Show realistic sample invoices with invoice number, customer, date, amount, status, and action.
 * Dashboard 3 — Business / Operations Dashboard: A third dashboard focused on another meaningful business view (e.g., cash flow, business performance, accounts, operational metrics, upcoming payments, recent activity, financial health, relevant charts/cards).
Use the existing application context if the repository provides a more appropriate dashboard concept. The three dashboards should feel like three real areas of the same application, not three copies of one page with different colors.
2. MOBILE NAVIGATION
The mobile navigation must use the same navigation destinations the app already has.
 * Do not invent a separate mobile navigation system.
 * Do not worry about copying the exact desktop sidebar icons.
 * The mobile version simply needs a proper bottom navigation bar using the app's existing navigation destinations.
For example, if the existing app navigation contains:
Dashboard | Invoices | Customers | Reports | More
...then mobile should use those same destinations in a bottom navigation. The exact destinations should come from the existing application/project context.
Mobile Nav Requirements:
 * Fixed/sticky at the bottom
 * 56–64px high plus safe-area padding
 * Touch friendly (minimum 44px touch targets)
 * Visually consistent with Divine Blood
 * Active destination clearly indicated
 * Accessible and usable without hover
 * Do not replace the app's navigation with arbitrary icons just to make the prototype look different.
3. INVOICE LIST MUST SHOW REAL CONTENT
The invoice list page/surface must not be empty. Show an actual populated invoice list, for example:
| Invoice | Customer | Date | Amount | Status |
|---|---|---|---|---|
| INV-1048 | Meridian House | Aug 14 | $12,400 | Paid |
| INV-1047 | Northstar Group | Aug 12 | $8,750 | Pending |
| INV-1046 | Aster & Co. | Aug 10 | $4,280 | Overdue |
| INV-1045 | Blackwood Ltd. | Aug 08 | $16,900 | Paid |
 * Use Berkeley Mono for appropriate financial values and identifiers.
 * Statuses must use: icon + text + color (never color alone).
 * The table/list must remain static and functional-looking.
 * No living material inside the invoice table.
4. "MORE" POP-UP MUST SHOW SOMETHING
The More navigation item must not open an empty pop-up/drawer. When activated, show a real menu/sheet containing useful application destinations (e.g., Reports, Customers, Documents, Payments, Team, Settings, Help, Steward).
 * Use the application's existing navigation structure where available.
 * Must open/close properly, have keyboard support, visible focus, work on mobile, use Divine Blood surfaces, respect existing typography/spacing, and use appropriate icons if available.
 * Do not put living material inside the More menu.
5. HEADER CONTROLS
The header must include:
Search | Notification 🔔 | Sparkles ✨
And, beside the dark-mode control:
Refresh | Dark Mode
Visual Relationship:
[ Search ] [ Bell ] [ Sparkles ] [ Refresh ] [ Dark Mode ]
 * Use the existing project's icon system when available.
 * The Sparkles action represents Steward/intelligent assistance.
 * Give every icon-only control an accessible label.
6. SIDEBAR BUTTON
Replace the current hamburger/sidebar button with the sidebar treatment from:
docs/TEMPLATES/React-temps/sidebaricon.tsx
Study that implementation and adapt the relevant visual/interaction behavior into the HTML implementation. If it is React-specific, translate the behavior to HTML/JavaScript. Do not simply paste React code into an HTML file. The resulting control must actually open/close the sidebar.
7. SOUND REFERENCE
Inspect:
docs/TEMPLATES/Sound-temp/cuelme.md
Determine whether its sound approach can be used in this implementation. If appropriate:
 * Install dependencies with Bun
 * Implement it cleanly
 * Keep audio user-triggered (do not autoplay intrusive sound)
 * Respect reduced-motion/accessibility expectations
If it cannot reasonably be integrated into these HTML dashboards, explain why rather than fabricating an implementation.
8. USE BUN
If dependencies are required, use Bun (bun install and appropriate Bun commands). Do not default to npm. Keep dependencies minimal.
9. THREE DASHBOARDS MUST SHARE ONE DESIGN SYSTEM
All three HTML files must share:
 * Divine Blood colors
 * Typography & Spacing
 * Sidebar & Header
 * Theme switching
 * Search, Notifications, Sparkles/Steward, Refresh
 * Mobile bottom navigation & Responsive behavior
 * Accessibility & Component language
Content must meaningfully differ across all three pages.
10. SHOW THE INTERFACE, DON'T LEAVE PLACEHOLDERS
Do not produce empty states. Populate dashboards with believable sample data including financial figures, charts, invoices, activity, statuses, customers/accounts, cards, and actionable controls.
11. DIVINE BLOOD LIGHT MODE
Major correction: Do not make the interface cream/beige with tiny gold accents.
It should feel:
WHITE white white WHITE GOLD GOLD GOLD restrained CRIMSON
Gold needs enough visual weight that a reviewer immediately recognizes it as part of the brand identity. Use stronger gold for meaningful accents rather than relying primarily on pale champagne tones (gold-100/gold-200). Maintain a serious, premium financial feel.
12. DARK MODE
Dark mode should visibly read:
BLACK / NEAR BLACK ████████████████ CRIMSON ███████ GOLD ██
Crimson provides the environmental identity; Gold provides highlights and premium emphasis.
13. LIVING MATERIAL
Follow design.md rules exactly. Blood and liquid gold are atmospheric.
Do NOT put living material inside:
 * Invoice / Financial tables
 * Charts & KPI values
 * Forms & Search results
 * More menu & Notifications
 * Steward conversation surfaces & Confirmation dialogs
Respect Whisper / Presence / Event rarity and support reduced motion.
14. RESPONSIVE DESIGN
 * Desktop: Sidebar, main dashboard, optional right rail.
 * Tablet: Collapsible sidebar, appropriate dashboard grid.
 * Mobile: Top bar, dashboard content, fixed bottom navigation with app destinations, populated "More" menu/sheet, safe-area support, and 44px+ touch targets.
15. FINAL CHECK BEFORE COMPLETION
Before declaring the work finished, inspect all three HTML files:
Three Pages
 * [ ] Exactly three dashboard HTML files exist.
 * [ ] All three are meaningfully different dashboards.
 * [ ] They clearly belong to the same application.
Light Mode
 * [ ] White clearly dominates.
 * [ ] Gold has obvious visual presence.
 * [ ] Crimson remains restrained.
 * [ ] The interface does NOT read as cream/beige.
Dark Mode
 * [ ] Black dominates.
 * [ ] Crimson is clearly present.
 * [ ] Gold is restrained but visible.
Header
 * [ ] Search exists.
 * [ ] Bell exists.
 * [ ] Sparkles exists beside Bell.
 * [ ] Refresh exists beside Dark Mode.
 * [ ] Dark Mode exists.
Navigation
 * [ ] Desktop sidebar works.
 * [ ] Sidebar trigger uses the BigDrops reference (docs/TEMPLATES/React-temps/sidebaricon.tsx).
 * [ ] Mobile has a bottom nav using existing application destinations.
 * [ ] More opens a populated menu/sheet.
Invoice
 * [ ] Invoice list contains actual sample records.
 * [ ] Amounts and IDs use Berkeley Mono.
 * [ ] Statuses use icon + text + color.
 * [ ] No living material appears inside the invoice list.
Sound & Tech
 * [ ] docs/TEMPLATES/Sound-temp/cuelme.md was investigated.
 * [ ] Sound was implemented if technically appropriate.
 * [ ] Bun was used for dependencies where needed.
Accessibility
 * [ ] Keyboard navigation works and focus is visible.
 * [ ] Icon-only controls have accessible labels.
 * [ ] Reduced motion works and mobile targets are \ge 44px.
 * [ ] No important state is communicated by color alone.
