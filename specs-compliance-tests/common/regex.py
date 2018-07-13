import re

_UTC_STRING = r'^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d{3})?Z$'  # noqa
UTC_STRING = re.compile(_UTC_STRING)

_SPID_LEVEL_23 = (r'(https:\/\/www\.spid\.gov\.it\/|urn:oasis:names:tc:SAML:2\.0:ac:classes:)SpidL[2-3]')  # noqa
SPID_LEVEL_23 = re.compile(_SPID_LEVEL_23)

_SPID_LEVEL_ALL = (r'(https:\/\/www\.spid\.gov\.it\/|urn:oasis:names:tc:SAML:2\.0:ac:classes:)SpidL[1-3]')  # noqa
SPID_LEVEL_ALL = re.compile(_SPID_LEVEL_ALL)
