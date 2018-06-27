#!/bin/bash

_DATA_DIR=${DATA_DIR:-"./data"}

SAMLRequest=`cat ${_DATA_DIR}/SAMLRequest.b64.txt`
echo -e "\n[SAMLRequest]\n\n${SAMLRequest}"

RelayState=`cat ${_DATA_DIR}/RelayState.b64.txt`
echo -e "\n[RelayState]\n\n${RelayState}"

Signature=`cat ${_DATA_DIR}/Signature.b64.txt`
echo -e "\n[Signature]\n\n${Signature}"

SigAlg=`cat ${_DATA_DIR}/SigAlg.b64.txt`
echo -e "\n[SigAlg]\n\n${SigAlg}\n"


if [ "X${Signature}" == "X" ]; then # HTTP-POST

    # decode SAMLRequest
    req=`mktemp`
    echo -n ${SAMLRequest} | base64 -d > ${req}

    # verify against XSD
    xmllint --noout --schema ./xsd/saml-schema-protocol-2.0.xsd ${req}
    if [ $? -ne 0 ]; then
        rm ${req}
        exit 1
    fi

    # verify XML signature
    xmlsec1 \
        --verify \
        --insecure \
        --id-attr:ID urn:oasis:names:tc:SAML:2.0:protocol:AuthnRequest \
        ${req}
    if [ $? -ne 0 ]; then
        rm ${req}
        exit 1
    fi

    rm ${req}
else # HTTP-Redirect

    # decode SAMLRequest
    req=`mktemp`
    echo -n ${SAMLRequest} \
        | base64 -d \
        | python -c "import sys, zlib;\
                     sys.stdout.write(zlib.decompress(sys.stdin.buffer.read(), -15).decode('utf-8'))" \
        > ${req}

    # verify against XSD
    xmllint --noout --schema ./xsd/saml-schema-protocol-2.0.xsd ${req}
    if [ $? -ne 0 ]; then
        rm ${req}
        exit 1
    fi

    # decode XML signature
    signature=`mktemp`
    echo -n ${Signature} | base64 -d > ${signature}

    # compose signature payload
    request=`echo -n ${SAMLRequest} \
        | python -c "import sys, urllib.parse as p;\
                     sys.stdout.write(p.quote_plus(sys.stdin.read()))"`

    relay_state=`echo -n ${RelayState} \
        | python -c "import sys, urllib.parse as p;\
                     sys.stdout.write(p.quote_plus(sys.stdin.read()))"`

    sig_alg=`echo -n ${SigAlg} \
        | python -c "import sys, urllib.parse as p;\
                     sys.stdout.write(p.quote_plus(sys.stdin.read()))"`

    payload=`mktemp`
    echo -n "SAMLRequest=${request}&RelayState=${relay_state}&SigAlg=${sig_alg}" > ${payload}

    # verify the signature with all the "signing" certificates that were
    # published within the metadata
    sign_ok=0
    dgst=`echo ${SigAlg} | grep -oP 'sha(256|384|512)'`
    for cert in `find ${_DATA_DIR} -type f -name *.metadata.signing.pem | tr '\n' ' '`; do
        pubkey=`mktemp`
        openssl x509 -in ${cert} -noout -pubkey > ${pubkey}

        openssl dgst -${dgst} -verify ${pubkey} -signature ${signature} ${payload}
        if [ $? -eq 0 ]; then
            sign_ok=1
        fi
        rm ${pubkey}
    done

    if [ ${sign_ok} -ne 1 ]; then
        rm ${payload} ${signature} ${req}
        exit 1
    fi

    rm ${payload} ${signature} ${req}
fi
