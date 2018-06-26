import lxml.objectify
import os
import re
import sys
import urllib.parse

from io import BytesIO
from lxml import etree as ET

sys.path.append(os.getcwd())
from common import dump_pem  # noqa

REQUEST = os.getenv('REQUEST', None)
METADATA = os.getenv('METADATA', None)

DATA_DIR = os.getenv('DATA_DIR', './data')

# check if envvars are set
if not REQUEST:
    sys.exit(1)

if not METADATA:
    sys.exit(1)

# parse the captured authentication request
request = None
with open(REQUEST, 'rb') as f:
    request = f.read()
    f.close()
params = urllib.parse.parse_qs(request.decode('utf-8'))

# save the authentication request parametes/fields in separate files
for par in ['SAMLRequest', 'RelayState', 'Signature', 'SigAlg']:
    if par in params:
        content = re.sub(r'[\s]', '', params[par][0])
    else:
        content = ''

    fname = '%s/%s.b64.txt' % (DATA_DIR, par)
    with open(fname, 'w') as f:
        f.write(content)
        f.close()

# if HTTP-Redirect extract the signing certificate(s) from the metadata
if 'SigAlg' in params:

    # load metadata file
    with open(METADATA, 'rb') as md_file:
        md = md_file.read()
        doc = ET.parse(BytesIO(md))
        md_file.close()

    # remove the namespace to simplify XPath
    root = doc.getroot()
    for elem in root.getiterator():
        if not hasattr(elem.tag, 'find'):
            continue
        i = elem.tag.find('}')
        if i >= 0:
            elem.tag = elem.tag[i+1:]
    lxml.objectify.deannotate(root, cleanup_namespaces=True)

    # save each certificate in a specific file (*.signature.pem)
    certs = doc.xpath('//SPSSODescriptor/KeyDescriptor[@use="signing"]'
                      '/KeyInfo/X509Data/X509Certificate')
    for cert in certs:
        dump_pem.dump_request_pem(cert, 'signature', DATA_DIR)
