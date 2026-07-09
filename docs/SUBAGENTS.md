# BIGDROPS — Subagent Directory (`.opencode/agents/`)

Written by OpenCode on 2026-07-09 via Local Runner.

This document explains every subagent installed in `.opencode/agents/` (232 total), what each does, how to invoke them, and whether they can be reused outside this project.

---

## Can I use these outside this project?

**Yes — all 232 are portable.** They are generic OpenCode agent persona files (upstream "agency-agents"), not tied to BIGDROPS code, database, or business logic. Each file is a self-contained Markdown document with simple frontmatter:

```yaml
---
name: Git Workflow Master
description: ...
mode: subagent
color: '#F39C12'
---
```

Nothing in the frontmatter or bodies references this repository's source, Supabase schema, or `AGENTS.md`. To reuse them:

- **Another OpenCode project:** copy the `.md` file(s) into that project's `.opencode/agents/` (or `.opencode/agent/`) directory.
- **Globally (all your projects):** place them in `~/.config/opencode/agent/` so every workspace can call them.
- **Claude Code / other harnesses:** the persona prompt bodies are reusable, but the `mode: subagent` frontmatter is OpenCode-specific — adapt the frontmatter to the target tool's format.

**Caveats:**
- Some personas are domain- or region-specific by *content* (e.g. China-market strategists, `government-digital-presales-consultant`, legal/medical/GIS specialists). They still *run* anywhere — the specialization is in the advice they give, not in a project dependency.
- These files were installed here and are not automatically updated; upstream improvements require re-installing.
- They run with full agent permissions — review a persona before trusting it with write/exec actions.

---

## How to invoke a subagent

- **Mention:** type `@<agent-name>` (e.g. `@git-workflow-master`) followed by your request.
- **Switch primary agent:** run `/agent` and pick one from the list.
- **Delegate via the main agent:** ask "use the <agent> to …" and it is dispatched with the `Task` tool, running in an isolated context and reporting back.

---

## Divisions (overview)

The 232 agents span ~18 divisions: academic, design, engineering, examples, finance, game-development, gis, marketing, paid-media, product, project-management, sales, security, spatial-computing, specialized, strategy, support, testing. The full alphabetical listing follows.

---

## Full listing (232)

