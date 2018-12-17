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

import re

_UTC_STRING = r'^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d{3})?Z$'  # noqa
UTC_STRING = re.compile(_UTC_STRING)

_SPID_LEVEL_23 = (r'(https:\/\/www\.spid\.gov\.it\/)SpidL[2-3]')  # noqa
SPID_LEVEL_23 = re.compile(_SPID_LEVEL_23)

_SPID_LEVEL_ALL = (r'(https:\/\/www\.spid\.gov\.it\/)SpidL[1-3]')  # noqa
SPID_LEVEL_ALL = re.compile(_SPID_LEVEL_ALL)
