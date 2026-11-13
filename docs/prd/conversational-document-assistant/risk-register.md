# Risk Register

- **Status:** DRAFT FOR REVIEW
- **Product:** Conversational Document Assistant
- **Writing Standard:** ASD-STE100 Simplified Technical English

Severity: high, medium, low. Likelihood: likely, possible, unlikely.

---

## RISK-01 - Client Invoice Content Leaves The Device

**Severity:** high
**Likelihood:** certain

Every conversation is sent to a third party. The Gemini free tier states that content is used to improve Google products and may be seen by human reviewers. The other free tiers carry their own terms.

**Mitigation.** The feature is off by default. A disclosure names the provider and states the training term before the first request. The user accepts. The Settings screen keeps the disclosure reachable. The app sends nothing when the feature is off.

**Residual.** A user who accepts the disclosure still sends client names, amounts and addresses to a provider that may train on them. The mitigation makes the choice explicit. It does not remove the exposure.

## RISK-02 - The Free Allowance Runs Out Mid Conversation

**Severity:** medium
**Likelihood:** likely

One provider gives 20 requests a day. A ten turn conversation uses ten. A busy day of invoicing uses more.

**Mitigation.** The chain. A quota error advances to the next provider. The Settings screen shows the allowance of each provider. The app reads the allowance from the provider instead of a stored table.

**Residual.** A user with one provider key and a busy day will stop. The message must say which provider failed and what to do.

## RISK-03 - The Model Writes A Wrong Money Value

**Severity:** high
**Likelihood:** possible

A free model can misread a price. A misread price becomes a wrong invoice that reaches a client.

**Mitigation.** Every change is a card. The money value is the most visible element of the card. The app computes the amount and the assistant reads it. The contradiction check compares a stated total with the computed total before the model sees the message.

**Residual.** A wrong price that the user does not look at. The card reduces the rate. It does not remove it.

## RISK-04 - The Model Invents A Value For A Missing Field

**Severity:** medium
**Likelihood:** possible

A model asked for a client name may produce one.

**Mitigation.** FR-08. The rule is in the system prompt. A missing required field raises a question instead of a value. The change card shows an empty to filled transition for every field.

## RISK-05 - The Provider Key Is Exposed

**Severity:** high
**Likelihood:** unlikely

A key in `localStorage` is readable by any script in the page. A key in a log line leaves the device.

**Mitigation.** The key lives in an app private file with owner only mode. One masking helper formats a key for display. The key never reaches a log, an error message, an analytics event or a crash report. The browser build keeps the feature off, so no key exists in a browser context.

## RISK-06 - The Model Output Is Not A Valid Tool Call

**Severity:** medium
**Likelihood:** possible

A free model may answer in prose when the tool list asked for a call.

**Mitigation.** The reply text is still shown to the user. A reply that carries an invalid call is rejected with a tool result that tells the model to try again. After two failures the loop stops and the draft is kept.

## RISK-07 - The Trial Runs Past The Month And Nobody Decides

**Severity:** low
**Likelihood:** likely

A trial with no end date becomes a permanent feature that was never designed.

**Mitigation.** The gate in the PRD. The toggle is a visible, reversible control. The product owner reports the two measures each Friday.

## RISK-08 - The Assistant Becomes The Only Way To Create An Invoice

**Severity:** medium
**Likelihood:** possible

Users learn the assistant and stop using the form. A later change to the assistant breaks invoice creation.

**Mitigation.** FR-14. The normal form must always work. The assistant is an addition. FR-08 keeps the required fields in the domain layer so that both paths use one rule set.

## RISK-09 - A Provider Changes Its Interface

**Severity:** medium
**Likelihood:** likely

A free provider can change its model list or its tool calling behaviour without notice.

**Mitigation.** The model name is a Setting, not a constant. A model that fails to answer is reported and the chain advances. A provider that no longer works is removed from the chain by the user.

## RISK-10 - The Prompt Grows And The Quota Shrinks

**Severity:** medium
**Likelihood:** possible

A long system prompt on every turn burns a small allowance fast.

**Mitigation.** The prompt is about 800 tokens for the first turn. The loop sends only the new turns after the first. The form state carries only the fields the tools can change.

## RISK-11 - The Work Touches Money Code

**Severity:** high
**Likelihood:** unlikely

A change near the invoice calculation can break every invoice in the app.

**Mitigation.** G1 and G2 in FR-16. The assistant reads `computeDocument` and never writes it. The change set is a new module, one Settings section and one sheet. A code review must show that `src/lib/Calculations.ts` and the PDF renderers are untouched.

## RISK-12 - A Tenant Turns The Feature On For A Client Contract

**Severity:** medium
**Likelihood:** possible

A tenant discovers the assistant and puts client data through a free provider under a contract that forbids it.

**Mitigation.** The disclosure names the provider. The feature is off by default. The product owner watches the trial for this. A later release can restrict the feature to the product owner account during the trial.

## RISK-13 - The Trial Measures The Wrong Thing

**Severity:** low
**Likelihood:** possible

A trial that counts invoices created measures adoption, not speed.

**Mitigation.** One measure: the time from opening a new invoice to a saved invoice, against the JSON import baseline measured in week 1.

## RISK-14 - The AMD Token Factory Terms Do Not Allow Production Use

