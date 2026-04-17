# ePrescription Compliance Readiness (Healthcare)

This document describes technical controls added for production readiness and healthcare data handling.

## Implemented Controls

- Authentication and role-based access checks for patient APIs.
- Record-sharing grants with explicit scope and expiry:
  - `FULL_HISTORY`, `CATEGORY_FILTER`, `SELECTED_RECORDS`
  - revocation and status tracking.
- Audit-oriented structured logging:
  - JSON logs with timestamp, level, request context.
  - basic sensitive-field redaction.
- Security response headers via `middleware.ts`:
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `Cache-Control: no-store` for API routes.
- Data minimization and explicit status transitions for:
  - appointment reminders,
  - medication adherence logs,
  - OCR import jobs.

## Operational Controls Required Before Go-Live

- Configure encryption:
  - TLS in transit.
  - managed encryption at rest for DB and blob storage.
- Configure secure secrets management:
  - store keys/secrets in a secret manager.
  - do not store real secrets in `.env` for production.
- Enable immutable audit log export to SIEM/SOC.
- Implement periodic access reviews for doctor/patient sharing grants.
- Configure automated backups and tested restore procedures.
- Configure data retention and deletion policies (PHI lifecycle).
- Implement breach detection and incident response runbook.

## Regulatory Mapping (Guidance)

This codebase is prepared for compliance implementation, but is not automatically certified.
Formal compliance requires legal, operational, and organizational controls in addition to code.

- HIPAA (US): Security Rule + Privacy Rule controls, BAAs, minimum necessary access.
- GDPR (EU): lawful basis, DSR workflows, DPIA, data transfer safeguards.
- Local health-data laws: residency, retention, consent, disclosure auditability.

## Environment Variables

- `LOG_LEVEL=info`
- `ENABLE_AUDIT_LOGS=true`
- `ENABLE_RECORD_SHARING=true`
- `RECORD_SHARE_DEFAULT_DAYS=30`
- `CRON_SECRET=<strong-random-token>`
- `ADHERENCE_MISSED_GRACE_MINUTES=120`
- `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=<optional>`
- `AZURE_DOCUMENT_INTELLIGENCE_KEY=<optional>`

## Cron Job

Internal endpoint:

- `POST /api/internal/jobs/health-automation`
- Header: `Authorization: Bearer <CRON_SECRET>`

Actions:

- marks due appointment reminders from `PENDING` -> `SENT`
- marks overdue medication logs from `PENDING` -> `MISSED`
