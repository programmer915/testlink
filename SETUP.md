# TestLink — going from local-only to a real synced website

The app works right now with zero setup: open `index.html`, everything
saves to your browser's localStorage. That's fine for testing on one
machine, but a shareable link only helps other students on other devices
once you turn on Firebase. This takes about 15 minutes.

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com → **Add project** → name it
   (e.g. "testlink-yourname") → skip Google Analytics if asked.
2. In the left sidebar: **Build → Authentication → Get started →
   Sign-in method → Email/Password → Enable → Save.**
3. In the left sidebar: **Build → Firestore Database → Create database
   → Start in production mode** (we'll paste real rules in a minute) →
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

Replace every `PASTE_...` value with what Firebase gave you, save the
file, and reload it in a browser. You should now see a **Sign in /
Create account** screen instead of the dashboard — that's the app
detecting Firebase is configured. Create a teacher account and you're in.

## 4. Deploy the security rules

Without this step, Firestore's default production rules block
everything, including your own app.

1. Install the CLI once: `npm install -g firebase-tools`
2. `firebase login`
3. In this folder: `firebase init firestore` → pick your project →
   when it asks for a rules file, point it at the included
   `firestore.rules` (or paste its contents into the one it generates).
4. `firebase deploy --only firestore:rules`

Read the comment block at the bottom of `firestore.rules` — it explains
exactly what these rules do and do not protect against.

## 5. Put the file online

Pick one:

- **Fastest**: push this folder to a GitHub repo → GitHub Pages
  (Settings → Pages → deploy from branch) → your `index.html` is live
  at `https://yourname.github.io/repo/`.
- **Firebase Hosting** (keeps everything in one place):
  `firebase init hosting` (public directory = this folder) →
  `firebase deploy --only hosting`.

Either way, the shareable links your teachers generate will work from
any device, because the test data now lives in Firestore instead of
being embedded in the URL.

## 6. Deploy secure grading (required for synced tests to be gradable)

Once Firebase is on, publishing a test strips the answer key out of the
document students can read — that's what makes it safe to use for
anything grade-bearing. But it means grading has moved to a Cloud
Function, so **a synced test won't be able to grade itself until you
deploy this once**:

```
firebase init functions      # choose your existing project, JavaScript, and
                              # when it asks to overwrite functions/, say yes
                              # (this repo's functions/index.js is already correct)
firebase deploy --only functions
```

That's it — no code changes needed, this repo's `functions/index.js` and
`functions/package.json` are already wired to match the client. If you
publish a test before deploying this, students will see a clear "couldn't
submit" message with a retry button rather than a silent failure or an
exposed answer key.

(Local-only mode, without Firebase, still grades entirely in the browser
as before — this step only applies once you've turned Firebase on.)

## What still doesn't require a backend at all

PDF/image extraction, the question verification screen, test
configuration, and the whole teacher wizard run entirely in the
browser already — none of that changes with Firebase. Firebase is only
responsible for: teacher accounts, and making tests/results visible
across devices instead of stuck in one browser's localStorage.
