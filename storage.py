"""Reading and writing the StudyTool database.

The whole database is one JSON file. It is small enough that rewriting it on
every change costs nothing, and keeping it as one file means a backup is a
copy-paste rather than a database dump.

Two things guard against losing work:

* Writes are atomic. The new file is written alongside the old one and then
  renamed over it, so an interrupted write can never leave a half-written
  file where your data used to be.
* Every write bumps a revision number. A client sends back the revision it
  loaded, and a mismatch is rejected rather than applied - that is what stops
  the iPad from silently overwriting something saved on the laptop.
"""

import json
import os


class Conflict(Exception):
    """Raised when a client tries to save on top of a newer revision."""


class Storage:
    def __init__(self, data_dir):
        self.data_dir = data_dir
        self.path = os.path.join(data_dir, "studytool.json")
        self.backup_path = os.path.join(data_dir, "studytool.json.bak")
        os.makedirs(data_dir, exist_ok=True)

    def read(self):
        """Return (revision, data). A missing file reads as (0, None)."""
        if not os.path.exists(self.path):
            return 0, None
        try:
            with open(self.path, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
        except (ValueError, OSError):
            # A corrupt file should not look like an empty one, or the next
            # save would overwrite the backup with nothing.
            raise RuntimeError(
                "The database file could not be read: %s. The previous version "
                "is at %s." % (self.path, self.backup_path)
            )
        return int(payload.get("revision", 0)), payload.get("data")

    def write(self, data, expected_revision=None):
        """Store data and return the new revision number."""
        current_revision, _ = self.read()

        if expected_revision is not None and int(expected_revision) != current_revision:
            raise Conflict(
                "Expected revision %s but the stored revision is %s"
                % (expected_revision, current_revision)
            )

        new_revision = current_revision + 1
        payload = {"revision": new_revision, "data": data}

        temp_path = self.path + ".tmp"
        with open(temp_path, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2)
            handle.flush()
            os.fsync(handle.fileno())

        # Keep the version we are about to replace, in case the new one turns
        # out to be wrong in a way the atomic rename cannot protect against.
        if os.path.exists(self.path):
            os.replace(self.path, self.backup_path)

        os.replace(temp_path, self.path)
        return new_revision
