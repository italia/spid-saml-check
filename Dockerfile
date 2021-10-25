FROM node:8-buster-slim 

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
        wget \
        curl \
        unzip \
        libxml2-utils \
        libxml2-dev \
        libxmlsec1-dev \
        libxmlsec1-openssl \
        xmlsec1 \
        openssl \
        python3 \
        python3-pip

# Install spid-sp-test
RUN pip3 install spid-sp-test --upgrade --no-cache

# Set the working directory
WORKDIR /spid-saml-check

# Copy the current directory to /spid-validator
ADD . /spid-saml-check

# Create directory for tests data
RUN mkdir /spid-saml-check/data

ENV TZ=Europe/Rome
ENV NODE_HTTPS_PORT=${EXPOSE_HTTPS_PORT}

# Build validator
RUN cd /spid-saml-check/spid-validator && \
    cd client && npm install --silent && cd .. && \
    cd server && npm install --silent && cd .. && \
    npm run build && \
    npm cache clean --force

# Ports exposed
EXPOSE ${EXPOSE_HTTPS_PORT}


ENTRYPOINT cd spid-validator && npm run start-prod
