#!/bin/bash

_DATA_DIR=${DATA_DIR:-"./data"}

SAMLResponse=`cat ${_DATA_DIR}/SAMLResponse.response.b64.txt`
echo -e "\n[SAMLResponse]\n\n${SAMLResponse}"

RelayState=`cat ${_DATA_DIR}/RelayState.response.b64.txt`
echo -e "\n[RelayState]\n\n${RelayState}"

Signature=`cat ${_DATA_DIR}/Signature.response.b64.txt`
echo -e "\n[Signature]\n\n${Signature}"

SigAlg=`cat ${_DATA_DIR}/SigAlg.response.b64.txt`
echo -e "\n[SigAlg]\n\n${SigAlg}\n"


if [ "X${Signature}" == "X" ]; then # HTTP-POST

    # decode SAMLResponse
    res=`mktemp`
    echo -n ${SAMLResponse} | base64 -d > ${res}

    # verify against XSD
    xmllint --noout --schema ./xsd/saml-schema-protocol-2.0.xsd ${res}
    if [ $? -ne 0 ]; then
        rm ${res}
        exit 1
    fi

    # verify response XML signature (outer)
    xmlsec1 \
        --verify \
        --insecure \
        --id-attr:ID urn:oasis:names:tc:SAML:2.0:protocol:Response \
        --node-name urn:oasis:names:tc:SAML:2.0:protocol:Response \
        ${res}
    if [ $? -ne 0 ]; then
        rm ${res}
        exit 1
    fi

    # verify assertion XML signature (inner)
    xmlsec1 --verify --insecure \
        --id-attr:ID urn:oasis:names:tc:SAML:2.0:assertion:Assertion \
        --node-name urn:oasis:names:tc:SAML:2.0:assertion:Assertion \
        ${res}
    if [ $? -ne 0 ]; then
        rm ${res}
        exit 1
    fi
    
    rm ${res}
fi
#else # HTTP-Redirect
#
#    # decode SAMLResponse
#    res=`mktemp`
#    echo -n ${SAMLResponse} \
#        | base64 -d \
#        | python -c "import sys, zlib;\
#                     sys.stdout.write(zlib.decompress(sys.stdin.buffer.read(), -15).decode('utf-8'))" \
#        > ${res}
#    
#    # verify against XSD
#    xmllint --noout --schema ./xsd/saml-schema-protocol-2.0.xsd ${res}
#    if [ $? -ne 0 ]; then
#        rm ${res}
#        exit 1
#    fi
#
#    # decode XML signature
#    signature=`mktemp`
#    echo -n ${Signature} | base64 -d > ${signature}
#
#    # compose signature payload
#    request=`echo -n ${SAMLResponse} \
#        | python -c "import sys, urllib.parse as p;\
#                     sys.stdout.write(p.quote_plus(sys.stdin.read()))"`
#    
#    relay_state=`echo -n ${RelayState} \
#        | python -c "import sys, urllib.parse as p;\
#                     sys.stdout.write(p.quote_plus(sys.stdin.read()))"`
#    
#    sig_alg=`echo -n ${SigAlg} \
#        | python -c "import sys, urllib.parse as p;\
#                     sys.stdout.write(p.quote_plus(sys.stdin.read()))"`
#
#    payload=`mktemp`
#    echo -n "SAMLResponse=${request}&RelayState=${relay_state}&SigAlg=${sig_alg}" > ${payload}
#
#    # verify the signature with all the "signing" certificates that were
#    # published within the metadata
#    sign_ok=0
#    for cert in `find ${_DATA_DIR} -type f -name *.signature.pem | tr '\n' ' '`; do
#        pubkey=`mktemp`
#        openssl x509 -in ${cert} -noout -pubkey > ${pubkey}
#
#        openssl dgst -verify ${pubkey} -signature ${signature} ${payload}
#        if [ $? -eq 0 ]; then
#            sign_ok=1
#        fi
#        rm ${pubkey}
#    done
#
#    if [ ${sign_ok} -ne 1 ]; then
#        rm ${payload} ${signature} ${res}
#        exit 1
#    fi
#    
#    rm ${payload} ${signature} ${res}
#fi
