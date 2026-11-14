# Decision Log

- **Status:** DRAFT FOR REVIEW
- **Product:** Conversational Document Assistant
- **Writing Standard:** ASD-STE100 Simplified Technical English

---

## DEC-01 - The Assistant Replaces The JSON Import Path For Invoice Creation

**Decision.** The conversational assistant is the fast path for invoice creation. The JSON import sheet stays for the cases it already handles well: a user who has a document file and wants its rows.

**Alternatives.** Keep both paths as equals. Replace the import sheet entirely.

**Reason.** The import path reads a document file that already exists. The assistant handles a live conversation. They serve different inputs. Removing the import path would remove a working feature.

## DEC-02 - The Model Sends Tool Calls, Not A Document JSON Blob

**Decision.** The model calls a small fixed tool list. The app owns the structure, the validation and the money.

**Alternatives.** The model returns the import JSON. The model returns a partial document that a second prompt turns into tools.

**Reason.** The import JSON carries structure the model gets wrong. The identifier lesson from the Item Library work is direct: a model that must copy identifiers fails, and the failure looks like a bad invoice. A tool list of nine calls with one field each is a task a free model can do.

## DEC-03 - The App Computes, The Model Never Computes

**Decision.** The model reads computed totals and never writes them.

**Reason.** A free model multiplies 5 by 95000 correctly most of the time. That is not a standard. The app already has the correct calculation. The model reads it and says it.

## DEC-04 - The Model Identifies A Row By Description, Not By Index

**Decision.** `update_line_item` and `remove_line_item` take a description fragment. The app resolves it.

**Reason.** A model that counts rows is unreliable. A model that copies a description fragment is reliable. The app owns the row identity.

## DEC-05 - Every Change Is A Card The User Accepts

**Decision.** No tool call changes the form directly. Every call produces a pending card. The user accepts or rejects it.

**Alternatives.** Apply the change at once. Apply at once with an undo.

**Reason.** An invoice is a money document. The user must see a change before it lands. A card is also the undo. An undo button is more code and is easier to get wrong than a reject button.

## DEC-06 - The Assistant Never Saves

**Decision.** The word `file it` prepares a confirmation. The user confirms. The normal save path runs.

**Reason.** A save that no human confirmed is a wrong invoice that reached a client. The confirmation view costs one screen.

## DEC-07 - Free Cloud Providers, Not The On Device Model

**Decision.** The assistant calls free cloud tiers. The on-device model work stays separate.

**Alternatives.** On-device only. Both.

**Reason.** The user requires a zero cost solution and the trial starts now. The on-device path needs a model download of 229 MB or 731 MB, a model swap, a prompt change and a runtime change before it can produce a tool call. The cloud path needs a key and a client. The free tier ceiling of 20 requests a day on some providers is handled by the chain, not by a slower build.

**Cost of this decision.** Client content leaves the device. FR-13 handles it with a disclosure.

## DEC-08 - One OpenAI Compatible Client, Many Base URLs

**Decision.** The client speaks the OpenAI chat completions interface. Each provider is a row of base URL, key and model name.

**Alternatives.** A provider adapter per provider. A local proxy that the user runs on a computer.

**Reason.** Five providers already speak the OpenAI interface. A local proxy needs a computer, a LAN route and a second process. The phone is the only device that is always present.

## DEC-09 - The Provider Chain Is Ordered And Editable

**Decision.** The chain is a list. The user reorders it and removes providers in Settings.

**Reason.** A user with only one provider key should not wait for the failures of the providers before it. A user with a fast provider should not be moved off it.

## DEC-10 - The Chain Advances On Quota, Rate Limit And Server Errors, And Stops On A Bad Request

**Decision.** The failover table in `architecture.md` section 7.

**Reason.** The same request on another provider fails the same way. Retrying a 400 across the chain wastes the whole chain and hides the real error.

## DEC-11 - The Allowance Is Read From The Provider, Not Stored

**Decision.** The app reads the allowance from the provider response and from the 429 body.

**Reason.** Google states that free tier limits are not published and must be read in AI Studio. A stored table was already wrong once, in the Our Free Model registry note, which claimed 27 free models and 200 requests a day when the live answer was 15 free variants and 50 or 1000 requests a day.

## DEC-12 - Keys Live In App Private Storage, And The Browser Build Is Out Of Scope

**Decision.** The keys are in a `0600` file under `Directory.Private`. The browser build keeps the feature off.

**Alternatives.** Add a secure storage plugin. Keep the keys in `localStorage`.

**Reason.** `localStorage` is readable by any script that runs in the page. The project has no secure storage plugin, and adding one for one trial is more than the trial needs. The file is app private and the browser build is not in the trial.

## DEC-13 - No Assistant Data Is Stored In The Tenant Database During The Trial