| # | Agent | What it does |
| :--- | :--- | :--- |
| 1 | 3d-scene-developer | Web 3D visualization — immersive scenes, terrain, point clouds via Cesium, ArcGIS Scene Viewer, modern 3D web frameworks |
| 2 | accessibility-auditor | Audits interfaces against WCAG, tests with assistive tech, ensures inclusive design |
| 3 | account-strategist | Post-sale land-and-expand, stakeholder mapping, QBR facilitation, net revenue retention |
| 4 | accounts-payable-agent | Autonomous vendor/contractor/bill payments across crypto, fiat, stablecoins |
| 5 | ad-creative-strategist | Ad copywriting, RSA optimization, asset groups, creative testing (Google/Meta/Microsoft) |
| 6 | aeo-foundations-architect | AI Engine Optimization infra — llms.txt, AI-aware robots.txt, agent discovery files |
| 7 | agentic-identity-trust-architect | Identity, auth, trust verification for autonomous AI agents in multi-agent systems |
| 8 | agentic-search-optimizer | WebMCP readiness + agentic task completion audits (book/buy/register/subscribe) |
| 9 | agents-orchestrator | Autonomous pipeline manager that orchestrates the entire dev workflow |
| 10 | ai-citation-strategist | AEO/GEO — brand visibility across ChatGPT, Claude, Gemini, Perplexity |
| 11 | ai-data-remediation-engineer | Self-healing data pipelines using local SLMs + semantic clustering |
| 12 | ai-engineer | ML model development, deployment, and integration into production systems |
| 13 | analytics-reporter | Turns raw data into dashboards, KPI tracking, statistical analysis |
| 14 | anthropologist | Cultural systems, rituals, kinship, belief systems, ethnographic method |
| 15 | api-tester | API validation, performance testing, QA across systems and integrations |
| 16 | app-store-optimizer | App Store Optimization (ASO), conversion, discoverability |
| 17 | application-security-engineer | Secures SDLC — threat modeling, secure code review, SAST/DAST |
| 18 | automation-governance-architect | Governance-first business automation (n8n) — value/risk/maintainability audits |
| 19 | autonomous-optimization-architect | Shadow-tests APIs for performance with financial/security guardrails |
| 20 | backend-architect | Scalable system design, database architecture, APIs, cloud infra |
| 21 | baidu-seo-specialist | Baidu/Chinese search ranking, ICP compliance, mobile-first indexing |
| 22 | behavioral-nudge-engine | Adapts software interaction cadence/style to maximize user motivation |
| 23 | bilibili-content-strategist | Bilibili (B站) UP主 growth, danmaku culture, algorithm, branded content |
| 24 | bim-gis-specialist | Bridges BIM + GIS — Revit/IFC conversion, indoor mapping, digital twins |
| 25 | blender-add-on-engineer | Blender Python add-ons, validators, exporters, pipeline automation |
| 26 | blockchain-security-auditor | Smart contract audits — vuln detection, formal verification, DeFi |
| 27 | book-co-author | Thought-leadership book collaborator turning fragments into chapters |
| 28 | bookkeeper-controller | Day-to-day accounting, reconciliations, month-end close, internal controls |
| 29 | brand-guardian | Brand identity development, consistency, positioning |
| 30 | business-strategist | Competitive analysis, market entry, business model, growth strategy |
| 31 | carousel-growth-engine | Autonomous TikTok/Instagram carousel generation + publishing |
| 32 | cartography-designer | Beautiful, readable maps — color, typography, label placement |
| 33 | change-management-consultant | ADKAR/Kotter/Prosci change programs for tech/restructuring/M&A |
| 34 | chief-financial-officer | Capital allocation, treasury, FP&A, M&A finance, investor relations |
| 35 | chief-of-staff | Executive coordinator — filters noise, owns processes, routes decisions |
| 36 | china-e-commerce-operator | Taobao/Tmall/Pinduoduo/JD operations, live commerce, 618/Double 11 |
| 37 | china-market-localization-strategist | Trend signals → GTM across Douyin, Xiaohongshu, WeChat, Bilibili |
| 38 | civil-engineer | Structural/geotechnical design with global codes (Eurocode, ACI, AISC…) |
| 39 | cloud-security-architect | Zero-trust architecture, defense-in-depth on AWS/Azure/GCP, IaC security |
| 40 | cms-developer | Drupal/WordPress themes, plugins/modules, content architecture |
| 41 | code-reviewer | Constructive review — correctness, maintainability, security, performance |
| 42 | codebase-onboarding-engineer | Helps new engineers understand unfamiliar codebases fast, fact-grounded |
| 43 | compliance-auditor | SOC 2, ISO 27001, HIPAA, PCI-DSS audits — readiness to certification |
| 44 | content-creator | Multi-platform editorial calendars, copy, brand storytelling |
| 45 | corporate-training-designer | Enterprise training design, curriculum, instructional design |
| 46 | cross-border-e-commerce-specialist | Amazon/Shopee/Lazada/Temu/TikTok Shop, logistics, compliance |
| 47 | cultural-intelligence-strategist | Detects invisible exclusion; authentic cross-cultural resonance |
| 48 | customer-service | General-industry customer service, complaints, escalation |
| 49 | customer-success-manager | Onboarding, health scoring, QBRs, churn prevention, renewals |
| 50 | data-consolidation-agent | Consolidates extracted sales data into live reporting dashboards |
| 51 | data-engineer | Data pipelines, lakehouse, ETL/ELT, Spark, dbt, streaming |
| 52 | data-privacy-officer | GDPR/CCPA programs — data mapping, PIAs, consent, breach response |
| 53 | database-optimizer | Schema design, query optimization, indexing (Postgres/MySQL/Supabase) |
| 54 | deal-strategist | MEDDPICC qualification, competitive positioning, win planning |
| 55 | developer-advocate | Dev communities, technical content, DX, platform adoption |
| 56 | devops-automator | Infrastructure automation, CI/CD, cloud operations |
| 57 | discovery-coach | Coaches sales discovery — question design, gap quantification |
| 58 | document-generator | Generates PDF/PPTX/DOCX/XLSX with formatting, charts, data viz |
| 59 | douyin-strategist | Douyin short-video — algorithm, viral planning, livestream commerce |
| 60 | drone-reality-mapping-specialist | Photogrammetry — orthomosaics, DTMs, point clouds, 3D meshes |
| 61 | drupal-shopping-cart-engineer | Drupal Commerce — catalog, payments, checkout, orders |
| 62 | email-intelligence-engineer | Extracts structured, reasoning-ready data from email threads |
| 63 | email-marketing-strategist | CRM campaigns, lifecycle automation, segmentation, deliverability |
| 64 | embedded-firmware-engineer | Bare-metal/RTOS — ESP32, STM32, Nordic nRF, FreeRTOS, Zephyr |
| 65 | esg-sustainability-officer | ESG reporting, decarbonization, disclosures, stakeholder alignment |
| 66 | evidence-collector | Screenshot-driven QA — finds 3-5 issues, requires visual proof |
| 67 | executive-summary-generator | C-suite summaries via McKinsey SCQA, BCG Pyramid, Bain frameworks |
| 68 | experiment-tracker | A/B tests, feature experiments, hypothesis validation |
| 69 | feedback-synthesizer | Collects/synthesizes user feedback into prioritized product insights |
| 70 | feishu-integration-developer | Feishu (Lark) Open Platform — bots, mini programs, Bitable, webhooks |
| 71 | filament-optimization-specialist | Restructures/optimizes Filament PHP admin interfaces |
| 72 | finance-tracker | Financial planning, budget management, cash flow, performance |
| 73 | financial-analyst | Financial modeling, forecasting, scenario analysis |
| 74 | fp-a-analyst | Budgeting, variance analysis, rolling forecasts, decision support |
| 75 | french-consulting-market-navigator | French ESN/SI freelance ecosystem — Malt, portage salarial, rates |
| 76 | frontend-developer | Modern web — React/Vue/Angular, UI implementation, performance |
| 77 | game-audio-engineer | FMOD/Wwise, adaptive music, spatial audio across engines |
| 78 | game-designer | GDD authorship, player psychology, economy balancing, loops |
| 79 | geoai-ml-engineer | Geospatial ML — feature extraction, object detection, segmentation |
| 80 | geographer | Physical/human geography, climate systems, spatial analysis |
| 81 | geoprocessing-specialist | ArcPy/Python toolboxes, Model Builder, batch geoprocessing |
| 82 | gis-analyst | Day-to-day GIS — maps, layers, spatial queries, data integrity |
| 83 | gis-qa-engineer | Geospatial QA — topology, metadata, CRS, accuracy assessment |
| 84 | git-workflow-master | Git workflows, branching, conventional commits, rebasing, worktrees |
| 85 | global-podcast-strategist | Podcast growth — positioning, audience, monetization (Spotify/Apple) |
| 86 | godot-gameplay-scripter | GDScript 2.0, C# integration, node architecture, type-safe signals |
| 87 | godot-multiplayer-engineer | Godot 4 networking — MultiplayerAPI, scene replication, RPCs |
| 88 | godot-shader-developer | Godot 4 shaders — Godot Shading Language, VisualShader, post-processing |
| 89 | government-digital-presales-consultant | China ToG digital transformation presales — bids, POC, compliance |
| 90 | grant-writer | Nonprofit/research grants — LOIs, proposals, budget narratives |
| 91 | growth-hacker | Rapid user acquisition, viral loops, funnel optimization |
| 92 | healthcare-customer-service | Patient support, billing, appointments, insurance, escalation |
| 93 | healthcare-marketing-compliance-specialist | China healthcare marketing compliance (pharma/devices/aesthetics) |
| 94 | historian | Historical analysis, periodization, material culture, historiography |
| 95 | hospitality-guest-services | Hotels/resorts/restaurants — reservations, concierge, loyalty |
| 96 | hr-onboarding | Employee orientation, docs, compliance, benefits, culture integration |
| 97 | identity-graph-operator | Shared identity graph resolution for multi-agent systems |
| 98 | image-prompt-engineer | Photography prompts for AI image generation |
| 99 | incident-responder | Digital forensics, breach investigation, crisis response, post-mortems |
| 100 | incident-response-commander | Production incident management, SLO/SLI tracking, on-call design |
| 101 | inclusive-visuals-specialist | Culturally accurate, non-stereotypical AI image/video generation |
| 102 | infrastructure-maintainer | System reliability, performance, technical operations, cost efficiency |
| 103 | instagram-curator | Instagram visual storytelling, community, multi-format content |
| 104 | investment-researcher | Market research, due diligence, portfolio analysis, valuation |
| 105 | it-service-manager | ITIL 4 — service catalog, incident/problem/change, SLAs, CMDB |
| 106 | jira-workflow-steward | Enforces Jira-linked Git workflows, traceable commits, PRs |
| 107 | korean-business-navigator | Korean business culture — 품의, nunchi, KakaoTalk etiquette |
| 108 | kuaishou-strategist | Kuaishou (快手) short-video, live commerce, lower-tier markets |
| 109 | language-translator | Real-time Spanish↔English with cultural/dialect context |
| 110 | legal-billing-time-tracking | Time capture, invoicing, billing narratives, trust compliance |
| 111 | legal-client-intake | Prospect qualifying, case intake, conflict checks, consult scheduling |
| 112 | legal-compliance-checker | Legal/compliance across jurisdictions for ops, data, content |
| 113 | legal-document-review | Contract/litigation/real-estate review, risk clauses, version compare |
| 114 | level-designer | Layout theory, pacing, encounter design, environmental narrative |
| 115 | linkedin-content-creator | LinkedIn thought leadership, personal brand, high-engagement content |
| 116 | livestream-commerce-coach | Host training + live room ops across Douyin/Kuaishou/Taobao Live |
| 117 | loan-officer-assistant | Mortgage/lending — intake, pre-qual, docs, pipeline, closing |
| 118 | lsp-index-engineer | Language Server Protocol code intelligence + semantic indexing |
| 119 | m-a-integration-manager | Post-merger integration — Day 1, 100-day plans, synergy tracking |
| 120 | macos-spatial-metal-engineer | Swift + Metal 3D rendering for macOS and Vision Pro |
| 121 | mcp-builder | Designs/builds/tests MCP servers extending agent capabilities |
| 122 | medical-billing-coding-specialist | ICD-10/CPT/HCPCS coding, claims, denials, revenue cycle |
| 123 | meeting-notes-specialist | Transcripts → decisions, action items, open questions (4-section) |
| 124 | minimal-change-engineer | Minimum-viable diffs — fixes only what's asked, refuses scope creep |
| 125 | mobile-app-builder | Native iOS/Android + cross-platform mobile development |
| 126 | model-qa-specialist | Independent ML/statistical model audit — replication, calibration |
| 127 | multi-agent-systems-architect | Design/coordination/governance of multi-agent AI pipelines |
| 128 | multi-platform-publisher | One-click Chinese blog publishing (知乎/小红书/CSDN/B站/公众号/掘金) |
| 129 | narrative-designer | Branching dialogue, lore architecture, environmental storytelling |
| 130 | narratologist | Narrative theory, story structure, character arcs (Propp→Campbell) |
| 131 | offer-lead-gen-strategist | Irresistible offers + lead magnets, multi-channel lead gen |
| 132 | operations-manager | Lean/Six Sigma — process mapping, capacity, KPIs, vendor management |
| 133 | organizational-psychologist | Team dynamics, psychological safety, burnout, culture health |
| 134 | orgscript-engineer | OrgScript grammar, AST validation, business logic definitions |
| 135 | outbound-strategist | Signal-based outbound — ICPs, multi-channel prospecting sequences |
| 136 | paid-media-auditor | 200+ checkpoint audits of Google/Microsoft/Meta ad accounts |
| 137 | paid-social-strategist | Meta/LinkedIn/TikTok/Pinterest/X/Snapchat full-funnel social ads |
| 138 | penetration-tester | Authorized pen tests, red team ops, vuln assessments |
| 139 | performance-benchmarker | Measures/analyzes/improves system performance |
| 140 | persona-walkthrough-specialist | Cognitive walkthroughs of pages → CRO reports (LIFT/Cialdini/Fogg) |
| 141 | personal-growth-mentor | Goal clarity, habit design, decisions, accountability |
| 142 | pipeline-analyst | Pipeline health, deal velocity, forecast accuracy, sales coaching |
| 143 | podcast-strategist | Chinese podcast market (Xiaoyuzhou, Ximalaya) — positioning, growth |
| 144 | ppc-campaign-strategist | Large-scale search/shopping/PMax across Google/Microsoft/Amazon |
| 145 | pr-communications-manager | Media relations, press releases, crisis comms, reputation |
| 146 | pricing-analyst | Pricing models — market/competitor/cost analysis, margin optimization |
| 147 | private-domain-operator | Enterprise WeChat (WeCom) private domain, SCRM, community ops |
| 148 | product-manager | Full product lifecycle — discovery, roadmap, GTM, outcomes |
| 149 | programmatic-display-buyer | Programmatic/display — GDN, DV360, trade desks, ABM |
| 150 | project-shepherd | Cross-functional project coordination, timelines, stakeholders |
| 151 | prompt-engineer | Crafts, tests, optimizes LLM prompts into production-grade behaviors |
| 152 | proposal-strategist | RFP win narratives — win themes, positioning, executive summaries |
| 153 | psychologist | Human behavior, personality, motivation, cognitive patterns |
| 154 | rapid-prototyper | Ultra-fast POC/MVP creation |
| 155 | real-estate-buyer-seller | Buyer/seller representation, listings, offers, closing coordination |
| 156 | reality-checker | Evidence-based certification — defaults to "NEEDS WORK" |
| 157 | recruitment-specialist | Talent acquisition on China hiring platforms, assessment, labor law |
| 158 | reddit-community-builder | Authentic Reddit engagement, value-driven content, culture navigation |
| 159 | report-distribution-agent | Automates distribution of sales reports by territory |
| 160 | retail-customer-returns | Returns/exchanges/refunds, fraud prevention, retention |
| 161 | roblox-avatar-creator | Roblox UGC/avatar pipeline — rigging, textures, marketplace submission |
| 162 | roblox-experience-designer | Roblox UX/monetization — engagement loops, DataStore, passes |
| 163 | roblox-systems-scripter | Roblox Luau, client-server security, RemoteEvents, DataStore |
| 164 | sales-coach | Rep development, pipeline reviews, call coaching, forecast accuracy |
| 165 | sales-data-extraction-agent | Monitors Excel, extracts MTD/YTD/Year-End sales metrics |
| 166 | sales-engineer | Technical discovery, demo engineering, POC scoping, battlecards |
| 167 | sales-outreach | Cold prospecting, follow-up, objection handling, proposals |
| 168 | salesforce-architect | Salesforce multi-cloud design, integration, governor limits |
| 169 | search-query-analyst | Search term analysis, negative keywords, query-to-intent mapping |
| 170 | security-architect | Threat modeling, secure-by-design, trust boundaries, risk reviews |
| 171 | senior-developer | Premium implementation — Laravel/Livewire/FluxUI, advanced CSS, Three.js |
| 172 | senior-project-manager | Spec→tasks, realistic scope, remembers prior projects |
| 173 | senior-secops-engineer | Scans for secrets first, then implements/audits security controls |
| 174 | seo-specialist | Technical SEO, content optimization, link authority, organic growth |
| 175 | short-video-editing-coach | Post-production coach — CapCut/Premiere/DaVinci/FCP, grading, VFX |
| 176 | social-media-strategist | Cross-platform social campaigns, community, thought leadership |
| 177 | software-architect | System design, DDD, architectural patterns, technical decisions |
| 178 | solidity-smart-contract-engineer | EVM contracts — gas optimization, proxies, DeFi, security-first |
| 179 | solution-engineer | GIS prototype builder — demos, POCs, technical validations |
| 180 | spatial-data-engineer | Geospatial ETL — format conversion, CRS reprojection, pipelines |
| 181 | spatial-data-scientist | Spatial statistics, econometrics, clustering, predictive analytics |
| 182 | sprint-prioritizer | Agile sprint planning, feature prioritization, resource allocation |
| 183 | sre-site-reliability-engineer | SLOs, error budgets, observability, chaos engineering, toil reduction |
| 184 | strategy-duel-agent | Live strategy duels using game theory + 36 Chinese stratagems |
| 185 | studio-operations | Day-to-day studio efficiency, process optimization, resourcing |
| 186 | studio-producer | High-level creative/technical orchestration, portfolio management |
| 187 | study-abroad-advisor | Study abroad planning (US/UK/CA/AU/EU/HK/SG) — apps, essays, visas |
| 188 | supply-chain-strategist | Supplier development, sourcing, QC, supply chain digitalization |
| 189 | support-responder | Multi-channel customer support, issue resolution, proactive care |
| 190 | tax-strategist | Tax optimization, multi-jurisdictional compliance, transfer pricing |
| 191 | technical-artist | Shaders, VFX, LOD pipelines, cross-engine asset optimization |
| 192 | technical-consultant | Strategic GIS advisor — gap analysis, roadmaps, RFP responses |
| 193 | technical-writer | Developer docs, API references, READMEs, tutorials |
| 194 | terminal-integration-specialist | Terminal emulation, text rendering, SwiftTerm for Swift apps |
| 195 | test-results-analyzer | Test result evaluation, quality metrics, actionable insights |
| 196 | threat-detection-engineer | SIEM rules, MITRE ATT&CK coverage, threat hunting, detection-as-code |
| 197 | threat-intelligence-analyst | Tracks adversaries, maps campaigns to ATT&CK, intel reports |
| 198 | tiktok-strategist | TikTok viral content, algorithm optimization, community building |
| 199 | tool-evaluator | Evaluates/tests/recommends tools, software, platforms |
| 200 | tracking-measurement-specialist | Conversion tracking, tag management (GTM/GA4/CAPI), attribution |
| 201 | trend-researcher | Emerging trends, competitive analysis, opportunity assessment |
| 202 | twitter-engager | Real-time Twitter engagement, thread creation, community growth |
| 203 | ui-designer | Visual design systems, component libraries, pixel-perfect UI |
| 204 | unity-architect | ScriptableObjects, decoupled systems, single-responsibility components |
| 205 | unity-editor-tool-developer | Custom EditorWindows, PropertyDrawers, pipeline automation |
| 206 | unity-multiplayer-engineer | Netcode for GameObjects, UGS Relay/Lobby, lag compensation |
| 207 | unity-shader-graph-artist | Unity Shader Graph, HLSL, URP/HDRP, custom passes |
| 208 | unreal-multiplayer-architect | Actor replication, GameMode/GameState, server-authoritative UE5 |
| 209 | unreal-systems-engineer | C++/Blueprint, Nanite, Lumen, Gameplay Ability System (UE5) |
| 210 | unreal-technical-artist | Material Editor, Niagara VFX, PCG, art-to-engine pipeline (UE5) |
| 211 | unreal-world-builder | UE5 World Partition, Landscape, foliage, HLOD, level streaming |
| 212 | ux-architect | Technical UX foundations, CSS systems, implementation guidance |
| 213 | ux-researcher | User behavior analysis, usability testing, research insights |
| 214 | video-optimization-specialist | YouTube algorithm, retention, chaptering, thumbnails, syndication |
| 215 | visionos-spatial-engineer | visionOS spatial computing, SwiftUI volumes, Liquid Glass |
| 216 | visual-storyteller | Visual narratives, multimedia content, brand storytelling |
| 217 | voice-ai-integration-engineer | Speech transcription pipelines — Whisper/ASR, diarization, subtitles |
| 218 | web-gis-developer | Interactive maps — MapLibre, ArcGIS JS, Leaflet, geospatial web services |
| 219 | wechat-mini-program-developer | WeChat Mini Programs — WXML/WXSS, payments, subscription messaging |
| 220 | wechat-official-account-manager | WeChat OA content marketing, subscriber engagement, conversion |
| 221 | weibo-strategist | Sina Weibo — trending topics, Super Topics, sentiment, fan economy |
| 222 | whimsy-injector | Adds personality, delight, playful moments to brand experiences |
| 223 | wordpress-shopping-cart-engineer | WooCommerce — catalog, payments, checkout, orders, coupons |
| 224 | workflow-architect | Maps complete workflow trees — happy paths, branches, failure modes |
| 225 | workflow-optimizer | Analyzes/optimizes/automates workflows across business functions |
| 226 | x-twitter-intelligence-analyst | X/Twitter research, trend detection, account monitoring |
| 227 | xiaohongshu-specialist | Xiaohongshu (RED) lifestyle content, trends, aesthetic storytelling |
| 228 | xr-cockpit-interaction-specialist | Immersive cockpit-based control systems for XR |
| 229 | xr-immersive-developer | WebXR + browser-based AR/VR/XR applications |
| 230 | xr-interface-architect | Spatial interaction design + interface strategy for AR/VR/XR |
| 231 | zhihu-strategist | Zhihu thought leadership, Q&A strategy, knowledge-driven engagement |
| 232 | zk-steward | Zettelkasten knowledge-base steward — atomic notes, connectivity |

---

*Generated 2026-07-09. Source: `.opencode/agents/*.md` frontmatter (232 files).*
