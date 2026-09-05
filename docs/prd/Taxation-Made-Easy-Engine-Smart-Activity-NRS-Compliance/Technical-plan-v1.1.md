================================================================
BIGDROPS INVOICE COMPLIANCE ENGINE — PRODUCT REQUIREMENTS DOCUMENT
Version: 1.1 (Claude baseline, patched)
Companion file: bigdrops-tax-ux-vision-v1.md (discovery stage, separate)
Target legislation: Nigeria Tax Act 2025, Nigeria Tax Administration Act 2025
Administering body: Nigeria Revenue Service (NRS)
================================================================

0. DOCUMENT CONTROL

0.1 This version patches v1.0. Two errors are fixed. One guardrail
    is added. Section 12 lists every change.
0.2 A second document exists now: bigdrops-tax-ux-vision-v1.md.
    That document holds product-vision ideas that are not yet
    buildable. Do not pull ideas from that file into a ticket
    without first answering its section 6 audit questions.
0.3 Sections 1 to 11 below are unchanged from v1.0 unless this
    document states a change. Read v1.0 first if you have not
    already.
0.4 Evidence corrections applied 2026-09-05. The baseline audit
    against the approved PRD set found three statements that needed
    correction: the small-company turnover threshold (section 8.3),
    the statutory status of the 21st-day deadlines (section 8.1),
    and the statutory status of the WHT rate table (section 5.7).
    These corrections are factual status fixes only. They do not
    change the architecture.

----------------------------------------------------------------
5. CALCULATION ENGINE CHANGES — PATCHED

5.1 Numeric precision (new rule).
    - Do not assume Calculations.ts uses floating-point math today.
      Check first.
    - If it already uses a fixed-point or decimal library, keep
      using that library. Do not introduce a second one.
    - If it uses plain JavaScript numbers, add a decimal library.
      Set precision to at least 20 digits. Round only at the final
      step, when the function returns its result.
    - Reason: NRS re-checks your submitted totals on their side. A
      rounding mismatch between your total and their recomputed
      total can cause a rejection.

5.7 WHT rate table — corrected.
    - The rate table in v1.0 left open which party's entity type
      (corporate or individual) picks the WHT rate column.
    - Correction: on a standard sales invoice, the party receiving
      payment is the tenant issuing the invoice, not the client.
      The rate table must read the tenant's own legal form, not
      the client's.
    - Action: add a new tenant-level field, SP-12, legal_form, enum
      "corporate" or "individual", on the Supplier Profile table
      from section 4.1 in v1.0. Do not add an entity-type field to
      the Client model.
    - Delete field CL-11's role in the WHT rate table. CL-11
      (client_type: B2B/B2C/B2G) still controls the clearance model
      in section 7.2. It never controlled the WHT rate. v1.0 did
      not actually say it did, but the note in v1.0 section 5.7
      was unclear on this point. This patch removes that ambiguity.
    - Open question 11.2 from v1.0 is now closed. Remove it from
      the open questions list.
    - Statutory status of the rate table (corrected 2026-09-05):
      the v1.0 rate values (goods 2%, construction 2%/5%, services
      5%/10%, rent 10%, exempt 0%) are working assumptions, not
      verified statutory rates. The rate source is the subsidiary
      regulation "regulations relating to deduction of tax at
      source" (Files-tax open decision 1). The regulation is not
      yet sourced. Do not ship these rates as statutory authority.
    - Carried-forward note conflict (corrected 2026-09-05): v1.0
      section 5.7 states that the Corporate/Individual rate column
      reads the client's entity type. This patch supersedes that
      statement: the rate column reads the tenant's own legal form
      (SP-12). Read this patch as authoritative over the v1.0 note.

----------------------------------------------------------------
8. COMPLIANCE HUB DASHBOARD — PATCHED