**Decision.** The conversation lives in memory for the session. Nothing is written to the tenant database.

**Reason.** A month of trial data in the tenant schema is a migration, a rollback plan and a privacy question. The trial does not need it. If the trial succeeds, the decision becomes a product decision with a proper design.

## DEC-14 - The Tool List And The Chat Sheet Are Document Generic

**Decision.** The tool list, the chat sheet, the provider client and the failover rules live outside the invoice module.

**Reason.** FR-17. A quotation or a waybill assistant is the same work with a different tool list. The invoice module must not become the place where the chat logic lives.

## DEC-15 - Notes And Terms Are Written As Plain Text

**Decision.** The notes tool takes plain text. The app stores one paragraph block.

**Reason.** The rich text block contract is a second thing for the model to get right, for little gain in a conversation. The user can edit the result in the form.

## DEC-16 - The Feature Is Off By Default And Stays Gated For The Trial

**Decision.** A Settings toggle, off after install.

**Reason.** FR-13 and FR-14. A trial that is on by default is a trial that has already shipped to every user of the app.

## DEC-17 - Cloudflare Workers AI Leads The Provider Chain

**Decision.** The first provider in the chain is Cloudflare Workers AI on the free plan. The AMD Radeon Cloud Token Factory is second. The key for each comes from a free signup and needs no credit request.

**Alternatives.** AMD first. Gemini first. OpenRouter first.

**Reason.** Two things decide the order. The AMD allowance is the largest at about 10 US dollars of usage a day, but its endpoint is on the China site, which is a reachability and a latency risk for a user in Nigeria. Cloudflare runs on an edge network that is close to the user, its free plan gives about 3,700 conversation turns a day with the cheapest model, and it needs no card. A chain that the user cannot reach is worth less than a chain that is smaller and reachable.

**Cost of this decision.** The Cloudflare free plan cannot use the strongest models. DeepSeek V4 Flash, GLM 5.2, GLM 5.3, Kimi K2.6 and Inkling 2 Small all need a paid billing method. The free plan serves Llama, Gemma 4 26B, Qwen 3 30B, Granite and GPT-OSS. RISK-18.

## DEC-18 - AMD Token Factory Is The Second Provider

**Decision.** The AMD Radeon Cloud Token Factory is the second provider. Its key comes from the free AMD AI Developer Program. No credit request is needed.

**Reason.** Its daily allowance of about 10 US dollars of usage is the largest in the chain by two orders of magnitude, and it serves frontier models that the Cloudflare free plan cannot reach. It is second because of the China site, not because of its quality.

**Cost of this decision.** The AMD terms call Token Factory a free trial and development service, not a production service, and forbid reselling access. RISK-14. The trial is inside the terms. A release to tenants is not.

## DEC-19 - Phase 1 Uses Only The OpenAI Interface

**Decision.** Every provider is called through the OpenAI chat completions interface. The AMD Anthropic Messages path is not used in phase 1.

**Reason.** One request builder and one stream parser. A second interface means a second parser, a second set of contract tests and a second set of failure cases. The Anthropic path is a fallback for a broken OpenAI path, not a phase 1 feature.

## DEC-20 - The Trial Runs Against A Local Gateway

**Decision.** The trial points the app at one OmniRoute gateway. The gateway is one OpenAI compatible endpoint on the developer computer, or on the phone in Termux. The app holds one provider row.

**Alternatives.** The app calls the free providers directly, with its own chain. The app calls one provider directly, with no chain.

**Reason.** The gateway already holds what the app would otherwise have to build. It has 150 or more free providers, a quota aware failover, live quota telemetry, a terms catalog that excludes the providers it marks as avoid, a routing decision header and a cost header. It binds `0.0.0.0`, so a phone on the same network reaches it, and it runs in Termux with no root.

The difference is one week against one month. The direct mode with its own chain stays in the app because a shipped product cannot require the tenant to run a gateway. The mode is a setting, not a fork.

**Cost of this decision.** The trial needs a gateway process. RISK-20.

## DEC-21 - The App Keeps Direct Mode For The Shipping Path

**Decision.** The app keeps the provider rows and the failover table for the direct mode. The gateway is one row among them.

**Reason.** A tenant of a shipped product will not run a Node server on their computer. The vendor can not run a gateway either without a cost that the free model budget does not cover. The direct mode, where the tenant pastes their own provider key into the app, is the shipping path. The gateway is the trial path and the developer path.

## DEC-22 - affectUI Is Evaluated For The Chat Surface And Not Adopted For The Trial

**Decision.** The change card is built inside this project. The affectUI components are not added as a dependency during the trial.

**Reason.** affectUI fits the project well: MIT, React 19, one file per component, no Tailwind and no animation library, and it installs into `src/components/ui/` with the shadcn CLI that this project already uses. Its Decision Inbox is an approval list with two answers, a live region and keyboard support, which is the shape of the change card.

