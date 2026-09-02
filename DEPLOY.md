# Putting StudyTool online

About 15 minutes, once. You don't write any code — every box you have to fill
in is written out below, ready to paste.

Wherever you see `YOURNAME`, use your own PythonAnywhere username.

---

## 1. Make the account (2 min)

Go to <https://www.pythonanywhere.com> and create a **free "Beginner"
account**. No card is needed at any point.

Your username becomes your web address, so pick one you don't mind other
people seeing: `https://YOURNAME.pythonanywhere.com`.

## 2. Get the files up there (4 min)

**On your PC first:** delete the `data` folder inside `StudyTool` if one
exists. It holds local test data and a signing key, and the server makes its
own on first run.

Then right-click the `StudyTool` folder → **Send to → Compressed (zipped)
folder**. You'll get `StudyTool.zip`.

On PythonAnywhere:

1. **Files** tab → **Upload a file** → choose `StudyTool.zip`.
2. **Consoles** tab → **Bash**. In the console, paste:

   ```bash
   unzip StudyTool.zip -d ~/
   ```

   You should now have `/home/YOURNAME/StudyTool` with `server.py` inside it.

## 3. Set your password (1 min)

**Files** tab → open `StudyTool/config.py` → change this line:

```python
PASSWORD = os.environ.get("STUDYTOOL_PASSWORD") or "change-me"
```

Replace `change-me` with a real password, keeping the quotes. Click **Save**.

Make it long — it's the only thing between the internet and your study
history, and you type it once per device. Until you change it, nobody can sign
in at all, including you.

## 4. Create the web app (3 min)

**Web** tab → **Add a new web app** → **Next** →
**Manual configuration** (*not* the Flask option — we're supplying our own) →
pick the newest Python offered → **Next**.

## 5. Point it at StudyTool (2 min)

Still on the **Web** tab, find **Code** → click the link next to
**WSGI configuration file**. Delete everything in that file and paste this,
changing `YOURNAME`:

```python
import sys

path = '/home/YOURNAME/StudyTool'
if path not in sys.path:
    sys.path.insert(0, path)

from server import application  # noqa: F401
```

Click **Save**.

## 6. Start it (1 min)

**Web** tab → the big green **Reload** button → then open
`https://YOURNAME.pythonanywhere.com`.

Sign in with your password. You should see the StudyTool homepage.

## 7. Bring your data across (2 min)

On your existing local copy, open the homepage and click **Export backup**.
On the hosted site, click **Import backup** and choose that file.

That's the only time you'll move a JSON file by hand. From then on every
change saves to the server as you make it.

## 8. Put it on your iPad (1 min)

Open the site in Safari → **Share** → **Add to Home Screen**. You get an app
icon, it opens full screen without the address bar, and it stays signed in for
90 days.

---

## Optional: make it a bit faster

**Web** tab → **Static files**, add two rows:

| URL | Directory |
| --- | --- |
| `/css/` | `/home/YOURNAME/StudyTool/css` |
| `/js/` | `/home/YOURNAME/StudyTool/js` |

This lets PythonAnywhere serve the stylesheet and scripts directly instead of
going through Python. Reload the web app afterwards.

---

## Keeping it alive

Free web apps run for three months per click, and an app nobody has used for a
month goes inactive on its own.

**Inactive does not mean deleted.** PythonAnywhere keep your files, your data
and your setup — the site just stops answering until you log in and press
**Run until 3 months from today** on the Web tab. Come back after the summer,
click once, and everything is where you left it.

The habit that makes this a non-issue: at the end of each term, hit **Export
backup** and drop the file in OneDrive. The homepage nags you if it's been
more than four weeks. That way nothing that happens to PythonAnywhere — or to
your account — can cost you your study history.

---

## Updating the site later

When a file changes on your PC, upload the changed file through the **Files**
tab and press **Reload** on the Web tab. Changes to `js/` or `css/` also need
a hard refresh in the browser (Ctrl+F5) to get past its cache.

Your `data` folder on the server is never touched by an update.

---

## If something goes wrong

**"Something went wrong :-("** — Web tab → **Error log**. The last few lines
name the problem. A `ModuleNotFoundError: flask` means Flask isn't installed
for the Python you chose; fix it in a Bash console with:

```bash
pip install --user Flask
```

**The login page says no password is set** — step 3 didn't save, or you
reloaded before saving. Check `config.py`, then press Reload.

**"This page is out of date"** — you had StudyTool open on two devices and
both tried to save. The newer change won; reload and redo the older one. This
message existing is the point: without it, one device would silently wipe the
other's work.