**Severity:** high
**Likelihood:** certain

The AMD documentation states that Token Factory is a free trial and development service, not for production, and that reselling access is not allowed. The trial by the product owner is inside the terms. A release of the assistant to tenants is not.

**Mitigation.** The trial stays internal. The feature stays behind a toggle. Before any release to tenants, the product owner must choose a provider whose terms allow it, which means a paid provider or a self hosted model. RISK-14 is the reason the chain holds more than one provider.

**Residual.** A release built on the AMD endpoint would breach its terms. The gate is a product decision, not a code check.

## RISK-15 - The AMD Endpoint Lives On The China Site

**Severity:** medium
**Likelihood:** possible

The console and the endpoint are `developer.amd.com.cn`. A user in Nigeria may see high latency, an unstable route or a blocked route. The provider that carries the chain may be the one that a Nigerian user cannot reach.

**Mitigation.** A device test from the user's own network before the trial starts. The chain covers the failure. The Settings screen shows a reachability result per provider.

**Residual.** If the endpoint is slow from Nigeria, the trial depends on the second and third providers, which have a daily ceiling of 500 and 50 requests. See DEC-17 for the allowance comparison.

## RISK-16 - The AMD Endpoint Silently Drops Parameters

**Severity:** low
**Likelihood:** likely

The endpoint rebuilds the request body and drops the parameters outside its accepted set without an error. A parameter that a developer believes is active may have no effect.

**Mitigation.** The client sends only the parameters it needs. A contract test checks that a request holds the expected keys. The client never sends `thinking`, which the endpoint answers with a 400.

## RISK-17 - The Daily Reset Time Is Not The User's Midnight

**Severity:** low
**Likelihood:** certain

The AMD allowance resets at 00:00 Beijing time. In Lagos that is 17:00. A user who invoices in the morning sees an allowance that is already partly spent and then reset in the afternoon.

**Mitigation.** The allowance readout shows the reset time in the user timezone. The chain covers the gap.

## RISK-18 - The Cloudflare Free Plan Cannot Use The Strong Models

**Severity:** medium
**Likelihood:** certain

The Cloudflare free plan gives 10,000 neurons a day, but the allowance is measured in GPU work, not in requests. The plan also refuses the models a serious assistant would want: DeepSeek V4 Flash, GLM 5.2, GLM 5.3, Kimi K2.6 and Inkling 2 Small all need a paid billing method. The free plan serves Llama, Gemma 4 26B, Qwen 3 30B, Granite and GPT-OSS.

**Mitigation.** The chain. The AMD provider and the OpenRouter free models carry the frontier models. The Cloudflare provider carries the reachable volume with a second tier of models. The readout shows the turns left, not the neurons left, so the user can see the real limit.

**Residual.** In the worst case the assistant runs on Granite Micro while the strong models sit behind an exhausted allowance. The trial measures whether that is good enough. See the trial measure in the PRD.

## RISK-19 - The Free Compute Platforms Are Too Small To Be Useful

**Severity:** low
**Likelihood:** likely

A free compute platform that runs the model on a server gives an endpoint with no quota wall. Three of the four free platforms are too small for a useful model: Cloady offers 0.5 vCPU and 1 GB of memory, and the Google Cloud always free tier offers one e2-micro VM with 1 GB of memory. The Hugging Face ZeroGPU allowance is 5 GPU minutes a day.

**Mitigation.** The self hosted option is deferred. Lightning AI is the only platform in the list with a free GPU allowance large enough to hold a real model, and it is a weekend project, not a trial week project. The provider chain covers the trial without it.

**Residual.** The chain always has a ceiling. A tenant that files many invoices a day needs a paid provider or a self hosted model.

## RISK-20 - The Trial Needs A Gateway Process

**Severity:** medium
**Likelihood:** likely

In gateway mode the app needs the gateway to be running. On a computer that means the computer is on and the phone is on the same network. In Termux that means Android has not stopped the process. A closed laptop ends the trial for the day.

**Mitigation.** The app shows the gateway state in the chat. An unreachable gateway is a clear message, not a spinner. The draft is kept and the manual form keeps working. The Settings screen holds a test button that names the gateway state.

## RISK-21 - The Gateway Holds The Provider Keys On A Computer

**Severity:** medium
**Likelihood:** possible

The gateway stores the provider keys and sees every prompt that passes through it. A computer that is shared, or a gateway that is exposed to the network without a key, leaks the keys and the client content.

**Mitigation.** The gateway must require its bearer token. The app never sends a provider key to a gateway row, only the gateway key. The Settings screen warns that a gateway on a shared network needs a key and a firewall. The trial runs on the developer network only.

**Residual.** The gateway process is a second holder of the client content. That is less exposure than a cloud provider, and more exposure than a direct call.

## RISK-22 - The Trial Depends On A Third Party Project

**Severity:** medium
**Likelihood:** possible

The gateway is OmniRoute. The trial depends on it behaving, on its free tier catalogue being honest, and on its terms catalogue staying correct.

**Mitigation.** The gateway is MIT, it has 87,000 stars, it is actively maintained, and its free tier document is checked against a computed total by a build gate. The direct mode in the app is the path that has no dependency on it. The app never requires the gateway to work, only to be one option.

