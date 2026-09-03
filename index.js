/**
 * Secure server-side grading — wired into the client's finishExam().
 * ----------------------------------------------------------------------
 * This is what keeps a student from reading the answer key out of
 * devtools before submitting: once a test is published, saveTest() in
 * index.html strips each question's `correct` field from the publicly
 * readable test document and writes it here instead, in a subcollection
 * only the owning teacher (and this function, via the admin SDK) can read.
 *
 * The client (finishExam() in index.html) calls this function instead of
 * grading locally whenever a test came from Firestore (i.e. has a slug).
 * It fetches the answer key, grades server-side, writes the result, and
 * returns only the score — never the key itself.
 *
 * Deploy with the Firebase CLI:
 *   npm install -g firebase-tools
 *   firebase init functions   (choose your existing project)
 *   # keep this file as functions/index.js — it already matches the client
 *   firebase deploy --only functions
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

exports.gradeTest = functions.https.onCall(async (data, context) => {
  const { testId, answers, student, tabSwitches, timeTakenMs, autoSubmitted } = data;

  const testSnap = await db.collection("tests").doc(testId).get();
  if (!testSnap.exists || testSnap.data().status !== "published") {
    throw new functions.https.HttpsError("failed-precondition", "This test is not open for attempts.");
  }
  const test = testSnap.data();

  const keySnap = await db.collection("tests").doc(testId).collection("private").doc("answerKey").get();
  if (!keySnap.exists) {
    throw new functions.https.HttpsError("failed-precondition", "No answer key found for this test.");
  }
  const answerKey = keySnap.data(); // { [questionId]: correctOptionIds[] }

  let score = 0, maxScore = 0, correctCount = 0, incorrectCount = 0, unattempted = 0;
  const perQuestionCorrect = {};

  (test.questions || []).forEach((q) => {
    maxScore += q.marks;
    const given = answers[q.id] || [];
    if (given.length === 0) { unattempted++; return; }

    const correct = new Set(answerKey[q.id] || []);
    const givenSet = new Set(given);
    const isCorrect = correct.size === givenSet.size && [...correct].every((c) => givenSet.has(c));
    perQuestionCorrect[q.id] = isCorrect;

    if (isCorrect) { score += q.marks; correctCount++; }
    else {
      incorrectCount++;
      const neg = test.config.negativeMarking ? (q.negativeMarks || test.config.negativeValue) : 0;
      score -= neg;
    }
  });
  score = Math.max(0, score);
  const percentage = maxScore ? (score / maxScore) * 100 : 0;

  const result = {
    id: db.collection("_ids").doc().id,
    testId, testName: test.meta.name,
    student, answers, perQuestionCorrect,
    score: Math.round(score * 100) / 100, maxScore, percentage,
    correctCount, incorrectCount, unattempted,
    timeTakenMs, tabSwitches: tabSwitches || 0,
    submittedAt: Date.now(), autoSubmitted: !!autoSubmitted,
  };

  await db.collection("tests").doc(testId).collection("results").doc(result.id).set(result);

  // Return only what the student is allowed to see; the client applies
  // the test's resultVisibility setting (immediate / scoreOnly / hidden)
  // when deciding what to actually display.
  return result;
});
