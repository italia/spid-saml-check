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
import datetime

from io import BytesIO
from lxml import etree as ET

from common import constants
from common import dump_pem
import common.helpers
import common.wrap
import urllib.parse
import requests
import time

METADATA = os.getenv('SP_METADATA', None)
DATA_DIR = os.getenv('DATA_DIR', './data')

class TestSPMetadataFicep(unittest.TestCase, common.wrap.TestCaseWrap):
    longMessage = False

    @classmethod
    def tearDownClass(cls):
        fname = '%s/sp-metadata-strict-ficep.json' % DATA_DIR
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
        if self.failures:
            self.fail(common.helpers.dump_failures(self.failures))

    def test_xsd(self):
        '''Validate the SP metadata against the SAML 2.0 Medadata XSD'''

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

    def test_AttributeConsumingService(self):
        '''Test the compliance of AttributeConsumingService element(s)'''

        acss = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                              '/AttributeConsumingService[@index="99"]')

        self._assertEqual(
            len(acss),
            1,
            'Must be present an AttributeConsumingService '
             'with index = 99 - AV eIDAS n° 1'
        )

        acss = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                              '/AttributeConsumingService[@index="99"]'
                              '/ServiceName')

        self._assertTrue((len(acss) == 1) and (acss[0].text == constants.FICEP_MINIMUM_SET_SERVICENAME),
                         'Must be present an AttributeConsumingService '
                         'with index = 99 and the sub-elemenet ServiceName vith "%s" value - AV eIDAS n° 1' %constants.FICEP_MINIMUM_SET_SERVICENAME
        )

        ras = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                              '/AttributeConsumingService[@index="99"]'
                              '/RequestedAttribute')

        self._assertEqual(len(ras), len(constants.FICEP_MIN_ATTRIBUTES),
            ('The Name attribute in RequestedAttribute element must be one of [%s] ') %
                          (', '.join(constants.FICEP_MIN_ATTRIBUTES))
        )

        for ra in ras:
            self._assertIn(ra.get('Name'), constants.FICEP_MIN_ATTRIBUTES,
                           (('The Name attribute '
                             'in RequestedAttribute element '
                             'must be one of [%s]') %
                            (', '.join(constants.FICEP_MIN_ATTRIBUTES))))

        acss = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                              '/AttributeConsumingService[@index="100"]'
                              '/ServiceName')

        if (len(acss) == 1):
            self._assertEqual(acss[0].text, constants.FICEP_FULL_SET_SERVICENAME,
                'AttributeConsumingService with index = 100 must have the sub-elemenet ServiceName with "%s" value - AV eIDAS n° 1' %constants.FICEP_FULL_SET_SERVICENAME
            )

            ras = self.doc.xpath('//EntityDescriptor/SPSSODescriptor'
                                 '/AttributeConsumingService[@index="100"]'
                                 '/RequestedAttribute')

            self._assertEqual(len(ras), len(constants.FICEP_FULL_ATTRIBUTES),
                ('The Name attribute in RequestedAttribute element must be one of [%s] ') %
                              (', '.join(constants.FICEP_FULL_ATTRIBUTES)))

            for ra in ras:
                self._assertIn(ra.get('Name'), constants.FICEP_FULL_ATTRIBUTES,
                               (('The Name attribute '
                                 'in RequestedAttribute element '
                                 'must be one of [%s]') %
                                (', '.join(constants.FICEP_FULL_ATTRIBUTES))))