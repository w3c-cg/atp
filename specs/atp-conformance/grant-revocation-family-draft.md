# ATP grant revocation conformance family

9 November 2026 · Draft 0.4.1 for ATP CG review

This draft responds to written feedback on the admission rules and pre-circulation reviews. The action scope is one issuer, one delegate, one reusable grant, one relying party (RP), and one repeatable resource operation. Fresh status reads and disabled caching are proposed test-profile conditions for group review. An RP whose status cache cannot be disabled is outside the test profile. Cached status, propagation delay, status-version rollback, in-flight requests and re-delegation are separate cases for later review.

## G01 — Active grant, then revoked grant

Run two isolated arms from equivalent clean state using the **same reusable grant fixture**. Within each arm, preserve the RP, resource, observer and grant between requests. Keep issuer, delegate, scope, target, action and grant bytes fixed. Give each request a fresh nonce and correlation ID so replay protection and deduplication do not explain the result. Choose a repeatable additive action, disable or control unrelated rate limits, and keep the grant and relevant status versions within their validity windows. Advance a harness-controlled clock explicitly and apply equivalent timing in both arms.

Each arm uses isolated issuer and status-source state initialized identically. The revocation transition must never be visible to the matched active arm. Publish a new authenticated status version in both arms with equivalent version, publication timing, signing configuration, and other status entries. The tested grant's status bit is the only difference in status content between the newly published versions. Digests and proof bytes may differ as a consequence.

| Stage | Revocation arm | Matched active arm |
|---|---|---|
| Request 1 | Verify active status. Allow, one callback and one committed effect. | Same. |
| Transition | Drain request 1. Issuer revokes the grant and publishes a new authenticated status version. Zero callbacks and zero action effects. | Drain request 1. Issuer publishes a new authenticated status version at the equivalent point, with the same grant still active. Zero callbacks and zero action effects. |
| Request 2 | Submit a fresh request. RP fetches and verifies the new revoked version for this request before deciding. Deny for revocation, zero callbacks and zero committed effects. | Submit an equivalent fresh request. RP fetches and verifies the new active version for this request before deciding. Allow, one callback and one committed effect. |

The matched arm exercises the **same grant twice**. It detects an implementation that treats the grant as single-use, stops dispatching after the first request, falsely labels a second-use denial as revocation, or denies after any new status version is published. An extra request under a different grant would not detect all of those failures.

The harness submits request 2 after the issuer has made the intended status available. It does not wait for the RP to prove it fetched status before submitting the request. The instrumented status source records the request or trace ID, RP identity, status version ID, digest served, and delivery time. Match this with the RP verification record for the same request and exact bytes. The issuer event must be bound to that version by authenticated evidence, for example a signed issuer record referencing the version digest. For request 2 in both arms, establish the order **status published → status delivered → verified → request decision**. In the revocation arm, the issuer revocation event must precede publication. Across clock domains, use authenticated causal ordering or nonoverlapping uncertainty intervals. A skipped fresh fetch or an early decision fails the case when the source and evidence collection are healthy. Ambiguous ordering from unavailable or unreliable evidence is inconclusive. Use a stated completion bound. A hung request on a healthy test harness is a mismatch for this profile.

Capture action handler invocations separately from the RP decision. Read committed resource state through an observer outside the RP and verifier. Use a dedicated test resource and a documented drain or equivalent completion barrier after each request, including the denied request. Observe through the final barrier and record the observation start and end, observer version, data source and isolation boundary. Verify observer health near the start and after the final barrier using identifiable canaries written directly to the resource. Account for canaries separately from action effects. After removing only the known canaries, require exactly **one** new action event and one handler invocation in the revocation arm and exactly **two** of each in the matched active arm. Correlate each invocation and event to an expected request. Unexpected or uncorrelated entries fail the arm. If pending work cannot be bounded or an observer misses a canary, record the run as inconclusive for the implementation. A healthy run with a mismatched positive control fails.

If the RP does not propagate a request or trace ID, correlate by time only when the isolated RP's fetch is the sole attributable fetch between submission and decision, with no overlapping requests or background activity that could account for it. Ambiguous correlation cannot establish a pass.

## G02–G05 — Other admission controls

Run each pair from equivalent clean state, with caching disabled in both arms. Change one specified condition. Record how the harness disabled caching and verify the expected status-source traffic. Keep verifier-only credential checks separate from claims about downstream action enforcement.

| ID | Single changed condition | Proposed expected result |
|---|---|---|
| G02 | Use the same grant fixture, active status source and harness-controlled proxy in both arms. The positive proxy passes the live lookup through unchanged. The negative proxy returns HTTP 503 with an empty body. The grant remains active at the source in both arms. | Under the proposed no-cache denial policy, deny with a distinct status-unavailable reason, zero callbacks and zero effects. **Group decision pending.** |
| G03 | Omit the embedded grant or grant reference according to the request binding. Use a syntactically valid action request that reaches authorization, and ensure the delegate has no other authority for the action. | Deny for missing grant, zero callbacks and zero effects. A parse rejection does not establish this case. |
| G04 | Flip one byte of the signature while preserving valid serialization and the signed status-list payload with clear bits. | Fail verification on proof using the selected profile’s defined error type. If wired into the RP, zero callbacks and zero effects. |
| G05a | Omit only the suspension entry. Keep the remaining bit clear. | For a profile requiring both purposes, fail on the missing purpose. If wired into the RP, zero callbacks and zero effects. |
| G05b | Omit only the revocation entry. Keep the remaining bit clear. | Same profile requirement and outcome as G05a. |

