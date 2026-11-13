# Test Plan

- **Status:** DRAFT FOR REVIEW
- **Product:** Conversational Document Assistant
- **Writing Standard:** ASD-STE100 Simplified Technical English

---

## 1. Layers

| Layer | Tool | Covers |
|---|---|---|
| Unit | `node --test` with the repository loader | The tool schema, the row resolver, the failure classifier, the quota reader, the key store. |
| Integration | `node --test` | The agent loop against a fake provider. The fake streams text and tool calls. |
| Contract | `node --test` | The OpenAI compatible request and stream parser against recorded provider payloads. |
| Device | Manual, on a real phone | The chat sheet, the keyboard, the card interaction, the real providers. |
| Money | Existing suite plus new guards | No change to the computed totals. |

## 2. Unit Tests

### 2.1 The Tool List

| # | Test | Expected |
|---|---|---|
| U-01 | The tool list contains no field that a calculation writes. | The list has no `amount`, `subtotal`, `total`, `vat_rate`, `discount_rate`, `wht_rate` or `install_rate`. |
| U-02 | A tool call that names a computed field is rejected. | The rejection names the field and the form does not change. |
| U-03 | A tool call with an unknown tool name is rejected. | The form does not change. |
| U-04 | A tool call with a missing required argument is rejected. | The form does not change. |
| U-05 | A tool call with a non numeric quantity is rejected. | The form does not change. |
| U-06 | A tool call with a negative unit price is rejected. | The form does not change. |

### 2.2 The Row Resolver

| # | Test | Expected |
|---|---|---|
| U-10 | A fragment that matches one row returns that row. | The index is the matching row. |
| U-11 | A fragment that matches no row returns a clear failure. | The failure names the fragment and the rows. |
| U-12 | A fragment that matches two rows returns a clear failure. | The failure asks the user to be more specific. |
| U-13 | A fragment matches a row after another row was removed. | The index is correct after the removal. |

### 2.3 The Failure Classifier

| # | Test | Expected |
|---|---|---|
| U-20 | A 429 advances the chain. | The next provider is used. |
| U-21 | A 500 advances the chain. | The next provider is used. |
| U-22 | A 400 does not advance the chain. | The chain stops and the error is shown. |
| U-23 | A 401 advances the chain and marks the key. | The Settings screen shows the key as failed. |
| U-24 | A timeout advances the chain at most once. | The chain does not loop. |
| U-25 | The Gemini quota body is read. | The allowance is the value in the body. |
| U-26 | An OpenRouter key body is read. | The allowance is `free_model_daily_requests.remaining`. |

### 2.4 The Key Store

| # | Test | Expected |
|---|---|---|
| U-30 | A key is written and read back. | The key round trips. |
| U-31 | The file mode is owner only. | The mode is 0600. |
| U-32 | A display value is masked. | Only the last four characters are shown. |
| U-33 | No log line contains a key. | The log capture holds no key. |
| U-34 | A removed key is gone from storage and from the chain. | Neither holds the key. |

## 3. Integration Tests Against A Fake Provider

| # | Test | Expected |
|---|---|---|
| I-01 | One user message with one tool call produces one card. | The card names the field and the values. The form is unchanged until the card is accepted. |
| I-02 | An accepted card applies once. | The form holds the new value and the card cannot be applied again. |
| I-03 | A rejected card leaves the form unchanged. | The card shows the rejection. |
| I-04 | A multi turn conversation sends only the new turns after the first. | The second request holds the first user message in the history, not in the resent system block. |
| I-05 | The tool result returns to the model. | The second request holds the tool result. |
| I-06 | The model answers in prose with no tool call. | The reply is shown and the loop ends. |
| I-07 | The model answers with an invalid tool call twice. | The loop stops after the second failure and the draft is kept. |
| I-08 | The model asks to file. | A confirmation view opens. Nothing is saved. |
| I-09 | The user confirms the filing. | The normal save path runs once. |
| I-10 | The save fails. | The failure is reported in the chat and the draft is kept. |
| I-11 | Every provider in the chain fails. | The assistant says so. The draft is kept. |
| I-12 | The feature is off. | No request is sent and the control is hidden. |

## 4. Contract Tests

Recorded payloads from each provider, sanitised of keys.

| # | Test | Expected |
|---|---|---|
| C-01 | A Gemini stream parses. | The text and the tool call are separated. |
| C-02 | An OpenRouter stream parses. | The text and the tool call are separated. |
| C-03 | A Groq stream parses. | The text and the tool call are separated. |
| C-04 | A Cerebras stream parses. | The text and the tool call are separated. |
| C-05 | A NVIDIA NIM stream parses. | The text and the tool call are separated. |
| C-06 | A provider that returns a plain text answer is handled. | The reply is shown. No crash. |
| C-07 | A provider that returns a HTML error body is handled. | The failure is classified. No crash. |

## 5. Money Tests

| # | Test | Expected |
|---|---|---|
| M-01 | The file `src/lib/Calculations.ts` is unchanged. | The git diff for the trial branch holds no change to that file. |
| M-02 | No PDF renderer is changed. | The git diff holds no change under `src/components/pdf/`. |
| M-03 | The existing invoice suite passes. | The critical suite holds the same result as before the change. |
| M-04 | A quantity of 5 and a price of 95000 give 475000. | The computed amount is 475000. |
| M-05 | The assistant never sends a computed field. | The tool list guard from U-01 holds at runtime. |

## 6. Device Tests On A Real Phone

| # | Test | Expected |
|---|---|---|
| D-01 | The chat sheet opens over the invoice form. | The sheet and the top of the form are visible together at 360 pixels. |
| D-02 | The keyboard does not cover the composer. | The composer stays above the keyboard. |
| D-03 | A real invoice is filed by conversation. | The invoice saves and the PDF matches the manual invoice. |
| D-04 | The first reply arrives in under 2 seconds. | The time is measured on the phone over a real network. |
| D-05 | The quota error advances the chain. | A second provider answers and the user sees which one. |
| D-06 | The feature off sends nothing. | The network log holds no request to a provider. |
| D-07 | A rotation of the phone does not lose the draft. | The form holds the values. |
| D-08 | The app is killed and restarted mid conversation. | The form holds the values. The conversation starts again. |

## 7. Trial Measurement

| Week | Action | Output |
|---|---|---|
| 1 | Measure the JSON import path with 3 real invoices. | The baseline time. |
| 1 | Use the assistant for 5 real invoices. | The first error list. |
| 2 | Fix the top 3 errors. | A release. |
| 2 | Measure the assistant path with 3 real invoices. | The first comparison. |
| 3 | Use the assistant for daily invoicing. | The error count per 20 invoices. |
| 4 | Measure the assistant path again. | The trial result. |
| 4 | Write the decision. | Keep, change or remove. |

## 8. Commands

```bash
bun run audit:load
bun run typecheck
bun run test
bun run lint
```

The new unit and integration tests live in `src/tests/ai-assistant/`. The repository test script runs `src/tests/critical/`. The new test files must be added to the critical folder, or the script must be widened. This is an open point for the project lead.

## 9. Gate Before The Trial Starts

- Every test in sections 2, 3, 4 and 5 passes.
- The device tests D-01, D-03, D-06 and D-07 pass on a real phone.
- The money tests M-01, M-02 and M-03 pass.
- The disclosure text is approved.
- The note and term defaults are approved.
