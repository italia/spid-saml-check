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
import requests
import sys
import unittest
import urllib.parse
import warnings
import subprocess
import time
import datetime

from io import BytesIO
from lxml import etree as ET

import common.constants
import common.helpers
import common.wrap


METADATA = os.getenv('SP_METADATA', None)
DATA_DIR = os.getenv('DATA_DIR', './data')
SSLLABS_FORCE_NEW = int(os.getenv('SSLLABS_FORCE_NEW', 0))
SSLLABS_SKIP = int(os.getenv('SSLLABS_SKIP', 0))

API = 'https://api.ssllabs.com/api/v3/'


def ssllabs_api(path, payload={}):
    url = API + path

    try:
        response = requests.get(url, params=payload)
    except requests.exception.RequestException:
        sys.stderr.write('Request failed.')
        sys.exit(1)

    data = response.json()
    return data


def ssllabs_from_cache(host, publish='off', startNew='off', fromCache='on',
                       all='done'):
    path = 'analyze'
    payload = {
                'host': host,
                'publish': publish,
                'startNew': startNew,
                'fromCache': fromCache,
                'all': all
              }
    data = ssllabs_api(path, payload)
    return data


def ssllabs_new_scan(host, publish='off', startNew='on', all='done',
                     ignoreMismatch='on'):
    path = 'analyze'
    payload = {
                'host': host,
                'publish': publish,
                'startNew': startNew,
                'all': all,
                'ignoreMismatch': ignoreMismatch
              }
    results = ssllabs_api(path, payload)

    payload.pop('startNew')

    if 'status' in results:
        while results['status'] != 'READY' and results['status'] != 'ERROR':
            time.sleep(30)
            results = ssllabs_api(path, payload)

    return results


