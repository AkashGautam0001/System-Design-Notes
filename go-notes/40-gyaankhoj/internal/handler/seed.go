// ============================================================
//  Seed Data — Sample TCS Knowledge Base Documents
// ============================================================
//  WHY: GyaanKhoj should be usable immediately after `go run main.go`.
//  Seeding the knowledge base with realistic TCS documents lets
//  developers test the full RAG pipeline (ingest → search → ask)
//  without manually creating documents first.
//
//  These sample documents cover typical TCS knowledge categories:
//  engineering practices, architecture patterns, cloud operations,
//  code review standards, and security policies. Each is 300-500
//  words of realistic content — enough for meaningful chunking
//  and retrieval.
// ============================================================

package handler

import "gyaankhoj/internal/model"

// ──────────────────────────────────────────────────────────────
// SeedDocuments returns sample TCS documents for the knowledge base.
// ──────────────────────────────────────────────────────────────

// SeedDocuments returns a set of realistic TCS documents for initial seeding.
func SeedDocuments() []model.IngestRequest {
	return []model.IngestRequest{
		{
			Title:    "TCS Agile Best Practices Guide",
			Source:   "TCS Engineering Wiki",
			Category: "process",
			Tags:     []string{"agile", "scrum", "best-practices", "process"},
			Content: `TCS follows a structured Agile methodology across all delivery units. Every project team operates in two-week sprints with clearly defined ceremonies. Sprint planning happens on the first Monday, where the team estimates stories using planning poker. The Product Owner prioritizes the backlog based on client value and technical dependencies.

Daily standups are limited to 15 minutes. Each team member answers three questions: What did I complete yesterday? What will I work on today? Are there any blockers? Blockers are escalated immediately to the Scrum Master, not discussed in the standup.

Sprint reviews happen on the last Friday. The team demonstrates working software to stakeholders. Key metrics tracked include velocity (story points completed), sprint burndown, and defect escape rate. Teams consistently delivering below 80% of committed velocity undergo a process health check.

Retrospectives follow the review. TCS uses the Start-Stop-Continue format. Action items from retros are tracked in JIRA and reviewed in the next retrospective. Teams that skip retrospectives tend to repeat the same mistakes — TCS mandates them for all projects.

Cross-functional teams are preferred. Each team should have at least one member with frontend, backend, QA, and DevOps skills. This reduces handoff delays and improves code ownership. When specialists are unavailable, TCS encourages pair programming across skill boundaries.

Release management follows trunk-based development. Feature branches live for at most 2 days before merging to main. Long-lived branches create merge conflicts and integration risk. Every merge to main triggers the CI pipeline: lint, unit tests, integration tests, and security scan.`,
		},
		{
			Title:    "Go Microservices at TCS — Architecture Patterns",
			Source:   "TCS Architecture Board",
			Category: "engineering",
			Tags:     []string{"go", "golang", "microservices", "architecture"},
			Content: `TCS has standardized on Go for high-performance microservices. Go's simplicity, fast compilation, and excellent concurrency support make it ideal for the backend services that power TCS's digital platforms.

Service Communication: Internal services use gRPC for synchronous communication due to its strong typing, code generation, and performance advantages over REST. External-facing APIs use REST with JSON for broader client compatibility. All services register with the Consul service mesh for discovery and load balancing.

Error Handling: Every Go service at TCS follows the error-as-value pattern. Functions return errors as the last return value. Errors are wrapped with context using fmt.Errorf and the %w verb. Sentinel errors are defined for domain-specific failures. Panics are reserved for truly unrecoverable situations — never for business logic errors.

Logging: All services use structured logging with zerolog. Log levels follow the standard: DEBUG for development, INFO for production operations, WARN for degraded states, ERROR for failures requiring attention. Every log entry includes the request ID, service name, and trace ID for distributed tracing.

Database Access: Services own their data. No shared databases between services. PostgreSQL is the default for relational data, Redis for caching, and MongoDB for document-oriented workloads. Database migrations are managed with golang-migrate and run automatically during deployment.

Configuration: Services read configuration from environment variables, following the twelve-factor app methodology. Secrets are managed through HashiCorp Vault. No secrets in code, no secrets in config files, no secrets in Docker images. The DevSecOps team audits every repository for accidental secret commits.

Testing: Minimum 80% code coverage for all services. Unit tests use the standard testing package. Integration tests use testcontainers-go to spin up real databases in Docker. Load testing happens monthly using k6 with production-like traffic patterns.`,
		},
		{
			Title:    "TCS Cloud Migration Playbook",
			Source:   "TCS Cloud CoE",
			Category: "cloud",
			Tags:     []string{"cloud", "aws", "migration", "kubernetes"},
			Content: `The TCS Cloud Center of Excellence has developed a structured approach for migrating on-premise applications to AWS and Azure. This playbook covers the six R's of migration: Rehost, Replatform, Repurchase, Refactor, Retire, and Retain.

Assessment Phase: Every migration begins with a portfolio assessment. The team catalogs all applications, their dependencies, data volumes, compliance requirements, and business criticality. Applications are scored on cloud readiness using TCS's proprietary CloudReady assessment framework. Applications scoring above 7 out of 10 are candidates for lift-and-shift. Those below 4 require significant refactoring or may be retained on-premise.

Containerization: TCS uses Docker for containerization and Kubernetes for orchestration. Every application must have a Dockerfile, health check endpoints, and graceful shutdown handling. Kubernetes manifests include resource limits, pod disruption budgets, and horizontal pod autoscalers. The platform team provides Helm charts for common patterns.

Data Migration: Database migration follows a parallel-run strategy. The new cloud database runs alongside the on-premise database for 2-4 weeks. Data is replicated using AWS DMS or custom CDC pipelines. Once data consistency is verified and latency is acceptable, traffic is cutover during a maintenance window. Rollback procedures are documented and tested before every cutover.

Networking: All cloud workloads run in private subnets. Internet access goes through NAT gateways. Service-to-service communication uses AWS PrivateLink or VPC peering. TLS is mandatory for all communication — no exceptions. The security team provides a shared certificate authority for internal services.

Cost Management: Every team tags their cloud resources with project code, environment, and cost center. Monthly cost reviews identify unused resources, oversized instances, and optimization opportunities. TCS has saved clients over 30% on cloud spend by right-sizing instances and leveraging reserved capacity.`,
		},
		{
			Title:    "Code Review Guidelines — TCS Engineering",
			Source:   "TCS Engineering Wiki",
			Category: "engineering",
			Tags:     []string{"code-review", "pull-request", "quality", "best-practices"},
			Content: `Code reviews are mandatory for every change at TCS. No code reaches production without at least two approvals from team members. This policy has reduced production defects by 60% since its introduction in 2019.

Review Turnaround: Reviewers must respond within 4 business hours. If the original reviewers are unavailable, the author can reassign to other qualified team members. Stale reviews blocking deployment are escalated to the tech lead.

What Reviewers Check: Correctness — does the code do what the ticket describes? Edge cases — are nil checks, empty slices, and error paths handled? Performance — are there unnecessary allocations, N+1 queries, or unbounded loops? Security — is user input validated? Are SQL queries parameterized? Is sensitive data logged? Readability — would a new team member understand this code in 6 months?

Pull Request Standards: Every PR includes a description of what changed and why. The description links to the JIRA ticket. PRs should be small — under 400 lines of changed code. Larger changes must be split into a stack of dependent PRs. Each PR includes tests for the changed behavior. Screenshots are required for UI changes.

Automated Checks: Before human review, every PR passes through automated gates: linting (golangci-lint for Go, ESLint for TypeScript), unit tests, integration tests, security scanning (Snyk for dependencies, Semgrep for code patterns), and code coverage threshold (minimum 80%). PRs that fail automated checks cannot be merged.

Review Comments: Use conventional comment prefixes. "nit:" for style suggestions that do not block merging. "question:" for clarification requests. "blocker:" for issues that must be fixed before merge. "suggestion:" for alternative approaches the author may consider. This taxonomy helps authors prioritize feedback.

Post-Merge: The author monitors the deployment pipeline after merge. If the build breaks, the author fixes it within 30 minutes or reverts the change. The team's build health dashboard shows the current status of main branch.`,
		},
		{
			Title:    "TCS Information Security Policy",
			Source:   "TCS CISO Office",
			Category: "security",
			Tags:     []string{"security", "policy", "compliance", "data-protection"},
			Content: `TCS handles sensitive data for clients across banking, healthcare, and government sectors. This security policy applies to all employees, contractors, and systems.

Authentication: All internal systems use SSO with Azure Active Directory. Multi-factor authentication is mandatory — no exceptions. Service-to-service authentication uses mutual TLS with certificates managed through the internal PKI. API keys are rotated every 90 days. Passwords must be at least 14 characters with complexity requirements.

Data Classification: TCS uses four data classification levels. Public — information intended for public disclosure. Internal — general business information not for external sharing. Confidential — sensitive business data requiring access controls. Restricted — highly sensitive data (PII, financial records, health data) requiring encryption at rest and in transit.

Encryption: All data in transit uses TLS 1.2 or higher. Data at rest uses AES-256 encryption. Database encryption is managed at the storage layer. Application-level encryption is used for Restricted data fields like Aadhaar numbers and bank account details. Encryption keys are stored in HashiCorp Vault with automatic rotation.

Access Control: Follow the principle of least privilege. Employees get access only to systems required for their role. Access reviews happen quarterly. When an employee changes projects, their access is reviewed and adjusted within 48 hours. Terminated employees have access revoked within 4 hours — automated through the HR system integration.

Incident Response: Security incidents are classified on a P1-P4 scale. P1 incidents (data breach, system compromise) require immediate response with the CISO notified within 15 minutes. The incident response team assembles within 30 minutes. All incidents are documented in the incident management system with root cause analysis completed within 5 business days.

Secure Development: All code repositories run automated security scanning. Dependencies are checked against known vulnerability databases daily. Container images are scanned before deployment. Penetration testing happens quarterly for client-facing applications. The DevSecOps team provides security champions in each delivery unit for real-time guidance.`,
		},
	}
}
