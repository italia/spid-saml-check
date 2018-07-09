import base64
import json
import os
import re
import unittest
import urllib.parse
import validators
import zlib

from io import BytesIO
from lxml import etree as ET

import common.helpers
import common.regex
import common.wrap

REQUEST = os.getenv('AUTHN_REQUEST', None)
DATA_DIR = os.getenv('DATA_DIR', './data')


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

    def test_xsd(self):
        '''Validate the SP metadata against the SAML 2.0 Medadata XSD'''
        pass

    def test_xmldsig(self):
        '''Verify the SP metadata signature'''
        pass

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
                    self.assertTrue(bool(common.regex.UTC_STRING.search(a)),
                                    common.helpers.found(a))

            if e.get('NotOnOrAfter'):
                with self.subTest('NotOnOrAfter must be a valid UTC date'):
                    a = e.get('NotOnOrAfter')
                    self.assertIsNotNone(a)
                    self.assertTrue(bool(common.regex.UTC_STRING.search(a)),
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
            self.assertTrue(bool(common.regex.SPID_LEVEL_ALL.search(level)),
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
