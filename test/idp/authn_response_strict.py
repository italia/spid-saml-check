import base64
import json
import os
import re
import subprocess
import unittest
import urllib.parse
import validators

from io import BytesIO
from lxml import etree as ET

import common.helpers
import common.wrap
from common import dump_pem
from common import constants
from common import regex

RESPONSE = os.getenv('AUTHN_RESPONSE', None)
DATA_DIR = os.getenv('DATA_DIR', './data')


class TestResponse(unittest.TestCase, common.wrap.TestCaseWrap):
    longMessage = False

    @classmethod
    def tearDownClass(cls):
        fname = '%s/idp-authn-response-strict.json' % DATA_DIR
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
            self.fail('AUTHN_RESPONSE not set')

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

    def test_Response(self):
        '''Test the compliance of Response element'''

        e = self.doc.xpath('/Response')
        self._assertTrue(
            (len(e) == 1),
            'One Response element must be present'
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
                    bool(regex.UTC_STRING.search(value)),
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

        e = self.doc.xpath('//Response/Status')
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
            constants.ALLOWED_STATUS_CODES,
            (('The %s attribute in %s element must be one of [%s]') %
             (attr, elem, ', '.join(constants.ALLOWED_STATUS_CODES)))

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

        e = self.doc.xpath('//Response/Issuer')
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
                self.assertEqual(a, '2.0', common.helpers.found(a))

            with self.subTest('IssueInstant attribute must be '
                              'a valid UTC string'):
                a = e.get('IssueInstant')
                self.assertIsNotNone(a)
                self.assertTrue(bool(regex.UTC_STRING.search(a)),
                                common.helpers.found(a))

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
                            common.helpers.found(a)
                        )

                    # NOTE: it seems to be out of SAML standard
                    #
                    # with self.subTest('NameID element must be '
                    #                   'present and valid'):
                    #     a = e.get('NameQualifier')
                    #     self.assertIsNotNone(a)

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
                            common.helpers.found(a)
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
                        a = e.get('NotOnOrAfter')
                        self.assertIsNotNone(a)
                        self.assertTrue(bool(regex.UTC_STRING.search(a)),
                                        common.helpers.found(a))

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
                        common.helpers.found(a)
                    )

            with self.subTest('Conditions element must be present'):
                e = self.doc.xpath('//Response/Assertion/Conditions')
                self.assertEqual(len(e), 1, 'Conditions element '
                                            'must be present')
                e = e[0]

                with self.subTest('NotBefore attribute must be present'):
                    a = e.get('NotBefore')
                    self.assertIsNotNone(a)
                    self.assertTrue(bool(regex.UTC_STRING.search(a)),
                                    common.helpers.found(a))

                with self.subTest('NotOnOrAfter attribute must be present'):
                    a = e.get('NotOnOrAfter')
                    self.assertIsNotNone(a)
                    self.assertTrue(bool(regex.UTC_STRING.search(a)),
                                    common.helpers.found(a))

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
                        self.assertIsNotNone(e.text,
                                             common.helpers.found(e.text))

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
                        e = self.doc.xpath('//Response/Assertion'
                                           '/AuthnStatement/AuthnContext'
                                           '/AuthnContextClassRef')
                        self.assertEqual(len(e), 1)
                        self.assertIn(e[0].text, constants.SPID_LEVELS,
                                      common.helpers.found(e[0].text))

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
                                                  common.helpers.found(a))

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
                    self.assertIn(a, constants.ALLOWED_XMLDSIG_ALGS,
                                  common.helpers.found(a))

                # save the grubbed certificate for future alanysis
                cert = self.doc.xpath('//Response/Assertion/Signature/'
                                      'KeyInfo/X509Data/X509Certificate')[0]
                dump_pem.dump_assertion_pem(cert, 'authn', 'signature',
                                            DATA_DIR)

            with self.subTest('Advice element could be present'):
                e = self.doc.xpath('//Response/Assertion/Advice')
                self.assertLessEqual(len(e), 1)

                if len(e) == 1:
                    e = self.doc.xpath('//Response/Assertion'
                                       '/Advice/Assertion')
                    self.assertGreaterEqual(len(e), 1)

    def test_Signature(self):
        '''Test the compliance of Signature element'''

        sign = self.doc.xpath('//Response/Signature')
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
            self._assertIn(alg, constants.ALLOWED_XMLDSIG_ALGS,
                           (('The signature algorithm must be one of [%s]') %
                            (', '.join(constants.ALLOWED_XMLDSIG_ALGS))))

            method = sign[0].xpath('./SignedInfo/Reference/DigestMethod')
            self._assertTrue((len(method) == 1),
                             'The DigestMethod element must be present')

            self._assertTrue(('Algorithm' in method[0].attrib),
                             'The Algorithm attribute must be present '
                             'in DigestMethod element')

            alg = method[0].get('Algorithm')
            self._assertIn(alg, constants.ALLOWED_DGST_ALGS,
                           (('The digest algorithm must be one of [%s]') %
                            (', '.join(constants.ALLOWED_DGST_ALGS))))

            # save the grubbed certificate for future alanysis
            cert = sign[0].xpath('./KeyInfo/X509Data/X509Certificate')[0]
            dump_pem.dump_response_pem(cert, 'authn', 'signature', DATA_DIR)
