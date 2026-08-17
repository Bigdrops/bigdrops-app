Create a complete single-file HTML page (Tailwind CSS via CDN + vanilla JavaScript only) that faithfully recreates a premium AI product settings dashboard called **FlowAI**.

**Highest priority: Mobile-first.**  
Design and perfect the experience first at 375px–430px width. Then make it scale elegantly to tablet and desktop. On mobile the left sidebar must become a full-height slide-over drawer triggered by a hamburger button.

### Exact Visual Style (match this closely)
- Background: very light gray (#F8F9FA or similar)
- Cards and main panels: pure white, rounded-2xl, soft multi-layer shadow (shadow-sm + subtle border)
- Typography: clean Inter or system-ui, excellent hierarchy
- Primary text: near-black (#111827)
- Secondary text: medium gray (#6B7280)
- Accent / active states: soft gray highlight + slight darker text
- Danger: soft red backgrounds, red borders, red buttons (#EF4444 / #DC2626)
- Borders: 1px solid #E5E7EB
- Focus rings: soft blue or black ring
- Smooth 150–250ms transitions everywhere

### Top Header (sticky)
Left: FlowAI logo (simple bold geometric mark + “FlowAI” wordmark)  
Center/Right on mobile: page title “Settings”  
Far right: small “Ask AI” button with a sparkle/star icon

### Left Sidebar – Exact Items & Icons
Use Lucide icons (or Heroicons) with these exact meanings:

- Workspaces → layout-grid or folders icon
- Dashboard → layout-dashboard
- Workflow Library → library or book-open + blue badge “28”
- Workflow Canvas → flame (orange/red) icon + small fire accent
- Templates → layout-template
- Analytics → bar-chart-2
- Team Members → users + green badge “35+”
- Integrations → puzzle or plug
- Agent Management → bot or cpu
- **Settings** → settings/gear (this one is active – soft gray background + left border accent)
- Help & Support → help-circle or life-buoy
- Appearance → sun or moon

Bottom section of sidebar:
- “Workflow Runs” list with 4 sample items (small colored status dots)
- Upgrade card: “891/1000 – Upgrade for unlimited use” + solid black Upgrade button
- User row: circular avatar + “Tanjim Islam” + “tanjim@gr8rstudio.com”

On mobile the sidebar slides in from the left with a dark semi-transparent backdrop. Clicking the backdrop or the X closes it smoothly.

### Main Content – Tab Navigation
Tabs (scrollable on mobile):  
**General Settings** | Profile Settings | Password & Security | Notifications | Billing | Danger Zone

Active tab has a clear visual treatment (underline or soft filled background + bold text). Tab switching must be instant with a short fade or slide transition of the content panel.

### Tab Contents (exact structure)

**1. General Settings (default open)**  
White card titled “General Settings” with subtitle “Manage your workspace configuration”

- Workspace Name → text input prefilled “gr8rstudio”
- Workspace URL → text input prefilled “flowai.app/company-hq” + helper text “Must be lowercase with no spaces”
- Workspace Logo → dashed border upload zone showing a small “gr8r” logo preview + Upload and Remove buttons
- Locale & Region section:
  - Timezone select (default “UTC (UTC+0)”)
  - Date Format select (default “MM/DD/YYYY”)
  - Time Format select (default “12-hour (1:00 PM)”)
- Footer actions: ghost “Cancel” button + solid black “Save changes” button

**2. Profile Settings**
- Large circular profile photo area with upload/remove
- Full Name, Email Address, Job Title, Company (pre-filled with Tanjim Islam data)
- Profile Overview textarea
- Connected Email and Connected Number fields
- “Update Profile” primary button

**3. Notifications**
Clean sectioned list with three columns of toggle switches for each row: Email | In-app | Slack

Sections:
- Workflow Runs (Run completed successfully, Run failed, Run took longer than expected)
- Team (New member joined, Member removed, Role changed)
- Integrations (Integration disconnected, New integration available)
- Billing (Usage reached 80% of limit)

Toggles must be smooth iOS-style switches with clear on/off visual states and a soft scale animation when flipped.

**4. Danger Zone**
Red-tinted card with strong warning banner at the top:  
“These actions are irreversible. Please read carefully before proceeding.”

Four rows, each with icon + title + short description + red action button:
- Export Workspace Data → “Request export”
- Transfer Workspace Ownership → “Transfer Ownership”
- Remove all non-owner Members → “Remove All Members”
- Delete Workspace → large solid red “Delete Workspace” button

Clicking any danger action opens a confirmation modal. The Delete Workspace action requires the user to type a confirmation phrase.

### Interaction & Feedback Requirements (very important)
- All inputs are fully editable
- All toggles are functional and remember state
- Save / Update buttons show a brief loading state then a success toast (top-right or bottom, soft green, auto-dismiss)
- Hover states on every clickable element (subtle background or scale)
- Active/pressed states
- Focus-visible rings for accessibility
- Smooth sidebar open/close animation
- Modal with backdrop blur or dark overlay + scale-in animation
- Toast notifications with slide-in/out
- Disabled states where appropriate
- Keyboard support (Escape closes sidebar and modals)

### Technical Requirements
- Single HTML file only
- Tailwind CSS via CDN
- Lucide icons via CDN (or inline SVG)
- Vanilla JavaScript only (no frameworks)
- Fully responsive and mobile-first
- Clean, readable, well-commented code
- No placeholder “lorem” text — use the exact labels and sample data described above

Make the final result look and feel like a real production settings page from a high-end AI SaaS product. Every detail of spacing, icon choice, interaction feedback, and visual hierarchy must feel intentional and polished.

Output only the complete HTML file. No extra explanation.