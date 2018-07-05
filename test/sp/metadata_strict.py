import json
import os
import subprocess
import unittest
import validators

from io import BytesIO
from lxml import etree as ET

from common import constants
from common import dump_pem
import common.helpers
import common.wrap

METADATA = os.getenv('SP_METADATA', None)
DATA_DIR = os.getenv('DATA_DIR', './data')


class TestSPMetadata(unittest.TestCase, common.wrap.TestCaseWrap):
    longMessage = False

    @classmethod
    def tearDownClass(cls):
        fname = '%s/sp-metadata-strict.json' % DATA_DIR
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
            self.fail('SP_METADATA not set')

        with open(METADATA, 'rb') as md_file:
            md = md_file.read()
            md_file.close()

        self.doc = ET.parse(BytesIO(md))
        common.helpers.del_ns(self.doc)

    def tearDown(self):
        self.assertEqual([], self.failures)

    def test_xsd_and_signature(self):
        cmd = ' '.join(['xmllint',
                        '--noout',
                        '--schema ./xsd/saml-schema-metadata-2.0.xsd',
                        METADATA])
        is_valid = True
        try:
            subprocess.run(cmd, shell=True, check=True)
        except subprocess.CalledProcessError as err:
            is_valid = False

        self._assertTrue(is_valid,
                         'the metadata must validate against the XSD')

        cmd = ' '.join(['xmlsec1',
                        '--verify',
                        '--insecure',
                        '--id-attr:ID',
                        'urn:oasis:names:tc:SAML:2.0:metadata:'
                        'EntityDescriptor',
                        METADATA])
        is_valid = True
        try:
            subprocess.run(cmd, shell=True, check=True)
        except subprocess.CalledProcessError as err:
            is_valid = False

        self._assertTrue(is_valid, 'the metadata signature must be valid')

    def test_entityID(self):
        e = self.doc.xpath('//EntityDescriptor')[0]
        a = e.get('entityID')
        self._assertIsNotNone(a, 'entityID must be present')

    def test_KeyDescriptor_signing(self):
        kds = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                             '/KeyDescriptor[@use="signing"]')
        self._assertGreaterEqual(
            len(kds),
            1,
            'at least one signing KeyDescriptor must be present')

        for kd in kds:
            certs = kd.xpath('./KeyInfo/X509Data/X509Certificate')
            self._assertGreaterEqual(
                len(certs),
                1,
                'at least one signing x509 must be present'
            )

            # save the grubbed certificate for future alanysis
            for cert in certs:
                dump_pem.dump_metadata_pem(cert, 'sp', 'signing', DATA_DIR)

        kds = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                             '/KeyDescriptor[@use="encryption"]')

        for kd in kds:
            certs = kd.xpath('./KeyInfo/X509Data/X509Certificate')
            self._assertGreaterEqual(
                len(certs),
                1,
                'if encryption KeyDescriptor, at least one encryption '
                'x509 must be present'
            )

            # save the grubbed certificate for future alanysis
            for cert in certs:
                dump_pem.dump_metadata_pem(cert, 'sp', 'encryption', DATA_DIR)

    def test_Signature(self):
        sign = self.doc.xpath('//EntityDescriptor/Signature')
        self._assertEqual(len(sign), 1,
                          'the Signature element must be present')

        method = sign[0].xpath('./SignedInfo/SignatureMethod')
        self._assertEqual(len(method), 1,
                          'the SignatureMethod element must be present')

        alg = method[0].get('Algorithm')
        self._assertIn(alg, constants.ALLOWED_XMLDSIG_ALGS,
                       'the algorithm used for the signature must be allowed')

        method = sign[0].xpath('./SignedInfo/Reference/DigestMethod')
        self._assertEqual(len(method), 1,
                          'DigestMethod element must be present')
        alg = method[0].get('Algorithm')
        self._assertIn(alg, constants.ALLOWED_DGST_ALGS,
                       'the digest algorithm used in the signature '
                       'must be allowed')

        # save the grubbed certificate for future alanysis
        cert = sign[0].xpath('./KeyInfo/X509Data/X509Certificate')[0]
        dump_pem.dump_metadata_pem(cert, 'sp', 'signature', DATA_DIR)

    def test_SPSSODescriptor(self):
        spsso = self.doc.xpath('//EntityDescriptor/SPSSODescriptor')
        self._assertEqual(len(spsso), 1,
                          'only one SPSSODescriptor element must be present')

        ars = spsso[0].get('AuthnRequestsSigned')
        self._assertEqual(ars.lower(), 'true',
                          'AuthnRequestsSigned attribute must be present '
                          'and set to true')

    def test_AssertionConsumerService(self):
        acss = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                              '/AssertionConsumerService')
        self._assertGreaterEqual(len(acss), 1,
                                 'one or more AssertionConsumerService '
                                 'must be present')

        for acs in acss:
            self._assertGreaterEqual(int(acs.get('index')), 0,
                                     'index attribute must be >= 0')

            binding = acs.get('Binding')
            self._assertIn(acs.get('Binding'), constants.ALLOWED_BINDINGS,
                           'Binding attribute must have an allowed value')

            location = acs.get('Location')
            self._assertIsValidHttpsUrl(location,
                                        'Location attribute must have a '
                                        'valid HTTPS url')

        acss = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                              '/AssertionConsumerService'
                              '[@isDefault="true"]')
        self._assertEqual(len(acss), 1,
                          'only one default AssertionConsumerService '
                          'must be present')

    def test_AttributeConsumingService(self):
        acss = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                              '/AttributeConsumingService')
        self._assertGreaterEqual(len(acss), 1,
                                 'one or more AttributeConsumingService '
                                 'must be oresent')

        for acs in acss:
            self._assertGreaterEqual(int(acs.get('index')), 0,
                                     'index attribute must be >= 0')

            sn = acs.xpath('./ServiceName')
            self._assertEqual(len(sn), 1,
                              'ServiceName elemenet must be present')
            self._assertIsNotNone(sn[0].text,
                                  'ServiceName value must be present')

            ras = acs.xpath('./RequestedAttribute')
            self._assertGreaterEqual(len(ras), 1,
                                     'one or more RequestedAttribute '
                                     'element must be present')
            for ra in ras:
                self._assertIn(ra.get('Name'), constants.SPID_ATTRIBUTES,
                               'Name attribute must have an allowed value')

    def test_Organization(self):
        orgs = self.doc.xpath('//EntityDescriptor/Organization')
        self._assertEqual(len(orgs), 1,
                          'Organization element must be present')

        if len(orgs) == 1:
            org = orgs[0]
            onames = org.xpath('./OrganizationName')
            for oname in onames:
                self._assertIsNotNone(
                    oname.get('{http://www.w3.org/XML/1998/namespace}lang'),
                    'lang attribute must be present'
                )
                self._assertIsNotNone(
                    oname.text,
                    'OrganizationName must not be empty'
                )

            ourls = org.xpath('./OrganizationURL')
            for ourl in ourls:
                self._assertIsNotNone(
                    ourl.get('{http://www.w3.org/XML/1998/namespace}lang'),
                    'lang attribute must be present'
                )
                self._assertTrue(
                    validators.url(ourl.text),
                    'OrganizationURL element must be a valid URL'
                )

            odns = org.xpath('./OrganizationDisplayName')
            for odn in odns:
                self._assertIsNotNone(
                    odn.get('{http://www.w3.org/XML/1998/namespace}lang'),
                    'lang attribute must be present'
                )
                self._assertIsNotNone(
                    odn.text,
                    'OrganizationDisplayName must not be empty'
                )

    def test_SingleLogoutService(self):
        slos = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                              '/SingleLogoutService')
        self._assertGreaterEqual(len(slos), 1,
                                 'one or more SingleLogoutService element '
                                 'must be present')

        for slo in slos:
            binding = slo.get('Binding')
            self._assertIn(binding, constants.ALLOWED_BINDINGS,
                           'Binding attribute must have an allowed value')

            location = slo.get('Location')
            self._assertIsValidHttpsUrl(location,
                                        'Location attribute must have a '
                                        'valid HTTPS url')
