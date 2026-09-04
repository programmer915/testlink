# TestLink — Online Test & Quiz Management

A teacher-controlled online exam platform: upload a question paper, verify
what gets extracted, configure the rules, and share one link. Students
open it, attempt the test under a real deadline, and get graded
instantly — with every result landing in the teacher's dashboard from
whatever device the student used.

Runs entirely on Firebase's free **Spark** plan. No Cloud Functions, no
billing account, no credit card required anywhere in this project.

## What's in this folder

```
index.html          ← the entire app (dashboard, wizard, exam, results, bank)
firestore.rules       ← Firestore security rules (who can read/write what,
                         and what enforces the exam timer without a server)
firebase.json          ← ties hosting + rules together
.firebaserc              ← put your Firebase project ID here
SETUP.md                 ← step-by-step deployment guide (~10 min)
```

## Architecture

Every piece of persistent data lives in Firestore, scoped to the signed-in
teacher's account — nothing is kept in localStorage, and no test data is
ever embedded in a URL:

| Data | Where it lives |
|---|---|
| Teacher accounts | Firebase Authentication (email/password) |
| Tests (draft + published), config, questions + answers | `tests/{testId}`, scoped by `ownerId` |
| Active & submitted exam attempts (timer, answers, order, score) | `tests/{testId}/attempts/{attemptId}` |
| Saved/reusable questions | `questionBank/{itemId}`, scoped by `ownerId` |

A "result" isn't a separate thing — it's just an attempt document with
`status: 'submitted'` and the graded fields (score, correctCount, etc.)
filled in, written by the student's own browser the instant they submit.
The teacher's Results page reads those same attempt documents directly.

This means: sign in from any device, and every test, every question
you've banked, and every student's result is exactly where you left it.
Clearing your browser, logging out, or switching computers changes
nothing. The same is true mid-exam: a student's timer, answers, marked
questions, and question/option order are all stored server-side in the
attempt document, not the browser. A refresh, a closed-and-reopened tab,
or reconnecting after a dropped connection all resume the exact same
attempt with the exact same time remaining. The browser only ever holds
a small pointer (the attempt's ID) in `localStorage` so it knows which
record to ask for — never the timer or the answers themselves — and it
can't be used to extend the exam by tampering with the system clock,
since every save is checked against Firestore's own server clock via
security rules (see the comment block in `firestore.rules`).

Since the app needs a database and accounts to function at all, it does
**not** run in a "local demo" mode — see `SETUP.md` to connect a free
Firebase project, which is required before opening `index.html` does
anything useful.

## Feature summary

**Teacher side**
- Upload a question paper as PDF, a photo/scan, a `.txt` file, or pasted
  text — parsed automatically into questions, options, and answers
- Mandatory verification screen (✓ Verified / ⚠ Needs Review / ✎ Edited)
  before anything can be published — extraction errors never go live silently
- Full question editor: text, options, correct answer(s), marks, negative
  marks, reordering
- **Question Bank**: save any verified question for reuse, and pull saved
  questions into any future test instead of retyping them
- Test configuration: duration, opens-at, hard deadline, attempts allowed,
  negative marking, question/option randomization, review permissions,
  result visibility, pass percentage
- One-click publish → shareable link, live the moment it's published
- **Results dashboard**: per-student scores, tab-switch counts, class
  average, pass rate, hardest/easiest question, CSV export, and a
  per-student "View responses" breakdown showing exactly what they
  answered against the correct answer, question by question
- All of the above is visible from any device the moment you log in —
  results appear automatically as students submit, with no manual
  import step

**Student side**
- Simple details form → instructions → timed exam
- Question palette, mark-for-review, clear answer, tab-switch tracking,
  auto-submit at zero
- Refreshing, closing and reopening the link, or reconnecting after a
  dropped connection all resume the same attempt with the exact time
  remaining — the timer never pauses, resets, or restarts
- Result screen shown immediately on submit: score, correct/incorrect/
  unattempted breakdown, and negative-marking deduction shown separately
  when applicable — respecting the teacher's visibility setting (full
  breakdown / score only / hidden until released)

**Core timing rule** (exactly as specified): a student's available time is
`min(test duration, deadline − their start time)`. Starting late never
grants extra time beyond the deadline, and no one can start after the
deadline at all — enforced by Firestore security rules using the
server's clock, not the student's device.

## Security model — and its one deliberate tradeoff

- A teacher can only ever see and edit their own tests, question bank,
  and results — enforced by Firestore rules keyed on `ownerId`, not just
  by the UI.
- An exam's timer can't be extended by editing a device's clock: every
  save to an attempt, including the final submission, is checked against
  Firestore's own server clock (`request.time`) via security rules, not
  anything the client sends. A fresh attempt's time allowance is capped
  at what the test's actual configuration allows, independent of what a
  client tries to write.
- A student can resume (or double-check) only the one specific attempt
  they already have the ID for; they cannot browse or list other
  students' attempts. Only the owning teacher can list all attempts for
  a test.
- **The deliberate tradeoff**: since there's no server-side compute layer
  in this build (no Cloud Functions, to avoid requiring a billing
  account), a published test's correct answers are fully present in the
  document a student's browser reads, so their own browser can grade
  their exam instantly on submit. A technically curious student could
  find those answers via developer tools. This is a reasonable tradeoff
  for practice quizzes and classroom tests; it would not be appropriate
  for a high-stakes exam. A version of this app with server-side grading
  (via a Cloud Function that never lets the answer key reach a student's
  browser) has already been built for this project and can be restored —
  it requires Firebase's Blaze plan, which is still $0 at classroom scale
  but does require a billing method on file.

## Deployment options

Either works, since the app uses hash-based routing (`#/...`) and needs
no server-side rewrites:

- **GitHub Pages** — push this folder to a repo, enable Pages in Settings.
- **Firebase Hosting** — `firebase deploy --only hosting`.

## Honest limitations, stated plainly

- OCR accuracy on messy scans/handwriting will be rough — that's exactly
  why the Verify step is mandatory, not optional.
- See the security tradeoff above — this build prioritizes zero cost and
  instant results over answer-key secrecy.
- Question Bank items are flat (text/options/marks) — there's no tagging
  or search yet; fine for a small personal bank, not built to scale to
  hundreds of saved questions gracefully yet.
