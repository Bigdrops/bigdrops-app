You are working on the BIGDROPS business platform.

Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

==================================================
SKILL LOADING PROTOCOL (MANDATORY)

1. Read "docs/PROJECTSKILLINDEX.md" first.
2. Load the following skills:
   - Karpathy
   - frontend-design
   - typescript-advanced-types
3. Attempt to load each skill through the skill system. If loading fails, fallback to reading the corresponding files from ".claude/skills" or the project skill directory.
4. If any required skill cannot be read, stop immediately and report the error.
5. Read "AGENTS.md" completely before making any code changes.

==================================================
REPORTING PROTOCOL (MANDATORY)

Save a detailed implementation report to:

"docs/Task/reports/bank-details-view-selection-refinement.md"

The report must include:

- Root Cause Analysis
- Files Modified
- UI Behaviour Before/After
- Hook Order Verification
- State Flow
- Verification Results
- Risks

==================================================
CONTEXT

The previous implementation partially reused the existing PDF bank account selection infrastructure.

However, it introduced two major problems:

1. Invoice View now crashes with React error #310.
2. The requested UX was not implemented.

The user never requested an additional "Switch Account" control.

The user requested that the existing Bank Details section itself becomes the selector.

This implementation must correct the architecture, not patch around it.

==================================================
OBJECTIVE

Redesign the Bank Details section so it becomes the single place for viewing and selecting payment accounts.

The Bank Details card must:

- display the active account
- expand/collapse independently
- allow selecting another account directly
- immediately update the PDF selection
- never require a second selector elsewhere

The previous PdfBankControls duplication should be removed if it is no longer necessary.

==================================================
REQUIRED UX

Collapsed:

Bank Details ▼

✓ FCMB
Jaiyeola Monday
2238393012

Nothing else is shown.

When expanded:

Bank Details ▲

✓ Active
FCMB
Jaiyeola Monday
2238393012

---

○ UBA
Sun and Shield Power Solutions
1024829598

---

○ Zenith
...

Clicking another account:

- immediately moves the Active indicator
- updates bankAccountId
- saves using the existing persistence mechanism
- updates PDF output
- DOES NOT collapse the section

==================================================
IMPORTANT UX RULES

The chevron performs ONE responsibility only:

- expand
- collapse

Nothing else.

Selecting an account performs ONE responsibility only:

- change active account

Nothing else.

These responsibilities must never be coupled.

==================================================
REMOVE DUPLICATED UI

Review whether PdfBankControls is still required.

If BankDetailsCard now performs account selection completely, remove the duplicated selector from Invoice and Quotation view pages.

There must be only ONE account-selection interface.

==================================================
INVOICE CRASH

Investigate and fix the React #310 error.

Do not guess.

Determine the exact cause.

Verify:

- no conditional hook execution
- no hooks after conditional returns
- no hook order changes between renders
- no render path changes violating Rules of Hooks

If another cause is found, document it with evidence.

==================================================
QUOTATION VIEW

Ensure the Quotation page receives the identical behaviour.

Invoice and Quotation must remain visually and functionally identical.

Do not implement the feature differently in each screen.

==================================================
STATE MANAGEMENT

Reuse the existing persistence.

Reuse the existing bankAccountId.

Reuse the existing save mechanism.

Do NOT introduce:

- new database columns
- new tables
- duplicated state
- duplicated selectors

==================================================
STRICT SCOPE

Modify only the components required to:

- fix the React crash
- redesign BankDetailsCard
- remove duplicated selector UI
- wire account selection into existing persistence
- ensure Invoice and Quotation behave identically

Do not modify Settings.

Do not modify the PDF renderer.

Do not redesign unrelated document sections.

==================================================
VERIFICATION

Run in this exact order:

1. bun run audit:load
2. bun run typecheck
3. bun run build

Manual verification:

Invoice:

- opens without React #310
- Bank Details collapsed by default
- active account visible
- expand works
- collapse works
- selecting another account updates immediately
- PDF uses new account
- refresh persists selection

Quotation:

Repeat every verification above.

Regression:

- no duplicate selector
- no duplicated state
- no broken hooks
- no console errors
- no React warnings

==================================================
OUTPUT

Provide:

1. Root Cause of React #310
2. Why it occurred
3. Files modified
4. Before/After UI description
5. State flow
6. Verification evidence
7. Risks
8. Confirmation that Invoice and Quotation now share identical behaviour

==================================================
STOP CONDITION

Stop only after:

- React #310 is resolved.
- BankDetailsCard is the only selector.
- Invoice and Quotation behave identically.
- PDF uses the selected account.
- No duplicate bank-selection UI remains.
- All verification passes.

==================================================
SUCCESS CRITERIA

Done means:

- Invoice no longer crashes.
- Quotation implements the same UX.
- Bank Details is collapsed by default.
- The active account is immediately visible.
- The chevron only expands/collapses.
- Clicking an account only changes the active account.
- There is only one bank-selection interface.
- Existing persistence is reused.
- No new schema or architectural duplication is introduced.