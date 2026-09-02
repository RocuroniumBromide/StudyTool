"""StudyTool server.

Serves the front end and two API endpoints that read and write the whole
database. The same file runs locally (via run.py) and on PythonAnywhere, which
imports `application` from here.
"""

import hmac
import os
import secrets
import time
from datetime import timedelta

from flask import (
    Flask, abort, jsonify, redirect, render_template_string, request,
    Response, send_from_directory, session, url_for,
)

import config
import storage

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = config.DATA_DIR or os.path.join(BASE_DIR, "data")
DEFAULT_PASSWORD = "change-me"

# Only these top-level folders are reachable. Everything else - server.py,
# config.py, the data folder - stays private.
PUBLIC_DIRS = ("css", "js")

db = storage.Storage(DATA_DIR)

app = Flask(__name__, static_folder=None)


def _secret_key():
    """A stable signing key, generated once and kept beside the database.

    Regenerating it on every start would sign everyone out on each restart,
    and hard-coding one would mean the key lives in the source.
    """
    path = os.path.join(DATA_DIR, "secret_key.txt")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as handle:
            key = handle.read().strip()
            if key:
                return key
    key = secrets.token_hex(32)
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(key)
    return key


def _secure_cookies():
    if config.SECURE_COOKIES is not None:
        return bool(config.SECURE_COOKIES)
    # PythonAnywhere serves over HTTPS; a local run does not.
    return "PYTHONANYWHERE_DOMAIN" in os.environ


app.secret_key = _secret_key()
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    # Lax also means another site cannot make your browser send this cookie on
    # a cross-site write, which is what protects the API from being driven
    # from a page you did not open yourself.
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=_secure_cookies(),
    PERMANENT_SESSION_LIFETIME=timedelta(days=90),
    JSON_SORT_KEYS=False,
)


# --------------------------------------------------------------------------
# Authentication
# --------------------------------------------------------------------------

def password_is_set():
    return bool(config.PASSWORD) and config.PASSWORD != DEFAULT_PASSWORD


def logged_in():
    return session.get("authenticated") is True


def safe_next(value):
    """Only allow redirects back into this site."""
    if value and value.startswith("/") and not value.startswith("//"):
        return value
    return "/"


LOGIN_PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>StudyTool</title>
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <div class="login-wrap">
    <h1>StudyTool</h1>
    <p class="hint">Enter your password to continue.</p>
    {% if not password_set %}
      <p class="error">This site has no password set yet. Open
      <code>config.py</code>, change <code>PASSWORD</code>, and reload the web
      app. Nobody can sign in until you do.</p>
    {% else %}
      <form method="post">
        <input type="hidden" name="next" value="{{ next_url }}">
        <input type="password" name="password" placeholder="Password"
               autocomplete="current-password" autofocus required>
        {% if error %}<p class="error">{{ error }}</p>{% endif %}
        <button type="submit" class="btn">Sign in</button>
      </form>
    {% endif %}
  </div>
</body>
</html>"""


@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    next_url = safe_next(request.values.get("next"))

    if request.method == "POST" and password_is_set():
        submitted = request.form.get("password", "")
        if hmac.compare_digest(submitted, config.PASSWORD):
            session.permanent = True
            session["authenticated"] = True
            return redirect(next_url)
        # Slow down anyone working through a list of guesses.
        time.sleep(1)
        error = "That password is not right."

    return render_template_string(
        LOGIN_PAGE,
        error=error,
        next_url=next_url,
        password_set=password_is_set(),
    )


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return redirect(url_for("login"))


# --------------------------------------------------------------------------
# The app itself
# --------------------------------------------------------------------------

@app.route("/")
def index():
    if not logged_in():
        return redirect(url_for("login", next=request.full_path.rstrip("?")))

    with open(os.path.join(BASE_DIR, "index.html"), "r", encoding="utf-8") as handle:
        html = handle.read()

    # Tells the front end to use the server rather than browser storage.
    # Opened straight from the file system, this placeholder stays a comment
    # and the app falls back to localStorage on its own.
    html = html.replace(
        "<!--API_CONFIG-->",
        '<script>window.STUDYTOOL_API = "/api";</script>',
    )

    response = Response(html, mimetype="text/html")
    response.headers["Cache-Control"] = "no-store"
    return response


@app.route("/<path:filename>")
def public_files(filename):
    if filename.split("/")[0] not in PUBLIC_DIRS:
        abort(404)
    return send_from_directory(BASE_DIR, filename)


# --------------------------------------------------------------------------
# API
# --------------------------------------------------------------------------

def require_login():
    if not logged_in():
        abort(401)


@app.errorhandler(401)
def unauthorised(_error):
    return jsonify(error="Not signed in"), 401


@app.route("/api/data", methods=["GET"])
def api_read():
    require_login()
    revision, data = db.read()
    response = jsonify(revision=revision, data=data)
    response.headers["Cache-Control"] = "no-store"
    return response


@app.route("/api/data", methods=["PUT"])
def api_write():
    require_login()

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or not isinstance(payload.get("data"), dict):
        return jsonify(error="Expected a JSON object with a 'data' key"), 400

    try:
        revision = db.write(payload["data"], payload.get("revision"))
    except storage.Conflict:
        return jsonify(error="Your copy is out of date"), 409

    return jsonify(revision=revision)


# PythonAnywhere's WSGI file imports this name.
application = app
