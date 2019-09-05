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
import zlib

from io import BytesIO
from lxml import etree as ET

import common.constants
import common.dump_pem
import common.helpers
import common.regex
import common.wrap

DATA_DIR = os.getenv('DATA_DIR', './data')
DEBUG = int(os.getenv('DEBUG', 0))
REQUEST = os.getenv('LOGOUT_REQUEST', None)


class TestLogoutRequest(unittest.TestCase, common.wrap.TestCaseWrap):
    longMessage = False

    @classmethod
    def tearDownClass(cls):
        fname = '%s/sp-logout-request-strict.json' % DATA_DIR
        with open(fname, 'w') as f:
            f.write(json.dumps(cls.report, indent=2))
            f.close()

    def _attr_expect(self, attr, found, expect):
        msg = (('%s attribute must be %s (found: %s)') %
               (attr, expect, found))
        self.assertEqual(found, expect, msg)

    def _attr_expect_not_none(self, attr, found):
        msg = (('%s attribute must be not None (found: %s)') %
               (attr, found))
        self.assertIsNotNone(found, msg)

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

        if not REQUEST:
            self.fail('REQUEST not set')

        req = None
        with open(REQUEST, 'rb') as f:
            req = f.read()
            f.close()

        self.params = urllib.parse.parse_qs(
            re.sub(r'[\s]', '', req.decode('utf-8'))
        )

        self.IS_HTTP_REDIRECT = False
        if 'Signature' in self.params and 'SigAlg' in self.params:
            self.IS_HTTP_REDIRECT = True

        if 'RelayState' not in self.params:
            self.fail('RelayState is missing')

        if 'SAMLRequest' not in self.params:
            self.fail('SAMLRequest is missing')

        if self.IS_HTTP_REDIRECT:
            xml = zlib.decompress(
                base64.b64decode(self.params['SAMLRequest'][0]),
                -15
            )
        else:
            xml = base64.b64decode(self.params['SAMLRequest'][0])

        if DEBUG:
            print(xml)

        self.doc = ET.parse(BytesIO(xml))
        common.helpers.del_ns(self.doc)

    def tearDown(self):
        if self.failures:
            self.fail(common.helpers.dump_failures(self.failures))

    def test_LogoutRequest(self):
        '''Test the compliance of LogoutRequest element'''

        e = self.doc.xpath('/LogoutRequest')
        self._assertTrue(
            (len(e) == 1),
            'One LogoutRequest element must be present'
        )

        e = e[0]

        for attr in ['ID', 'Version', 'IssueInstant', 'Destination']:
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
                    'The %s attribute must be a valid UTC string' % attr
                )

            if attr == 'Destination':
                self._assertIsValidHttpsUrl(
                    value,
                    'The %s attribute must be a valid HTTPS url' % attr
                )

        for elem in ['Issuer', 'NameID', 'SessionIndex']:
            _e = e.xpath('./%s' % elem)
            self._assertTrue(
                (len(_e) == 1),
                'The %s element must be present' % elem
            )

            _e = _e[0]

            self._assertIsNotNone(
                _e.text,
                'The %s element must have a value' % elem
            )

            if elem != 'SessionIndex':
                for attr in ['Format', 'NameQualifier']:
                    self._assertTrue(
                        (attr in _e.attrib),
                        (('The %s attribute in %s element must be present') %
                         (attr, elem))
                    )

                    value = _e.get(attr)

                    self._assertIsNotNone(
                        value,
                        (('The %s attribute in '
                          '%s element must have a value') %
                         (attr, elem))
                    )

                    if (elem == 'logoutRequest') and (attr == 'Format'):
                        exp = 'urn:oasis:names:tc:SAML:2.0:nameid-format:entity'  # noqa
                        self._assertEqual(
                            value,
                            exp,
                            (('The %s attribute in %s element must be %s') %
                             (attr, elem, exp))
                        )

                    if (elem == 'NameID') and (attr == 'Format'):
                        exp = 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient'  # noqa
                        self._assertEqual(
                            value,
                            exp,
                            (('The %s attribute in %s element must be %s') %
                             (attr, elem, exp))
                        )

    def test_Signature(self):
        '''Test the compliance of Signature element'''

        if not self.IS_HTTP_REDIRECT:
            sign = self.doc.xpath('//LogoutRequest/Signature')
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
            common.dump_pem.dump_request_pem(cert, 'logout', 'signature', DATA_DIR)  # noqa

    def test_xsd_and_xmldsig(self):
        '''Test if the XSD validates and if the signature is valid'''

        msg = ('The LogoutRequest must validate against XSD ' +
               'and must have a valid signature')

        cmd = ['bash',
               './script/check-request-xsd-and-signature.sh',
               'logout',
               'sp']

        is_valid = True
        try:
            p = subprocess.run(cmd, check=True, stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
            if DEBUG:
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
