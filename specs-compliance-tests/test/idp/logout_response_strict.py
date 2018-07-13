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

import base64
import json
import os
import re
import subprocess
import unittest
import urllib.parse

from io import BytesIO
from lxml import etree as ET

import common.constants
import common.dump_pem
import common.helpers
import common.regex
import common.wrap

DATA_DIR = os.getenv('DATA_DIR', './data')
DEBUG = int(os.getenv('DEBUG', 0))
RESPONSE = os.getenv('LOGOUT_RESPONSE', None)


class TestLogoutResponseStrict(unittest.TestCase, common.wrap.TestCaseWrap):
    longMessage = False

    @classmethod
    def tearDownClass(cls):
        fname = '%s/idp-logout-response-strict.json' % DATA_DIR
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

        if not RESPONSE:
            self.fail('LOGOUT_RESPONSE not set')

        res = None
        with open(RESPONSE, 'rb') as f:
            res = f.read()
            f.close()

        self.params = urllib.parse.parse_qs(
            re.sub(r'[\s]', '', res.decode('utf-8'))
        )

        if 'SAMLResponse' not in self.params:
            self.fail('SAMLResponse is missing')
        if 'RelayState' not in self.params:
            self.fail('RelayState is missing')

        xml = base64.b64decode(self.params['SAMLResponse'][0])
        self.doc = ET.parse(BytesIO(xml))
        common.helpers.del_ns(self.doc)

    def tearDown(self):
        if self.failures:
            self.fail(common.helpers.dump_failures(self.failures))

    def test_LogoutResponse(self):
        '''Test the compliance of LogoutResponse element'''

        e = self.doc.xpath('/LogoutResponse')
        self._assertTrue(
            (len(e) == 1),
            'One LogoutResponse element must be present'
        )

        e = e[0]

        for attr in ['ID', 'Version', 'IssueInstant', 'InResponseTo',
                     'Destination']:
            self._assertTrue(
                (attr in e.attrib),
                'The %s attribute must be present' % attr
            )

            value = e.get(attr)

            self._assertIsNotNone(
                value,
                'The %s attribute must have a value' % attr
            )

            if attr == 'Version':
                exp = '2.0'
                self._assertEqual(
                    value,
                    exp,
                    'The %s attribute must be %s' % (attr, exp)
                )

            if attr == 'IssueInstant':
                self._assertTrue(
                    bool(common.regex.UTC_STRING.search(value)),
                    'The %s attribute must be a valid UTC string' % (attr)
                )

            if attr == 'Destination':
                self._assertIsValidHttpsUrl(
                    value,
                    'The %s attribute must be a valid HTTPS url' % (attr)
                )

    def test_Status(self):
        '''Test the compliance of Status element'''
        # TODO: deal with (status_code, error_code) tuple

        e = self.doc.xpath('/LogoutResponse/Status')
        self._assertTrue(
            (len(e) == 1),
            'The Status element must be present'
        )

        e = e[0]

        elem = 'StatusCode'
        attr = 'Value'

        _e = e.xpath('./%s' % elem)
        self._assertTrue(
            (len(_e) == 1),
            'The %s element must be present' % elem
        )

        _e = _e[0]

        self._assertTrue(
            (attr in _e.attrib),
            'The %s attribute in %s element must be present' % (attr, elem)
        )

        value = _e.get(attr)

        self._assertIsNotNone(
            value,
            'The %s attribute in %s element must be present' % (attr, elem)
        )

        self._assertIn(
            value,
            common.constants.ALLOWED_STATUS_CODES,
            (('The %s attribute in %s element must be one of [%s]') %
             (attr, elem, ', '.join(common.constants.ALLOWED_STATUS_CODES)))

        )

        for elem in ['StatusMessage', 'StatusDetail']:
            _e = e.xpath('./%s' % elem)
            if len(_e) > 0:
                self._assertEqual(
                    len(_e),
                    1,
                    'Only one %s element can be present' % elem
                )

    def test_Issuer(self):
        '''Test the compliance of Issuer element'''

        e = self.doc.xpath('/LogoutResponse/Issuer')
        self._assertTrue(
            (len(e) == 1),
            'The Issuer element must be present'
        )

        e = e[0]
        attr = 'Format'

        if attr in e.attrib:
            value = e.get(attr)
            exp = 'urn:oasis:names:tc:SAML:2.0:nameid-format:entity'

            self._assertIsNotNone(
                value,
                'The %s attribute must have a value' % attr
            )

            self._assertEqual(
                value,
                exp,
                'The %s attribute must be %s' % (attr, exp)
            )

    def test_Signature(self):
        '''Test the compliance of Signature element'''

        sign = self.doc.xpath('/LogoutResponse/Signature')
        if len(sign) > 0:
            self._assertTrue((len(sign) == 1),
                             'The Signature element must be present')

            method = sign[0].xpath('./SignedInfo/SignatureMethod')
            self._assertTrue((len(method) == 1),
                             'The SignatureMethod element must be present')

            self._assertTrue(('Algorithm' in method[0].attrib),
                             'The Algorithm attribute must be present '
                             'in SignatureMethod element')

            alg = method[0].get('Algorithm')
            self._assertIn(alg, common.constants.ALLOWED_XMLDSIG_ALGS,
                           (('The signature algorithm must be one of [%s]') %
                            (', '.join(common.constants.ALLOWED_XMLDSIG_ALGS))))  # noqa

            method = sign[0].xpath('./SignedInfo/Reference/DigestMethod')
            self._assertTrue((len(method) == 1),
                             'The DigestMethod element must be present')

            self._assertTrue(('Algorithm' in method[0].attrib),
                             'The Algorithm attribute must be present '
                             'in DigestMethod element')

            alg = method[0].get('Algorithm')
            self._assertIn(alg, common.constants.ALLOWED_DGST_ALGS,
                           (('The digest algorithm must be one of [%s]') %
                            (', '.join(common.constants.ALLOWED_DGST_ALGS))))

            # save the grubbed certificate for future alanysis
            cert = sign[0].xpath('./KeyInfo/X509Data/X509Certificate')[0]
            common.dump_pem.dump_response_pem(cert, 'logout', 'signature',
                                              DATA_DIR)

    def test_xsd_and_xmldsig(self):
        '''Test if the XSD validates and if the signature is valid'''

        msg = ('The LogoutResponse must validate against XSD ' +
               'and must have a valid signature')

        cmd = ['bash',
               './script/check-response-xsd-and-signature.sh',
               'logout',
               'idp']

        is_valid = True
        try:
            p = subprocess.run(cmd, check=True, stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
            stdout = '\n'.join(
                list(
                    filter(None, p.stdout.decode('utf-8').split('\n'))
                )
            )
            print('\n' + stdout)

            stderr = '\n'.join(
                list(
                    filter(None, p.stderr.decode('utf-8').split('\n'))
                )
            )
            print('\n' + stderr)

        except subprocess.CalledProcessError as err:
            is_valid = False
            lines = [msg]

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

            msg = '\n'.join(lines)

        self._assertTrue(is_valid, msg)

# vim: ft=python
