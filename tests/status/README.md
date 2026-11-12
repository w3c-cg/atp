# Experimental ATP credential status fixtures

Based on ATP PR #6 head 7e3a990c58c980ccb016ebaf6ce0b5163151881f and the
earlier November 2 fixture review bundle. The offline Ed25519 test JWS and its
public deterministic key exercise selected status behavior. They do not define
the adopted ATP credential envelope or demonstrate VC-BSL interoperability.

With Node 24:

```sh
node run.mjs
node --test profile.test.mjs mutations.test.mjs
```

`node generate.mjs` regenerates the fixture JSON and checksum files. An external
ES module can export `evaluate(input, key, history)`. Pass its absolute path
as `ATP_STATUS_ADAPTER`. The adapter receives the input and public test key
without expected answers. A fresh history set is passed per case.

The runner compares complete output fields, including local diagnostics and
proposed symbolic error types. Null means that the case does not use a
Bitstring Status List error type. The case for optional remembered revocation
enables that mode explicitly. The holder-provided maximum age in these
fixtures is experimental. It does not implement verified-copy caching or its
agreed age origin, TTL behavior, provenance, or live HTTP semantics.
