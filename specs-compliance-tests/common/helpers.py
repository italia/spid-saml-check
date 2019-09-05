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
import lxml.objectify
import random
import subprocess


def del_ns(tree):
    root = tree.getroot()
    for elem in root.getiterator():
        if not hasattr(elem.tag, 'find'):
            continue
        i = elem.tag.find('}')
        if i >= 0:
            elem.tag = elem.tag[i+1:]
    lxml.objectify.deannotate(root, cleanup_namespaces=True)


def found(val):
    return "Found: %s" % val


def dump_failures(failures):
    who = [
        ('IF9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fCi8gSGV5LC'
         'B0aGVyZSB3YXMgYW4gZXJyb3IhIFRha2UgYSBsb29rIGluIFwKXCB0aGUgbGlzdCBi'
         'ZWxvdy4uLiAgICAgICAgICAgICAgICAgICAgICAgLwogLS0tLS0tLS0tLS0tLS0tLS'
         '0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0KICAgICAgICBcICAgXl9fXgogICAgICAg'
         'ICBcICAob28pXF9fX19fX18KICAgICAgICAgICAgKF9fKVwgICAgICAgKVwvXAogIC'
         'AgICAgICAgICAgICAgfHwtLS0tdyB8CiAgICAgICAgICAgICAgICB8fCAgICAgfHwK'),
        ('IF9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fCi8gSGV5LC'
         'B0aGVyZSB3YXMgYW4gZXJyb3IhIFRha2UgYSBsb29rIGluIFwKXCB0aGUgbGlzdCBi'
         'ZWxvdy4uLiAgICAgICAgICAgICAgICAgICAgICAgLwogLS0tLS0tLS0tLS0tLS0tLS'
         '0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0KICAgXAogICAgXAogICAgICAgIC4tLS4K'
         'ICAgICAgIHxvX28gfAogICAgICAgfDpfLyB8CiAgICAgIC8vICAgXCBcCiAgICAgKH'
         'wgICAgIHwgKQogICAgLydcXyAgIF8vYFwKICAgIFxfX18pPShfX18vCgo='),
        ('IF9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fCi8gSGV5LC'
         'B0aGVyZSB3YXMgYW4gZXJyb3IhIFRha2UgYSBsb29rIGluIFwKXCB0aGUgbGlzdCBi'
         'ZWxvdy4uLiAgICAgICAgICAgICAgICAgICAgICAgLwogLS0tLS0tLS0tLS0tLS0tLS'
         '0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0KICAgICAgICAgIFwKICAgICAgICAgICBc'
         'CiAgICAgICAgICAgIFwgICAgICAgICAgX18tLS1fXwogICAgICAgICAgICAgICAgIC'
         'AgIF8tICAgICAgIC8tLV9fX19fXwogICAgICAgICAgICAgICBfXy0tKCAvICAgICBc'
         'IClYWFhYWFhYWFhYWFx2LgogICAgICAgICAgICAgLi1YWFgoICAgTyAgIE8gIClYWF'
         'hYWFhYWFhYWFhYWFgtCiAgICAgICAgICAgIC9YWFgoICAgICAgIFUgICAgICkgICAg'
         'ICAgIFhYWFhYWFhcCiAgICAgICAgICAvWFhYWFgoICAgICAgICAgICAgICApLS1fIC'
         'BYWFhYWFhYWFhYWFwKICAgICAgICAgL1hYWFhYLyAoICAgICAgTyAgICAgKSAgIFhY'
         'WFhYWCAgIFxYWFhYWFwKICAgICAgICAgWFhYWFgvICAgLyAgICAgICAgICAgIFhYWF'
         'hYWCAgIFxfXyBcWFhYWFgKICAgICAgICAgWFhYWFhYX18vICAgICAgICAgIFhYWFhY'
         'WCAgICAgICAgIFxfXy0tLS0+CiAtLS1fX18gIFhYWF9fLyAgICAgICAgICBYWFhYWF'
         'ggICAgICBcX18gICAgICAgICAvCiAgIFwtICAtLV9fLyAgIF9fXy9cICBYWFhYWFgg'
         'ICAgICAgICAgICAvICBfX18tLS89CiAgICBcLVwgICAgX19fLyAgICBYWFhYWFggIC'
         'AgICAgICAgICAgICctLS0gWFhYWFhYCiAgICAgICBcLVwvWFhYXCBYWFhYWFggICAg'
         'ICAgICAgICAgICAgICAgICAgL1hYWFhYCiAgICAgICAgIFxYWFhYWFhYWFggICBcIC'
         'AgICAgICAgICAgICAgICAgICAvWFhYWFgvCiAgICAgICAgICBcWFhYWFhYICAgICAg'
         'PiAgICAgICAgICAgICAgICAgXy9YWFhYWC8KICAgICAgICAgICAgXFhYWFhYLS1fXy'
         '8gICAgICAgICAgICAgIF9fLS0gWFhYWC8KICAgICAgICAgICAgIC1YWFhYWFhYWC0t'
         'LS0tLS0tLS0tLS0tLSAgWFhYWFhYLQogICAgICAgICAgICAgICAgXFhYWFhYWFhYWF'
         'hYWFhYWFhYWFhYWFhYWFhYLwogICAgICAgICAgICAgICAgICAiIlZYWFhYWFhYWFhY'
         'WFhYWFhYWFhWIiIK'),
    ]
    return '\n'.join([
        '\n',
        base64.b64decode(
            who[random.randrange(0, len(who), 1)]
        ).decode('utf-8'),
        '\n',
        '\n'.join(failures),
    ])


def parse_pem(cert):
    result = []

    #
    # sigalg
    #

    cmd = ' | '.join([
        'openssl x509 -in %s -noout -text' % cert,
        'sed -e "s/^\\s\\s*//g"',
        'grep "Signature Algorithm"',
        'uniq',
        'cut -d":" -f2',
        'sed -e "s/^\\s\\s*//g"'
    ])

    try:
        p = subprocess.run(
            cmd,
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        value = p.stdout.decode('utf-8').replace('\n', '')
        result.append(value)
    except subprocess.CalledProcessError as err:
        print(err)
        return []

    #
    # klen
    #

    cmd = ' | '.join([
        'openssl x509 -in %s -noout -text' % cert,
        'sed -e "s/^\\s\\s*//g"',
        'grep "Public-Key"',
        'cut -d"(" -f2',
        'cut -d" " -f1',
    ])

    try:
        p = subprocess.run(
            cmd,
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        value = p.stdout.decode('utf-8').replace('\n', '')
        result.append(value)
    except subprocess.CalledProcessError as err:
        print(err)
        return []

    #
    # alg
    #

    cmd = ' | '.join([
        'openssl x509 -in %s -noout -text' % cert,
        'sed -e "s/^\\s\\s*//g"',
        'grep "Public Key Algorithm"',
        'cut -d":" -f2',
        'cut -d" " -f2',
    ])

    try:
        p = subprocess.run(
            cmd,
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        value = p.stdout.decode('utf-8').replace('\n', '')
        result.append(value)
    except subprocess.CalledProcessError as err:
        print(err)
        return []


    #
    # validity
    #

    cmd = ' | '.join([
        'openssl x509 -in %s -noout -enddate' % cert,
        'cut -d"=" -f2',
        'cut -b 1-20',
    ])

    try:
        p = subprocess.run(
            cmd,
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        value = p.stdout.decode('utf-8').replace('\n', '')
        result.append(value)
    except subprocess.CalledProcessError as err:
        print(err)
        return []

    return result
