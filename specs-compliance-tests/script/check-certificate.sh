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

pem=${1}

sigalg=`openssl x509 -in ${pem} -noout -text \
    | sed -e "s/^\s\s*//g" \
    | grep "Signature Algorithm" \
    | uniq \
    | cut -d ':' -f 2 \
    | sed -e "s/^\s\s*//g"`

klen=`openssl x509 -in ${pem} -noout -text \
    | sed -e "s/^\s\s*//g" \
    | grep "Public-Key" \
    | cut -d '(' -f 2 | cut -d ' ' -f 1`

alg=`openssl x509 -in ${pem} -noout -text \
    | sed -e "s/^\s\s*//g" \
    | grep "Public Key Algorithm" \
    | cut -d ':' -f 2 | cut -d ' ' -f 2`

subject=`openssl x509 -in ${pem} -noout -subject \
    | sed -e "s/subject=//g" -e "s/^\s\s*//g"`

validity=`openssl x509 -in ${pem} -noout -subject \
    | grep "Validity"`


echo "Checking \"${subject}\""

if [ `echo ${sigalg} | grep -c "^sha1"` -eq 1 ]; then
    echo "Certificate signed with weak algorithm (${sigalg})"
    exit 1
fi

if [ "${alg}" == "rsaEncryption" ]; then
    MINLEN=2048
    if [ ${klen} -lt ${MINLEN} ]; then
        echo "Certificate key (${alg}) is ${klen} bit"
        exit 1
    fi
elif [ "${alg}" == "id-ecPublicKey" ]; then
    MINLEN=256
    if [ ${klen} -lt ${MINLEN} ]; then
        echo -e "Certificate key (${alg}) is ${klen} bit"
        exit 1
    fi
else
    echo -e "Certificate ${alg} is not allowed"
    exit 1
fi
