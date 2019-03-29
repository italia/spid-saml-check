FROM debian:buster
LABEL mantainer="Michele D'Amico, michele.damico@agid.gov.it"

# Set the working directory
WORKDIR /spid-saml-check

# Copy the current directory to /spid-validator
ADD . /spid-saml-check

# Create directory for tests data
RUN mkdir /spid-saml-check/specs-compliance-tests/data

ENV \
    DATA_DIR=/spid-saml-check/specs-compliance-tests/data \
    SP_METADATA=/spid-saml-check/specs-compliance-tests/data/sp-metadata.xml \
    AUTHN_REQUEST=/spid-saml-check/specs-compliance-tests/data/authn-request.xml

# Update and install utilities
RUN apt-get update \
    && apt-get install -y \
        wget \
        curl \
        unzip \
        gcc \
        libxml2-utils \
        openssl \
        python3 \
        python3-pip \
        xmlsec1 \ 
        apache2

# Node.js
RUN curl -sL https://deb.nodesource.com/setup_11.x | bash - \
    && apt-get install -y \
        nodejs \
        build-essential

# Tox
RUN pip3 install tox

# Build validator
RUN cd /spid-saml-check/spid-validator && \
    cd client && npm install --silent && cd .. && \
    cd server && npm install --silent && cd .. && \
    npm run build

# Ports exposed
EXPOSE 8080


ENTRYPOINT cd spid-validator && npm run start-prod
