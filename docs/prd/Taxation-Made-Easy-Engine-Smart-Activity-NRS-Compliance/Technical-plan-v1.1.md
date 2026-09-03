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

----------------------------------------------------------------
11. OPEN QUESTIONS — UPDATED

11.1 Which APP or System Integrator will BIGDROPS use? Still open.
11.2 CLOSED in v1.1. See section 5.7 above.
11.3 Does the existing audit diffing system need manual field
     registration? Still open.
11.4 Confirm the mapping in field IH-5 (Reference) against the
     existing PO Number field before implementation. Still open.
11.5 NEW. Does Calculations.ts already use fixed-point or decimal
     math? Answer this before writing section 5.1's guardrail.
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
================================================================