import base64
import lxml.objectify
import os
import re
import unittest
import urllib.parse
import validators

from common import dump_pem
from common import constants
from io import BytesIO
from lxml import etree as ET

RESPONSE = os.getenv('RESPONSE', None)
DATA_DIR = os.getenv('DATA_DIR', './data')

_RE_UTC = r'^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d{3})?Z$'
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


class TestResponse(unittest.TestCase):
    longMessage = False

    def setUp(self):
        if not RESPONSE:
            self.fail('RESPONSE not set')

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
        del_ns(self.doc)

    def tearDown(self):
        pass

    def test_Response(self):
        e = self.doc.xpath('/Response')
        self.assertEqual(len(e), 1, 'only one Response element '
                                    'must be present')

        e = e[0]

        with self.subTest('ID attribute must be present'):
            a = e.get('ID')
            self.assertIsNotNone(a)

        with self.subTest('Version attribute must be set to 2.0'):
            a = e.get('Version')
            self.assertIsNotNone(a)
            self.assertEqual(a, '2.0', _found(a))

        with self.subTest('IssueInstant attribute must be '
                          'a valid UTC string'):
            regex = re.compile(_RE_UTC)
            a = e.get('IssueInstant')
            self.assertIsNotNone(a)
            self.assertTrue(bool(regex.search(a)), _found(a))

        with self.subTest('InResponseTo attribute must be present'):
            a = e.get('InResponseTo')
            self.assertIsNotNone(a)

        with self.subTest('Destination attribute must '
                          'be present and HTTPS URI'):
            a = e.get('Destination')
            self.assertIsNotNone(a)
            self.assertTrue(a.startswith('https://'), _found(a))
            self.assertTrue(validators.url(a), _found(a))

    def test_Status(self):
        # TODO: deal with (status_code, error_code) tuple

        e = self.doc.xpath('//Response/Status')
        self.assertEqual(len(e), 1, 'only one Status element must be present')

        with self.subTest('StatusCode element must be present and valid'):
            e = self.doc.xpath('//Response/Status/StatusCode')
            self.assertEqual(len(e), 1, 'only one StatusCode element must '
                                        'be present')

            a = e[0].get('Value')
            allowed_status_codes = [
                'urn:oasis:names:tc:SAML:2.0:status:AuthnFailed',
                'urn:oasis:names:tc:SAML:2.0:status:NoAuthnContext',
                'urn:oasis:names:tc:SAML:2.0:status:NoPassive',
                'urn:oasis:names:tc:SAML:2.0:status:RequestDenied',
                'urn:oasis:names:tc:SAML:2.0:status:RequestUnsupported',
                'urn:oasis:names:tc:SAML:2.0:status:Requester',
                'urn:oasis:names:tc:SAML:2.0:status:Success',
                'urn:oasis:names:tc:SAML:2.0:status:VersionMismatch',
            ]
            self.assertIn(a, allowed_status_codes, _found(a))

        with self.subTest('StatusMessage element must be valid (if present)'):
            e = self.doc.xpath('//Response/Status/StatusMessage')
            self.assertLessEqual(len(e), 1, 'only one StatusMessage element '
                                            'could be present')

        with self.subTest('StatusDetail element must be valid (if present)'):
            e = self.doc.xpath('//Response/Status/StatusDetail')
            self.assertLessEqual(len(e), 1, 'only one StatusDetail element '
                                            'could be present')

    def test_Issuer(self):
        e = self.doc.xpath('//Response/Issuer')
        self.assertEqual(len(e), 1, 'Issuer element must be present')

        e = e[0]
        with self.subTest('Format attribute must be '
                          'urn:oasis:names:tc:SAML:2.0:nameid-format:entity'):
            a = e.get('Format')
            self.assertIsNotNone(a)
            self.assertEqual(
                a,
                'urn:oasis:names:tc:SAML:2.0:nameid-format:entity',
                _found(a)
            )

    def test_Assertion(self):
        sc = self.doc.xpath('//Response/Status/StatusCode')
        v = sc[0].get('Value')

        e = self.doc.xpath('//Response/Assertion')

        if v != 'urn:oasis:names:tc:SAML:2.0:status:Success':
            self.assertEqual(len(e), 0, 'Assertion element '
                                        'must not be present')
        else:
            self.assertEqual(len(e), 1, 'Assertion element must be present')
            e = e[0]

            with self.subTest('ID attribute must be present'):
                a = e.get('ID')
                self.assertIsNotNone(a)

            with self.subTest('Version attribute must be set to 2.0'):
                a = e.get('Version')
                self.assertIsNotNone(a)
                self.assertEqual(a, '2.0', _found(a))

            with self.subTest('IssueInstant attribute must be '
                              'a valid UTC string'):
                regex = re.compile(_RE_UTC)
                a = e.get('IssueInstant')
                self.assertIsNotNone(a)
                self.assertTrue(bool(regex.search(a)), _found(a))

            with self.subTest('Subject element must be present'):
                e = self.doc.xpath('//Response/Assertion/Subject')
                self.assertEqual(len(e), 1, 'Subject element must be present')

                with self.subTest('NameID element must be present and valid'):
                    e = self.doc.xpath('//Response/Assertion/Subject/NameID')
                    self.assertEqual(len(e), 1, 'Subject element '
                                                'must be present')
                    e = e[0]

                    with self.subTest('Format attribute must be '
                                      'urn:oasis:names:tc:SAML:2.0:'
                                      'nameid-format:transient'):
                        a = e.get('Format')
                        self.assertIsNotNone(a)
                        self.assertEqual(
                            a,
                            'urn:oasis:names:tc:SAML:2.0:'
                            'nameid-format:transient',
                            _found(a)
                        )

                    with self.subTest('NameID element must be '
                                      'present and valid'):
                        a = e.get('NameQualifier')
                        self.assertIsNotNone(a)

                with self.subTest('SubjectConfirmation element must be '
                                  'present and valid'):
                    e = self.doc.xpath('//Response/Assertion/Subject'
                                       '/SubjectConfirmation')
                    self.assertEqual(len(e), 1, 'SubjectConfirmation element '
                                                'must be present')
                    e = e[0]

                    with self.subTest('Method attribute must be '
                                      'urn:oasis:names:tc:'
                                      'SAML:2.0:cm:bearer'):
                        a = e.get('Method')
                        self.assertEqual(
                            a,
                            'urn:oasis:names:tc:SAML:2.0:cm:bearer',
                            _found(a)
                        )

                with self.subTest('SubjectConfirmationData element must be '
                                  'present and valid'):
                    e = self.doc.xpath('//Response/Assertion/Subject'
                                       '/SubjectConfirmation'
                                       '/SubjectConfirmationData')
                    self.assertEqual(len(e), 1, 'SubjectConfirmation element '
                                                'must be present')
                    e = e[0]

                    with self.subTest('Recipient attribute must be present'):
                        a = e.get('Recipient')
                        self.assertIsNotNone(a)

                    with self.subTest('NotOnOrAfter attribute '
                                      'must be present'):
                        regex = re.compile(_RE_UTC)
                        a = e.get('NotOnOrAfter')
                        self.assertIsNotNone(a)
                        self.assertTrue(bool(regex.search(a)), _found(a))

                    with self.subTest('InResponseTo attribute '
                                      'must be present'):
                        a = e.get('InResponseTo')
                        self.assertIsNotNone(a)

            with self.subTest('Issuer element must be present'):
                e = self.doc.xpath('//Response/Assertion/Issuer')
                self.assertEqual(len(e), 1, 'Issuer element must be present')
                e = e[0]

                with self.subTest('Format attribute must be '
                                  'urn:oasis:names:tc:SAML:2.0:'
                                  'nameid-format:entity'):
                    a = e.get('Format')
                    self.assertEqual(
                        a,
                        'urn:oasis:names:tc:SAML:2.0:nameid-format:entity',
                        _found(a)
                    )

            with self.subTest('Conditions element must be present'):
                e = self.doc.xpath('//Response/Assertion/Conditions')
                self.assertEqual(len(e), 1, 'Conditions element '
                                            'must be present')
                e = e[0]

                with self.subTest('NotBefore attribute must be present'):
                    regex = re.compile(_RE_UTC)
                    a = e.get('NotBefore')
                    self.assertIsNotNone(a)
                    self.assertTrue(bool(regex.search(a)), _found(a))

                with self.subTest('NotOnOrAfter attribute must be present'):
                    regex = re.compile(_RE_UTC)
                    a = e.get('NotOnOrAfter')
                    self.assertIsNotNone(a)
                    self.assertTrue(bool(regex.search(a)), _found(a))

                with self.subTest('AudienceRestriction element '
                                  'must be present'):
                    e = self.doc.xpath('//Response/Assertion/Conditions'
                                       '/AudienceRestriction')
                    self.assertEqual(len(e), 1, 'AudienceRestriction element '
                                                'must be present')
                    e = e[0]

                    with self.subTest('Audience element must be present'):
                        e = self.doc.xpath('//Response/Assertion/Conditions'
                                           '/AudienceRestriction/Audience')
                        self.assertEqual(len(e), 1, 'Audience element '
                                                    'must be present')
                        e = e[0]
                        self.assertIsNotNone(e.text, _found(e.text))

            with self.subTest('AuthnStatement element must be present'):
                e = self.doc.xpath('//Response/Assertion/AuthnStatement')
                self.assertGreaterEqual(len(e), 1, 'At least one '
                                                   'AuthnStatement element '
                                                   'must be present')

                with self.subTest('AuthnContext element must be present'):
                    e = self.doc.xpath('//Response/Assertion/AuthnStatement'
                                       '/AuthnContext')
                    self.assertEqual(len(e), 1)

                    with self.subTest('AuthnContextClassRef element '
                                      'must be present'):
                        regex = re.compile(_RE_SPID_L)
                        e = self.doc.xpath('//Response/Assertion'
                                           '/AuthnStatement/AuthnContext'
                                           '/AuthnContextClassRef')
                        self.assertEqual(len(e), 1)
                        self.assertTrue(
                            bool(regex.search(e[0].text)), _found(e[0].text)
                        )

                with self.subTest('AttributeStatement element '
                                  'could be present'):
                    e = self.doc.xpath('//Response/Assertion'
                                       '/AttributeStatement')
                    self.assertLessEqual(len(e), 1)

                    if len(e) == 1:
                        attributes = self.doc.xpath('//Response/Assertion'
                                                    '/AttributeStatement'
                                                    '/Attribute')
                        for attribute in attributes:
                            with self.subTest('Attribute element '
                                              'must be valid'):
                                with self.subTest('Name attribute '
                                                  'must be valid'):
                                    a = attribute.get('Name')
                                    self.assertIn(a,
                                                  constants.SPID_ATTRIBUTES,
                                                  _found(a))

                                with self.subTest('AttributeValue element '
                                                  'must be present '
                                                  'and valid'):
                                    e = attribute.xpath('./AttributeValue')
                                    self.assertIsNotNone(e[0].text)

            with self.subTest('Signature element must be present'):
                e = self.doc.xpath('//Response/Assertion/Signature/SignedInfo'
                                   '/SignatureMethod')
                self.assertEqual(len(e), 1)
                e = e[0]

                with self.subTest('Algorithm attribute must have '
                                  'an allowed value'):
                    a = e.get('Algorithm')
                    self.assertIn(a, constants.ALLOWED_XMLDSIG_ALGS, _found(a))

                # save the grubbed certificate for future alanysis
                cert = self.doc.xpath('//Response/Assertion/Signature/'
                                      'KeyInfo/X509Data/X509Certificate')[0]
                dump_pem.dump_assertion_pem(cert, 'signature', DATA_DIR)

            with self.subTest('Advice element could be present'):
                e = self.doc.xpath('//Response/Assertion/Advice')
                self.assertLessEqual(len(e), 1)

                if len(e) == 1:
                    e = self.doc.xpath('//Response/Assertion'
                                       '/Advice/Assertion')
                    self.assertGreaterEqual(len(e), 1)

    def test_Signature(self):
        e = self.doc.xpath('//Response/Signature')
        self.assertLessEqual(len(e), 1, 'Signature element could be present')

        if len(e) == 1:
            e = e[0]
            with self.subTest('Algorithm attribute must have '
                              'an allowed value'):
                sm = e.xpath('./SignedInfo/SignatureMethod')[0]
                a = sm.get('Algorithm')
                self.assertIn(a, constants.ALLOWED_XMLDSIG_ALGS, _found(a))

            # save the grubbed certificate for future alanysis
            cert = e.xpath('./KeyInfo/X509Data/X509Certificate')[0]
            dump_pem.dump_response_pem(cert, 'signature', DATA_DIR)
