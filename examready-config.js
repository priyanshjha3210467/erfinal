/* ExamReady student-side configuration. Keep tunable product values here. */
(function (global) {
  'use strict';

  global.ExamReadyConfig = Object.freeze({
    storageKey: 'examready_student_progress_v1',
    firebase: Object.freeze({
      apiKey: '',
      adminUid: ''
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