For G02, require proxy logs showing the RP lookup in both arms and the response served, including successful pass-through in the positive arm. Without evidence the RP reached the proxy and was served the injected response, the negative result is inconclusive. Record the RP decision and observer result separately. A delivered status credential that fails proof verification belongs to G04. Pin the lookup and decision bounds and keep any retries inside the bound subject to the same injected outage. Record a still-pending request as pending at the deadline. It does not match the proposed denial result. If the CG selects pause or retry instead, define its deadline, observable pending state, and evidence of zero dispatch and effects while pending before scoring that policy.

For G04, keep the proof defect intact after modifying the fixture. If the selected profile requires multiple signature components, run one negative variant per required component and leave the other components valid. For G05, re-sign the modified credential with the same signing configuration as the positive fixture so only the missing purpose accounts for the failure. G05 applies only when both status purposes are required by the selected profile.

## Evidence and reporting

Publish case and arm IDs, request IDs, fixture digest, expected and observed decision and reason, callback and resource counts, issuer and source records, cache configuration evidence, observation windows and completion barriers. Pin the runner, RP, verifier and observer versions. Record implementation mismatches separately from harness faults. Run each intentional fault through the applicable family and identify the requests or arm checks that detect it. The observer faults test the harness. Their detection makes the affected implementation verdict inconclusive.

## Local model check

The embedded Python model uses simulated issuer status, scripted logical event ordering, and an in-process journal and observer. It exercises expected decisions, G01 fresh-fetch evidence, per-request counts, arm totals and observer canaries against modeled faults. Real G01 version publication in both arms, G02 proxy transparency, G04 per-component signatures where applicable, signed fixtures, fetch instrumentation, cache configuration evidence, completion barriers, independent resource observation and independent implementation runs remain pending. The unavailable-status row applies only to the proposed G02 denial policy.

In the run record, G01R is the revocation arm and G01A is the matched active arm. The other cases use P for the positive arm and N for the negative arm. A final number identifies the request within that arm.

| Model or injected fault | Target check (full results in JSON) |
|---|---|
| Reference | All twelve arms matched |
| allow-all | G01R-2 |
| deny-all | G01R-1 |
| ignore-revocation | G01R-2 |
| stale-no-refetch | G01R-2: fresh status evidence |
| single-use-mislabeled | G01A-2 |
| deny-on-new-version | G01A-2 |
| uncorrelated-write | G01R: arm totals and correlation |
| deny-but-dispatch | G01R-2 |
| allow-without-status | G02N-1 |
| ambient-authority | G03N-1 |
| skip-proof | G04N-1 |
| revocation-only | G05aN-1 |
| suspension-only | G05bN-1 |
| dead-observer (harness fault, run inconclusive) | G01R: observer canary |
| late-dead-observer (harness fault, run inconclusive) | G01R: observer canary |

## Reproduce the model

Save the Python block as `atp_grant_model.py` and run `python3 -I atp_grant_model.py`. The JSON records model observations and the checks that detected each fault. Its event ticks express simulated order.


