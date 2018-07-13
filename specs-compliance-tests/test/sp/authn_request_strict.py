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
import common.dump_pem as dump_pem
import common.helpers
import common.regex
import common.wrap

REQUEST = os.getenv('AUTHN_REQUEST', None)
DATA_DIR = os.getenv('DATA_DIR', './data')
DEBUG = int(os.getenv('DEBUG', 0))


class TestAuthnRequest(unittest.TestCase, common.wrap.TestCaseWrap):
    longMessage = False

    @classmethod
    def tearDownClass(cls):
        fname = '%s/sp-authn-request-strict.json' % DATA_DIR
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

        if not REQUEST:
            self.fail('AUTHN_REQUEST not set')

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

        self.doc = ET.parse(BytesIO(xml))
        common.helpers.del_ns(self.doc)

    def tearDown(self):
        if self.failures:
            self.fail(common.helpers.dump_failures(self.failures))

    def test_xsd_and_xmldsig(self):
        '''Test if the XSD validates and if the signature is valid'''

        msg = ('The AuthnRequest must validate against XSD ' +
               'and must have a valid signature')

        cmd = ['bash',
               './script/check-request-xsd-and-signature.sh',
               'authn',
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

    def test_AuthnRequest(self):
        '''Test the compliance of AuthnRequest element'''
        req = self.doc.xpath('/AuthnRequest')
        self._assertTrue(
            (len(req) == 1),
            'One AuthnRequest element must be present'
        )

        req = req[0]

        for attr in ['ID', 'Version', 'IssueInstant', 'Destination']:
            self._assertTrue(
                (attr in req.attrib),
                'The %s attribute must be present' % attr
            )

            value = req.get(attr)
            if (attr == 'ID'):
                self._assertIsNotNone(
                    value,
                    'The %s attribute must have a value' % attr
                )

            if (attr == 'Version'):
                exp = '2.0'
                self._assertEqual(
                    value,
                    exp,
                    'The %s attribute must be %s' % (attr, exp)
                )

            if (attr == 'IssueInstant'):
                self._assertIsNotNone(
                    value,
                    'The %s attribute must have a value' % attr
                )
                self._assertTrue(
                    bool(common.regex.UTC_STRING.search(value)),
                    'The %s attribute must be a valid UTC string' % attr
                )

            if (attr == 'Destination'):
                self._assertIsNotNone(
                    value,
                    'The %s attribute must have a value' % attr
                )
                self._assertIsValidHttpsUrl(
                    value,
                    'The %s attribute must be a valid HTTPS url' % attr
                )

        self._assertTrue(
            ('IsPassive' not in req.attrib),
            'The IsPassive attribute must not be present'
        )

        level = req.xpath('//RequestedAuthnContext'
                          '/AuthnContextClassRef')[0].text
        if bool(common.regex.SPID_LEVEL_23.search(level)):
            self._assertTrue(
                ('ForceAuthn' in req.attrib),
                'The ForceAuthn attribute must be present if SPID level > 1'
            )
            value = req.get('ForceAuthn')
            self._assertEqual(
                value.lower(),
                'true',
                'The ForceAuthn attribute must be true'
            )

        attr = 'AssertionConsumerServiceIndex'
        if attr in req.attrib:
            value = req.get(attr)
            self._assertIsNotNone(
                value,
                'The %s attribute must have a value' % attr
            )
            self._assertGreaterEqual(
                int(value),
                0,
                'The %s attribute must be >= 0' % attr
            )
        else:
            for attr in ['AssertionConsumerServiceURL', 'ProtocolBinding']:
                self._assertTrue(
                    (attr in req.attrib),
                    'The %s attribute must be present' % attr
                )

                value = req.get(attr)

                self._assertIsNotNone(
                    value,
                    'The %s attribute must have a value' % attr
                )

                if attr == 'AssertionConsumerServiceURL':
                    self._assertIsValidHttpsUrl(
                        value,
                        'The %s attribute must be a valid HTTPS url' % attr
                    )

                if attr == 'ProtocolBinding':
                    exp = 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST'
                    self._assertEqual(
                        value,
                        exp,
                        'The %s attribute must be %s' % (attr, exp)
                    )

        attr = 'AttributeConsumingServiceIndex'
        if attr in req.attrib:
            value = req.get(attr)
            self._assertIsNotNone(
                value,
                'The %s attribute must have a value' % attr
            )
            self._assertGreaterEqual(
                int(value),
                0,
                'The %s attribute must be >= 0' % attr
            )

    def test_Subject(self):
        '''Test the compliance of Subject element'''

        subj = self.doc.xpath('//AuthnRequest/Subject')
        if len(subj) > 1:
            self._assertEqual(
                len(subj),
                1,
                'Only one Subject element can be present'
            )

        if len(subj) == 1:
            subj = subj[0]
            name_id = subj.xpath('./NameID')
            self._assertEqual(
                len(name_id),
                1,
                'One NameID element in Subject element must be present'
            )
            name_id = name_id[0]
            for attr in ['Format', 'NameQualifier']:
                self._assertTrue(
                    (attr in name_id.attrib),
                    'The %s attribute must be present' % attr
                )

                value = name_id.get(attr)

                self._assertIsNotNone(
                    value,
                    'The %s attribute must have a value' % attr
                )

                if attr == 'Format':
                    exp = ('urn:oasis:names:tc:SAML:1.1:nameid-format'
                           ':unspecified')
                    self._assertEqual(
                        value,
                        exp,
                        'The % attribute must be %s' % (attr, exp)
                    )

    def test_Issuer(self):
        '''Test the compliance of Issuer element'''

        e = self.doc.xpath('//AuthnRequest/Issuer')
        self._assertTrue(
            (len(e) == 1),
            'One Issuer element must be present'
        )

        e = e[0]

        self._assertIsNotNone(
            e.text,
            'The Issuer element must have a value'
        )

        for attr in ['Format', 'NameQualifier']:
            self._assertTrue(
                (attr in e.attrib),
                'The %s attribute must be present' % attr
            )

            value = e.get(attr)

            self._assertIsNotNone(
                value,
                'The %s attribute must have a value' % attr
            )

            if attr == 'Format':
                exp = 'urn:oasis:names:tc:SAML:2.0:nameid-format:entity'
                self._assertEqual(
                    value,
                    exp,
                    'The %s attribute must be %s' % (attr, exp)
                )

    def test_NameIDPolicy(self):
        '''Test the compliance of NameIDPolicy element'''

        e = self.doc.xpath('//AuthnRequest/NameIDPolicy')
        self._assertTrue(
            (len(e) == 1),
            'One Issuer element must be present'
        )

        e = e[0]

        self._assertTrue(
            ('AllowCreate' not in e.attrib),
            'The AllowCreate attribute must not be present'
        )

        attr = 'Format'
        self._assertTrue(
            (attr in e.attrib),
            'The %s attribute must be present' % attr
        )

        value = e.get(attr)

        self._assertIsNotNone(
            value,
            'The %s attribute must have a value' % attr
        )

        if attr == 'Format':
            exp = 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient'
            self._assertEqual(
                value,
                exp,
                'The %s attribute must be %s' % (attr, exp)
            )

    def test_Conditions(self):
        '''Test the compliance of Conditions element'''
        e = self.doc.xpath('//AuthnRequest/Conditions')

        if len(e) > 1:
            self._assertEqual(
                len(1),
                1,
                'Only one Conditions element is allowed'
            )

        if len(e) == 1:
            e = e[0]
            for attr in ['NotBefore', 'NotOnOrAfter']:
                self._assertTrue(
                    (attr in e.attrib),
                    'The %s attribute must be present' % attr
                )

                value = e.get(attr)

                self._assertIsNotNone(
                    value,
                    'The %s attribute must have a value' % attr
                )

                self._assertTrue(
                    bool(common.regex.UTC_STRING.search(value)),
                    'The %s attribute must have avalid UTC string' % attr
                )

    def test_RequestedAuthnContext(self):
        '''Test the compliance of RequestedAuthnContext element'''

        e = self.doc.xpath('//AuthnRequest/RequestedAuthnContext')
        self._assertEqual(
            len(e),
            1,
            'Only one RequestedAuthnContex element must be present'
        )

        e = e[0]

        attr = 'Comparison'
        self._assertTrue(
            (attr in e.attrib),
            'The %s attribute must be present' % attr
        )

        value = e.get(attr)
        self._assertIsNotNone(
            value,
            'The %s attribute must have a value' % attr
        )

        allowed = ['exact', 'minimum', 'better', 'maximum']
        self._assertIn(
            value,
            allowed,
            (('The %s attribute must be one of [%s]') %
             (attr, ', '.join(allowed)))
        )

        acr = e.xpath('./AuthnContextClassRef')
        self._assertEqual(
            len(acr),
            1,
            'Only one AuthnContexClassRef element must be present'
        )

        acr = acr[0]

        self._assertIsNotNone(
            acr.text,
            'The AuthnContexClassRef element must have a value'
        )

        self._assertTrue(
            bool(common.regex.SPID_LEVEL_ALL.search(acr.text)),
            'The AuthnContextClassRef element must have a valid SPID level'
        )

    def test_Signature(self):
        '''Test the compliance of Signature element'''

        if not self.IS_HTTP_REDIRECT:
            sign = self.doc.xpath('//AuthnRequest/Signature')
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
            dump_pem.dump_request_pem(cert, 'authn', 'signature', DATA_DIR)

    def test_Scoping(self):
        '''Test the compliance of Scoping element'''

        e = self.doc.xpath('//AuthnRequest/Scoping')
        self._assertEqual(
            len(e),
            0,
            'The Scoping element must not be present'
        )

    def test_RequesterID(self):
        '''Test the compliance of RequesterID element'''

        e = self.doc.xpath('//AuthnRequest/RequesterID')
        self._assertEqual(
            len(e),
            0,
            'The RequesterID  element must not be present'
        )
