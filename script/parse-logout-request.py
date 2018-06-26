import sys
import os
import re
import urllib.parse

DATA_DIR = os.getenv('DATA_DIR', './data')
LOGOUT_REQUEST = os.getenv('LOGOUT_REQUEST', None)


def main():
    # parse logout request
    req = None
    with open(LOGOUT_REQUEST, 'rb') as f:
        req = f.read()
        f.close()
    params = urllib.parse.parse_qs(req.decode('utf-8'))

    # dump parsed parameters
    for par in ['SAMLRequest', 'RelayState', 'Signature', 'SigAlg']:
        if par in params:
            content = re.sub(r'[\s]', '', params[par][0])
        else:
            content = ''

        fname = '%s/%s.logout-request.b64.txt' % (DATA_DIR, par)
        with open(fname, 'w') as f:
            f.write(content)
            f.close()

    # TODO: in case of HTTP-Redirect
    if ('Signature' in params) and ('SigAlg' in params):
        pass


if __name__ == '__main__':
    if not LOGOUT_REQUEST:
        print('LOGOUT_REQUEST not set')
        sys.exit(1)

    main()
    sys.exit(0)