```python
import json
from dataclasses import dataclass, replace


@dataclass(frozen=True)
class Input:
    grant: bool = True
    available: bool = True
    proof: bool = True
    revocation_entry: bool = True
    suspension_entry: bool = True


BASE = Input()
PAIRS = {
    "G02": (replace(BASE, available=False), "deny_status_unavailable"),
    "G03": (replace(BASE, grant=False), "deny_no_grant"),
    "G04": (replace(BASE, proof=False), "deny_proof"),
    "G05a": (replace(BASE, suspension_entry=False), "deny_purpose"),
    "G05b": (replace(BASE, revocation_entry=False), "deny_purpose"),
}


def decide(item, status, fault, repeat):
    if fault == "allow-all":
        return "allow"
    if fault == "deny-all":
        return "deny_unconditional"
    if not item.grant and fault != "ambient-authority":
        return "deny_no_grant"
    if status is None and item.grant and fault != "allow-without-status":
        return "deny_status_unavailable"
    if not item.proof and fault != "skip-proof":
        return "deny_proof"
    if not item.revocation_entry and fault != "suspension-only":
        return "deny_purpose"
    if not item.suspension_entry and fault != "revocation-only":
        return "deny_purpose"
    if repeat and fault == "single-use-mislabeled":
        return "deny_revoked"
    if status == "revoked" and fault != "ignore-revocation":
        return "deny_revoked"
    return "allow"


def run_arm(arm, requests, fault, revoke=False):
    journal, callbacks, events, records = ["canary-start"], [], [], []
    failures = []

    def event(kind, request_id=None, status=None, version=None):
        tick = len(events) + 1
        events.append({"tick": tick, "kind": kind,
                       "request_id": request_id, "status": status, "version": version})
        return tick

    source_status = "active"
    source_version = 1
    first_served_version = None
    previous_status = None
    for index, (item, expected) in enumerate(requests, start=1):
        request_id = f"{arm}-{index}"
        publication = None
        if arm.startswith("G01") and index == 2:
            if revoke:
                source_status = "revoked"
                event("issuer_revocation", status=source_status)
            source_version += 1
            publication = event("status_published", status=source_status, version=source_version)
        event("submit", request_id)
        delivery = verified = None
        status = previous_status
        if item.grant and not (index == 2 and fault == "stale-no-refetch"):
            event("status_attempt", request_id)
            status = source_status if item.available else None
            if status is not None:
                delivery = event("status_served", request_id, status, source_version)
                if first_served_version is None:
                    first_served_version = source_version
                if item.proof and item.revocation_entry and item.suspension_entry:
                    verified = event("status_verified", request_id, status, source_version)
            previous_status = status
        decision = decide(item, status, fault, repeat=index == 2)
        if fault == "deny-on-new-version" and delivery is not None and source_version != first_served_version:
            decision = "deny_revoked"
        decision_tick = event("decision", request_id)
        if decision == "allow" or fault == "deny-but-dispatch":
            callbacks.append(request_id)
            journal.append(request_id)
        if revoke and index == 2 and fault == "uncorrelated-write":
            journal.append("uncorrelated")
        event("drain", request_id)
        records.append((request_id, expected, decision))
        if arm.startswith("G01"):
            ordered = delivery is not None and verified is not None
            if ordered:
                ordered = delivery < verified < decision_tick and status == source_status
            if ordered and publication is not None:
                ordered = publication < delivery
            if not ordered:
                failures.append(f"{request_id}: fresh status evidence")

    journal.append("canary-end")
    event("canary_end")
    if fault == "dead-observer":
        observed = []
    elif fault == "late-dead-observer":
        observed = [entry for entry in journal[:2] if entry != "canary-end"]
    else:
        observed = journal.copy()
    if "canary-start" not in observed or "canary-end" not in observed:
        return {"inconclusive": True, "checks": [f"{arm}: observer canary"],
                "events": events}

    checks = failures
    expected_ids = [request_id for request_id, expected, _ in records
                    if expected == "allow"]
    observed_effects = [entry for entry in observed
                        if entry not in {"canary-start", "canary-end"}]
    outcomes = []
    for request_id, expected, actual in records:
        count = int(expected == "allow")
        seen = (actual, callbacks.count(request_id), observed_effects.count(request_id))
        wanted = (expected, count, count)
        if seen != wanted:
            checks.append(request_id)
        outcomes.append({"id": request_id, "expected": wanted, "actual": seen})
    if arm.startswith("G01") and (observed_effects != expected_ids or callbacks != expected_ids):
        checks.append(f"{arm}: arm totals and correlation")
    return {"inconclusive": False, "checks": checks, "events": events,
            "outcomes": outcomes, "effects": observed_effects, "callbacks": callbacks}


def run(fault):
    result = {
        "G01R": run_arm("G01R", [(BASE, "allow"), (BASE, "deny_revoked")], fault, revoke=True),
        "G01A": run_arm("G01A", [(BASE, "allow"), (BASE, "allow")], fault),
    }
    for case, (negative, denial) in PAIRS.items():
        result[f"{case}P"] = run_arm(f"{case}P", [(BASE, "allow")], fault)
        result[f"{case}N"] = run_arm(f"{case}N", [(negative, denial)], fault)
    return result


targets = {
    "allow-all": "G01R-2",
    "deny-all": "G01R-1",
    "ignore-revocation": "G01R-2",
    "stale-no-refetch": "G01R-2: fresh status evidence",
    "single-use-mislabeled": "G01A-2",
    "deny-on-new-version": "G01A-2",
    "uncorrelated-write": "G01R: arm totals and correlation",
    "deny-but-dispatch": "G01R-2",
    "allow-without-status": "G02N-1",
    "ambient-authority": "G03N-1",
    "skip-proof": "G04N-1",
    "revocation-only": "G05aN-1",
    "suspension-only": "G05bN-1",
    "dead-observer": "G01R: observer canary",
    "late-dead-observer": "G01R: observer canary",
}
runs = {fault: run(fault) for fault in ["reference", *targets]}
assert not any(arm["checks"] for arm in runs["reference"].values())
for fault, target in targets.items():
    assert any(target in arm["checks"] for arm in runs[fault].values()), fault
for fault in ("dead-observer", "late-dead-observer"):
    assert runs[fault]["G01R"]["inconclusive"]
assert runs["single-use-mislabeled"]["G01R"]["checks"] == []
assert runs["deny-on-new-version"]["G01R"]["checks"] == []
assert runs["uncorrelated-write"]["G01R"]["checks"] == ["G01R: arm totals and correlation"]
assert [len(runs["reference"][arm]["effects"]) for arm in ("G01R", "G01A")] == [1, 2]
print(json.dumps({"model": "0.4", "targets": targets, "runs": runs}, indent=2))
```