class TestSPMetadataExtra(unittest.TestCase, common.wrap.TestCaseWrap):
    longMessage = False

    @classmethod
    def tearDownClass(cls):
        fname = '%s/sp-metadata-extra.json' % DATA_DIR
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

        warnings.filterwarnings(
            action="ignore",
            message="unclosed",
            category=ResourceWarning
        )

    def tearDown(self):
        warnings.filterwarnings(
            action="ignore",
            message="unclosed",
            category=ResourceWarning
        )
        if self.failures:
            self.fail(common.helpers.dump_failures(self.failures))

    def test_EntityDescriptor(self):
        '''Test the compliance of EntityDescriptor element'''

        ed = self.doc.xpath('//EntityDescriptor')[0]
        eid = ed.get('entityID')
        self._assertIsValidHttpsUrl(
            eid,
            'The entityID attribute must be a valid HTTPS url'
        )

    def test_SPSSODescriptor(self):
        '''Test the compliance of SPSSODescriptor element'''

        spsso = self.doc.xpath('//EntityDescriptor/SPSSODescriptor')[0]
        for attr in ['protocolSupportEnumeration', 'WantAssertionsSigned']:
            self._assertTrue(
                (attr in spsso.attrib),
                'The %s attribute must be present' % attr
            )

            a = spsso.get(attr)
            self._assertIsNotNone(
                a,
                'The %s attribute must have a value' % attr
            )

            if attr == 'protocolSupportEnumeration':
                self._assertEqual(
                    a,
                    'urn:oasis:names:tc:SAML:2.0:protocol',
                    'The %s attribute must be '
                    'urn:oasis:names:tc:SAML:2.0:protocol' % attr
                )

            if attr == 'WantAssertionsSigned':
                self._assertEqual(
                    a.lower(),
                    'true',
                    'The %s attribute must be true' % attr
                )

    def test_AttributeConsumingService(self):
        '''Test the compliance of AttributeConsumingService element(s)'''

        acss = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                              '/AttributeConsumingService')
        for acs in acss:
            ras = acs.xpath('./RequestedAttribute')
            for ra in ras:
                a = ra.get('NameFormat')
                if a is not None:
                    self._assertIn(
                        a,
                        common.constants.ALLOWED_FORMATS,
                        (('The NameFormat attribute '
                          'in RequestedAttribute element '
                          'must be one of [%s]') %
                         (', '.join(common.constants.ALLOWED_FORMATS)))
                    )

    def test_Organization(self):
        '''Test the compliance of Organization element'''
        org = self.doc.xpath('//EntityDescriptor/Organization')[0]

        for elem in ['Name', 'URL', 'DisplayName']:
            e = org.xpath(
                './Organization%s[@xml:lang="it"]' % elem,
                namespaces={
                    'xml': 'http://www.w3.org/XML/1998/namespace',
                }
            )
            self._assertTrue(
                (len(e) == 1),
                'An IT localised Organization%s must be present' % elem
            )

    @unittest.skipIf(SSLLABS_SKIP == 1, 'x')
    def test_ssllabs(self):
        '''Test the TLS configuration of Locations URL'''

        locations = []
        acss = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                              '/AssertionConsumerService')
        for acs in acss:
            url = acs.get('Location')
            locations.append(url)

        to_check = [(urllib.parse.urlparse(location).netloc, location)
                    for location in locations]
        for t in to_check:
            if (SSLLABS_FORCE_NEW == 1):
                data = ssllabs_new_scan(t[0])
            else:
                data = ssllabs_from_cache(t[0])
                while data['status'] != 'ERROR' and data['status'] != 'READY':
                    time.sleep(30)
                    data = ssllabs_from_cache(t[0])

            self._assertIsTLSGrade(
                {'location': t[1], 'data': data,
                 'service': 'AssertionConsumerService'},
                ['A+', 'A', 'A-'],
                '%s must be reachable and have strong TLS configuration' % t[1]
            )

        locations = []
        slos = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                              '/SingleLogoutService')
        for slo in slos:
            url = slo.get('Location')
            locations.append(url)

        to_check = [(urllib.parse.urlparse(location).netloc, location)
                    for location in locations]
        for t in to_check:
            if (SSLLABS_FORCE_NEW == 1):
                data = ssllabs_new_scan(t[0])
            else:
                data = ssllabs_from_cache(t[0])
                while data['status'] != 'ERROR' and data['status'] != 'READY':
                    time.sleep(30)
                    data = ssllabs_from_cache(t[0])

            self._assertIsTLSGrade(
                {'location': t[1], 'data': data,
                 'service': 'AssertionConsumerService'},
                ['A+', 'A', 'A-'],
                '%s must be reachable and have strong TLS configuration' % t[1]
            )

    @unittest.skipIf(SSLLABS_SKIP == 1, 'x')
    def test_HTTPSVulnerabilities(self):
        '''Test Locations URL for HTTPS Vulnerabilities'''
        locations = []
        acss = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                              '/AssertionConsumerService')
        for acs in acss:
            url = acs.get('Location')
            locations.append(url)

        to_check = [(urllib.parse.urlparse(location).netloc, location)
                    for location in locations]
        for t in to_check:
            if (SSLLABS_FORCE_NEW == 1):
                data = ssllabs_new_scan(t[0])
            else:
                data = ssllabs_from_cache(t[0])
                while data['status'] != 'ERROR' and data['status'] != 'READY':
                    time.sleep(30)
                    data = ssllabs_from_cache(t[0])

            self._detectVulnerabilities(
                {'location': t[1], 'data': data,
                 'service': 'AssertionConsumerService'},
                '%s has one or more HTTPS vulnerabilities' % t[1]
            )

        locations = []
        slos = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                              '/SingleLogoutService')
        for slo in slos:
            url = slo.get('Location')
            locations.append(url)

        to_check = [(urllib.parse.urlparse(location).netloc, location)
                    for location in locations]
        for t in to_check:
            if (SSLLABS_FORCE_NEW == 1):
                data = ssllabs_new_scan(t[0])
            else:
                data = ssllabs_from_cache(t[0])
                while data['status'] != 'ERROR' and data['status'] != 'READY':
                    if data['status'] == 'IN_PROGRESS' and ('endpoints' in data) and ("eta" in data['endpoints'][0]) and (data['endpoints'][0]['eta'] > 0):
                        retry_delay = data['endpoints'][0]['eta']
                    else:
                        retry_delay = 10
                    time.sleep(retry_delay)
                    data = ssllabs_from_cache(t[0])
            self._detectVulnerabilities(
                {'location': t[1], 'data': data,
                 'service': 'SingleLogoutService'},
                '%s has one or more HTTPS vulnerabilities' % t[1]
            )

    def _test_certificates_extra(self, use):
        cmd = ['find',
               DATA_DIR,
               '-type',
               'f',
               '-name',
               '*.sp.metadata.%s.pem' % use]
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE)
        out, err = process.communicate()
        certs = out.decode('utf-8').split('\n')

        pka = ['rsaEncryption', 'id-ecPublicKey']

        for cert_path in certs:
            if cert_path:
                r = common.helpers.parse_pem(cert_path)
                self._assertTrue(
                    (datetime.datetime.strptime(r[3], "%b %d %H:%M:%S %Y") >= datetime.datetime.now() + datetime.timedelta(days = common.constants.SIX_MONTHS)),
                    (('The certificate %s should be valid for at least 6 months from now. It will expire on ' + r[3]) %
                     cert_path)
                )

                self._assertIn(
                    r[2],
                    pka,
                    (('The key type of %s certificate must be one of [%s]') %
                     (cert_path, ', '.join(pka)))
                )

                if r[2] == 'rsaEncryption':
                    exp = common.constants.DESIRED_CERTIFICATE_LENGHT

                elif r[2] == 'id-ecPublicKey':
                    exp = 256
                else:
                    pass

                self._assertTrue(
                    (int(r[1]) >= exp),
                    (('The key length of %s certificate must be >= %d. Instead it is '+ r[1]) %
                     (cert_path, exp))
                )


    def test_signature_longterm_certificates(self):
        '''Test the compliance of signature certificate(s)'''
        self._test_certificates_extra('signature')

    def test_signing_longterm_certificates(self):
        '''Test the compliance of signing certificate(s)'''
        self._test_certificates_extra('signing')

    def test_encryption_longterm_certificates(self):
        '''Test the compliance of encryption certificate(s)'''
        self._test_certificates_extra('encryption')

