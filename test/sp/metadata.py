import OpenSSL.crypto
import base64
import lxml.objectify
import os
import re
import unittest
import validators

from io import BytesIO
from lxml import etree as ET

METADATA = os.getenv('METADATA', None)
DATA_DIR = os.getenv('DATA_DIR', './data')

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
    'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256',
    'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha384',
    'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha512',
    'http://www.w3.org/2001/04/xmldsig-more#hmac-sha256',
    'http://www.w3.org/2001/04/xmldsig-more#hmac-sha384',
    'http://www.w3.org/2001/04/xmldsig-more#hmac-sha512',
    'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    'http://www.w3.org/2001/04/xmldsig-more#rsa-sha384',
    'http://www.w3.org/2001/04/xmldsig-more#rsa-sha512',
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
        if not METADATA:
            self.fail('METADATA not set')

        with open(METADATA, 'rb') as md_file:
            md = md_file.read()
            self.doc = ET.parse(BytesIO(md))
            md_file.close()

    def test_entityID(self):
        del_ns(self.doc)

        e = self.doc.xpath('//EntityDescriptor')[0]
        a = e.get('entityID')

        self.assertIsNotNone(a)

    def test_KeyDescriptor_signing(self):
        del_ns(self.doc)

        kds = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                             '/KeyDescriptor[@use="signing"]')
        self.assertGreaterEqual(len(kds), 1)

        for kd in kds:
            certs = kd.xpath('./KeyInfo/X509Data/X509Certificate')
            self.assertGreaterEqual(len(certs), 1)

            for cert in certs:
                b64 = re.sub(r'[\s]', '', cert.text)
                pem = []
                n = 72
                pem.append('-----BEGIN CERTIFICATE-----')
                [pem.append(b64[i:i+n]) for i in range(0, len(b64), n)]
                pem.append('-----END CERTIFICATE-----')

                x509 = OpenSSL.crypto.load_certificate(
                    OpenSSL.crypto.FILETYPE_ASN1,
                    base64.b64decode(b64)
                )

                dgst = x509.digest('sha256').decode('utf-8').replace(':', '')
                fname = '%s/%s.pem' % (DATA_DIR, dgst[0:16])

                with open(fname, 'w') as f:
                    f.write('\n'.join(pem))
                    f.close()

    def test_Signature(self):
        del_ns(self.doc)

        sign = self.doc.xpath('//EntityDescriptor/Signature')
        self.assertEqual(len(sign), 1)

        method = sign[0].xpath('./SignedInfo/SignatureMethod')
        self.assertEqual(len(method), 1)

        alg = method[0].get('Algorithm')
        self.assertIn(alg, SIGN_ALGS, alg)

        cert = sign[0].xpath('./KeyInfo/X509Data/X509Certificate')[0]

        b64 = re.sub(r'[\s]', '', cert.text)
        pem = []
        n = 72
        pem.append('-----BEGIN CERTIFICATE-----')
        [pem.append(b64[i:i+n]) for i in range(0, len(b64), n)]
        pem.append('-----END CERTIFICATE-----')

        x509 = OpenSSL.crypto.load_certificate(
            OpenSSL.crypto.FILETYPE_ASN1,
            base64.b64decode(b64)
        )

        dgst = x509.digest('sha256').decode('utf-8').replace(':', '')
        fname = '%s/%s.sign.pem' % (DATA_DIR, dgst[0:16])

        with open(fname, 'w') as f:
            f.write('\n'.join(pem))
            f.close()

    def test_SPSSODescriptor(self):
        del_ns(self.doc)

        spsso = self.doc.xpath('//EntityDescriptor/SPSSODescriptor')
        self.assertEqual(len(spsso), 1)

        pse = spsso[0].get('protocolSupportEnumeration')
        self.assertEqual(pse, 'urn:oasis:names:tc:SAML:2.0:protocol')

        ars = spsso[0].get('AuthnRequestsSigned')
        self.assertIn(ars, ['true', '1', True, 1])

        was = spsso[0].get('WantAssertionsSigned')
        self.assertEqual(was, 'true')

    def test_AssertionConsumerService(self):
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

    def test_AttributeConsumingService(self):
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

    def test_Organization(self):
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

    def test_SingleLogoutService(self):
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
