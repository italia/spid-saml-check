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


def dump_metadata_pem(xml_elem, use, data_dir):
    _dump_pem(xml_elem, data_dir, 'metadata', use)


def dump_request_pem(xml_elem, use, data_dir):
    _dump_pem(xml_elem, data_dir, 'request', use)


def dump_response_pem(xml_elem, use, data_dir):
    _dump_pem(xml_elem, data_dir, 'response', use)


def dump_assertion_pem(xml_elem, use, data_dir):
    _dump_pem(xml_elem, data_dir, 'assertion', use)


def dump_logout_request_pem(xml_elem, use, data_dir):
    _dump_pem(xml_elem, data_dir, 'logout-request', use)
