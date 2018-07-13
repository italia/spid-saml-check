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
import re
import OpenSSL


def _dump_pem(xml_elem, data_dir, context, use):
    pem = []
    n = 78

    b64 = re.sub(r'[\s]', '', xml_elem.text)
    pem.append('-----BEGIN CERTIFICATE-----')
    [pem.append(b64[i:i+n]) for i in range(0, len(b64), n)]
    pem.append('-----END CERTIFICATE-----')

    x509 = OpenSSL.crypto.load_certificate(OpenSSL.crypto.FILETYPE_ASN1,
                                           base64.b64decode(b64))

    dgst = x509.digest('sha256').decode('utf-8').replace(':', '')
    fname = ('%s/%s.%s.%s.pem') % (data_dir, dgst[0:16], context, use)

    with open(fname, 'w') as f:
        f.write('\n'.join(pem))
        f.close()


def dump_metadata_pem(xml_elem, context, use, data_dir):
    _dump_pem(xml_elem, data_dir, '%s.metadata' % context, use)


def dump_request_pem(xml_elem, context, use, data_dir):
    _dump_pem(xml_elem, data_dir, '%s.request' % context, use)


def dump_response_pem(xml_elem, context, use, data_dir):
    _dump_pem(xml_elem, data_dir, '%s.response' % context, use)


def dump_assertion_pem(xml_elem, context, use, data_dir):
    _dump_pem(xml_elem, data_dir, '%s.assertion' % context, use)
