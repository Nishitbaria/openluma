# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| `main` branch | Yes |
| Older releases | No |

We recommend always running the latest version from `main` or the most recent release.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please email **dev@bundled.design** with the subject line `[SECURITY] OpenLuma vulnerability`.

Include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

You will receive a response within **48 hours**. We take all security reports seriously and will work with you to understand and address the issue promptly.

## Disclosure Policy

- We will acknowledge receipt of your report within 48 hours
- We will provide an estimated timeline for a fix
- We will notify you when the issue is resolved
- We credit reporters in the fix commit/release notes (unless you prefer anonymity)

## Scope

This policy covers the OpenLuma application code at https://github.com/Nishitbaria/openluma. It does not cover third-party dependencies — please report those to the respective upstream project.

## Known Security Considerations

- All API routes validate authentication via Better Auth sessions
- Private event visibility is enforced server-side
- QR ticket tokens are cryptographically random and single-use for check-in
- Environment variables (API keys, secrets) must never be committed — see `.env.example`
