import unittest
import lxml.objectify
import requests
import ssl
import sys
import warnings
import validators
import os

from requests.adapters import HTTPAdapter
from requests.packages.urllib3.poolmanager import PoolManager

from io import BytesIO
from lxml import etree as ET

METADATA_FILE = os.getenv('METADATA', None)


def del_ns(tree):
    root = tree.getroot()
    for elem in root.getiterator():
        if not hasattr(elem.tag, 'find'):
            continue
        i = elem.tag.find('}')
        if i >= 0:
            elem.tag = elem.tag[i+1:]
    lxml.objectify.deannotate(root, cleanup_namespaces=True)


class TLSAdapter(HTTPAdapter):
    def __init__(self, ssl_version, **kwargs):
        self.ssl_version = ssl_version
        super(TLSAdapter, self).__init__(**kwargs)

    def init_poolmanager(self, connections, maxsize, block=False):
        self.poolmanager = PoolManager(
            num_pools=connections,
            maxsize=maxsize,
            block=block,
            ssl_version=self.ssl_version
        )


class TestSPMetadataExtra(unittest.TestCase):

    def setUp(self):
        if not METADATA_FILE:
            self.fail('METADATA_FILE not set')

        with open(METADATA_FILE, 'rb') as md_file:
            md = md_file.read()
            self.doc = ET.parse(BytesIO(md))
            md_file.close()

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

    def test_entityID(self):
        del_ns(self.doc)

        ed = self.doc.xpath('//EntityDescriptor')[0]
        eid = ed.get('entityID')

        self.assertTrue(eid.startswith('https://'))
        self.assertTrue(validators.url(eid))

    def test_tls1_0(self):
        del_ns(self.doc)

        name = 'AssertionConsumerService'
        with self.subTest(name=name):
            acss = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                                  '/AssertionConsumerService')
            for acs in acss:
                url = acs.get('Location')
                with self.subTest(url=url):
                    s = requests.Session()
                    s.mount('https://', TLSAdapter(ssl.PROTOCOL_TLSv1))

                    not_supported = True
                    try:
                        r = s.head(url, timeout=2)
                        not_supported = False
                    except Exception:
                        pass
                    self.assertTrue(
                        not_supported,
                        (('%s, %s available on TLS v1.0') %
                         (name, url))
                    )

        name = 'SingleLogoutService'
        with self.subTest(name=name):
            slos = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                                  '/SingleLogoutService')
            for slo in slos:
                url = slo.get('Location')
                with self.subTest(url=url):
                    s = requests.Session()
                    s.mount('https://', TLSAdapter(ssl.PROTOCOL_TLSv1))

                    not_supported = True
                    try:
                        r = s.head(url, timeout=2)
                        not_supported = False
                    except Exception:
                        pass
                    self.assertTrue(
                        not_supported,
                        (('%s, %s available on TLS v1.0') %
                         (name, url))
                    )

    def test_tls1_1(self):
        del_ns(self.doc)

        name = 'AssertionConsumerService'
        with self.subTest(name=name):
            acss = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                                  '/AssertionConsumerService')
            for acs in acss:
                url = acs.get('Location')
                with self.subTest(url=url):
                    s = requests.Session()
                    s.mount('https://', TLSAdapter(ssl.PROTOCOL_TLSv1_1))

                    not_supported = True
                    try:
                        r = s.head(url, timeout=2)
                        not_supported = False
                    except Exception:
                        pass
                    self.assertTrue(
                        not_supported,
                        (('%s, %s available on TLS v1.1') %
                         (name, url))
                    )

        name = 'SingleLogoutService'
        with self.subTest(name=name):
            slos = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                                  '/SingleLogoutService')
            for slo in slos:
                url = slo.get('Location')
                with self.subTest(url=url):
                    s = requests.Session()
                    s.mount('https://', TLSAdapter(ssl.PROTOCOL_TLSv1_1))

                    not_supported = True
                    try:
                        r = s.head(url, timeout=2)
                        not_supported = False
                    except Exception:
                        pass
                    self.assertTrue(
                        not_supported,
                        (('%s, %s available on TLS v1.1') %
                         (name, url)))

    def test_tls1_2(self):
        del_ns(self.doc)

        name = 'AssertionConsumerService'
        with self.subTest(name=name):
            acss = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                                  '/AssertionConsumerService')
            for acs in acss:
                url = acs.get('Location')
                with self.subTest(url=url):
                    s = requests.Session()
                    s.mount('https://', TLSAdapter(ssl.PROTOCOL_TLSv1_2))

                    is_supported = True
                    try:
                        r = s.head(url, timeout=2)
                    except Exception:
                        is_supported = False
                    self.assertTrue(
                        is_supported,
                        (('%s, %s not available on TLS v1.2 or invalid') %
                         (name, url))
                    )

        name = 'SingleLogoutService'
        with self.subTest(name=name):
            slos = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                                  '/SingleLogoutService')
            for slo in slos:
                url = slo.get('Location')
                with self.subTest(url=url):
                    s = requests.Session()
                    s.mount('https://', TLSAdapter(ssl.PROTOCOL_TLSv1_2))

                    not_supported = True
                    try:
                        r = s.head(url, timeout=2)
                    except Exception:
                        is_supported = False
                    self.assertTrue(
                        is_supported,
                        (('%s, %s not available on TLS v1.2 or invalid') %
                         (name, url)))
