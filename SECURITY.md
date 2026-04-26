# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in openShield, please report it responsibly.

**Do not open a public issue.**

Instead, please email the maintainers directly with:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and work with you to verify and address the issue before any public disclosure.

## Security Features

openShield implements the following security measures:

- **Zero external network calls** at runtime — no telemetry endpoints, no remote config
- **No eval() or Function() constructors** — all code is static and auditable
- **Content Security Policy compliant** — no inline scripts
- **Least-privilege permissions** — only requests APIs actually used
- **Local-only storage** — `chrome.storage.local` and `chrome.storage.session`; no cloud sync

## Permissions Justification

| Permission | Justification |
|------------|---------------|
| `declarativeNetRequest` | Block and modify network requests |
| `declarativeNetRequestFeedback` | Count blocked requests for badge display |
| `storage` | Persist settings locally |
| `tabs` | Read current tab URL for per-site settings |
| `scripting` | Inject fingerprint protection into pages |
| `webNavigation` | Detect bounce-tracking redirects |
| `browsingData` | Auto Shred site data on tab close |
| `<all_urls>` | Apply protections on all websites |
