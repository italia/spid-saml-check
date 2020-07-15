# Copyright 2019 AgID - Agenzia per l'Italia Digitale
#
# Licensed under the EUPL, Version 1.2 or - as soon they will be approved by
# the European Commission - subsequent versions of the EUPL (the "Licence").
#
# You may not use this work except in compliance with the Licence.
#
# You may obtain a copy of the Licence at:
#
#	 https://joinup.ec.europa.eu/software/page/eupl
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the Licence is distributed on an "AS IS" basis, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# Licence for the specific language governing permissions and limitations
# under the Licence.


BOOLEAN_TRUE = [
    'true',
    '1',
]

ALLOWED_BINDINGS = [
	'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
	'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
]

ALLOWED_SINGLELOGOUT_BINDINGS = [
    'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
    'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
    'urn:oasis:names:tc:SAML:2.0:bindings:SOAP',
]

ALLOWED_FORMATS = [
	'urn:oasis:names:tc:SAML:2.0:attrname-format:basic',
	'urn:oasis:names:tc:SAML:2.0:attrname-format:uri'
]

ALLOWED_STATUS_CODES = [
	'urn:oasis:names:tc:SAML:2.0:status:AuthnFailed',
	'urn:oasis:names:tc:SAML:2.0:status:NoAuthnContext',
	'urn:oasis:names:tc:SAML:2.0:status:NoPassive',
	'urn:oasis:names:tc:SAML:2.0:status:RequestDenied',
	'urn:oasis:names:tc:SAML:2.0:status:RequestUnsupported',
	'urn:oasis:names:tc:SAML:2.0:status:Requester',
	'urn:oasis:names:tc:SAML:2.0:status:Success',
	'urn:oasis:names:tc:SAML:2.0:status:VersionMismatch',
]

ALLOWED_XMLDSIG_ALGS = [
	'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256',
	'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha384',
	'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha512',
	'http://www.w3.org/2001/04/xmldsig-more#hmac-sha256',
	'http://www.w3.org/2001/04/xmldsig-more#hmac-sha384',
	'http://www.w3.org/2001/04/xmldsig-more#hmac-sha512',
	'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
	'http://www.w3.org/2001/04/xmldsig-more#rsa-sha384',
	'http://www.w3.org/2001/04/xmldsig-more#rsa-sha512',
]

ALLOWED_DGST_ALGS = [
	'http://www.w3.org/2001/04/xmlenc#sha256',
	'http://www.w3.org/2001/04/xmlenc#sha384',
	'http://www.w3.org/2001/04/xmlenc#sha512',
]

SPID_ATTRIBUTES = [
	'address',
	'companyName',
	'countyOfBirth',
	'dateOfBirth',
	'digitalAddress',
	'email',
	'expirationDate',
	'familyName',
	'fiscalNumber',
	'gender',
	'idCard',
	'ivaCode',
	'mobilePhone',
	'name',
	'placeOfBirth',
	'registeredOffice',
	'spidCode',
]

SPID_LEVELS = [
	'https://www.spid.gov.it/SpidL1',
	'https://www.spid.gov.it/SpidL2',
	'https://www.spid.gov.it/SpidL3',
	'urn:oasis:names:tc:SAML:2.0:ac:classes:SpidL1',
	'urn:oasis:names:tc:SAML:2.0:ac:classes:SpidL2',
	'urn:oasis:names:tc:SAML:2.0:ac:classes:SpidL3',
]

ONE_MONTH = 30
SIX_MONTHS = 182
ONE_YEAR = 365

MINIMUM_CERTIFICATE_LENGHT = 1024  # type: int
DESIRED_CERTIFICATE_LENGHT = 2048  # type: int

FICEP_MINIMUM_SET_SERVICENAME = 'eIDAS Natural Person Minimum Attribute Set'
FICEP_FULL_SET_SERVICENAME = 'eIDAS Natural Person Full Attribute Set'

FICEP_MIN_ATTRIBUTES = [
    'spidCode',
    'name',
    'familyName',
    'dateOfBirth',
]

FICEP_FULL_ATTRIBUTES = [
    'spidCode',
    'name',
    'familyName',
    'dateOfBirth',
    'placeOfBirth',
    'address',
    'gender',
]