8.1 Filing deadlines — corrected structure.
    - v1.0 stated one universal date, the 21st, for both VAT and
      WHT. Keep the 21st as the default value for both. But do not
      hard-code it as a single constant used everywhere.
    - Store the deadline as a lookup value, keyed by obligation
      type, not as one shared constant. Table:

      obligation_type      statutory_due_day
      vat_return           21
      wht_remittance        21

    - Reason: this costs nothing extra to build correctly now, and
      it means a future change to one obligation's date does not
      require touching the other.
    - If your compliance advisor identifies a case where the two
      dates genuinely differ, add a new row to the lookup table.
      Do not add a special case in code.
    - Statutory status of the 21st (corrected 2026-09-05): the 21st
      is the PRD default only. It is not verified statutory
      authority in this repository. The general VAT return deadline
      is delegated by NTA section 156(1) to the NTAA 2025, whose
      text is absent from NRS-docs/. The verified NTA section
      155(4) day-14 applies only to a designated VAT withholding
      agent (Files-tax open decision 3). The WHT remittance
      deadline depends on the unsourced subsidiary regulation
      (Files-tax open decision 1). Name the lookup column
      default_due_day instead of statutory_due_day when the table
      is created, so the unresolved status is not misrepresented.

----------------------------------------------------------------
8.3 SMALL COMPANY TURNOVER THRESHOLD — CORRECTED

    - v1.0 section 8.3 stated "Financial statement turnover is
      ₦100,000,000 or below" as a legal condition for small company
      status. The verified Nigeria Tax Act 2025 text defines small
      company by gross turnover of ₦50,000,000 or below per annum
      (section 202, NRS-docs/NIGERIA-TAX-ACT-2025.md line 4502).
    - The fixed-assets condition (₦250,000,000 or below) and the
      professional-services exclusion are unchanged and verified.
    - Use ₦50,000,000 in the dashboard indicator. Keep the
      "Internal Estimate" label and the three-condition display.
    - The VAT registration threshold (₦25,000,000, v1.0 section
      8.4) remains unresolved in this repository. No primary source
      for it is present. Do not present it as verified.

----------------------------------------------------------------
11. OPEN QUESTIONS — UPDATED

11.1 Which APP or System Integrator will BIGDROPS use? Still open.
11.2 CLOSED in v1.1. See section 5.7 above.
11.3 Does the existing audit diffing system need manual field
     registration? Still open.
11.4 Confirm the mapping in field IH-5 (Reference) against the
     existing PO Number field before implementation. Still open.
11.5 ANSWERED in the 2026-09-05 baseline audit. Calculations.ts
     uses decimal.js, precision 20, ROUND_HALF_UP (line 38). No
     second library is needed. Section 5.1's guardrail applies.
11.6 NEW. Confirm the tenant's legal form (corporate or individual)
     is not already stored somewhere before adding SP-12.

----------------------------------------------------------------
12. CHANGELOG, v1.0 to v1.1

    Section   Change
    5.1       Added numeric precision guardrail. Conditional on
              11.5.
    5.7       Fixed which party's entity type drives the WHT rate
              table. Was ambiguous toward the client. Now correctly
              points to the tenant, via new field SP-12.
    8.1       Changed VAT/WHT deadline from one hard-coded constant
              to a lookup table keyed by obligation type. Both
              values still default to the 21st. No behavior change
              today. Removes a rigid assumption for the future.
    11.2      Closed.
    11.5      New open question, tied to 5.1.
    11.6      New open question, tied to 5.7.

    Not changed: sections 1 to 4, 6, 7, 9, 10 carry forward from
    v1.0 without edits. Re-read v1.0 for their full text.

    Evidence corrections added 2026-09-05 (baseline audit):
    0.4       Added evidence-correction note.
    5.7       Added statutory-status note for the rate table;
              flagged the carried-forward client-entity-type note
              as superseded.
    8.1       Added statutory-status note for the 21st-day
              defaults; recommended the lookup column name
              default_due_day.
    8.3       Corrected the small-company turnover threshold to
              ₦50,000,000 per verified NTA 2025 section 202.
    11.5      Answered: Calculations.ts uses decimal.js, precision
              20, ROUND_HALF_UP.
================================================================