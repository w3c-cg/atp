# Implementation evidence — 2026-11-25

Individual contributor proposal. Public references only; no independent conformance asserted.

- [Operator authority examples](https://github.com/agent-trust-protocol/atp-core/tree/main/examples/operator-authority): retrieved README blob `4855bc1862dc22264f0aea3a78a4537f113b0a6b`. Reports historical local 10 signed-fixture tests and 9/9 two-agent tests. Revision-3 mapping exercises 12 cases / 44 calls with a synthetic evaluator. These are not fresh test results. Status is simulated; request encoding is noncanonical; nonce storage is in-memory; real runtime containment, authenticated status, chain validation and atomic revocation/execution remain unproven. The newer SDK fixture uses Ed25519 only; no post-quantum mandate claim.
- [Protocol support](https://github.com/agent-trust-protocol/atp-core/blob/main/docs/PROTOCOL-SUPPORT.md): retrieved blob `f6feccb095969ff21c44bff8ada77b4400027bdd`, source audit dated 2026-10-16. Distinguishes experimental, planned and unverified integrations. Requires server-owned enforcement and independent interop tests.

Blob identifiers are not commit identifiers. Pin repository commits, commands, environment, fixture hashes, actual results and independent reproduction before promoting claims. No private Studio documentation or private research is included. No fresh runs performed.
