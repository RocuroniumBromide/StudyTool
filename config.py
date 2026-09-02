"""StudyTool configuration.

The only line you have to change is PASSWORD.
"""

import os

# The password you will type to open the site. Change the text below before you
# deploy - the app refuses to let anyone in while it is still "change-me".
#
# Use something long. It is the only thing standing between the internet and
# your study history, and you only ever type it once per device.
#
# (If you would rather not keep it in a file, set a STUDYTOOL_PASSWORD
# environment variable instead and leave this line alone.)
PASSWORD = os.environ.get("STUDYTOOL_PASSWORD") or "change-me"

# Where the database file is written. None means a "data" folder next to this
# file, which is what you want on PythonAnywhere and locally.
DATA_DIR = None

# Force secure (HTTPS-only) cookies. None auto-detects: on when hosted, off
# when you run it locally over plain http://localhost.
SECURE_COOKIES = None
