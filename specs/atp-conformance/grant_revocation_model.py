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
