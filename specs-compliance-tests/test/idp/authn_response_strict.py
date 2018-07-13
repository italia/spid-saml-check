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

import common.helpers
import common.wrap
from common import dump_pem
from common import constants
from common import regex

DATA_DIR = os.getenv('DATA_DIR', './data')
DEBUG = int(os.getenv('DEBUG', 0))
RESPONSE = os.getenv('AUTHN_RESPONSE', None)


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
        '''Test the compliance of Assertion element'''

        sc = self.doc.xpath('//Response/Status/StatusCode')[0].get('Value')
        e = self.doc.xpath('//Response/Assertion')

        if sc != 'urn:oasis:names:tc:SAML:2.0:status:Success':
            self._assertEqual(
                len(e),
                0,
                'The Assertion element must not be present'
            )
        else:
            self._assertEqual(
                len(e),
                1,
                'One Assertion element must be present'
            )

            e = e[0]

            for attr in ['ID', 'Version', 'IssueInstant']:
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
                        'The %s attribute must be a valid UTC string' % attr
                    )
            #
            # Subject
            #

            subj = e.xpath('./Subject')
            self._assertEqual(
                len(subj),
                1,
                'One Subject attribute must be present'
            )

            subj = subj[0]
            for elem in ['NameID', 'SubjectConfirmation']:
                _e = subj.xpath('./%s' % elem)
                self._assertTrue(
                    (len(_e) == 1),
                    (('The %s element in Subject element '
                      'must be present') % elem)
                )

                _e = _e[0]

                if elem == 'NameID':
                    for attr in ['Format', 'NameQualifier']:
                        self._assertTrue(
                            (attr in _e.attrib),
                            (('The %s attribute of %s element in Subject '
                              'element must be present') %
                             (attr, elem))
                        )

                        value = _e.get(attr)

                        self._assertIsNotNone(
                            (attr in _e.attrib),
                            (('The %s attribute of %s element in Subject '
                              'element must have a value') %
                             (attr, elem))
                        )

                        if attr == 'Format':
                            exp = 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient'  # noqa
                            self._assertEqual(
                                value,
                                exp,
                                (('The %s attribute of %s element in Subject '
                                  'element must be %s') %
                                 (attr, elem, exp))
                            )

                    self._assertIsNotNone(
                        _e.text,
                        (('The %s element in Subject element '
                          'must have a value') % elem)
                    )

                if elem == 'SubjectConfirmation':
                    attr = 'Method'
                    self._assertTrue(
                        (attr in _e.attrib),
                        (('The %s attribute of %s element in Subject '
                          'element must be present') %
                         (attr, elem))
                    )

                    value = _e.get(attr)

                    self._assertIsNotNone(
                        (attr in _e.attrib),
                        (('The %s attribute of %s element in Subject '
                          'element must have a value') %
                         (attr, elem))
                    )

                    exp = 'urn:oasis:names:tc:SAML:2.0:cm:bearer'  # noqa
                    self._assertEqual(
                        value,
                        exp,
                        (('The %s attribute of %s element in Subject '
                          'element must be %s') %
                         (attr, elem, exp))
                    )

                    scd = _e.xpath('./SubjectConfirmationData')
                    self._assertTrue(
                        (len(scd) == 1),
                        'The SubjectConfirmationData element must be present'
                    )

                    scd = scd[0]

                    for attr in ['Recipient', 'NotOnOrAfter', 'InResponseTo']:
                        self._assertTrue(
                            (attr in scd.attrib),
                            (('The %s attribute in SubjectConfirmationData '
                              'must be present') % attr)
                        )

                        value = scd.get(attr)

                        self._assertIsNotNone(
                            value,
                            (('The %s attribute in SubjectConfirmationData '
                              'must have a value') % attr)
                        )

                        if attr == 'Recipient':
                            self._assertIsValidHttpsUrl(
                                value,
                                (('The %s attribute '
                                  'in SubjectConfirmationData '
                                  'must be a valid HTTPS url') % attr)
                            )

                        if attr == 'NotOnOrAfter':
                            self._assertTrue(
                                bool(regex.UTC_STRING.search(value)),
                                (('The %s attribute '
                                  'in SubjectConfirmationData '
                                  'must be a valid UTC string') % attr)
                            )

            #
            # Issuer
            #

            iss = e.xpath('./Issuer')
            self._assertTrue(
                (len(iss) == 1),
                'The Issuer element must be present'
            )

            iss = iss[0]

            self._assertTrue(
                ('Format' in iss.attrib),
                'The Format attribute in Issuer element must be present'
            )

            value = iss.get('Format')
            exp = 'urn:oasis:names:tc:SAML:2.0:nameid-format:entity'
            self._assertEqual(
                value,
                exp,
                'The Format attribute in Issuer element must be %s' % exp
            )

            #
            # Conditions
            #

            cond = e.xpath('./Conditions')
            self._assertTrue(
                (len(cond) == 1),
                'The Conditions element must be present'
            )

            cond = cond[0]

            for attr in ['NotBefore', 'NotOnOrAfter']:
                self._assertTrue(
                    (attr in cond.attrib),
                    (('The %s attribute in Conditions element '
                      'must be present') % attr)
                )

                value = cond.get(attr)

                self._assertIsNotNone(
                    value,
                    (('The %s attribute in Conditions element '
                      'must have a value') % attr)
                )

                self._assertTrue(
                    bool(regex.UTC_STRING.search(value)),
                    (('The %s attribute '
                      'in Conditions element '
                      'must be a valid UTC string') % attr)
                )

            aud_res = cond.xpath('./AudienceRestriction')
            self._assertTrue(
                (len(aud_res) == 1),
                'The AudienceRestriction element must be present'
            )

            aud_res = aud_res[0]
            audience = aud_res.xpath('./Audience')

            self._assertTrue(
                (len(audience) == 1),
                'The Audience element must be present'
            )

            audience = audience[0]
            self._assertIsNotNone(
                audience.text,
                'The Audience element must have a value'
            )

            #
            # AuthnContextClassRef
            #

            acr = e.xpath('./AuthnStatement/AuthnContext/AuthnContextClassRef')
            self._assertTrue(
                (len(acr) == 1),
                'The AuthnStatement/AuthnContext/AuthnContextClassRef '
                'element must be present'
            )

            acr = acr[0]
            self._assertIn(
                acr.text,
                constants.SPID_LEVELS,
                (('The AuthnStatement/AuthnContext/AuthnContextClassRef '
                  'must be one of [%s]') % ', '.join(constants.SPID_LEVELS))
            )

            #
            # AttributeStatement
            #

            attr_stat = e.xpath('./AttributeStatement')

            if len(attr_stat) > 0:
                self._assertTrue(
                    (len(attr_stat) == 1),
                    'Only one AttributeStatement element can be present'
                )

                attr_stat = attr_stat[0]

                attributes = attr_stat.xpath('./Attribute')
                self._assertGreaterEqual(
                    len(attributes),
                    1,
                    'These should be at least one Attribute element'
                )

                for attribute in attributes:
                    self._assertIn(
                        attribute.get('Name'),
                        constants.SPID_ATTRIBUTES,
                        (('The Name attribute in Attribute element '
                          'must be one of [%s]') %
                         (', '.join(constants.SPID_ATTRIBUTES)))
                    )

                    av = attribute.xpath('./AttributeValue')

                    self._assertTrue(
                        (len(av) == 1),
                        'One AttributeValue element must be present'
                    )

                    av = av[0]

                    self._assertIsNotNone(
                        av.text,
                        'The AttributeValue element must have a value'
                    )

            #
            # Signature
            #

            sign = e.xpath('./Signature')
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

            cert = sign[0].xpath('./KeyInfo/X509Data/X509Certificate')[0]
            dump_pem.dump_assertion_pem(cert, 'authn', 'signature', DATA_DIR)

            #
            # Advice
            #

            adv = e.xpath('./Advice')
            self._assertTrue(
                (len(adv) == 0),
                'The Advice element ,ust not be used'
            )

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

    def test_xsd_and_xmldsig(self):
        '''Test if the XSD validates and if the signature is valid'''

        msg = ('The AuthnRequest must validate against XSD ' +
               'and must have a valid signature')

        cmd = ['bash',
               './script/check-response-xsd-and-signature.sh',
               'authn',
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
