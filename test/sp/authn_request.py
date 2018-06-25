import base64
import lxml.objectify
import os
import re
import unittest
import urllib.parse
import validators
import zlib

from io import BytesIO
from lxml import etree as ET

REQUEST = os.getenv('REQUEST', None)
DATA_DIR = os.getenv('DATA_DIR', './data')

_RE_UTC = r'^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d{3})?Z$'
_RE_SPID_L23 = (r'(https:\/\/www\.spid\.gov\.it\/'
                r'|urn:oasis:names:tc:SAML:2\.0:ac:classes:)SpidL[2-3]')
_RE_SPID_L = (r'(https:\/\/www\.spid\.gov\.it\/'
              r'|urn:oasis:names:tc:SAML:2\.0:ac:classes:)SpidL[1-3]')


def del_ns(tree):
    root = tree.getroot()
    for elem in root.getiterator():
        if not hasattr(elem.tag, 'find'):
            continue
        i = elem.tag.find('}')
        if i >= 0:
            elem.tag = elem.tag[i+1:]
    lxml.objectify.deannotate(root, cleanup_namespaces=True)


def _found(val):
    return 'Found: %s' % val


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

    def test_AuthnRequest(self):
        del_ns(self.doc)

        req = self.doc.xpath('/AuthnRequest')[0]

        with self.subTest('ID attribute must be present'):
            self.assertIsNotNone(req.get('ID'))

        with self.subTest('IsPassive attribute must not be present'):
            self.assertIsNone(req.get('IsPassive'))

        with self.subTest('Version attribute must be 2.0'):
            a = req.get('Version')
            self.assertIsNotNone(a)
            self.assertEqual(a, '2.0', _found(a))

        with self.subTest('IssueInstant attribute must be UTC time'):
            regex = re.compile(_RE_UTC)
            a = req.get('IssueInstant')
            self.assertIsNotNone(a)
            self.assertTrue(bool(regex.search(a)), _found(a))

        with self.subTest('Destination attribute must be present'):
            a = req.get('Destination')
            self.assertIsNotNone(a)

        with self.subTest('ForceAuthn attribute '
                          'must be present if SpidL > 1'):
            level = req.xpath('//RequestedAuthnContext'
                              '/AuthnContextClassRef')[0].text
            a = req.get('ForceAuthn')
            regex = re.compile(_RE_SPID_L23)

            if bool(regex.search(level)):
                self.assertIsNotNone(a)
                self.assertEqual(a, 'true', _found(a))

        check_alternative = False
        with self.subTest('AssertionConsumerServiceIndex '
                          'must be present and >= 0'):
            a = req.get('AssertionConsumerServiceIndex')
            if a:
                self.assertGreaterEqual(int(a), 0, _found(a))
            else:
                check_alternative = True

        if check_alternative:
            with self.subTest('AssertionConsumerServiceURL '
                              'must be present and a valid HTTPS URL'):
                a = req.get('AssertionConsumerServiceURL')
                self.assertIsNotNone(a)
                self.assertTrue(a.startswith('https://'), _found(a))
                self.assertTrue(validators.url(a), _found(a))

                a = req.get('ProtocolBinding')
                self.assertIsNotNone(a)
                self.assertEqual(
                    a,
                    'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
                    _found(a)
                )

        with self.subTest('AttributeConsumingServiceIndex could be present'):
            a = req.get('AttributeConsumingServiceIndex')
            if a:
                self.assertGreaterEqual(int(a), 0, _found(a))

    def test_Subject(self):
        del_ns(self.doc)

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
                        _found(a)
                    )

                with self.subTest('NameQualifier attribute '
                                  'must be present and valid'):
                    a = e.get('NameQualifier')
                    self.assertIsNotNone(a)

    def test_Issuer(self):
        del_ns(self.doc)

        e = self.doc.xpath('//AuthnRequest/Issuer')
        self.assertEqual(len(e), 1, 'Issuer element must be present')

        e = e[0]

        with self.subTest('Format attribute must be present and valid'):
            a = e.get('Format')
            self.assertIsNotNone(a)
            self.assertEqual(
                a,
                'urn:oasis:names:tc:SAML:2.0:nameid-format:entity',
                _found(a)
            )

        with self.subTest('NameQualifier attribute '
                          'must be present and valid'):
            a = e.get('NameQualifier')
            self.assertIsNotNone(a)

    def test_NameIDPolicy(self):
        del_ns(self.doc)

        e = self.doc.xpath('//AuthnRequest/NameIDPolicy')
        self.assertEqual(len(e), 1, 'NameIDPolicy element must be present')

        e = e[0]

        with self.subTest('Format attribute must be present and valid'):
            a = e.get('Format')
            self.assertIsNotNone(a)
            self.assertEqual(
                a,
                'urn:oasis:names:tc:SAML:2.0:nameid-format:transient',
                _found(a)
            )

    def test_Conditions(self):
        del_ns(self.doc)

        e = self.doc.xpath('//AuthnRequest/Conditions')
        if len(e) > 0:
            e = e[0]

            regex = re.compile(_RE_UTC)

            if e.get('NotBefore'):
                with self.subTest('NotBefore must be a valid UTC date'):
                    a = e.get('NotBefore')
                    self.assertIsNotNone(a)
                    self.assertTrue(bool(regex.search(a)), _found(a))

            if e.get('NotOnOrAfter'):
                with self.subTest('NotOnOrAfter must be a valid UTC date'):
                    a = e.get('NotOnOrAfter')
                    self.assertIsNotNone(a)
                    self.assertTrue(bool(regex.search(a)), _found(a))

    def test_RequestedAuthnContext(self):
        del_ns(self.doc)

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
                _found(a)
            )

        with self.subTest('AuthnContextClassRef must be present and valid'):
            e = e.xpath('./AuthnContextClassRef')
            self.assertEqual(
                len(e),
                1,
                'AuthnContextClassRef element must be present'
            )

            level = e[0].text
            regex = re.compile(_RE_SPID_L)

            self.assertTrue(bool(regex.search(level)), _found(level))

    def test_Signature(self):
        if not self.IS_HTTP_REDIRECT:
            del_ns(self.doc)
            e = self.doc.xpath('//AuthnRequest/Signature')
            self.assertEqual(len(e), 1, 'Signature element must be present')

    def test_Scoping(self):
        del_ns(self.doc)

        e = self.doc.xpath('//AuthnRequest/Scoping')
        if len(e) > 0:
            e = e[0]

            with self.subTest('ProxyCount must be 0'):
                a = e.get('ProxyCount')
                self.assertIsNotNone(a)
                self.assertIsEqual(int(a), 0, _found(a))

    def test_RequesterID(self):
        del_ns(self.doc)

        e = self.doc.xpath('//AuthnRequest/RequesterID')
        if len(e) > 0:
            for rid in e:
                url = rid.text
                self.assertIsNotNone(url)
                self.assertTrue(url.startswith('https://'), _found(url))
                self.assertTrue(validators.url(url), _found(url))
