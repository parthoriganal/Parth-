# Secret-scan candidate review

Reviewed 2026-11-08. `detect-secrets` 1.5.0, with network verification disabled, reported the following 31 candidates in the `43e7bed` full repository snapshot. This review does not reproduce candidate values. “Harmless” here means the inspected value is demonstrably a placeholder, identifier, public integrity metadata, or synthetic fixture in its local context; it is not a claim that every credential in the repository or Git history has been found. No live authentication attempts were made.

All paths below are relative to the repository root. Lines refer to the scanned snapshot. The 30 upstream findings were already in the base; the test fixture was added subsequently. Every entry is classified **verified harmless example/data**; none is a confirmed secret or unresolved candidate among these 31.

| # | Location | Evidence for classification |
|---|---|---|
| 1 | `.claude/skills/anthropic/claude-api/curl/examples.md:8` | Explicit API-key placeholder in a curl example. |
| 2 | `.claude/skills/anthropic/claude-api/curl/managed-agents.md:8` | Explicit API-key placeholder in a curl example. |
| 3 | `.claude/skills/anthropic/claude-api/go/managed-agents/README.md:509` | Client-secret value is explicitly truncated with an ellipsis in example code. |
| 4 | `.claude/skills/anthropic/claude-api/php/managed-agents/README.md:22` | Example client initialization uses a placeholder. |
| 5 | `.claude/skills/anthropic/claude-api/php/managed-agents/README.md:416` | Example secret configuration uses a placeholder. |
| 6 | `.claude/skills/anthropic/claude-api/ruby/managed-agents/README.md:351` | Client-secret value is explicitly truncated with an ellipsis in example code. |
| 7 | `.claude/skills/anthropic/claude-api/shared/managed-agents-onboarding-from-url.md:227` | Secret-name identifier in example configuration, not a secret value. |
| 8 | `.claude/skills/anthropic/claude-api/shared/managed-agents-tools.md:384` | Environment-variable identifier in example configuration, not a secret value. |
| 9 | `.claude/skills/anthropic/claude-api/shared/managed-agents-tools.md:385` | Placeholder/environment reference in example configuration. |
| 10 | `.claude/skills/anthropic/claude-api/typescript/claude-api/README.md:26` | Example client initialization uses a placeholder. |
| 11 | `.claude/skills/anthropic/claude-api/typescript/managed-agents/README.md:24` | Example client initialization uses a placeholder. |
| 12 | `.claude/skills/anthropic/skill-creator/eval-viewer/viewer.html:10` | Public script's HTML subresource-integrity checksum, not an authentication credential. |
| 13 | `.claude/skills/nextlevelbuilder/design/SKILL.md:312` | Explicit API-key placeholder in shell documentation. |
| 14 | `.claude/skills/nextlevelbuilder/design/references/cip-design.md:121` | Explicit API-key placeholder in shell documentation. |
| 15 | `.claude/skills/nextlevelbuilder/design/references/icon-design.md:120` | Explicit API-key placeholder in shell documentation. |
| 16 | `.claude/skills/nextlevelbuilder/design/references/logo-design.md:93` | Explicit API-key placeholder in shell documentation. |
| 17 | `.claude/skills/nextlevelbuilder/design/scripts/icon/generate.py:245` | Error-message text describing a missing environment variable; no credential literal. |
| 18 | `.claude/skills/nextlevelbuilder/design/scripts/logo/generate.py:207` | HTTP method and authentication-header identifiers in a function signature; no credential literal. |
| 19 | `.claude/skills/nextlevelbuilder/design/scripts/logo/generate.py:211` | Comparison with an authentication-header name; not a credential value. |
| 20 | `.claude/skills/nextlevelbuilder/design/scripts/logo/tests/test_generate.py:201` | Authentication-header name in a test, not a credential value. |
| 21 | `.claude/skills/nextlevelbuilder/design/scripts/tests/test_icon_generate.py:35` | Synthetic API-key value assigned in a test fixture. |
| 22 | `.claude/skills/nextlevelbuilder/ui-ux-pro-max/data/catalog-summary.json:27` | SHA-256 snapshot checksum; verified against its named repository file. |
| 23 | `.claude/skills/nextlevelbuilder/ui-ux-pro-max/data/catalog-summary.json:30` | SHA-256 snapshot checksum; verified against its named repository file. |
| 24 | `.claude/skills/nextlevelbuilder/ui-ux-pro-max/data/catalog-summary.json:33` | SHA-256 snapshot checksum; verified against its named repository file. |
| 25 | `.claude/skills/nextlevelbuilder/ui-ux-pro-max/data/catalog-summary.json:36` | SHA-256 snapshot checksum; verified against its named repository file. |
| 26 | `.claude/skills/nextlevelbuilder/ui-ux-pro-max/data/google-font-licenses.json:6` | Source repository revision identifier in metadata. |
| 27 | `.claude/skills/nextlevelbuilder/ui-ux-pro-max/scripts/tests/fixtures/relevance-baseline.json:3279` | Oracle fingerprint in test baseline metadata. |
| 28 | `.claude/skills/nextlevelbuilder/ui-ux-pro-max/scripts/tests/fixtures/relevance-baseline.json:3280` | Runtime fingerprint in test baseline metadata. |
| 29 | `.claude/skills/nextlevelbuilder/ui-ux-pro-max/scripts/tests/fixtures/relevance-thresholds.json:5` | Runtime fingerprint in test threshold metadata. |
| 30 | `.claude/skills/nextlevelbuilder/ui-ux-pro-max/scripts/tests/fixtures/relevance-thresholds.json:6` | Oracle fingerprint in test threshold metadata. |
| 31 | `tests/test_kdp_quality.py:48` | Synthetic product identifier in mocked test data, not a credential. |

Separately, the three short access-token-like strings previously noted in Go and Ruby examples are visibly truncated with ellipses, and the token-shaped strings in the examples are explicitly marked placeholders. They were preserved. The scanner was not configured to validate credentials against services; other unknown or non-pattern-matching secrets may remain. Gitleaks was not available because its release-asset download host could not be reached.
