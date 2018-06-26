ALLOWED_BINDINGS = [
    'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
    'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
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
