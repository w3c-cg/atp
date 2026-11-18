"""Test runtime selection contracts independently of the installed patch release."""
import json
import os
from pathlib import Path
import runpy
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = runpy.run_path(str(ROOT / 'scripts/check-review-evidence.py'))
NODE = RUNTIME['resolve_node']()[0]


class RuntimeTests(unittest.TestCase):
    def run_checks(self, extra):
        env = dict(os.environ)
        env.pop('ATP_REVIEW_NODE', None)
        env.pop('ATP_STATUS_ADAPTER', None)
        env.update(extra)
        result = subprocess.run([sys.executable, '-I', str(ROOT / 'scripts/check-review-evidence.py')],
                                cwd=ROOT, env=env, text=True, capture_output=True, timeout=60)
        return result, json.loads(result.stdout)

    def resolve_with_mock_npm(self, package_version):
        # Mock only runtime selection, not cryptographic/suite results. The mock
        # returns the requested pin even if the actual CI Node is a newer patch.
        resolve = RUNTIME['resolve_node']
        def probe(executable):
            if executable == '/unsupported-node':
                raise RuntimeError('unsupported runtime')
            self.assertEqual(executable, NODE)
            return {'node': package_version, 'openssl': 'mock-selection-only'}
        def which(command):
            return {'node': '/unsupported-node', 'npm': '/mock-npm'}.get(command)
        npm_result = subprocess.CompletedProcess([], 0, stdout=NODE + '\n', stderr='')
        with patch.dict(resolve.__globals__, {'probe_node': probe}):
            with patch('shutil.which', side_effect=which):
                with patch('subprocess.run', return_value=npm_result) as npm:
                    try:
                        result = resolve()
                    finally:
                        npm.assert_called_once()
                        args = npm.call_args.args[0]
                        self.assertIn('--package=node@24.22.1', args)
        return result

    def test_incapable_path_runtime_selects_exact_npm_pin(self):
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop('ATP_REVIEW_NODE', None)
            executable, versions, source = self.resolve_with_mock_npm('24.22.1')
        self.assertEqual(executable, NODE)
        self.assertEqual(versions['node'], '24.22.1')
        self.assertEqual(source, 'node@24.22.1')

    def test_wrong_npm_pin_is_rejected(self):
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop('ATP_REVIEW_NODE', None)
            with self.assertRaisesRegex(RuntimeError, 'pinned Node 24.22.1'):
                self.resolve_with_mock_npm('24.22.2')

    def test_capable_selected_runtime_executes_all_node_checks(self):
        # No fake crypto or version output: all five real suites execute here.
        result, report = self.run_checks({'ATP_REVIEW_NODE': NODE})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(report['passed'])
        self.assertEqual(report['environment']['nodeSelection'], 'configured')
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
