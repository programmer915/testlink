# TestLink — setup guide

This build runs entirely on Firebase's free **Spark** plan: Authentication
+ Firestore + (optionally) Hosting. There is no Cloud Functions step, and
nothing anywhere in this project ever requires a billing account or a
credit card. It will not run at all — no local/offline mode exists —
until it's connected to a Firebase project, which takes about 10 minutes.

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com → **Add project** → name it
   (e.g. "testlink-yourname") → skip Google Analytics if asked.
2. In the left sidebar: **Build → Authentication → Get started →
   Sign-in method → Email/Password → Enable → Save.**
3. In the left sidebar: **Build → Firestore Database → Create database
   → Start in production mode** (we'll add real rules in step 4) →
   pick a region close to you.

## 2. Get your web app config

1. Project Overview (gear icon) → **Project settings**.
2. Under "Your apps", click the **</> (web)** icon → register an app
   (any nickname) → **don't** check "Firebase Hosting" yet.
3. Copy the `firebaseConfig` object it shows you.

## 3. Paste it into `index.html`

Open `index.html`, find this block near the top of the `<script>` tag:

```js
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  ...
};
```

Replace every `PASTE_...` value with what Firebase gave you and save the
file. Until you do this, opening `index.html` shows a "Server setup
required" message instead of the app — that's expected.

## 4. Publish the security rules (this is the step that actually fixes access errors)

Firestore starts in "production mode" with default rules that deny
*everything* — that's why you'll see "Missing or insufficient
permissions" anywhere in the app until this step is done. No CLI needed:

1. In the Firebase Console: **Build → Firestore Database → Rules** tab.
2. Open `firestore.rules` from this folder, select all, copy it.
3. Paste it over whatever is currently in the Rules editor, replacing it entirely.
4. Click **Publish**.

Read the comment block at the bottom of `firestore.rules` — it explains
exactly what these rules do and do not protect against, in plain terms.

## 5. Put the file online

Pick one — both are free, and neither needs the command line if you'd
rather avoid it:

- **GitHub Pages** — push this folder to a GitHub repo → repo Settings →
  Pages → deploy from branch → your `index.html` is live at
  `https://yourname.github.io/repo/`.
- **Firebase Hosting** — needs the CLI once: `npm install -g firebase-tools`,
  then `firebase login`, `firebase init hosting` (choose your project,
  public directory = this folder), then `firebase deploy --only hosting`.

Either way, every teacher who signs up gets their own tests, question
bank, and results — visible from any device, any browser, after just
logging back in. Nothing is stored in the browser itself except a small
pointer used to resume an exam in progress (see the note at the bottom
of this guide).

## 6. Try the full loop once

1. Open the live URL, create a teacher account.
2. Create a test, extract or paste some questions, verify them, publish.
3. Open the share link in a private/incognito window (as a "student"),
   complete and submit it — you should see your score immediately.
4. Switch back to your teacher tab and open that test's Results page —
   the submission should already be there, no import step needed.
5. Refresh the student tab mid-exam next time (before submitting) to
   confirm the timer keeps counting down normally instead of freezing —
   that's the specific bug this architecture was built to fix.

## An important, deliberate tradeoff in this build

Because there's no Cloud Functions (no server-side compute at all), a
published test's questions — including the correct answers — are fully
readable by anyone with the link, including via browser developer tools.
This is what makes instant, on-submit grading possible without a paid
plan. If that's not an acceptable tradeoff for a particular test (e.g. a
graded exam rather than a practice quiz), the fix is reintroducing a
Cloud Function that holds the only copy of the answer key — which has
already been built once for this project and can be swapped back in, at
the cost of Firebase requiring a billing method on file for Cloud
Functions (even though actual usage costs $0 at classroom scale).

## What still runs entirely in the browser (by design)

PDF/image OCR extraction and the question verification screen run
client-side, same as always. The exam timer's *anchor point* — when an
attempt started, and how much time it's allowed — is decided once by the
browser but then locked in by Firestore's security rules using the
server's own clock (`request.time`), not the browser's: every save,
including the final submission, is checked against that server clock, so
changing a device's system clock doesn't buy extra time. The only thing
kept in browser storage is a small pointer — the attempt's ID — in
`localStorage`, purely so a refreshed or reopened tab knows which
Firestore record to resume; it never holds the timer or the answer data
itself, and a cached copy of a student's own final result (so revisiting
the same link on the same device shows it again without re-fetching).
