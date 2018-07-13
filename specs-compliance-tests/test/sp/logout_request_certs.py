# Copyright 2018 AgID - Agenzia per l'Italia Digitale
#
# Licensed under the EUPL, Version 1.2 or - as soon they will be approved by
# the European Commission - subsequent versions of the EUPL (the "Licence").
#
# You may not use this work except in compliance with the Licence.
#
# You may obtain a copy of the Licence at:
#
#    https://joinup.ec.europa.eu/software/page/eupl
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the Licence is distributed on an "AS IS" basis, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# Licence for the specific language governing permissions and limitations
# under the Licence.

import json
import os
import subprocess
import unittest

import common.helpers
import common.wrap

DATA_DIR = os.getenv('DATA_DIR', './data')


class TestLogoutRequestCertificates(unittest.TestCase,
                                    common.wrap.TestCaseWrap):
    longMessage = False

    @classmethod
    def tearDownClass(cls):
        fname = '%s/sp-logout-request-certs.json' % DATA_DIR
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

    def _test_certificates(self, use):
        cmd = ['find',
               DATA_DIR,
               '-type',
               'f',
               '-name',
               '*.logout.request.%s.pem' % use]
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE)
        out, err = process.communicate()
        certs = out.decode('utf-8').split('\n')

        for cert_path in certs:
            if cert_path:
                r = common.helpers.parse_pem(cert_path)

                self._assertFalse(
                    r[0].lower().startswith('sha1'),
                    (('The %s certificate must not use '
                      'weak signature algorithm') %
                     cert_path)
                )

                exp = ['rsaEncryption', 'id-ecPublicKey']
                self._assertIn(
                    r[2],
                    exp,
                    (('The key type of %s certificate must be one of [%s]') %
                     (cert_path, ', '.join(exp)))
                )

                if r[2] == 'rsaEncryption':
                    exp = 2048
                elif r[2] == 'id-ecPublicKey':
                    exp = 256
                else:
                    pass

                self._assertTrue(
                    (int(r[1]) >= exp),
                    (('The key length of %s certificate must be >= %d') %
                     (cert_path, exp))
                )

    def test_signature_certificates(self):
        '''Test the compliance of signature certificate(s)'''
        self._test_certificates('signature')
