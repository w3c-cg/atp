# Grant-revocation family: review entry point

13 November 2026. Informative review material, not an adopted conformance item.
Completion tracker: https://github.com/w3c-cg/atp/issues/8

## Review the existing draft

`grant-revocation-family-draft.md` is the unchanged 9 November draft 0.4.1.
SHA-256: `8c259d769340b64e1237d9bad62a325638077dc6d3fb89eed690d7695ac78964`.
This publishes existing reviewed work; it does not restart its review history.
The draft responds to Evgenii's written review and subsequent pre-circulation
checks. Larry remains accountable for this contribution. The pre-circulation
review reported no blockers in v0.4; v0.4.1 incorporates its two prose edits.
This is not a claim of a completed CG case-by-case review or independent run.

Evgenii: please review G01 through G05 case by case here. Other members can
comment on individual assumptions or contribute one bounded fixture/adapter.

Decisions still requested:

1. Accept or amend the proposed fresh-read/no-cache test profile. This is not
   a universal requirement to disable production status caching.
2. Select G02's behavior when a live lookup returns HTTP 503. Its denial
   expectation remains a proposal, not an agreed normative rule.
3. Agree the grant/status securing format, evidence contract and first RP
   implementation before producing signed runtime fixtures.

## Reproduce the model

The Python file is extracted unchanged from the draft's single Python block.
Run from this directory with Python 3 (only standard-library dependencies):

```sh
python3 -I grant_revocation_model.py > local-model-results.json
```

`grant-revocation-model-results.json` records the 13 November local model run.
Its embedded assertions passed: 12 reference arms and 15 modelled faults.
Observer faults yield inconclusive outcomes. The model version stays 0.4,
because v0.4.1 changed prose only. This checks expectation discrimination;
it does not run an RP, fetch signed status or observe a real resource.

## Reuse existing work rather than rebuilding it

| Existing material | Useful contribution to this family | Limit |
| --- | --- | --- |
| ATP CG PR #6, head `74261626e376ea813255ad553171f74f130ddbda`, `tests/status` | Offline fixture format, external-adapter runner, status/error controls | Experimental Ed25519 envelope, not agreed hybrid VC proofs, caching or live HTTP |
| ATP Core public trust demonstration, package `29c8ce870152cbc28a5161f6b16e4f36257e1580` | Pinned setup, preserved results, callback controls and independent-rerun instructions | Author-run 40 tests and 22 overlapping scenarios; synthetic status; callback counts are not resource observation |
| ATP Studio PR #105, tested head `eb6a3f5284d76d8c6b1da396876a03caaaf85c0b` | Candidate PostgreSQL sink, transactional authority fence and concurrent-withdrawal controls | Author-produced implementation/CI evidence; not a portable sink guarantee or independent CG run |
| AIKR declaration/evidence/decision/outcome work | Keep record completeness, verification, authorization and observed effects separate | Documentary/model work does not establish runtime enforcement |

Sources:

- https://github.com/w3c-cg/atp/pull/6
- https://github.com/agent-trust-protocol/atp-core/blob/29c8ce870152cbc28a5161f6b16e4f36257e1580/examples/trust-demonstration/README.md
- https://github.com/agent-trust-protocol/atp-core/pull/242
- https://github.com/w3c-cg/aikr/issues/29
- https://github.com/agent-trust-protocol/atp-studio/pull/105

The public Core package and AIKR implementation issue already exist: do not
resubmit them. Link new reviewer results to their original threads. Core PR
#242 remains draft at inspection; Studio PR #105 is merged. Neither establishes
that this family has passed against those implementations.

The separate ATP Mandates containment proposal is extension/research input.
Its cached-status, in-flight, receiver-acceptance and recovery cases must not
silently expand the four initial specifications or G01-G05. NTI governance
and implementation results likewise need an explicit semantic mapping before
they can support an ATP claim; no NTI adoption or transfer is asserted here.

## What an implementation report must add

Pin fixture hashes, native securing/profile rules, implementation and runner
versions, authenticated issuer/publication/fetch/verification evidence, cache
configuration, actual dispatch, independent resource effects, canaries and
completion barriers. Preserve PASS, FAIL, INCONCLUSIVE and NOT RUN. Report
positive controls alongside negatives. Record unresolved policy explicitly.

Larry Lewis  
Chair, W3C Agent Trust Protocol Community Group