The reason not to adopt it now is that the components carry their own styles and not the `bd-*` tokens of this app. The change card must show an old value, a new value and a money amount in the app's own language. Restyling a foreign component costs more than the sixty lines that the card needs. The trial does not need the trace view, the agent tree or the cost breakdown that the paid tier of affectUI covers.

**Trigger to adopt.** If the assistant grows past one document type, or if the team wants an agent trace view with cost and timing, the Tool Call Card and the Decision Inbox are the fast path. The MCP server lets Claude Code, Codex and OpenCode install them.


## DEC-23 - The Provider Catalog Is Data, Not Code Per Provider

**Decision.** Every tier 1 provider is a catalog row: name, base URL, key prefix, default model and declared models. One OpenAI compatible client serves every row.

**Alternatives.** A module per provider. A setup wizard that asks for a base URL.

**Reason.** Five providers already share the OpenAI interface, and the rest publish a compatibility route. A module per provider adds code without a behaviour change. A setup wizard asks the user for a value that the app already knows. The row keeps one paste as the whole setup cost.

## DEC-24 - The Model List Starts Declared And Refreshes On Demand

**Decision.** The dropdown opens with declared model ids. A **Fetch models** action merges the live `/models` answer. A failed fetch keeps the declared list.

**Alternatives.** Fetch on open. Ship no list and force a fetch.

**Reason.** Fetch on open adds a spinner to a control that must feel instant. A provider without a `/models` route would show an empty dropdown. The declared list is the floor, and the live list is a bonus.

## DEC-25 - A Custom Endpoint Is A First-Class Provider

**Decision.** The custom form creates a provider row with the `custom:<slug>` id. It uses the same client, the same cards and the same key rules.

**Alternatives.** A separate "advanced" chat path. A base URL field on every message.

**Reason.** An unlisted model fails for the same reasons as a listed one: a bad key, a quota, a network fault. A second chat path doubles the failure handling. One row keeps one readout and one failover rule.

## DEC-26 - Four Layouts, One State Model

**Decision.** The assistant renders in four shells that read one conversation, one invoice and one provider state. Width alone selects the shell.

**Alternatives.** One responsive column. A separate desktop product.

**Reason.** A phone needs a sheet, a foldable needs a split, a tablet needs a rail and a desktop needs an artifact column. These are layout differences, not product differences. A single state model keeps the money rule and the card rule the same in every shell.

## DEC-27 - Keep Local Chat Primitives And Do Not Add The assistant-ui Runtime

**Decision.** Keep the BOUXRE chat UI and local Chat-blocks patterns. Do not add `@assistant-ui/react` for this feature.

**Alternatives.** Adopt the full assistant-ui runtime. Copy selected primitive behavior into local components.

**Reason.** BOUXRE must own every document mutation, approval, and financial calculation. Local state and deterministic change cards keep that boundary explicit. The existing four viewport shells and BYOK transport also remain app-owned. The local Shadcn references provide the required scroll, composer, model menu, approval, and status-trace patterns without adding a runtime dependency graph. Current assistant-ui guidance also deprecates `makeAssistantToolUI` and `useAssistantToolUI` in favor of toolkit renderers or inline part overrides. Port only the UX behaviors that are needed.

## DEC-28 - Bolu Is A Conversational Business Operations Assistant

**Status:** APPROVED by the product owner on 2026-11-13.

**Decision.** Bolu must support both reading existing authorized business records and controlled write workflows for creating and modifying business documents. Read-only Business Intelligence is one capability within Bolu. It is not the complete product direction.

**Approval boundary.** Bolu may interpret requests and propose structured changes. The application owns validation, authorization, tenant scope, calculations, business rules, persistence, and execution. The user must explicitly approve each proposed change before the application applies it. The user must separately confirm before the application saves or files a document. Approval to apply a draft change does not authorize persistence.

**Financial and security constraints.** Existing calculation engines and system-owned computed values remain authoritative. The model must not invent missing facts or calculate replacement financial values. Existing tenant boundaries and permissions apply to every read and write. No payment, money movement, or other financial execution is approved by this decision.

**Scope limits.** This decision approves the product direction and control boundary only. It does not approve every FR in this draft, the initial document pack, all eight authoring packs, a provider chain, provider key custody, a trial design, or a release plan. Reconcile those items and obtain owner approval before treating them as committed scope.

**Relationship to prior entries.** DEC-01 through DEC-27 remain historical proposals and decisions within the DRAFT FOR REVIEW authoring specification. This entry does not silently promote their detailed requirements or provider/trial choices to approved requirements. Where an earlier entry assumes that read-only BI is sufficient, it is superseded by this direction. Other detailed entries remain proposed or unresolved until reconciled.
