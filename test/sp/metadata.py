import os
import unittest
import validators

from io import BytesIO
from lxml import etree as ET

import common.helpers
from common import constants
from common import dump_pem

METADATA = os.getenv('SP_METADATA', None)
DATA_DIR = os.getenv('DATA_DIR', './data')


class TestSPMetadata(unittest.TestCase):
    longMessage = False

    def setUp(self):
        if not METADATA:
            self.fail('SP_METADATA not set')

        with open(METADATA, 'rb') as md_file:
            md = md_file.read()
            md_file.close()

        self.doc = ET.parse(BytesIO(md))
        common.helpers.del_ns(self.doc)

    def test_entityID(self):
        e = self.doc.xpath('//EntityDescriptor')[0]
        a = e.get('entityID')
        with self.subTest('entityID must be present'):
            self.assertIsNotNone(a)

    def test_KeyDescriptor_signing(self):
        with self.subTest('one or more signing KeyDescriptor must be present'):
            kds = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                                 '/KeyDescriptor[@use="signing"]')
            self.assertGreaterEqual(len(kds), 1)

        for kd in kds:
            with self.subTest('one or more signing X509 must be present'):
                certs = kd.xpath('./KeyInfo/X509Data/X509Certificate')
                self.assertGreaterEqual(len(certs), 1)

            # save the grubbed certificate for future alanysis
            for cert in certs:
                dump_pem.dump_metadata_pem(cert, 'sp', 'signing', DATA_DIR)

        kds = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                             '/KeyDescriptor[@use="encryption"]')

        for kd in kds:
            with self.subTest('one or more encryption X509 must be present'):
                certs = kd.xpath('./KeyInfo/X509Data/X509Certificate')
                self.assertGreaterEqual(len(certs), 1)

            # save the grubbed certificate for future alanysis
            for cert in certs:
                dump_pem.dump_metadata_pem(cert, 'sp', 'encryption', DATA_DIR)

    def test_Signature(self):
        with self.subTest('Signature element must be present'):
            sign = self.doc.xpath('//EntityDescriptor/Signature')
            self.assertEqual(len(sign), 1)

        with self.subTest('SignatureMethod element must be present'):
            method = sign[0].xpath('./SignedInfo/SignatureMethod')
            self.assertEqual(len(method), 1)

        with self.subTest('Algorithm attribute must be valid'):
            alg = method[0].get('Algorithm')
            self.assertIn(alg, constants.ALLOWED_XMLDSIG_ALGS,
                          common.helpers.found(alg))

        # save the grubbed certificate for future alanysis
        cert = sign[0].xpath('./KeyInfo/X509Data/X509Certificate')[0]
        dump_pem.dump_metadata_pem(cert, 'sp', 'signature', DATA_DIR)

    def test_SPSSODescriptor(self):
        with self.subTest('SPSSODescriptor element must be present'):
            spsso = self.doc.xpath('//EntityDescriptor/SPSSODescriptor')
            self.assertEqual(len(spsso), 1)

        with self.subTest('AuthnRequestsSigned attribute must be true'):
            ars = spsso[0].get('AuthnRequestsSigned')
            self.assertIn(ars, ['true', '1', True, 1],
                          common.helpers.found(ars))

    def test_AssertionConsumerService(self):
        with self.subTest('one or more AssertionConsumerService '
                          'must be present'):
            acss = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                                  '/AssertionConsumerService')
            self.assertGreaterEqual(len(acss), 1)

        for acs in acss:
            with self.subTest('index attribute must be >= 0'):
                self.assertGreaterEqual(int(acs.get('index')), 0)

            with self.subTest('Binding attribute must have an '
                              'allowed binding'):
                binding = acs.get('Binding')
                self.assertIn(acs.get('Binding'), constants.ALLOWED_BINDINGS,
                              common.helpers.found(binding))

            with self.subTest('Location attribute must be an HTTPS URL'):
                regex = r'^https://.*'
                location = acs.get('Location')
                self.assertRegex(location, regex,
                                 common.helpers.found(location))
                self.assertTrue(validators.url(location),
                                common.helpers.found(location))

        with self.subTest('only one default AssertionConsumerService '
                          'must be present'):
            acss = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                                  '/AssertionConsumerService'
                                  '[@isDefault="true"]')
            self.assertEqual(len(acss), 1)

    def test_AttributeConsumingService(self):
        with self.subTest('one or more AttributeConsumingService '
                          'elements must be present'):
            acss = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                                  '/AttributeConsumingService')
            self.assertGreaterEqual(len(acss), 1)

        for acs in acss:
            with self.subTest('index attribute must be >= 0'):
                self.assertGreaterEqual(int(acs.get('index')), 0)

            with self.subTest('ServiceName element must be present'):
                sn = acs.xpath('./ServiceName')
                self.assertEqual(len(sn), 1)
                self.assertIsNotNone(sn[0].text)

            with self.subTest('one or more RequestedAttribute elements '
                              'must be present'):
                ras = acs.xpath('./RequestedAttribute')
                self.assertGreaterEqual(len(ras), 1)
                for ra in ras:
                    with self.subTest('Name attribute must be valid'):
                        self.assertIn(
                            ra.get('Name'),
                            constants.SPID_ATTRIBUTES,
                            common.helpers.found(ra.get('Name'))
                        )

    def test_Organization(self):
        with self.subTest('Organization elemement must be present'):
            orgs = self.doc.xpath('//EntityDescriptor/Organization')
            self.assertEqual(len(orgs), 1)

        if len(orgs) == 1:
            org = orgs[0]
            onames = org.xpath('./OrganizationName')
            for oname in onames:
                with self.subTest('lang attribute must be present'):
                    self.assertIsNotNone(
                        oname.get('{http://www.w3.org/XML/1998/namespace}lang')
                    )

            ourls = org.xpath('./OrganizationURL')
            for ourl in ourls:
                with self.subTest('lang attribute must be present'):
                    self.assertIsNotNone(
                        ourl.get('{http://www.w3.org/XML/1998/namespace}lang')
                    )
                with self.subTest('OrganizationURL attribute must be '
                                  'a valid URL'):
                    self.assertTrue(
                        validators.url(ourl.text),
                        common.helpers.found(ourl.text)
                    )

            odns = org.xpath('./OrganizationDisplayName')
            for odn in odns:
                with self.subTest('lang attribute must be present'):
                    self.assertIsNotNone(
                        odn.get('{http://www.w3.org/XML/1998/namespace}lang')
                    )
                    self.assertIsNotNone(odn.text)

    def test_SingleLogoutService(self):
        with self.subTest('one or more SingleLogoutService elements '
                          'must be present'):
            slos = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                                  '/SingleLogoutService')
            self.assertGreaterEqual(len(slos), 1)

        for slo in slos:
            with self.subTest('Binding attribute must be an allowed binding'):
                binding = slo.get('Binding')
                self.assertIn(binding, constants.ALLOWED_BINDINGS,
                              common.helpers.found(binding))

            with self.subTest('Location attribute must be a valid HTTPS URL'):
                location = slo.get('Location')
                regex = r'^https://.*'
                self.assertRegex(location, regex,
                                 common.helpers.found(location))
                self.assertTrue(validators.url(location),
                                common.helpers.found(location))
