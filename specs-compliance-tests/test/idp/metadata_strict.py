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

import json
import os
import subprocess
import unittest

from io import BytesIO
from lxml import etree as ET

import common.constants
import common.dump_pem
import common.helpers
import common.wrap

DATA_DIR = os.getenv('DATA_DIR', './data')
METADATA = os.getenv('IDP_METADATA', None)


class TestIDPMetadataStrict(unittest.TestCase, common.wrap.TestCaseWrap):
    longMessage = False

    @classmethod
    def tearDownClass(cls):
        fname = '%s/idp-metadata-strict.json' % DATA_DIR
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

        if not METADATA:
            self.fail('IDP_METADATA not set')

        with open(METADATA, 'rb') as md_file:
            md = md_file.read()
            md_file.close()

        self.doc = ET.parse(BytesIO(md))
        common.helpers.del_ns(self.doc)

    def tearDown(self):
        if self.failures:
            self.fail(common.helpers.dump_failures(self.failures))

    def test_xsd(self):
        '''Validate the IDP metadata against the SAML 2.0 Medadata XSD'''

        cmd = ' '.join(['xmllint',
                        '--noout',
                        '--schema ./xsd/saml-schema-metadata-2.0.xsd',
                        METADATA])
        is_valid = True
        msg = 'the metadata must validate against the XSD'
        try:
            subprocess.run(cmd, shell=True, check=True, stdout=subprocess.PIPE,
                           stderr=subprocess.PIPE)
        except subprocess.CalledProcessError as err:
            is_valid = False
            lines = [msg]
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
            msg = '\n'.join(lines)

        self._assertTrue(is_valid, msg)

    def test_xmldsig(self):
        '''Validate the IDP metadata signature'''

        cmd = ' '.join(['xmlsec1',
                        '--verify',
                        '--insecure',
                        '--id-attr:ID',
                        'urn:oasis:names:tc:SAML:2.0:metadata:'
                        'EntityDescriptor',
                        METADATA])
        is_valid = True
        msg = 'the metadata signature must be valid'
        try:
            subprocess.run(cmd, shell=True, check=True, stdout=subprocess.PIPE,
                           stderr=subprocess.PIPE)
        except subprocess.CalledProcessError as err:
            is_valid = False
            lines = [msg]
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
            msg = '\n'.join(lines)

        self._assertTrue(is_valid, msg)

    def test_EntityDescriptor(self):
        '''Test the compliance of EntityDescriptor element'''

        e = self.doc.xpath('/EntityDescriptor')
        self._assertTrue(
            (len(e) == 1),
            'One EntityDescriptor element must be present'
        )

        e = e[0]

        for attr in ['entityID']:
            self._assertTrue(
                (attr in e.attrib),
                'The %s attribute must be present' % attr
            )

            val = e.get(attr)

            self._assertIsNotNone(
                val,
                'The %s attribute must have a value' % attr
            )

            self._assertIsValidHttpsUrl(
                val,
                'The %s attribute must have a valid HTTPS url' % attr
            )

    def test_IDPSSODescriptor(self):
        '''Test the compliance of IDPSSODescriptor element'''

        e = self.doc.xpath('/EntityDescriptor/IDPSSODescriptor')
        self._assertTrue(
            (len(e) == 1),
            'One IDPSSODescriptor element must be present'
        )

        e = e[0]

        for attr in ['protocolSupportEnumeration', 'WantAuthnRequestsSigned']:
            self._assertTrue(
                (attr in e.attrib),
                'The %s attribute must be present' % attr
            )

            exp = ''
            val = e.get(attr)

            self._assertIsNotNone(
                val,
                'The %s attribute must have a value' % attr
            )

            if attr == 'protocolSupportEnumeration':
                exp = 'urn:oasis:names:tc:SAML:2.0:protocol'

            if attr == 'WantAuthnRequestsSigned':
                exp = 'true'

            self._assertEqual(
                val,
                exp,
                'The %s attribute must be %s' % (attr, exp)
            )

        # KeyDescriptor

        elem = 'KeyDescriptor'
        for use in ['signing', 'encryption']:
            _e = e.xpath('./%s[@use="%s"]' % (elem, use))

            if use == 'signing':
                self._assertTrue(
                    (len(_e) >= 1),
                    'At least one signing %s element must be present' % elem
                )

            for kd in _e:
                certs = kd.xpath('./KeyInfo/X509Data/X509Certificate')
                self._assertTrue(
                    (len(certs) > 0),
                    'At least one %s x509 must be present' % use
                )

                # save the grubbed certificate for future alanysis
                for cert in certs:
                    common.dump_pem.dump_metadata_pem(
                        cert,
                        'idp',
                        use,
                        DATA_DIR
                    )

        # NameIDFormat

        elem = 'NameIDFormat'
        _e = e.xpath('./%s' % elem)

        self._assertTrue(
            (len(_e) == 1),
            'One %s element must be present' % elem
        )

        _e = _e[0]

        self._assertIsNotNone(
            _e.text,
            'The %s element must have a value' % elem
        )

        exp = 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient'
        self._assertEqual(
            _e.text,
            exp,
            'The %s element must be %s' % (elem, exp)
        )

        # SingleSignOnService

        elem = 'SingleSignOnService'
        _e = e.xpath('./%s' % elem)
        self._assertTrue(
            (len(_e) >= 1),
            'At least one %s element must be present' % elem
        )

        for s in _e:
            for attr in ['Location', 'Binding']:
                self._assertTrue(
                    (attr in s.attrib),
                    'The %s attribute must be present' % attr
                )

                val = s.get(attr)

                self._assertIsNotNone(
                    val,
                    'The %s attribute must have a value' % attr
                )

                if attr == 'Location':
                    self._assertIsValidHttpsUrl(
                        val,
                        'The %s attribute must be a valid HTTPS url' % attr
                    )

                if attr == 'Binding':
                    exp = [
                        'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
                        'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
                    ]
                    self._assertIn(
                        val,
                        exp,
                        (('The %s attribute must be one of [%s]') %
                         (attr, ', '.join(exp)))
                    )

        # Attribute

        elem = 'Attribute'
        _e = e.xpath('./%s' % elem)

        for a in _e:
            for attr in ['Name']:
                self._assertTrue(
                    (attr in a.attrib),
                    (('The %s attribute in %s element must be present') %
                     (attr, elem))
                )

                val = a.get(attr)

                self._assertIsNotNone(
                    val,
                    (('The %s attribute in %s element must have a value') %
                     (attr, elem))
                )

                exp = common.constants.SPID_ATTRIBUTES
                self._assertIn(
                    val,
                    exp,
                    (('The %s attribute in %s element must be one of [%s]') %
                     (attr, elem, ', '.join(exp)))
                )

    def test_Signature(self):
        '''Test the compliance of Signature element'''

        sign = self.doc.xpath('/EntityDescriptor/Signature')
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
                        (', '.join(common.constants.ALLOWED_XMLDSIG_ALGS))))

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
        common.dump_pem.dump_metadata_pem(cert, 'idp', 'signature', DATA_DIR)

    def test_Organization(self):
        '''Test the compliance of Organization element'''

        orgs = self.doc.xpath('/EntityDescriptor/Organization')
        self._assertTrue((len(orgs) <= 1),
                         'Only one Organization element can be present')

        if len(orgs) == 1:
            org = orgs[0]
            for ename in ['OrganizationName', 'OrganizationDisplayName',
                          'OrganizationURL']:
                elements = org.xpath('./%s' % ename)
                self._assertGreater(
                    len(elements),
                    0,
                    'One or more %s elements must be present' % ename
                )

                for element in elements:
                    self._assertTrue(
                        ('{http://www.w3.org/XML/1998/namespace}lang' in element.attrib),  # noqa
                        'The lang attribute in %s element must be present' % ename  # noqa
                    )

                    self._assertIsNotNone(
                        element.text,
                        'The %s element must have a value' % ename
                    )

                    if ename == 'OrganizationURL':
                        self._assertIsValidHttpUrl(
                            element.text,
                            'The %s element must be a valid URL' % ename
                        )

# vim: ft=python
