#!/bin/bash

_DATA_DIR=${DATA_DIR:-"./data"}
_DEBUG=${DEBUG:-0}

CTX=${1}
FROM=${2}

SAMLResponse=`cat ${_DATA_DIR}/SAMLResponse.${CTX}.response.txt`
if [ ${_DEBUG} -eq 1 ]; then
    echo -e "\n[SAMLResponse]\n\n${SAMLResponse}"
fi

RelayState=`cat ${_DATA_DIR}/RelayState.${CTX}.response.txt`
if [ ${_DEBUG} -eq 1 ]; then
    echo -e "\n[RelayState]\n\n${RelayState}"
fi

Signature=`cat ${_DATA_DIR}/Signature.${CTX}.response.txt`
if [ ${_DEBUG} -eq 1 ]; then
    echo -e "\n[Signature]\n\n${Signature}"
fi

SigAlg=`cat ${_DATA_DIR}/SigAlg.${CTX}.response.txt`
if [ ${_DEBUG} -eq 1 ]; then
    echo -e "\n[SigAlg]\n\n${SigAlg}\n"
fi

if [ "X${Signature}" == "X" -a "X${SigAlg}" == "X" ]; then # HTTP-POST

    # decode SAMLResponse
    res=`mktemp`
    echo -n ${SAMLResponse} | base64 -d > ${res}
    
    if [ ${_DEBUG} -eq 1 ]; then
        echo -e "\n[SAMLResponse]\n\n`xmllint --format ${res}`"
    fi

    # verify against XSD
    xmllint --noout --schema ./xsd/saml-schema-protocol-2.0.xsd ${res}
    if [ $? -ne 0 ]; then
        rm ${res}
        exit 1
    fi

    # verify response XML signature (outer)
    if [ "${CTX}" == "authn" ]; then
        elem="urn:oasis:names:tc:SAML:2.0:protocol:Response"
    elif [ "${CTX}" == "logout" ]; then
        elem="urn:oasis:names:tc:SAML:2.0:protocol:LogoutResponse"
    else
        rm ${res}
        exit 1
    fi
    xmlsec1 \
        --verify \
        --insecure \
        --id-attr:ID ${elem} \
        --node-name ${elem} \
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
else # HTTP-Redirect

    # decode SAMLResponse
    res=`mktemp`
    echo -n ${SAMLResponse} \
        | base64 -d \
        | python -c "import sys, zlib;\
                     sys.stdout.write(zlib.decompress(sys.stdin.buffer.read(), -15).decode('utf-8'))" \
        > ${res}
    
    if [ ${_DEBUG} -eq 1 ]; then
        echo -e "\n[SAMLResponse]\n\n`xmllint --format ${res}`"
    fi
    
    # verify against XSD
    xmllint --noout --schema ./xsd/saml-schema-protocol-2.0.xsd ${res}
    if [ $? -ne 0 ]; then
        rm ${res}
        exit 1
    fi

    # decode XML signature
    signature=`mktemp`
    echo -n ${Signature} | base64 -d > ${signature}

    # compose signature payload
    response=`echo -n ${SAMLResponse} \
        | python -c "import sys, urllib.parse as p;\
                     sys.stdout.write(p.quote_plus(sys.stdin.read()))"`
    
    relay_state=`echo -n ${RelayState} \
        | python -c "import sys, urllib.parse as p;\
                     sys.stdout.write(p.quote_plus(sys.stdin.read()))"`
    
    sig_alg=`echo -n ${SigAlg} \
        | python -c "import sys, urllib.parse as p;\
                     sys.stdout.write(p.quote_plus(sys.stdin.read()))"`

    payload=`mktemp`
    echo -n "SAMLResponse=${response}&RelayState=${relay_state}&SigAlg=${sig_alg}" > ${payload}

    # verify the signature with all the "signing" certificates that were
    # published within the metadata
    sign_ok=0
    dgst=`echo ${SigAlg} | grep -oP 'sha(256|384|512)'`
    for cert in `find ${_DATA_DIR} -type f -name *.${FROM}.metadata.signing.pem | tr '\n' ' '`; do
        pubkey=`mktemp`
        openssl x509 -in ${cert} -noout -pubkey > ${pubkey}

        openssl dgst -${dgst} -verify ${pubkey} -signature ${signature} ${payload}
        if [ $? -eq 0 ]; then
            sign_ok=1
        fi
        rm ${pubkey}
    done

    if [ ${sign_ok} -ne 1 ]; then
        rm ${payload} ${signature} ${res}
        exit 1
    fi
    
    rm ${payload} ${signature} ${res}
fi
