# TestLink — Online Test & Quiz Management

A teacher-controlled online exam platform: upload a question paper, verify
what gets extracted, configure the rules, and share one link. Students open
it, attempt the test under a real deadline, and get graded automatically.

## What's in this folder

```
index.html          ← the entire app (dashboard, wizard, exam, results)
firestore.rules      ← Firestore security rules (who can read/write what)
functions/index.js   ← secure server-side grading (Cloud Function)
functions/package.json
firebase.json         ← ties hosting + rules + functions together
.firebaserc           ← put your Firebase project ID here
SETUP.md              ← step-by-step: local demo → fully live in ~15 min
```

## Two ways to run this

**1. Local-only demo (zero setup)** — just open `index.html` in a browser.
Everything is stored in that browser's localStorage: no accounts, no
internet required beyond loading the CDN libraries for OCR/PDF parsing.
Shareable links work by embedding the whole test inside the URL, so they
work on any device too — just without centralized results collection.

**2. Full synced website** — follow `SETUP.md` to connect a free Firebase
project. This adds real teacher accounts, tests and results that sync
across every device, short shareable links, and secure server-side grading
so the answer key never reaches a student's browser. Takes about 15
minutes and costs nothing at classroom scale (Firebase's free tier).

## Feature summary

**Teacher side**
- Upload a question paper as PDF, a photo/scan, a `.txt` file, or pasted
  text — parsed automatically into questions, options, and answers
- Mandatory verification screen (✓ Verified / ⚠ Needs Review / ✎ Edited)
  before anything can be published — extraction errors never go live silently
- Full question editor: text, options, correct answer(s), marks, negative
  marks, reordering
- Test configuration: duration, opens-at, hard deadline, attempts allowed,
  negative marking, question/option randomization, review permissions,
  result visibility, pass percentage
- One-click publish → shareable link
- Results dashboard: per-student scores, tab-switch counts, class average,
  pass rate, hardest/easiest question, CSV export

**Student side**
- Simple details form → instructions → timed exam
- Question palette, mark-for-review, clear answer, auto-save (survives a
  refresh), tab-switch tracking, auto-submit at zero
- Result screen respecting the teacher's visibility setting (full
  breakdown / score only / hidden until released)

**Core timing rule** (exactly as specified): a student's available time is
`min(test duration, deadline − their start time)`. Starting late never
grants extra time beyond the deadline, and no one can start after the
deadline at all.

## Deployment options

Either works, since the app uses hash-based routing (`#/...`) and needs
no server-side rewrites:

- **GitHub Pages** — push this folder to a repo, enable Pages in Settings,
  done. Works for the local-only mode out of the box; add your Firebase
  config first if you want the synced mode.
- **Firebase Hosting** — `firebase deploy --only hosting` after following
  `SETUP.md`. Keeps hosting, database, auth, and functions in one project.

## Honest limitations, stated plainly

- OCR accuracy on messy scans/handwriting will be rough — that's exactly
  why the Verify step is mandatory, not optional.
- Local-only mode (no Firebase) has no central results collection across
  devices; students download a result file and send it back for the
  teacher to import — a real but manual bridge until Firebase is wired in.
- Secure grading (the Cloud Function) requires the extra deploy step in
  `SETUP.md`. Skip it and the app still works, but for a synced test the
  student will need functions deployed to actually get graded — this is
  intentional: it's what keeps the answer key off the student's device.
