"""Run existing contributor checks; success does not mean independent conformance."""
import json, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
commands=[
 ['node','tests/status/run.mjs'],
 ['node','--test','tests/status/profile.test.mjs','tests/status/mutations.test.mjs','tests/status/errors.test.mjs'],
 ['node','specs/atp-conformance/identity-review.mjs'],
 [sys.executable,'-I','specs/atp-conformance/privacy-review.py'],
 [sys.executable,'-I','specs/atp-conformance/grant_revocation_model.py'],
]
reports=[]
for command in commands:
 result=subprocess.run(command,cwd=ROOT,text=True,capture_output=True)
 reports.append({'command':command,'exitCode':result.returncode,'stdout':result.stdout,'stderr':result.stderr})
print(json.dumps({'scope':'contributor review checks, not independent interoperability', 'passed':all(r['exitCode']==0 for r in reports),'runs':reports},indent=2))
sys.exit(0 if all(r['exitCode']==0 for r in reports) else 1)
