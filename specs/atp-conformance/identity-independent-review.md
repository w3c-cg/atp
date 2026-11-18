# Independent identifier subset review — Tetsuroh Hori

Recorded 17 November 2026 (Central). External review input, not CG adoption or
complete-profile conformance. The contributor of this revision inspected the
published record; this revision does not claim to have rerun Hori's reader.

## Pins and reported result

- [Tracker comment](https://github.com/w3c-cg/atp/issues/8#issuecomment-6931778426).
- [External record at fedc713](https://github.com/aos-standard/catalog/tree/fedc713/docs/runs/w3c-atp-did-cold).
- ATP source: `specs/did-atp/index.html` at `8e4f7ac4237a98d31457cf26c9f1d3be6b923a43`.
- Published vector Git blob: `c42a2d50a7d70ff2acff24faadafc39f30238120`.
- [v2 score](https://github.com/aos-standard/catalog/blob/fedc713/docs/runs/w3c-atp-did-cold/runs/score_v2.json), Git blob `a9a3fcd22644cbe616e73720100392f15be1e2a2`: 11 agreeing cases out of 11.
- [Mutation record](https://github.com/aos-standard/catalog/blob/fedc713/docs/runs/w3c-atp-did-cold/runs/mutation_battery_v2.json), Git blob `276c6233379d634b212d2a60da53c06c398eb400`: four detected and five undetected mutants.

Hori states that he wrote the Python reader from specification text without
opening the vector generator, SDK, /proof program or PR #10 runner. He reports
using Python cryptography for Ed25519 and OpenSSL 3.6.1 for ML-DSA-65 seed-based
key generation, with AI assistance disclosed and personal responsibility for
the run. That independence is his declared process, not something repository
inspection alone can prove.

His frozen v1 matched 10/11; the missed case omitted saltHex from the reader's
input split. The frozen v2 passes that field through, retaining the derivation,
and matches 11/11. Both versions and freeze records remain available externally.
The reported evidence supports tested derivation interoperability across the
two implementation paths. It is not a universal proof of seed portability.

**Covered:** identifier syntax on the supplied cases, e1_/pq1_ fingerprints,
pairwise derivation. **Not covered:** DID resolution, DID Document, either
required signature, request binding, lifecycle or action authorization.

## Coverage gaps and text questions

| Finding | Proposed next task | Current status |
|---|---|---|
| Method-name case is not caught by existing vectors | Add a distinct negative control after contribution review | Requirement already in method-name text; proposed external fixture not imported |
| Invalid fingerprint alphabet is not caught | Add a length-preserving alphabet negative | ABNF requirement; proposed external fixture not imported |
| Missing path before binding pair is not caught | Add a no-path negative control | ABNF requirement; proposed external fixture not imported |
| Short master secret is not caught | Add a rejected derivation-input group and ensure runner consumes it | Minimum-length requirement exists; runner/schema extension still needed |
| Port-form mutant survives | Pin domain/port grammar, then define control | Current domain-name definition incomplete |
| Uppercase hostname vector lacks explicit local rule | Define domain-name and canonical representation with pinned did:wba mapping | Pending group decision; DNS case-insensitivity is not a DID canonicalization rule |
| Earlier path segment resembles binding | Choose final-two-segment parsing or explicit prefix reservation | Existing ABNF permits it; reader's extra rejection is not yet a normative requirement |

For the path question, final-two-segment parsing preserves the current grammar:
only the trailing e1_/pq1_ pair supplies the bindings and earlier legal segments
remain path data. Reserving binding prefixes throughout a path would narrow
accepted identifiers and needs an explicit compatibility decision. Do not silently
label either candidate as agreed by adding a deciding vector first.

## Contribution and tracker disposition

Hori says he is not a CG participant and asks that the files remain review
input until membership is addressed. Link the independent report and acknowledge
its limits now. Invite participation before incorporating substantive proposed
fixture/code contributions, following CONTRIBUTING.md. No external reader or
proposed vector file is copied by this revision.

Tracker #8 may record an independent result for this subset, with the v1/v2
history and gaps. Leave the complete selected-profile item unchecked. This
result does not approve PR #11's unrelated credential/privacy/action proposals.
