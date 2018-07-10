import json
import os
import subprocess
import unittest

import common.helpers
import common.wrap

DATA_DIR = os.getenv('DATA_DIR', './data')


class TestSPCertificates(unittest.TestCase, common.wrap.TestCaseWrap):
    @classmethod
    def tearDownClass(cls):
        fname = '%s/idp-authn-response-certs.json' % DATA_DIR
        with open(fname, 'w') as f:
            f.write(json.dumps(cls.report, indent=2))
            f.close()

    def setUp(self):
        self.failures = []
        _report = self.__class__.report
        paths = self.id().split('.')
        c = 1
        for path in paths:
            if path not in _report:
                if c == len(paths):
                    _report[path] = {
                        'description': self.shortDescription(),
                        'assertions': [],
                    }
                else:
                    _report[path] = {}
            _report = _report[path]
            c += 1

    def tearDown(self):
        if self.failures:
            self.fail(common.helpers.dump_failures(self.failures))

    def _test_certificates(self, element, use):
        cmd = ['find',
               DATA_DIR,
               '-type',
               'f',
               '-name',
               '*.authn.%s.%s.pem' % (element, use)]
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE)
        out, err = process.communicate()
        certs = out.decode('utf-8').split('\n')

        for cert_path in certs:
            if cert_path:
                cmd = ['bash', './script/check-certificate.sh',
                       cert_path]
                is_valid = True
                msg = 'The %s certificate must be valid' % cert_path
                try:
                    subprocess.run(cmd, check=True, stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE)
                except subprocess.CalledProcessError as err:
                    is_valid = False
                    lines = [msg]
                    if err.stderr:
                        stderr = (
                            'stderr: ' +
                            '\nstderr: '.join(
                                list(
                                    filter(
                                        None,
                                        err.stderr.decode('utf-8').split('\n')
                                    )
                                )
                            )
                        )
                        lines.append(stderr)
                    if err.stdout:
                        stdout = (
                            'stdout: ' +
                            '\nstdout: '.join(
                                list(
                                    filter(
                                        None,
                                        err.stdout.decode('utf-8').split('\n')
                                    )
                                )
                            )
                        )
                        lines.append(stdout)
                    msg = '\n'.join(lines)

                self._assertTrue(is_valid, msg)

    def test_signature_certificates(self):
        '''Test the compliance of signature certificate(s)'''
        self._test_certificates('response', 'signature')

    def test_assertion_signature_certificates(self):
        '''Test the compliance of signature certificate(s)'''
        self._test_certificates('assertion', 'signature')
