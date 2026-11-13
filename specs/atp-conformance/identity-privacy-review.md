# Identity and privacy: existing evidence for CG review

13 November 2026. Review input for deliverables 1 and 3; related tracker #8.
These files publish the existing 9 November checks, with fresh local outputs.
They do not replace the specification or declare an agreed securing profile.

## Identity reproduction

From this directory on Node 24 with compatible OpenSSL ML-DSA support:

```sh
node identity-review.mjs > local-identity-results.json
```

The runner reuses `../did-atp/test-vectors.json` rather than copying published
fixtures. Checked vector Git blob: `c42a2d50a7d70ff2acff24faadafc39f30238120`.
The sole change to the previously prepared runner is its relative input path.
The recorded output was produced with Node v24.22.1: all 11 published cases
and eight primitive signature controls passed. The original runner against
the same published vector bytes produced this output. The relocated runner
was also run in a matching directory layout and produced byte-identical JSON.

This is an author-workflow reproduction using Node crypto, not a separate
organization's implementation. The syntax helper covers the published cases,
not the complete method grammar. Raw signatures share a fixed test challenge;
this does not test a real securing envelope, DID resolution, key discovery,
request-bound proof, lifecycle, replay defense or remote interoperability.
Pairwise derived binding keys differ in these fixtures; shared document or
transport metadata can still correlate peers.

**Review decisions:** select and specify the remaining PQ DID-document securing
serialization and signed bytes; review required-proof verification and key
lifecycle; then add complete envelope, resolver and request-binding cases.
Do not choose JWS, COSE or a Data Integrity cryptosuite implicitly by accepting
these primitive checks. A reviewer can contribute an independent recomputation
now and a complete-profile adapter after the format decision.

## Privacy candidate

```sh
python3 -I privacy-review.py > local-privacy-results.json
```

The unchanged candidate passes three openings and rejects seven tampering
controls. Its root is a new candidate, not a reproduction of the published
example root. It uses sorted ASCII keys, JSON name/value scalar pairs, leaf
and node domain separation, and a specified odd-node marker. These conventions
are proposals for review. The fixture's trusted root is supplied out of band;
there is no issuer-signature verification or zero-knowledge construction.

The current privacy draft's example lists name/org indices `[1,4]`; lexical
ordering of its shown keys gives `[2,3]`, while the shown insertion order gives
`[1,4]`. The code reports those conventions; it does not parse the draft or
establish which byte encoding originally generated the published root.
Checked specification blob: `5c2cfcc85878f5e8eaba04cf6cadc86c5c42ef7a`.

**Review decisions:** agree complete value/Unicode/number serialization, name
ordering, zero-based indices, odd-node treatment, credential/root binding and
issuer authentication. Recover the original example generator or replace the
root and paths together under an explicitly selected profile. Preserve
pairwise key separation requirements and document correlation, schema leakage
and low-entropy guessing risks. Range proofs remain experimental.

## How to contribute without repeating completed work

Please report exact source/vector pins, runtime, command, exit status and full
output. Identify mismatches and propose one bounded correction per issue/PR.
Keep the included contributor outputs separate from independent results.
Reuse existing PR #6 status fixtures and PR #9 action-family review for their
respective boundaries; passing these identity/privacy checks does not pass
either of those suites. AIKR's existing trust demonstration is a separate
callback/policy experiment and should be linked, not resubmitted.

Larry Lewis  
Chair, W3C Agent Trust Protocol Community Group
