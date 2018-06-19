import lxml.objectify
import validators
import requests
import sys
from lxml import etree as ET
from io import BytesIO


METADATA_FILE = './data/metadata.xml'


def _w(msg):
    sys.stderr.write('[WARN] %s\n' % msg)



def test_entity_id(doc):
    ed = doc.xpath('//EntityDescriptor')[0]
    eid = ed.get('entityID')

    if validators.url(eid):
        if not eid.startswith('https://'):
            _w('entityID should be an HTTPS URI (%s)' % eid)
    else:
        _w('entityID should be an HTTPS URI (%s)' % eid)


def test_locations(doc):
    acss = doc.xpath('//EntityDescriptor/SPSSODescriptor/AssertionConsumerService')
    for acs in acss:
        url = acs.get('Location')
        try:
            r = requests.head(url, timeout=2)
            if (r.status_code / 100 >= 4):
                _w("AssertionConsumerService Location (%d, %s)" % (r.status_code, url))
        except:
            _w("AssertionConsumerService Location (timeout, %s)" % (url))

    slos = doc.xpath('//EntityDescriptor/SPSSODescriptor/SingleLogoutService')
    for slo in slos:
        url = slo.get('Location')
        is_timeout = False
        try:
            r = requests.head(url, timeout=2)
            if (r.status_code / 100 >= 4):
                _w("SingleLogoutService Location (%d, %s)" % (r.status_code, url))
        except:
            _w("SingleLogoutService Location (timeout, %s)" % (url))


if __name__ == '__main__':
    with open(METADATA_FILE, 'rb') as md_file:
        md = md_file.read()
        doc = ET.parse(BytesIO(md))
        md_file.close()


    root = doc.getroot()
    for elem in root.getiterator():
        if not hasattr(elem.tag, 'find'):
            continue
        i = elem.tag.find('}')
        if i >= 0:
            elem.tag = elem.tag[i+1:]
    lxml.objectify.deannotate(root, cleanup_namespaces=True)

    test_entity_id(doc)
    test_locations(doc)



