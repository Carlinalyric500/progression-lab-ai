# Security

## Security Documentation Model

Security detail is split between wiki navigation and versioned in-repo artifacts.

Primary in-repo references:

- `SECURITY_AUDIT_2025.md`
- `SECURITY_DEPENDENCIES.md`
- `SECURITY_DEPLOYMENT.md`
- `SECURITY_FIXES_APPLIED.md`

## Core Practices

1. Keep dependency and deployment security checklists current.
2. Validate auth and API access controls after major feature changes.
3. Apply migration and billing changes with explicit rollback plans.
4. Track high-severity findings with owner and remediation status.

## MFA and WebAuthn Policy

- Admin dashboard enforces hardware MFA using WebAuthn.
- `ADMIN` users must register a security key if one is not present, then use key auth at login.
- `AUDITOR` users are required to complete key auth on admin login when they have enrolled credentials.
- Main app users can optionally enroll WebAuthn credentials in Security settings.
- Main app users with active credentials must complete key verification at login.

## WebAuthn Configuration

Main app required environment variables:

- `WEBAUTHN_RP_ID`
- `WEBAUTHN_RP_NAME`
- `WEBAUTHN_ORIGIN`

Admin dashboard also requires:

- `ADMIN_WEBAUTHN_ORIGIN`

Operational notes:

- Origins must exactly match the deployed app origins.
- Production WebAuthn origins must use HTTPS.
- RP ID must be valid for the target origin domain.

## Deployment Security

For release-time controls, use:

- `SECURITY_DEPLOYMENT.md`

## Audit and Follow-up

For historical findings and remediations, use:

- `SECURITY_AUDIT_2025.md`
- `SECURITY_FIXES_APPLIED.md`

## Related Pages

- Deployment: `Deployment`
- Architecture: `Architecture`
