"""Exercise runtime fallback and prove real check failures remain failures."""
import json
import os
from pathlib import Path
import shlex
import runpy
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
NODE = runpy.run_path(str(ROOT / 'scripts/check-review-evidence.py'))['resolve_node']()[0]


class RuntimeTests(unittest.TestCase):
    def run_checks(self, extra):
        env = dict(os.environ)
        env.pop('ATP_REVIEW_NODE', None)
        env.pop('ATP_STATUS_ADAPTER', None)
        env.update(extra)
        result = subprocess.run([sys.executable, '-I', str(ROOT / 'scripts/check-review-evidence.py')],
                                cwd=ROOT, env=env, text=True, capture_output=True, timeout=60)
        return result, json.loads(result.stdout)

    def test_incapable_path_node_uses_selected_runtime_for_all_node_commands(self):
        # Simulate an unsupported installed Node and npm's successful resolution.
        # Actual crypto and all five suites run against the real selected Node.
        self.assertIsNotNone(NODE)
        with tempfile.TemporaryDirectory() as directory:
            fake = Path(directory)
            (fake / 'node').write_text('#!/bin/sh\nexit 1\n')
            (fake / 'npm').write_text('#!/bin/sh\nprintf "%s\\n" ' + shlex.quote(NODE) + '\n')
            for path in fake.iterdir():
                path.chmod(0o700)
            result, report = self.run_checks({'PATH': directory + os.pathsep + os.environ['PATH']})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(report['passed'])
        self.assertEqual(report['environment']['nodeSelection'], 'node@24.22.1')
        self.assertEqual(len(report['runs']), 5)
        self.assertTrue(all(run['command'][0] == NODE for run in report['runs'][:3]))

    def test_missing_runtime_produces_structured_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            result, report = self.run_checks({'PATH': directory})
        self.assertEqual(result.returncode, 1)
        self.assertFalse(report['passed'])
        self.assertIn('preflightError', report)
        self.assertEqual(report['runs'], [])

    def test_actual_adapter_failure_is_not_hidden(self):
        with tempfile.TemporaryDirectory() as directory:
            missing = str(Path(directory) / 'absent-adapter.mjs')
            result, report = self.run_checks({'ATP_REVIEW_NODE': NODE, 'ATP_STATUS_ADAPTER': missing})
        self.assertEqual(result.returncode, 1)
        self.assertFalse(report['passed'])
        self.assertTrue(any(run['exitCode'] != 0 for run in report['runs']))
        self.assertIn('FAILED:', result.stderr)


if __name__ == '__main__':
    unittest.main()
