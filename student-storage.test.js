/* Run with: node student-storage.test.js */
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync(__dirname + '/student-storage.js', 'utf8');

function createStorage() {
  const values = {};
  const window = {
    localStorage: {
      getItem: key => values[key] || null,
      setItem: (key, value) => { values[key] = String(value); },
      removeItem: key => { delete values[key]; }
    },
    dispatchEvent: () => {},
    CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init.detail; }
  };
  vm.runInNewContext(source, {
    window, Date, JSON, Math, Number, String, Boolean, Object, Array, RegExp, Intl, Set, parseInt
  }, { filename: 'student-storage.js' });
  return window.ExamReadyStorage;
}

function dateAt(offset) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
}

function addActivities(storage, offset, count = 5) {
  const timestamp = dateAt(offset).toISOString();
  for (let index = 0; index < count; index += 1) {
    storage.recordQuestionAnswer({
      questionId: `q-${offset}-${index}`,
      prompt: 'Test prompt',
      correctAnswer: 'Test answer',
      subject: 'Mathematics',
      chapter: 'Revision',
      correct: true,
      timestamp
    });
  }
}

function testNormalDay() {
  const storage = createStorage(); storage.setDailyGoal('casual'); addActivities(storage, -1); addActivities(storage, 0);
  const summary = storage.getStreakSummary(); assert.strictEqual(summary.currentStreak, 2); assert.strictEqual(summary.todayDone, true);
}

function testMissedDayWithFreeze() {
  const storage = createStorage(); storage.setDailyGoal('casual'); for (let offset = -8; offset <= -2; offset += 1) addActivities(storage, offset); addActivities(storage, 0);
  const summary = storage.getStreakSummary(); assert.strictEqual(summary.week.find(day => day.date === dateAt(-1).toISOString().slice(0, 10))?.status, 'frozen'); assert.strictEqual(summary.currentStreak, 8);
}

function testMissedDayWithoutFreeze() {
  const storage = createStorage(); storage.setDailyGoal('casual'); for (let offset = -8; offset <= -3; offset += 1) addActivities(storage, offset); addActivities(storage, -1); addActivities(storage, 0);
  const summary = storage.getStreakSummary(); assert.strictEqual(summary.currentStreak, 2); assert.strictEqual(summary.freezesOwned, 0);
}

function testMultipleMissedDays() {
  const storage = createStorage(); storage.setDailyGoal('casual'); for (let offset = -8; offset <= -3; offset += 1) addActivities(storage, offset); addActivities(storage, 0);
  const summary = storage.getStreakSummary(); assert.strictEqual(summary.currentStreak, 1); assert.strictEqual(summary.week.find(day => day.date === dateAt(-1).toISOString().slice(0, 10))?.status, 'missed');
}

function testExamPause() {
  const storage = createStorage(); storage.setDailyGoal('casual'); for (let offset = -8; offset <= -2; offset += 1) addActivities(storage, offset); storage.setExamPause(true);
  const summary = storage.getStreakSummary(); assert.strictEqual(summary.paused, true); assert.strictEqual(summary.week.find(day => day.date === dateAt(0).toISOString().slice(0, 10))?.status, 'paused'); assert.strictEqual(summary.currentStreak, 7);
}

function testFutureEventsIgnored() {
  const storage = createStorage(); storage.setDailyGoal('casual'); addActivities(storage, 1); const summary = storage.getStreakSummary(); assert.strictEqual(summary.todayCount, 0); assert.strictEqual(summary.currentStreak, 0);
}

[testNormalDay, testMissedDayWithFreeze, testMissedDayWithoutFreeze, testMultipleMissedDays, testExamPause, testFutureEventsIgnored].forEach(test => { test(); console.log(`PASS ${test.name}`); });
