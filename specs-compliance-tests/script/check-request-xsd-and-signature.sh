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

#!/bin/bash

_DATA_DIR=${DATA_DIR:-"./data"}
_DEBUG=${DEBUG:-0}

CTX=${1}
FROM=${2}

SAMLRequest=`cat ${_DATA_DIR}/SAMLRequest.${CTX}.request.txt`
if [ ${_DEBUG} -eq 1 ]; then
    echo -e "[SAMLRequest]\n${SAMLRequest}"
fi

RelayState=`cat ${_DATA_DIR}/RelayState.${CTX}.request.txt`
if [ ${_DEBUG} -eq 1 ]; then
    echo -e "[RelayState]\n${RelayState}"
fi

Signature=`cat ${_DATA_DIR}/Signature.${CTX}.request.txt`
if [ ${_DEBUG} -eq 1 ]; then
    echo -e "[Signature]\n${Signature}"
fi

SigAlg=`cat ${_DATA_DIR}/SigAlg.${CTX}.request.txt`
if [ ${_DEBUG} -eq 1 ]; then
    echo -e "[SigAlg]\n${SigAlg}\n"
fi

if [ "X${Signature}" == "X" -a "X${SigAlg}" == "X" ]; then # HTTP-POST

    # decode SAMLRequest
    req=`mktemp`
    echo -n ${SAMLRequest} | base64 -d > ${req}


    if [ ${_DEBUG} -eq 1 ]; then
        echo -e "[SAMLRequest]\n`xmllint --format ${req}`"
    fi

    # verify against XSD
    echo -n "Validating XSD... "
    xmllint --noout --schema ./xsd/saml-schema-protocol-2.0.xsd ${req}
    if [ $? -ne 0 ]; then
        echo "FAIL"
        rm ${req}
        exit 1
    fi
    echo "OK"

    # verify XML signature
    if [ "${CTX}" == "authn" ]; then
        elem="urn:oasis:names:tc:SAML:2.0:protocol:AuthnRequest"
    elif [ "${CTX}" == "logout" ]; then
        elem="urn:oasis:names:tc:SAML:2.0:protocol:LogoutRequest"
    else
        rm ${req}
        exit 1
    fi

    echo -n "Validating signature... "
    xmlsec1 \
        --verify \
        --insecure \
        --id-attr:ID ${elem} \
        ${req}
    echo ${req}
    if [ $? -ne 0 ]; then
        echo "FAIL"
        rm ${req}
        exit 1
    fi
    echo "OK"

    rm ${req}
else # HTTP-Redirect

    # decode SAMLRequest
    req=`mktemp`
    echo -n ${SAMLRequest} \
        | base64 -d \
        | python -c "import sys, zlib;\
                     sys.stdout.write(zlib.decompress(sys.stdin.buffer.read(), -15).decode('utf-8'))" \
        > ${req}

    if [ ${_DEBUG} -eq 1 ]; then
        echo -e "[SAMLRequest]\n`xmllint --format ${req}`"
    fi

    # verify against XSD
    echo -n "Validating XSD... "
    xmllint --noout --schema ./xsd/saml-schema-protocol-2.0.xsd ${req}
    if [ $? -ne 0 ]; then
        echo "FAIL"
        rm ${req}
        exit 1
    fi
    echo "OK"

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
    for cert in `find ${_DATA_DIR} -type f -name *.${FROM}.metadata.signing.pem | tr '\n' ' '`; do
        pubkey=`mktemp`
        openssl x509 -in ${cert} -noout -pubkey > ${pubkey}

        openssl dgst -${dgst} -verify ${pubkey} -signature ${signature} ${payload}
        if [ $? -eq 0 ]; then
            sign_ok=1
        fi
        rm ${pubkey}
    done

    echo -n "Validating signature... "
    if [ ${sign_ok} -ne 1 ]; then
        echo "FAIL"
        rm ${payload} ${signature} ${req}
        exit 1
    fi
    echo "OK"

    rm ${payload} ${signature} ${req}
fi
