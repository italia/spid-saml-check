import json
import os
import subprocess
import unittest

import common.wrap

DATA_DIR = os.getenv('DATA_DIR', './data')


class TestSPCertificates(unittest.TestCase, common.wrap.TestCaseWrap):
    @classmethod
    def tearDownClass(cls):
        fname = '%s/sp-metadata-certs.json' % DATA_DIR
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
        self.assertEqual([], self.failures)

    def _test_certificates(self, use):
        cmd = ['find',
               DATA_DIR,
               '-type',
               'f',
               '-name',
               '*.sp.metadata.%s.pem' % use]
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE)
        out, err = process.communicate()
        certs = out.decode('utf-8').split('\n')

        for cert_path in certs:
            if cert_path:
                cmd = ['bash', './script/check-certificate.sh',
                       cert_path]
                is_valid = True
                try:
                    subprocess.run(cmd, check=True)
                except subprocess.CalledProcessError as err:
                    is_valid = False
                self._assertTrue(
                    is_valid,
                    'the %s certificate must be valid' % cert_path
                )

    def test_signature_certificates(self):
        '''check signature certificates'''
        self._test_certificates('signature')

    def test_signing_certificates(self):
        '''check signing certificates'''
        self._test_certificates('signing')

    def test_encryption_certificates(self):
        '''check encryption certificates'''
        self._test_certificates('encryption')
