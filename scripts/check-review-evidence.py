"""Run contributor checks with a capable Node runtime; never mask test failures."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
NODE_PACKAGE = 'node@24.22.1'
PROBE = r'''
const crypto = require('node:crypto');
if (Number(process.versions.node.split('.')[0]) < 24) {
  throw Error('Node 24 or later is required for these review checks');
}
const {privateKey, publicKey} = crypto.generateKeyPairSync('ml-dsa-65');
const message = Buffer.from('ATP review runtime capability check');
const signature = crypto.sign(null, message, privateKey);
if (!crypto.verify(null, message, publicKey, signature)) {
  throw Error('ML-DSA-65 signing and verification are unavailable');
}
console.log(JSON.stringify({node:process.versions.node, openssl:process.versions.openssl}));
'''


def probe_node(executable):
    result = subprocess.run([executable, '-e', PROBE], text=True,
                            capture_output=True, timeout=60)
    if result.returncode:
        raise RuntimeError('Node runtime lacks the required ML-DSA-65 support')
    return json.loads(result.stdout)


def resolve_node():
    """Use a capable installed Node; otherwise obtain the pinned npm runtime."""
    requested = os.environ.get('ATP_REVIEW_NODE')
    current = requested or shutil.which('node')
    if current:
        try:
            versions = probe_node(current)
            return current, versions, 'configured' if requested else 'PATH'
        except (OSError, ValueError, RuntimeError, subprocess.TimeoutExpired):
            if requested:
                raise RuntimeError('ATP_REVIEW_NODE is not a capable Node 24+ executable')
    npm = shutil.which('npm')
    if not npm:
        raise RuntimeError('Install Node 24 with ML-DSA-65 support, or set ATP_REVIEW_NODE to its executable; npm is unavailable for automatic setup')
    print('Selecting Node 24.22.1 for ATP review checks (npm cache/download).', file=sys.stderr)
    result = subprocess.run(
        [npm, 'exec', '--yes', '--package=' + NODE_PACKAGE, '--',
         'node', '-p', 'process.execPath'],
        cwd=ROOT, text=True, capture_output=True, timeout=180)
    if result.returncode:
        # Return npm's error to the local operator, not a fabricated pass.
        raise RuntimeError('Automatic Node setup failed: ' + result.stderr.strip()[-2000:])
    node_path = Path(result.stdout.strip().splitlines()[-1]) if result.stdout.strip() else Path('')
    if not node_path.is_absolute() or not node_path.is_file():
        raise RuntimeError('npm did not return an existing absolute Node executable path')
    versions = probe_node(str(node_path))
    if versions['node'] != '24.22.1':
        raise RuntimeError('npm did not select the pinned Node 24.22.1 runtime')
    return str(node_path), versions, NODE_PACKAGE


def main():
    report = {'scope': 'contributor review checks, not independent interoperability',
              'passed': False, 'environment': {'python': sys.version.split()[0]},
              'runs': []}
    try:
        node, versions, source = resolve_node()
        report['environment'].update(versions)
        report['environment']['nodeSelection'] = source
    except (OSError, ValueError, RuntimeError, subprocess.TimeoutExpired) as error:
        report['preflightError'] = str(error)
        print('ATP runtime setup failed: ' + str(error), file=sys.stderr)
        print(json.dumps(report, indent=2))
        return 1
    commands = [
        [node, 'tests/status/run.mjs'],
        [node, '--test', 'tests/status/profile.test.mjs',
         'tests/status/mutations.test.mjs', 'tests/status/errors.test.mjs'],
        [node, 'specs/atp-conformance/identity-review.mjs'],
        [sys.executable, '-I', 'specs/atp-conformance/privacy-review.py'],
        [sys.executable, '-I', 'specs/atp-conformance/grant_revocation_model.py'],
    ]
    for command in commands:
        try:
            result = subprocess.run(command, cwd=ROOT, text=True,
                                    capture_output=True, timeout=120)
            run = {'command': command, 'exitCode': result.returncode,
                   'stdout': result.stdout, 'stderr': result.stderr}
        except subprocess.TimeoutExpired:
            run = {'command': command, 'exitCode': 124, 'stdout': '',
                   'stderr': 'Check exceeded its 120-second execution limit'}
        except OSError as error:
            run = {'command': command, 'exitCode': 1, 'stdout': '', 'stderr': str(error)}
        report['runs'].append(run)
        if run['exitCode']:
            print('FAILED: ' + ' '.join(command), file=sys.stderr)
            print(run['stderr'] or run['stdout'][-2000:], file=sys.stderr)
    report['passed'] = all(run['exitCode'] == 0 for run in report['runs'])
    print(json.dumps(report, indent=2))
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    sys.exit(main())
