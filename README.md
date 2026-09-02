# StudyTool

A study tracker: define your topics once, then log study sessions, confidence
ratings and quiz scores against them — either generally, or against a specific
exam with a countdown.

Front end is plain HTML, CSS and JavaScript with no build step and no
dependencies. The server is one file of Flask.

**To put it online, follow [DEPLOY.md](DEPLOY.md).** It's about 15 minutes and
you don't write any code.

## Running it on this machine

```bash
python run.py
```

Or double-click `StudyTool.bat`. It starts the server, opens your browser at
<http://localhost:8137>, and keeps running until you close the window.

To reach it from an iPad on the same Wi-Fi:

```bash
python run.py --lan
```

That prints the address to use, and Windows will ask once to let Python
through the firewall. Both devices must be on your home network and this
machine has to stay on — which is exactly why the hosted version exists.

You can also just open `index.html` with no server at all. It works, but it
falls back to browser storage (see below).

## Where your data lives

**Hosted or run locally through `run.py`:** one JSON file on the server, at
`data/studytool.json`. Writes are atomic and the previous version is kept
alongside as `.bak`, so an interrupted save can't corrupt your history.

**Opened as a bare `index.html`:** this browser's `localStorage`, with no
server involved. Fine for a quick look, but treat it as scratch — Safari
deletes it after about a week of not visiting, and it's per-browser, so it
won't follow you to another device.

The app works out which one it's using on its own: the server injects a flag
into the page it serves, and without that flag the app falls back to browser
storage. There's nothing to configure.

**Either way, export a backup now and then.** The homepage has Export and
Import buttons and will nag you when it's been more than four weeks. Keep the
file in OneDrive and no single failure — cleared browser, dead account,
provider shutting down — can cost you anything.

## The three modes

**Topic editor** — subjects, each holding topics. This is the one list that
everything else reads from. Renaming saves when you click away; deleting a
topic also deletes its study sessions and removes it from any exam.

**General study** — every topic you have, ordered weakest first, counting
every session you've ever logged, including ones logged under an exam.

**Exam study** — an exam has a name, a date, a pass mark and a chosen subset
of your topics. Its page shows a countdown, a confidence bar, and only the
sessions logged against that exam. Past exams get a result field, and the exam
list shows them as passed or failed.

### How a topic gets its colour

From the **most recent** session on that topic:

| Confidence | Colour |
| --- | --- |
| High | green |
| Medium | yellow |
| Low / Very low | red |
| No sessions yet | grey chip |

The bar at the top of the page is one slice per topic in that same order, so
the grey tail is how much you haven't touched yet.

Topics are listed weakest first: unstudied chips, then lowest confidence, and
within the same confidence the one you studied longest ago comes first.

## Layout

```
index.html            Page shell and script order
css/styles.css        All styling

server.py             Flask: serves the front end, /api/data, and login
storage.py            Atomic reads and writes of the JSON database
config.py             Your password (the only file you edit to deploy)
run.py                Local launcher
StudyTool.bat         Double-click version of run.py

js/
  util/               dom helpers, date maths, percentage/confidence formatting
  data/
    schema.js         Data shape, validation on load, and all derived values
                      (board ordering, latest quiz per type, colour bands)
    blobRepo.js       Every create/read/update/delete rule, written once
    localRepo.js      Backend: this browser's localStorage
    remoteRepo.js     Backend: the server, over HTTP
    repo.js           Picks the backend and exposes App.repo
  components/         Progress bar, topic picker, topic board, quiz editor
  views/              One file per screen
  router.js           Hash router
  app.js              Route table, boot
```

Views never touch storage. They only call `App.repo`, and every method there
is asynchronous. A backend supplies just two operations — load the database,
save the database — so `localRepo` and `remoteRepo` cannot drift apart on the
rules, because they don't contain any.

## The API

Two endpoints, both requiring a session cookie from `/login`:

```
GET  /api/data   ->  { "revision": 7, "data": { ... } }
PUT  /api/data   <-  { "revision": 7, "data": { ... } }
                 ->  { "revision": 8 }
```

The revision is how two devices stay honest. A `PUT` carrying a stale revision
is rejected with `409`, and the page reloads rather than overwriting whatever
the other device saved. Without it, opening the app on your iPad and your
laptop on the same day would silently lose a session.

## If it ever needs multiple users

Today the whole database is one blob behind one password, which is right for
one person and wrong for twenty. The change would be: give each user a row,
scope `storage.py` by user id, swap the shared password for real accounts, and
split `/api/data` into per-resource endpoints so two people editing different
exams don't collide.

None of the front end would change, because none of it knows where the data
comes from.

## Data model

```jsonc
{
  "version": 1,
  "meta": { "lastBackupAt": "2026-09-02" },   // drives the backup reminder
  "subjects": [
    { "id": "sub_x", "name": "Accounting", "order": 0,
      "topics": [ { "id": "top_y", "name": "Taxation", "order": 0 } ] }
  ],
  "exams": [
    { "id": "exam_z", "name": "Semester 1", "date": "2026-11-20",
      "topicIds": ["top_y"], "passMark": 50, "score": null,
      "createdAt": "...", "order": 0 }
  ],
  "sessions": [
    { "id": "ses_a", "examId": "exam_z",   // null for a general-study session
      "topicId": "top_y", "date": "2026-09-02",
      "confidence": 1,                     // 1 very low ... 4 high
      "notes": "",
      "quizzes": [ { "type": "MCQ", "correct": 1, "total": 6 } ],
      "createdAt": "..." }
  ]
}
```

Dates are stored as plain local `YYYY-MM-DD` strings, never timestamps, so
they can't drift by a day across timezones. Quiz scores are stored as the
fraction you entered and only turned into a percentage for display.
