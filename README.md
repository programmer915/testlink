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
| Tests (draft + published), config, questions (+ answers, unless "hidden") | `tests/{testId}`, scoped by `ownerId` |
| Answer key for "hidden" result-visibility tests | `tests/{testId}/private/answerKey` — owner only |
| One-attempt-per-mobile-number locks | `tests/{testId}/mobileClaims/{mobileKey}` |
| Active & submitted exam attempts (timer, answers, order, score) | `tests/{testId}/attempts/{attemptId}` |
| Saved/reusable questions | `questionBank/{itemId}`, scoped by `ownerId` |

A "result" isn't a separate thing — it's just an attempt document with
`status: 'submitted'`. For most tests, the graded fields (score,
correctCount, etc.) are filled in by the student's own browser the
instant they submit. For tests set to "Hidden" result visibility, the
attempt carries raw answers only, and the teacher's Results page grades
it the moment it's opened — see the Security model section below.

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
- **AI conversion prompt**: a copiable prompt for pasting your question
  paper (in any messy layout) into an AI assistant, which reformats it
  into text this app's parser can extract automatically
- Mandatory verification screen (✓ Verified / ⚠ Needs Review / ✎ Edited)
  before anything can be published — extraction errors never go live silently
- Full question editor: single-choice, multiple-choice, true/false, and
  numerical (accepted-range) questions, each with text, an optional
  image, marks, and negative marks
- **Question Bank**: save any verified question for reuse, and pull saved
  questions into any future test instead of retyping them
- Test configuration: duration, opens-at, hard deadline, attempts allowed,
  negative marking, question/option randomization, review permissions,
  result visibility, pass percentage
- **Preview as Student**: walk through the exact exam UI and result
  screen before publishing — never touches the server, never counts as
  a real attempt
- One-click publish → shareable link, live the moment it's published
- **Question Paper export**: generate the current test as a clean,
  print-ready `.docx` — title, total marks, duration, negative-marking
  rule, and every question with its options in the actual configured
  order, with no answers included
- **Results dashboard**: per-student scores, tab-switch counts, class
  average, pass rate, a self-contained CSV export (test name/marks/
  duration/averages included as a header block, not just the raw rows),
  and a per-student "View responses" breakdown showing exactly what they
  answered against the correct answer, question by question
- **Question-wise analytics**: for every question — attempted/
  unattempted/correct/wrong counts, accuracy, average marks earned, and
  a difficulty rating (Easy/Moderate/Hard) derived from actual student
  performance, with flags for high-wrong-rate and frequently-skipped
  questions
- **Unfinished Attempts view**: see who's currently mid-exam versus who
  started but never finished (derived from each attempt's own time
  allowance, not a separate stored status), with started-at, elapsed
  time, last activity, questions answered, and tab switches — plus a
  Reset action that clears a stuck attempt so the student can restart
  under the exact same rules a fresh attempt would follow
- **Remove a wrong or duplicate submission**, or **release a mobile
  number** whose attempt got stuck without finishing — both directly
  from the Results page
- All of the above is visible from any device the moment you log in —
  results appear automatically as students submit, with no manual
  import step

**Student side**
- Simple details form (name, class, roll number, mobile number) →
  instructions → timed exam
- **Up to the teacher's configured number of attempts per mobile
  number**, enforced server-side — see the Security model section for
  exactly what this does and doesn't guard against
- Question palette, mark-for-review, clear answer, tab-switch tracking,
  auto-submit at zero
- Refreshing, closing and reopening the link, or reconnecting after a
  dropped connection all resume the same attempt with the exact time
  remaining — the timer never pauses, resets, or restarts
- A visible warning (with automatic retry) if the connection drops
  mid-exam, instead of silently failing to save an answer
- Every question clearly labelled by type — Single Choice, Multiple
  Choice, True/False, or Numerical Answer — right above the question text
- Result screen shown immediately on submit — score, correct/incorrect/
  unattempted breakdown, and negative-marking deduction shown separately
  when applicable — for "Show immediately"/"Score only" tests. "Hidden"
  tests instead show a plain submission confirmation, since grading for
  those happens later on the teacher's side (see Security model)

**Core timing rule** (exactly as specified): a student's available time is
`min(test duration, deadline − their start time)`. Starting late never
grants extra time beyond the deadline, and no one can start after the
deadline at all — enforced by Firestore security rules using the
server's clock, not the student's device.

## Security model

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
  a test, or delete a wrong/duplicate one from the Results page.
- **Each mobile number gets up to the test's own "Allowed attempts per
  student" limit** (Configure), enforced by an atomically incrementing
  counter on a Firestore rule — the count can only ever go up by exactly
  one per write, and never past the configured limit, with no query or
  Cloud Function needed to check "how many times has this number been
  used". Since there's no SMS/OTP verification, a determined student can
  still type a fake number — this stops accidental or casual
  re-attempts, not deliberate dishonesty. If a genuine attempt gets stuck
  (dropped connection, never finished), the teacher's "Release a mobile
  number" tool on the Results page clears it for a real retry, on top of
  whatever attempts remained.
