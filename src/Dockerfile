FROM ubuntu:latest
MAINTAINER Michele D'Amico, michele.damico@agid.gov.it

# Create user to run validator (not root for security reason!)
RUN useradd --user-group --create-home --shell /bin/false validator

# Set the working directory
WORKDIR /spid-validator

# Copy the current directory to /spid-validator
ADD . /spid-validator

# Update and install utilities
RUN apt-get update && \
    apt-get install -y curl && \
    apt-get install -y vim && \
    apt-get install -y net-tools && \
    apt-get install -y unzip libxml2-utils && \
    apt-get install -y apache2

# Node 6
RUN apt-get install -y nodejs && \
    apt-get install -y npm && \
    apt-get install -y build-essential

# Build validator
RUN cd /spid-validator && \
    cd client && npm install --suppress-warnings && cd .. && \
    cd server && npm install --suppress-warnings && cd .. && \
    npm run build

# Ports exposed
EXPOSE 8080

RUN chown -R validator:validator /spid-validator/*

USER validator

ENTRYPOINT ["npm", "run", "start-prod"]
