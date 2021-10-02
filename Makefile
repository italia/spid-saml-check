default: build

# Build Docker image
build: docker_build output

# Debug the laste Docker image
debug: docker_debug

# Run the last Docker image
run: docker_run

# Run Docker image prune
clean: docker_image_prune

# Run Docker image remove
remove: docker_image_remove_last_build output

# Build and push Docker image
release: docker_build docker_push output

# Image can be overidden with env vars.
# es: make build DOCKER_IMAGE=my-cns 
DOCKER_IMAGE ?= italia/spid-saml-check

# Expose HTTPS port can be overidden with env vars.
# es: make run EXPOSE_HTTPS_PORT=90443
EXPOSE_HTTPS_PORT ?= 8443

# Get the latest commit.
GIT_COMMIT = $(strip $(shell git rev-parse --short HEAD))

# Get the version number from the code
CODE_VERSION = $(strip $(shell git describe --tags --always --abbrev=0 | cut -c3-))

# Find out if the working directory is clean
GIT_NOT_CLEAN_CHECK = $(shell git status --porcelain)
ifneq (x$(GIT_NOT_CLEAN_CHECK), x)
DOCKER_TAG_SUFFIX = "-dirty"
endif

# If we're releasing to Docker Hub, and we're going to mark it with the latest
# tag, it should exactly match a version release
ifeq ($(MAKECMDGOALS),release)
# Use the version number as the release tag.
DOCKER_TAG = $(CODE_VERSION)

ifndef CODE_VERSION
$(error You need to create a VERSION file to build a release)
endif

# See what commit is tagged to match the version
VERSION_COMMIT = $(strip $(shell git rev-list $(GIT_COMMIT) -n 1 | cut -c1-7))
ifneq ($(VERSION_COMMIT), $(GIT_COMMIT))
$(error echo You are trying to push a build based on commit $(GIT_COMMIT) but the tagged release version is $(VERSION_COMMIT))
endif

# Don't push to Docker Hub if this isn't a clean repo
ifneq (x$(GIT_NOT_CLEAN_CHECK), x)
$(error echo You are trying to release a build based on a dirty repo)
endif

else
# Add the commit ref for development builds. Mark as dirty if the working directory isn't clean
DOCKER_TAG = $(CODE_VERSION)-$(GIT_COMMIT)$(DOCKER_TAG_SUFFIX)
endif

docker_build:
	# Build Docker image
	docker build \
		--build-arg BUILD_DATE=`date -u +"%Y-%m-%dT%H:%M:%SZ"` \
		--build-arg VERSION=$(CODE_VERSION) \
		--build-arg VCS_URL=`git config --get remote.origin.url` \
		--build-arg VCS_REF=$(GIT_COMMIT) \
		--build-arg EXPOSE_HTTPS_PORT=$(EXPOSE_HTTPS_PORT) \
		-t $(DOCKER_IMAGE):$(DOCKER_TAG) .

docker_push:
	# Tag image as latest
	docker tag $(DOCKER_IMAGE):$(DOCKER_TAG) $(DOCKER_IMAGE):latest

	# Push to DockerHub
	docker push $(DOCKER_IMAGE):$(DOCKER_TAG)
	docker push $(DOCKER_IMAGE):latest

docker_debug:
	# Run bash shell on Container
	docker run --rm -it $(DOCKER_IMAGE):$(DOCKER_TAG) /bin/bash

docker_run:
	# Run Container
	docker run --rm -it -d --name=spid-saml-check -p ${EXPOSE_HTTPS_PORT}:8443 $(DOCKER_IMAGE):$(DOCKER_TAG)

docker_image_prune:
	# Docker image prune
	docker image prune --force

docker_image_remove_last_build:
	# Docker image remove
	docker image rm $(DOCKER_IMAGE):$(DOCKER_TAG)

output:
	@echo Docker Image: $(DOCKER_IMAGE):$(DOCKER_TAG)