- **Per-test answer-key handling, tied to the existing "Result
  visibility" setting**:
  - *Show immediately / Score only* — the answer key travels inside the
    published test's document, so a student's own browser can grade
    their exam instantly and show a full result on submit. The tradeoff:
    a technically curious student could find the answer key via
    developer tools. Fine for practice quizzes; not for anything
    high-stakes.
  - *Hidden until released* — the answer key is stripped out of the
    public test entirely and stored in a private, owner-only
    subcollection instead. A student's browser only ever submits raw
    answers — it never has the key, before, during, or after the exam.
    Grading happens later, in the teacher's own browser, the moment the
    Results page is opened. The cost: the student gets no score at all
    until the teacher looks, since there's no server compute layer to do
    it for them instantly. Pick this mode for anything you don't want a
    curious student poking at.
- If even the "immediate" mode's tradeoff needs closing later — e.g. you
  want instant results *and* full secrecy — the fix is a Cloud Function
  that grades everything server-side regardless of visibility setting.
  Already built once for this project and can be restored; it requires
  Firebase's Blaze plan (still $0 at classroom scale, but does require a
  billing method on file).

## Deployment options

Either works, since the app uses hash-based routing (`#/...`) and needs
no server-side rewrites:

- **GitHub Pages** — push this folder to a repo, enable Pages in Settings.
- **Firebase Hosting** — `firebase deploy --only hosting`.

## Staying within Firestore's free tier

This app is built to run indefinitely on Firebase's free Spark plan, so a
few things exist specifically to keep it there:

- **A live document-size indicator in the test editor.** Every question
  in a test — including any attached image — lives in one Firestore
  document, which has a hard 1 MiB cap. The wizard now shows an
  approximate running size (OK / getting large / critical / over limit)
  on every step, recalculated on every edit. Saving and publishing are
  both blocked outright once a test would exceed 1 MiB, with a plain
  explanation, instead of failing silently or with a confusing server
  error.
- **No unnecessary Firestore reads during an exam.** Every answer save
  and 30-second heartbeat now does exactly one write and zero reads.
  (An earlier version read the document back after every write, to
  fine-tune the on-screen timer — that cost a second Firestore
  operation on every single sync, for a value that was only ever
  cosmetic display, never actual enforcement.)
- **The Results page's live listener shuts off the moment you navigate
  away from it**, instead of continuing to consume reads in the
  background for every student's heartbeat on a test you're no longer
  looking at.
- **Total stored data (the 1 GiB cap)** isn't actively managed by the
  app — the practical mitigation is the same Delete button already on
  the Dashboard: periodically removing old tests you no longer need
  keeps long-term storage bounded. There's no automatic cleanup.

None of this required Cloud Functions or Cloud Storage — both remain
deliberately out of this build (see the Security model section above for
why, and what would change if that constraint is ever lifted).

## Honest limitations, stated plainly

- OCR accuracy on messy scans/handwriting will be rough — that's exactly
  why the Verify step is mandatory, not optional.
- See the security tradeoff above — "immediate"/"score only" tests
  prioritize instant results over answer-key secrecy; "hidden" tests
  close that gap at the cost of the student seeing nothing until the
  teacher looks.
- Question Bank items are flat (text/options/marks) — there's no tagging
  or search yet; fine for a small personal bank, not built to scale to
  hundreds of saved questions gracefully yet.
- **Images live embedded in the test document itself** (as compressed
  JPEG data), since this build has no separate file storage — there's no
  extra setup step, but it means a test's total document size (all its
  questions combined) has to stay under Firestore's 1 MiB-per-document
  limit. A handful of diagrams per test is comfortably fine; dozens of
  large images on one test is not. The printable `.docx` question paper
  does not currently include images — only text and options.
- **Firestore's free daily write quota (20,000/day) is a real ceiling.**
  Each student writes roughly one "heartbeat" every 30 seconds for as
  long as the exam is open, plus one write per answer change, plus the
  final submit — very roughly 100–150 writes for a ~45-minute exam. That
  puts a rough, approximate ceiling of somewhere around 150–200 students
  *on the same calendar day, across every test in the project combined*
  before the free quota is exhausted for the day (it resets daily). This
  is about total operations performed that day, not how much data is
  stored — deleting old tests or results does not raise this ceiling. If
  you outgrow it, the practical fixes, in order of effort: stretch the
  heartbeat interval further (in `heartbeat()`'s `setInterval` call in
  `index.html`, currently 30 seconds), spread a large cohort's exam
  across more than one calendar day, or move to Firestore's paid tier
  (usage-based, but no longer "free" once past the quota).
