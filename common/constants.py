ALLOWED_BINDINGS = [
    'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
    'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
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
