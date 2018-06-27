import base64
import os
import re
import unittest
import urllib.parse
import validators
import zlib

from io import BytesIO
from lxml import etree as ET

import common.constants
import common.dump_pem as dump_pem
import common.helpers
import common.regex

DATA_DIR = os.getenv('DATA_DIR', './data')
DEBUG = int(os.getenv('DEBUG', 0))
REQUEST = os.getenv('LOGOUT_REQUEST', None)


class TestLogoutRequest(unittest.TestCase):
    longMessage = False

    def _attr_expect(self, attr, found, expect):
        msg = (('%s attribute must be %s (found: %s)') %
               (attr, expect, found))
        self.assertEqual(found, expect, msg)

    def _attr_expect_not_none(self, attr, found):
        msg = (('%s attribute must be not None (found: %s)') %
               (attr, found))
        self.assertIsNotNone(found, msg)

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

        if DEBUG:
            print(xml)

        self.doc = ET.parse(BytesIO(xml))
        common.helpers.del_ns(self.doc)

    def tearDown(self):
        pass

    def test_LogoutRequest(self):
        req = self.doc.xpath('/LogoutRequest')
        self.assertEqual(len(req), 1)

        req = req[0]

        with self.subTest('ID attribute must be present'):
            a = req.get('ID')
            self.assertIsNotNone(a)

        with self.subTest('Version attribute must be present and valid'):
            a = req.get('Version')
            self.assertIsNotNone(a)
            self.assertEqual(a, '2.0', common.helpers.found(a))

        with self.subTest('IssueInstant attribute must be present and valid'):
            a = req.get('IssueInstant')
            self.assertIsNotNone(a)
            self.assertTrue(bool(common.regex.UTC_STRING.search(a)),
                            common.helpers.found(a))

        with self.subTest('Destination attribute must be present and valid'):
            a = req.get('Destination')
            self.assertIsNotNone(a)
            self.assertTrue(a.startswith('https://'), common.helpers.found(a))
            self.assertTrue(validators.url(a), common.helpers.found(a))

        with self.subTest('Issuer element must be present and valid'):
            e = req.xpath('./Issuer')
            self.assertEqual(len(e), 1)
            e = e[0]

            # NOTE: it seems to be out of SAML standard
            #
            # attr = 'Format'
            # expect = 'urn:oasis:names:tc:SAML:2.0:nameid-format:entity'
            # found = e.get(attr)
            # self._attr_expect(attr, found, expect)
            #
            # attr = 'NameQualifier'
            # found = e.get(attr)
            # self._attr_expect_not_none(attr, found)

            self.assertIsNotNone(e.text,
                                 'element %s must have a value' % e.tag)

        with self.subTest('NameID element must be present and valid'):
            e = req.xpath('./NameID')
            self.assertEqual(len(e), 1)
            e = e[0]

            attr = 'Format'
            expect = 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient'
            found = e.get(attr)
            self._attr_expect(attr, found, expect)

            # NOTE: it seems to be out of SAML standard
            #
            # attr = 'NameQualifier'
            # found = e.get(attr)
            # self._attr_expect_not_none(attr, found)

            self.assertIsNotNone(e.text,
                                 'element %s must have a value' % e.tag)

        with self.subTest('SessionIndex element must be present and valid'):
            e = req.xpath('./SessionIndex')
            self.assertEqual(len(e), 1)
            self.assertIsNotNone(e[0].text,
                                 'element %s must have a value' % e[0].tag)

    def test_Signature(self):
        if not self.IS_HTTP_REDIRECT:
            sign = self.doc.xpath('//LogoutRequest/Signature')
            self.assertEqual(len(sign), 1,
                             'Signature element must be present')
            sign = sign[0]

            sm = sign.xpath('./SignedInfo/SignatureMethod')[0]
            alg = sm.get('Algorithm')
            self.assertIn(alg, common.constants.ALLOWED_XMLDSIG_ALGS,
                          common.helpers.found(alg))

            # save the grubbed certificate for future alanysis
            cert = sign.xpath('./KeyInfo/X509Data/X509Certificate')[0]
            dump_pem.dump_logout_request_pem(cert, 'signature', DATA_DIR)
