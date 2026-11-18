# Member feedback to specification and executable checks

Integration review, 15 November 2026 (Central). No CG consensus or remote merge claimed.

## Source and scope

- PR #6 head: 74261626e376ea813255ad553171f74f130ddbda.
- PR #9 head: 67e64736ef97c8611dc8395c612dae725b7a4434.
- PR #10 head: b9197199580922db9d88ea21f828398c73159bba.
- Paul Ashley's dispositions: https://github.com/w3c-cg/atp/pull/6#issuecomment-6903889365

This branch integrates those existing contributions for local validation; it
is not a declaration that their separate reviews are complete. Prefer applying
the follow-up patch after those branches are integrated, without republishing
or overwriting their evidence. Do not merge the full integration branch merely
to bypass the reviews.

| Member input | Text/code change | Remaining decision |
|---|---|---|
| D1 agree with amendment | Trust draft records issuer authorization and same-issuer-first candidate; full-profile gaps visible in identity page | Same issuer vs authorized publisher; exact suites, key/signed-byte binding |
| D2 amend | Trust draft records signed validity, receipt age, local rollback high-water mark and audit minimization | Durations, persistence, equal-time conflicts, holder provenance; cache implementation still absent |
| D3 agree | Trust/conformance text and fixture evaluator/expectations align malformed values and decompression; separate expansion-limit diagnostic | CG review/merge and independent adapter results |
| Existing identity/privacy work | Spec pages now link existing runners; privacy page warns against treating unresolved example as fixture | Actual encoding/root and complete identity envelope choices |
| Existing revocation family | Conformance page and combined runner expose model beside status checks | Evgenii's case review, G02 and live signed/effect-observed execution |

## Security limits in D2

Signed validUntil bounds the lifetime of an old list; it does not prove that
list is current. First-seen holder bytes cannot acquire trusted age merely by
being presented. A local validFrom high-water mark does not distinguish two
versions at the same instant, order global publication, or protect itself from
backup rollback. Persisted trusted state, clock assumptions and parameter
values need explicit review before coding a claimed interoperable cache.

No private research experiment or unpublished security material is imported.
Core/Studio/AIKR evidence remains separately scoped and cannot substitute for
CG profile tests. PR #7 scoring-policy questions remain open.

## Validation and merge order

`python3 -I scripts/check-review-evidence.py` runs all existing suites plus
four new error/expansion-control tests. Results are contributor-run only.
Review PR #10 and #9 as evidence publication; review PR #6's normative changes
and this D3 revision separately. After reviewed integration, enable the CI
workflow and verify it remotely. Group adoption and independent conformance
remain separate acceptance steps.

## 17 November follow-up: Paul Ashley on PR #11

Source: https://github.com/w3c-cg/atp/pull/11#issuecomment-6909300990

| Review item | Disposition in this revision | Status |
|---|---|---|
| Name delegated status authorization | Link the existing TRQP section; require an explicit publication permission in the proposal | Proposed permission profile still needs agreement |
| Same hybrid credential/list candidate | Securing-profile note now links D1 proof-set candidate | Suite/signed-byte choices remain open |
| Equal-time conflicts | Record issuer prohibition and verifier fail-closed candidate; distinguish content from fresh signatures | Proposed, not normative cache implementation |
| Holder age | Record signed-validFrom age origin and future-time/skew questions | Proposed; no latest-version claim |
| Expansion cap | Explicitly record open ATP-wide maximum; local guard failure is unverifiable/UNKNOWN/zero trust/no policy use | Existing local guard tested; numeric ATP limit open |
| VCDM 2.0 expiry | Correct Trust Credential text and example to validUntil | Implemented in draft; boundary/legacy-field controls added |

The new expiry tests sign actual experimental credentials and list versions;
they test one millisecond before, at, and after expiry, and reject a credential
that only supplies the old expirationDate field. No existing signed fixture
bytes or expected-vector outcomes change in this revision.

## Independent identity subset evidence

[External review record](identity-independent-review.md) links Hori's pinned
reader/scorer results and records four negative-coverage gaps and two syntax
questions. This is independent evidence for an identifier subset, not a check
mark for complete-profile conformance. No external fixture/code contribution
is imported before its contribution process is addressed. An acknowledgment
and membership invitation are prepared separately for tracker #8.

## Runtime compatibility follow-up

The combined runner now probes ML-DSA-65 signing/verification before the suites.
An unsuitable PATH Node triggers selection of node@24.22.1 through npm; all
Node commands use that resolved executable, including children using process.execPath.
The report records Node/OpenSSL/Python versions. An explicit ATP_REVIEW_NODE
runtime must pass the same probe; it never bypasses crypto checks. Setup errors,
timeouts and actual test failures remain nonzero, with concise stderr diagnostics.
Three integration controls verify fallback from an incapable PATH Node, structured
failure when no runtime can be selected, and preservation of an actual adapter failure.
The fallback control simulates npm resolution; no package download is claimed by
that test. The selected runtime executes the real crypto/suites.
