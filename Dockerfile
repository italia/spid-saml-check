FROM node:20

# Metadata params
ARG BUILD_DATE
ARG VCS_REF
ARG VCS_URL
ARG VERSION
ARG EXPOSE_HTTPS_PORT

# Define the Metadata Container image
# For more info refere to https://github.com/opencontainers/image-spec/blob/main/annotations.md
LABEL   org.opencontainers.image.authors="Michele D'Amico, michele.damico@agid.gov.it" \
        org.opencontainers.image.created=${BUILD_DATE} \
        org.opencontainers.image.version=${VERSION} \
        org.opencontainers.image.source=${VCS_URL} \
        org.opencontainers.image.revision=${VCS_REF} \
        org.opencontainers.image.url="https://github.com/italia/spid-saml-check" \
        org.opencontainers.image.vendor="Developers Italia" \
        org.opencontainers.image.licenses="EUPL-1.2" \
        org.opencontainers.image.title="SPID SAML Check" \
        org.opencontainers.image.description="SPID SAML Check è una suita applicativa che fornisce diversi strumenti ai Service Provider SPID, utili per ispezionare le request di autenticazione SAML inviate all'Identity Provider, verificare la correttezza del metadata e inviare response personalizzate al Service Provider." \
        org.opencontainers.image.base.name="italia/spid-saml-check"

# Update and install utilities
RUN apt-get update && apt-get install -y \
        gcc \
        make \
        wget \
        curl \
        libxml2-utils \
        libxml2-dev \
        libxmlsec1-dev \
        libxmlsec1-openssl \
        libffi-dev \
        xmlsec1 \
        openssl \
        python3 \
        python3-pip \
        libffi-dev \
        python3-virtualenv \
        build-essential  \
        python3-dev cargo

# tells node-gyp where to search for python
ENV PYTHON=/usr/bin/python3

# Install spid-sp-test
# TODO: create a venv and remove --break-system-packages
RUN pip3 install spid-sp-test --no-cache --break-system-packages

# Copy the current directory to /spid-validator
ADD . /spid-saml-check
WORKDIR /spid-saml-check

# Create directory for tests data
RUN mkdir /spid-saml-check/data

ENV TZ=Europe/Rome
ENV NODE_HTTPS_PORT=${EXPOSE_HTTPS_PORT}

# Install server then install client and build it
WORKDIR /spid-saml-check/spid-validator
RUN cd server && npm install --silent && cd ..
RUN cd client && npm install --silent && cd .. && \
    npm run build

# Ports exposed
EXPOSE ${EXPOSE_HTTPS_PORT}

ENTRYPOINT npm run start-prod
