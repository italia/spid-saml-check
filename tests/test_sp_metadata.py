import unittest
import lxml.objectify
import validators
import requests
import sys
import OpenSSL.crypto
import base64
from lxml import etree as ET
from io import BytesIO

XSD_FILE = './xsd/saml-schema-metadata-2.0.xsd'
METADATA_FILE = './data/metadata.xml'

ATTRIBUTES = [
    'address',
    'companyName',
    'countyOfBirth',
    'dateOfBirth',
    'digitalAddress',
    'email',
    'expirationDate',
    'familyName',
    'fiscalNumber',
    'gender',
    'idCard',
    'ivaCode',
    'mobilePhone',
    'name',
    'placeOfBirth',
    'registeredOffice',
    'spidCode',
]

BINDINGS = [
    'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
    'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
]

SIGN_ALGS = [
    'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    'http://www.w3.org/2001/04/xmldsig-more#rsa-sha384',
    'http://www.w3.org/2001/04/xmldsig-more#rsa-sha512',
    'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256',
    'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha384',
    'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha512',
    'http://www.w3.org/2001/04/xmldsig-more#hmac-sha256',
    'http://www.w3.org/2001/04/xmldsig-more#hmac-sha384',
    'http://www.w3.org/2001/04/xmldsig-more#hmac-sha512',
]

def del_ns(tree):
    root = tree.getroot()
    for elem in root.getiterator():
        if not hasattr(elem.tag, 'find'):
            continue
        i = elem.tag.find('}')
        if i >= 0:
            elem.tag = elem.tag[i+1:]
    lxml.objectify.deannotate(root, cleanup_namespaces=True)


class TestSPMetadata(unittest.TestCase):
    longMessage = False

    def setUp(self):
        with open(METADATA_FILE, 'rb') as md_file:
            md = md_file.read()
            self.doc = ET.parse(BytesIO(md))
            md_file.close()

    def test_0000_validate_against_xsd(self):
        is_valid = True
        try:
            with open(XSD_FILE, 'rb') as xsd_file:
                xsd = xsd_file.read()
                schema = ET.XMLSchema(ET.parse(BytesIO(xsd)))
                xsd_file.close()
            schema.assertValid(self.doc)
        except Exception as err:
            print(err)
            is_valid = False

        self.assertTrue(is_valid)

    def test_0001_entityID(self):
        del_ns(self.doc)

        e = self.doc.xpath('//EntityDescriptor')[0]
        a = e.get('entityID')

        self.assertIsNotNone(a)

    def test_0002_KeyDescriptor_signing(self):
        del_ns(self.doc)

        kds = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                             '/KeyDescriptor[@use="signing"]')
        self.assertGreaterEqual(len(kds), 1)

        for kd in kds:
            certs = kd.xpath('./KeyInfo/X509Data/X509Certificate')
            self.assertGreaterEqual(len(certs), 1)

            for cert in certs:
                b64 = cert.text
                x509 = OpenSSL.crypto.load_certificate(
                    OpenSSL.crypto.FILETYPE_ASN1,
                    base64.b64decode(b64)
                )
                
                components = x509.get_subject().get_components()
                cn = None

                for c in components:
                    if c[0] == b'CN':
                        cn = c[1]
                        break

                self.assertFalse(x509.has_expired(), 'Certificate expired (%s)' % cn)
                self.assertIn(x509.get_signature_algorithm(), [
                    b'sha256WithRSAEncryption',
                    b'sha384WithRSAEncryption',
                    b'sha512WithRSAEncryption',
                ], 'Certificate signed with weak algorithm (%s)' % cn)
                
                pkey = x509.get_pubkey()
                self.assertGreaterEqual(pkey.bits(), 1024, 'Certificate has poor key (%s)' % cn)
                self.assertEqual(pkey.type(), OpenSSL.crypto.TYPE_RSA, 'Certificate key is not RSA (%s)' % cn)

    def test_0003_Signature(self):
        del_ns(self.doc)

        sign = self.doc.xpath('//EntityDescriptor/Signature')
        self.assertEqual(len(sign), 1)

        method = sign[0].xpath('./SignedInfo/SignatureMethod')
        self.assertEqual(len(method), 1)

        alg = method[0].get('Algorithm')
        self.assertIn(alg, SIGN_ALGS, alg)

    def test_0004_SPSSODescriptor(self):
        del_ns(self.doc)

        spsso = self.doc.xpath('//EntityDescriptor/SPSSODescriptor')
        self.assertEqual(len(spsso), 1)

        pse = spsso[0].get('protocolSupportEnumeration')
        self.assertEqual(pse, 'urn:oasis:names:tc:SAML:2.0:protocol')

        ars = spsso[0].get('AuthnRequestsSigned')
        self.assertIn(ars, ['true', '1', True, 1])

        was = spsso[0].get('WantAssertionsSigned')
        self.assertEqual(was, 'true')

    def test_0005_AssertionConsumerService(self):
        del_ns(self.doc)

        acss = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                              '/AssertionConsumerService')
        self.assertGreaterEqual(len(acss), 1)

        for acs in acss:
            self.assertGreaterEqual(int(acs.get('index')), 0)

            binding = acs.get('Binding')
            self.assertIn(acs.get('Binding'), BINDINGS, binding)

            regex = r'^https://.*'
            location = acs.get('Location')
            self.assertRegex(location, regex, location)
            self.assertTrue(validators.url(location), location)

        acs = acss[0]
        self.assertEqual(int(acs.get('index')), 0)
        self.assertEqual(acs.get('isDefault'), 'true')

    def test_0006_AttributeConsumingService(self):
        del_ns(self.doc)

        acss = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                              '/AttributeConsumingService')
        self.assertGreaterEqual(len(acss), 1)

        for acs in acss:
            self.assertGreaterEqual(int(acs.get('index')), 0)

            sn = acs.xpath('./ServiceName')
            self.assertEqual(len(sn), 1)
            self.assertIsNotNone(sn[0].text)

            ras = acs.xpath('./RequestedAttribute')
            self.assertGreaterEqual(len(ras), 1)
            for ra in ras:
                self.assertIn(ra.get('Name'), ATTRIBUTES)

    def test_0007_Organization(self):
        del_ns(self.doc)

        orgs = self.doc.xpath('//EntityDescriptor/Organization')
        self.assertGreaterEqual(len(orgs), 0)

        if len(orgs) == 1:
            org = orgs[0]
            onames = org.xpath('./OrganizationName')
            for oname in onames:
                self.assertIsNotNone(
                    oname.get('{http://www.w3.org/XML/1998/namespace}lang')
                )

            ourls = org.xpath('./OrganizationURL')
            for ourl in ourls:
                self.assertIsNotNone(
                    ourl.get('{http://www.w3.org/XML/1998/namespace}lang')
                )
                self.assertTrue(validators.url(ourl.text))
            
            odns = org.xpath('./OrganizationDisplayName')
            for odn in odns:
                self.assertIsNotNone(
                    odn.get('{http://www.w3.org/XML/1998/namespace}lang')
                )
                self.assertIsNotNone(odn.text)

    def test_0008_SingleLogoutService(self):
        del_ns(self.doc)

        slos = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                              '/SingleLogoutService')
        self.assertGreaterEqual(len(slos), 1)

        for slo in slos:
            binding = slo.get('Binding')
            self.assertIn(binding, BINDINGS, binding)

            location = slo.get('Location')
            regex = r'^https://.*'
            self.assertRegex(location, regex, location)
            self.assertTrue(validators.url(location), location)
