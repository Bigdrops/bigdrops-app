

Create a new HTML dashboard template for Divine Blood.

First, read and follow the Divine Blood design system here:

docs/TEMPLATES/Designsdotmds/Divine-blood.md

Do not restate or reproduce the design system in your work. Use it as the source of truth.

## Output

Put the finished HTML template(s) here:

docs/TEMPLATES/htmltemps/Divine-blood/

If practical, create up to 3 different dashboard approaches/variations in that directory. They must all follow the same Divine Blood design system, but can explore different dashboard compositions and information hierarchy.

Do not create 3 different visual themes. They are alternative layouts using the same design system.

## Dashboard Architecture

The dashboard must include:

### 1. KPI Summary
Four KPI cards:
- Inflow
- Balance
- Volume
- Pending items

### 2. Recent Documents / Ledger Feed
A vertical feed containing:
- Invoices
- Quotes
- Dispatch notes

Client/details on the left, status on the right.

### 3. Audit Trail
A chronological vertical timeline with connected markers.

### 4. Tenant Switcher
The tenant/company switcher belongs in the **sidebar/side drawer**, NOT in the dashboard content.

Required functions:
```js
initCompanySwitcher()
toggleCompanyMenu()

Required elements:

#companyTrigger
#companyMenu

Switching companies should update the active company without reloading the page.

5. Recent Activity

Horizontal notification/activity carousel.

Required functions:

renderActivity()
onNotifClick(id, docIndex)

Required elements:

#activityScroll
#drawerOverlay

Use approximately 260px-wide activity cards.

Clicking an activity opens the Document Drawer.

6. Tips & Tricks

Hero/banner slideshow with automatically rotating tips.

Required functions:

nextTip()
renderTipDots()
resetTipInterval()

Required elements:

#tipText
#tipDots

Rotation interval: 5.5 seconds.

7. FAB / Quick Actions

Include a FAB consistent with the main application.

When the FAB is clicked, show a small, humble quick-action popup.

Use this existing file only to determine the popup's approximate size/footprint:

docs/TEMPLATES/htmltemps/reprise-dashboard.html

Do NOT copy its visual design.

The popup should use the Divine Blood design system and remain compact rather than becoming a large modal.

Responsive Navigation

This is important.

The dashboard must have a proper mobile navigation.

Mobile navigation is required for:

Phones

Foldable cover displays

Flip cover displays


Use the available viewport width as the source of truth rather than hardcoding device names.

When a fold/flip device is unfolded and has enough available width, the interface may transition into the tablet/desktop-style layout.

Expected behavior:

Phone / Cover display
→ Mobile navigation

Tablet / unfolded portrait
→ Tablet navigation

Unfolded landscape / sufficiently wide viewport
→ Desktop-style sidebar/navigation

Do not force desktop navigation onto narrow fold/flip cover displays.

Respect safe-area insets.

Important

The tenant switcher must remain in the sidebar/drawer.

It must not appear as a dashboard widget.

The dashboard must be fully functional, not a static wireframe.

Implement the required JavaScript functions and DOM hooks.

Support Light and Dark modes from the design system.

Follow the design system's responsive and accessibility requirements.

Keep the dashboard spacious and readable.

Do not add unnecessary features just to fill space.


Deliverable

Create the HTML template(s) directly in:

docs/TEMPLATES/htmltemps/Divine-blood/

If three approaches genuinely improve the result, create three variations. Otherwise create one excellent implementation rather than padding the directory with weak variations.

Make the result production-quality and visually polished.