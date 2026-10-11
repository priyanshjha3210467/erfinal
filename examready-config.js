/* ExamReady student-side configuration. Keep tunable product values here. */
(function (global) {
  'use strict';

  global.ExamReadyConfig = Object.freeze({
    storageKey: 'examready_student_progress_v1',
    firebase: Object.freeze({
      apiKey: 'AIzaSyCBUyyfSnI4KFz_hZ0uxJeg7HaaKf5kAxg',
      adminAccounts: Object.freeze([
        Object.freeze({ email: 'sanatandharameditz@gmail.com', uid: '0ivcFODXcXPzstYTRy9Qu3Iiny23' }),
        Object.freeze({ email: 'priyansh.jha3210@gmail.com', uid: 'RgBpjfynA3b7ytF1kMJmAK5KIn2' }),
        Object.freeze({ email: 'duelzone.official@gmail.com', uid: 'tQKPPknZq7Xa0rNe9XPlqZwtmtp2' })
      ])
    }),
    schemaVersion: 1,
    featureName: 'Streak',
    defaultProfileName: 'Student',
    defaultAvatar: '📚',
    profileAvatars: ['📚', '✏️', '🔬', '🎨', '🚀', '🌟'],
    maxAvatarDataUrlLength: 700000,
    maxProfiles: 6,
    maxEventsPerProfile: 5000,
    dailyGoals: Object.freeze({ casual: 5, regular: 10, serious: 20 }),
    freezeLimit: 2,
    examPauseLimitDays: 14,
    streakRiskHour: 18
  });
}(window));
