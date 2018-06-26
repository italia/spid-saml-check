import os
import re
import sys
import urllib.parse


RESPONSE = os.getenv('RESPONSE', None)
DATA_DIR = os.getenv('DATA_DIR', './data')

# check if envvars are set
if not RESPONSE:
    sys.exit(1)

# parse the captured authentication response
response = None
with open(RESPONSE, 'rb') as f:
    response = f.read()
    f.close()
params = urllib.parse.parse_qs(response.decode('utf-8'))

# save the authentication response parametes/fields in separate files
for par in ['SAMLResponse', 'RelayState', 'Signature', 'SigAlg']:
    if par in params:
        content = re.sub(r'[\s]', '', params[par][0])
    else:
        content = ''

    fname = '%s/%s.response.b64.txt' % (DATA_DIR, par)
    with open(fname, 'w') as f:
        f.write(content)
        f.close()
