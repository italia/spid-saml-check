import base64
import os
import re
import unittest
import urllib.parse
import validators
import zlib

import common.helpers

from common import regex
from io import BytesIO
from lxml import etree as ET

REQUEST = os.getenv('REQUEST', None)
DATA_DIR = os.getenv('DATA_DIR', './data')


class TestAuthnRequest(unittest.TestCase):
    longMessage = False

    def setUp(self):
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

        self.doc = ET.parse(BytesIO(xml))
        common.helpers.del_ns(self.doc)

    def test_AuthnRequest(self):
        req = self.doc.xpath('/AuthnRequest')[0]

        with self.subTest('ID attribute must be present'):
            self.assertIsNotNone(req.get('ID'))

        with self.subTest('IsPassive attribute must not be present'):
            self.assertIsNone(req.get('IsPassive'))

        with self.subTest('Version attribute must be 2.0'):
            a = req.get('Version')
            self.assertIsNotNone(a)
            self.assertEqual(a, '2.0', common.helpers.found(a))

        with self.subTest('IssueInstant attribute must be UTC time'):
            a = req.get('IssueInstant')
            self.assertIsNotNone(a)
            self.assertTrue(bool(regex.UTC_STRING.search(a)),
                            common.helpers.found(a))

        with self.subTest('Destination attribute must be present'):
            a = req.get('Destination')
            self.assertIsNotNone(a)

        with self.subTest('ForceAuthn attribute '
                          'must be present if SpidL > 1'):
            level = req.xpath('//RequestedAuthnContext'
                              '/AuthnContextClassRef')[0].text
            a = req.get('ForceAuthn')

            if bool(regex.SPID_LEVEL_23.search(level)):
                self.assertIsNotNone(a)
                self.assertEqual(a, 'true', common.helpers.found(a))

        check_alternative = False
        with self.subTest('AssertionConsumerServiceIndex '
                          'must be present and >= 0'):
            a = req.get('AssertionConsumerServiceIndex')
            if a:
                self.assertGreaterEqual(int(a), 0, common.helpers.found(a))
            else:
                check_alternative = True

        if check_alternative:
            with self.subTest('AssertionConsumerServiceURL '
                              'must be present and a valid HTTPS URL'):
                a = req.get('AssertionConsumerServiceURL')
                self.assertIsNotNone(a)
                self.assertTrue(a.startswith('https://'),
                                common.helpers.found(a))
                self.assertTrue(validators.url(a), common.helpers.found(a))

                a = req.get('ProtocolBinding')
                self.assertIsNotNone(a)
                self.assertEqual(
                    a,
                    'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
                    common.helpers.found(a)
                )

        with self.subTest('AttributeConsumingServiceIndex could be present'):
            a = req.get('AttributeConsumingServiceIndex')
            if a:
                self.assertGreaterEqual(int(a), 0, common.helpers.found(a))

    def test_Subject(self):
        subj = self.doc.xpath('//AuthnRequest/Subject')
        if len(subj) > 0:
            subj = subj[0]

            with self.subTest('NameID element must be present and valid'):
                e = subj.xpath('./NameID')
                self.assertGreater(len(e), 0)

                e = e[0]

                with self.subTest('Format attribute '
                                  'must be present and valid'):
                    a = e.get('Format')
                    self.assertIsNotNone(a)
                    self.assertEqual(
                        a,
                        'urn:oasis:names:tc:SAML:1.1:nameid-format'
                        ':unspecified',
                        common.helpers.found(a)
                    )

                with self.subTest('NameQualifier attribute '
                                  'must be present and valid'):
                    a = e.get('NameQualifier')
                    self.assertIsNotNone(a)

    def test_Issuer(self):
        e = self.doc.xpath('//AuthnRequest/Issuer')
        self.assertEqual(len(e), 1, 'Issuer element must be present')

        e = e[0]

        with self.subTest('Format attribute must be present and valid'):
            a = e.get('Format')
            self.assertIsNotNone(a)
            self.assertEqual(
                a,
                'urn:oasis:names:tc:SAML:2.0:nameid-format:entity',
                common.helpers.found(a)
            )

        with self.subTest('NameQualifier attribute '
                          'must be present and valid'):
            a = e.get('NameQualifier')
            self.assertIsNotNone(a)

    def test_NameIDPolicy(self):
        e = self.doc.xpath('//AuthnRequest/NameIDPolicy')
        self.assertEqual(len(e), 1, 'NameIDPolicy element must be present')

        e = e[0]

        with self.subTest('Format attribute must be present and valid'):
            a = e.get('Format')
            self.assertIsNotNone(a)
            self.assertEqual(
                a,
                'urn:oasis:names:tc:SAML:2.0:nameid-format:transient',
                common.helpers.found(a)
            )

    def test_Conditions(self):
        e = self.doc.xpath('//AuthnRequest/Conditions')
        if len(e) > 0:
            e = e[0]

            if e.get('NotBefore'):
                with self.subTest('NotBefore must be a valid UTC date'):
                    a = e.get('NotBefore')
                    self.assertIsNotNone(a)
                    self.assertTrue(bool(regex.UTC_STRING.search(a)),
                                    common.helpers.found(a))

            if e.get('NotOnOrAfter'):
                with self.subTest('NotOnOrAfter must be a valid UTC date'):
                    a = e.get('NotOnOrAfter')
                    self.assertIsNotNone(a)
                    self.assertTrue(bool(regex.UTC_STRING.search(a)),
                                    common.helpers.found(a))

    def test_RequestedAuthnContext(self):
        e = self.doc.xpath('//AuthnRequest/RequestedAuthnContext')
        self.assertEqual(
            len(e),
            1,
            'RequestedAuthnContext element must be present'
        )

        e = e[0]

        with self.subTest('Comparison must be present and valid'):
            a = e.get('Comparison')
            self.assertIsNotNone(a)
            self.assertIn(
                a,
                ['exact', 'minimum', 'better', 'maximum'],
                common.helpers.found(a)
            )

        with self.subTest('AuthnContextClassRef must be present and valid'):
            e = e.xpath('./AuthnContextClassRef')
            self.assertEqual(
                len(e),
                1,
                'AuthnContextClassRef element must be present'
            )

            level = e[0].text
            self.assertTrue(bool(regex.SPID_LEVEL_ALL.search(level)),
                            common.helpers.found(level))

    def test_Signature(self):
        if not self.IS_HTTP_REDIRECT:
            e = self.doc.xpath('//AuthnRequest/Signature')
            self.assertEqual(len(e), 1, 'Signature element must be present')

    def test_Scoping(self):
        e = self.doc.xpath('//AuthnRequest/Scoping')
        if len(e) > 0:
            e = e[0]

            with self.subTest('ProxyCount must be 0'):
                a = e.get('ProxyCount')
                self.assertIsNotNone(a)
                self.assertIsEqual(int(a), 0, common.helpers.found(a))

    def test_RequesterID(self):
        e = self.doc.xpath('//AuthnRequest/RequesterID')
        if len(e) > 0:
            for rid in e:
                url = rid.text
                self.assertIsNotNone(url)
                self.assertTrue(url.startswith('https://'),
                                common.helpers.found(url))
                self.assertTrue(validators.url(url),
                                common.helpers.found(url))
