# Agent Trust Protocol (ATP) — W3C Community Group

A quantum-safe **identity, trust, and privacy layer for AI agents**. ATP extends the W3C
[Decentralized Identifiers](https://www.w3.org/TR/did-core/) and
[Verifiable Credentials](https://www.w3.org/TR/vc-data-model/) data models for autonomous
agents.

**Charter:** produce open specifications that fill the **Security and Privacy modules**
described by the [AI Agent Protocol Community Group](https://www.w3.org/community/agentprotocol/),
modules currently marked as pending community contribution.

> ⚠️ **Status: drafts for review — not yet adopted CG Reports.**
> The four specifications below are **input documents** to the Community Group, shared here
> so members can read and comment on them. They render with an **"Unofficial Draft"**
> banner. They become Community Group Reports only if and when the group votes to adopt
> them, at which point they will gain the formal W3C status, copyright, and IPR notices
> required by the [CG report requirements](https://www.w3.org/community/reports/reqs/).

## Read the specifications

Rendered (via GitHub Pages):

> **https://w3c-cg.github.io/atp/specs/**

| Spec | What it covers |
|---|---|
| [did:atp — Quantum-Safe DID Method](https://w3c-cg.github.io/atp/specs/did-atp/) | A DID method binding a classical Ed25519 key and a post-quantum ML-DSA-65 (FIPS 204) key in one hybrid identifier, with deterministic pairwise derivation. Includes published, vendor-neutral test vectors. |
| [Agent Trust Scoring & Credentials](https://w3c-cg.github.io/atp/specs/atp-trust/) | A deterministic, bounded, fail-closed trust model whose levels are expressible as signed W3C Verifiable Credentials. |
| [Privacy-First Interaction](https://w3c-cg.github.io/atp/specs/atp-privacy/) | Pairwise (per-relationship) identifiers, Merkle-based selective disclosure, and experimental zero-knowledge range proofs. |
| [Conformance & Interoperability](https://w3c-cg.github.io/atp/specs/atp-conformance/) | Normative conformance items and a vendor-neutral test-vector format for independent implementations to verify interoperability. |

The specifications are written with [ReSpec](https://respec.org/), a W3C-supported
specification tool.

## How to give feedback

Please file one **[GitHub issue](https://github.com/w3c-cg/atp/issues)** per topic —
questions, disagreements, gaps, and editorial nits are all welcome. We're running an
asynchronous review; there is no need to wait for a meeting to comment.

## Implementation status

Contributor review code is available for all four workstreams. Run the combined
checks with Node 24 and Python 3 (no package installation required):

```sh
python3 -I scripts/check-review-evidence.py > review-results.json
```

The CI workflow runs the same command and retains its report. A passing report
checks the included contributor code; it does not establish independent
interoperability, CG approval, or complete-profile conformance.

| Workstream | Runnable material | Remaining gate |
|---|---|---|
| Identity | `specs/atp-conformance/identity-review.mjs` | Selected DID-document envelope/signed bytes, resolver and lifecycle evidence |
| Credentials | `tests/status/run.mjs` and Node tests | Hybrid proof profile, cache/issuer decisions, independent adapter |
| Privacy | `specs/atp-conformance/privacy-review.py` | Selected encoding and authenticated root, independent review |
| Conformance | `specs/atp-conformance/grant_revocation_model.py` | Agreed action profile and signed live implementation runs |

See [member review dispositions](specs/atp-conformance/member-dispositions.md)
and [tracker #8](https://github.com/w3c-cg/atp/issues/8). The evidence originally
submitted in PRs #6, #9 and #10 is reused here; those PRs are not represented as
approved or remotely merged by this integration branch.

## License

This repository follows the standard W3C Community Group licensing (see
[`LICENSE.md`](LICENSE.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md)):

- **Specifications** — contributions are made under the
  [W3C Community Contributor License Agreement (CLA)](https://www.w3.org/community/about/agreements/cla/).
- **Other reports** — [W3C Software and Document License](https://www.w3.org/copyright/software-license/).
- **Test suites** — [W3C 3-clause BSD License](https://www.w3.org/copyright/3-clause-bsd-license-2008/).

Substantive contributions to specifications require joining the Community Group.
