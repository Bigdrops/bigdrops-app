You are inspecting an existing production codebase, not proposing a greenfield architecture.

Target repository: BIGDROPS

Role

Act as a Principal Software Architect, Staff Backend Engineer, and Performance Engineer conducting a production architecture review.

Base your response only on the repository contents. Do not extrapolate or invent implementations that are not present.

---

Objective

Determine whether BIGDROPS should adopt:

1. Redis
2. Kafka
3. Elasticsearch

The recommendation must be based on the current implementation, not future possibilities.

---

Required Reading

Inspect the repository in this order:

1. README.md
2. AGENTS.md
3. docs/
4. package.json
5. vite.config.*
6. supabase/
7. src/
8. Any architecture documents
9. Migration files
10. Services and domain layers

Pay particular attention to:

- src/domain
- src/modules
- src/services
- src/lib
- src/hooks
- src/context
- src/supabase
- src/components
- src/pages

---

Inspection Areas

1. Architecture

Determine:

- Modular monolith vs layered monolith
- Existing domain boundaries
- Coupling between modules
- Separation of UI, domain and infrastructure
- Technical debt
- Architectural strengths
- Architectural risks

Support every conclusion with file references.

---

2. Database

Inspect:

- Supabase usage
- Query patterns
- JSONB usage
- Aggregation queries
- N+1 patterns
- Missing indexes
- Expensive joins
- RPC usage
- Materialized views
- RLS complexity

Determine whether the current database is becoming a bottleneck.

---

3. Performance

Identify:

- Slow data flows
- Duplicate fetches
- Re-render hotspots
- Heavy calculations
- Large bundle risks
- Memory issues
- Network waterfalls
- Expensive report generation

Point to the exact files.

---

4. Background Work

Find every operation that currently runs synchronously, including:

- PDF generation
- Notifications
- Imports
- Exports
- Reports
- Audit logging
- Email
- File processing
- Dashboard aggregation

Determine whether these should become background jobs.

---

5. Redis Evaluation

Determine whether Redis would provide immediate value.

Look for:

- repeated queries
- expensive dashboard calculations
- repeated configuration loading
- session-heavy operations
- rate limiting
- distributed locks
- caching opportunities
- queue opportunities

Answer:

- Should Redis be added now?
- Exactly where?
- Expected performance improvement.
- Complexity introduced.
- Priority (High/Medium/Low).

---

6. Kafka Evaluation

Determine whether Kafka is justified.

Inspect whether the codebase already exhibits:

- domain events
- asynchronous workflows
- module decoupling
- integrations
- event pipelines
- notification fan-out
- analytics events
- audit pipelines

If Kafka is not justified, explain precisely why.

If another event system would be more appropriate, explain why.

---

7. Elasticsearch Evaluation

Inspect current search capabilities.

Determine:

- where searching exists
- how filtering works
- how many modules require search
- whether PostgreSQL full-text search is sufficient
- whether fuzzy search is needed
- autocomplete requirements
- cross-module search requirements

Answer:

- Should Elasticsearch be adopted?
- Immediately?
- Later?
- Not at all?

Support every recommendation with repository evidence.

---

8. Scalability Review

Estimate how well the current architecture scales.

Evaluate:

- 10 users
- 100 users
- 1,000 users
- 10,000 users

Identify what breaks first.

---

9. Code Quality

Review:

- consistency
- abstraction quality
- duplication
- domain modeling
- React architecture
- Supabase integration
- maintainability

Highlight the strongest engineering decisions as well as the weakest.

---

10. Opportunities

Identify the ten highest-impact improvements.

Rank them by:

- Impact
- Effort
- Risk

Do not recommend technology simply because it is popular.

---

Constraints

- Do not modify any files.
- Do not propose code.
- Do not invent missing features.
- Base every conclusion on repository evidence.
- Cite file paths for every major observation.
- Distinguish clearly between observations and recommendations.
- If evidence is insufficient for a claim, explicitly state that.

---

Output Format

Produce exactly the following sections:

1. Executive Summary
2. Current Architecture
3. Current Performance Profile
4. Redis Assessment
5. Kafka Assessment
6. Elasticsearch Assessment
7. Scalability Assessment
8. Top 10 Architectural Risks
9. Top 10 Architectural Strengths
10. Immediate Wins (Next 30 Days)
11. Medium-Term Improvements (3–6 Months)
12. Long-Term Evolution (6–18 Months)
13. Final Verdict

End with a scorecard:

Category| Score (/10)| Evidence
Architecture| | 
Scalability| | 
Performance| | 
Maintainability| | 
Domain Design| | 
Database Design| | 
Developer Experience| | 
Readiness for Redis| | 
Readiness for Kafka| | 
Readiness for Elasticsearch| | 

Finally provide a prioritized roadmap with:

- Do now
- Do next
- Do later
- Avoid

Success Criteria

The review is complete only when every conclusion is supported by concrete repository evidence, the three technologies (Redis, Kafka, Elasticsearch) are evaluated independently, and the recommendations reflect the current implementation rather than hypothetical future requirements.

Stop Condition

Stop after producing the complete a

rchitectural review. Do not propose or implement code changes.


REPORTING PROTOCOL (MANDATORY)
==================================================
Save report to: `docs/Task/reports/