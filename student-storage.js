/*
 * ExamReady student data layer.
 * Student progress is profile-scoped and is the only module that owns its
 * localStorage keys. Content/admin storage intentionally remains separate.
 */
(function (global) {
  'use strict';

  const CONFIG = global.ExamReadyConfig || {
    storageKey: 'examready_student_progress_v1',
    schemaVersion: 1,
    defaultProfileName: 'Student',
    defaultAvatar: '📚',
    profileAvatars: ['📚', '✏️', '🔬', '🎨', '🚀', '🌟'],
    maxAvatarDataUrlLength: 700000,
    maxProfiles: 6,
    maxEventsPerProfile: 5000
  };

  const EVENT_TYPES = new Set([
    'questionAnswered', 'cardReviewed', 'dailyGoalSet', 'freezeEarned',
    'freezeUsed', 'pauseStarted', 'pauseEnded', 'profileCreated',
    'profileUpdated', 'quizCompleted', 'mistakeReviewed', 'mistakeCleared'
  ]);
  const listeners = new Set();
  let memoryState = null;

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (error) { return null; }
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function makeId(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function cleanText(value, fallback, maxLength) {
    const text = String(value == null ? '' : value)
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength);
    return text || fallback;
  }

  function cleanAvatar(value) {
    const avatar = String(value || '').trim();
    const maxDataUrlLength = Number(CONFIG.maxAvatarDataUrlLength) || 700000;
    if (/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(avatar) && avatar.length <= maxDataUrlLength) return avatar;
    const textAvatar = avatar.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 12);
    return textAvatar || CONFIG.defaultAvatar;
  }

  function sanitizeDetails(value, depth) {
    if (depth > 3) return null;
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      if (typeof value === 'string') return value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 500);
      return value;
    }
    if (Array.isArray(value)) return value.slice(0, 20).map(item => sanitizeDetails(item, depth + 1));
    if (typeof value === 'object') {
      const result = {};
      Object.keys(value).slice(0, 30).forEach(key => {
        const safeKey = cleanText(key, '', 60);
        if (safeKey) result[safeKey] = sanitizeDetails(value[key], depth + 1);
      });
      return result;
    }
    return null;
  }

  function localDateKey(timestamp) {
    const date = new Date(timestamp == null ? Date.now() : timestamp);
    if (!Number.isFinite(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function dateFromKey(key) {
    const parts = String(key || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) return null;
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
  }

  function addDaysKey(key, amount) {
    const date = dateFromKey(key);
    if (!date) return '';
    date.setDate(date.getDate() + Number(amount || 0));
    return localDateKey(date);
  }

  function getGoalTarget(profile) {
    const configured = profile && profile.dailyGoal && Number(profile.dailyGoal.target);
    return configured > 0 ? configured : null;
  }

  function isPauseDate(profile, dateKey) {
    const pause = profile && profile.settings && profile.settings.examPause;
    if (!pause || !pause.active || !pause.startedAt) return false;
    const start = localDateKey(pause.startedAt);
    const end = localDateKey(pause.endsAt || pause.startedAt);
    return dateKey >= start && dateKey <= end;
  }

  function createProfileRecord(name, avatar) {
    const createdAt = nowIso();
    const userId = makeId('user');
    return {
      schemaVersion: CONFIG.schemaVersion,
      profile: {
        userId,
        name: cleanText(name, CONFIG.defaultProfileName, 40),
        avatar: cleanAvatar(avatar),
        createdAt,
        updatedAt: createdAt
      },
      dailyGoal: null,
      events: [],
      flashcards: {},
      mistakes: [],
      personalFlashcards: {},
      settings: {},
      backup: { lastExportAt: null }
    };
  }

  function normalizeProfile(profile) {
    const fallback = createProfileRecord(CONFIG.defaultProfileName, CONFIG.defaultAvatar);
    if (!profile || typeof profile !== 'object') return fallback;
    const source = profile.profile && typeof profile.profile === 'object' ? profile.profile : {};
    const normalized = {
      schemaVersion: CONFIG.schemaVersion,
      profile: {
        userId: cleanText(source.userId, fallback.profile.userId, 100),
        name: cleanText(source.name, CONFIG.defaultProfileName, 40),
        avatar: cleanAvatar(source.avatar),
        createdAt: String(source.createdAt || fallback.profile.createdAt),
        updatedAt: String(source.updatedAt || fallback.profile.updatedAt)
      },
      dailyGoal: profile.dailyGoal && typeof profile.dailyGoal === 'object' ? clone(profile.dailyGoal) : null,
      events: Array.isArray(profile.events) ? profile.events.slice(-CONFIG.maxEventsPerProfile) : [],
      flashcards: profile.flashcards && typeof profile.flashcards === 'object' ? clone(profile.flashcards) : {},
      mistakes: Array.isArray(profile.mistakes) ? clone(profile.mistakes) : [],
      personalFlashcards: profile.personalFlashcards && typeof profile.personalFlashcards === 'object'
        ? clone(profile.personalFlashcards) : {},
      settings: profile.settings && typeof profile.settings === 'object' ? clone(profile.settings) : {},
      backup: profile.backup && typeof profile.backup === 'object'
        ? { lastExportAt: profile.backup.lastExportAt ? String(profile.backup.lastExportAt) : null }
        : { lastExportAt: null }
    };
    return normalized;
  }

  function normalizeState(state) {
    const profiles = {};
    if (state && state.profiles && typeof state.profiles === 'object') {
      Object.keys(state.profiles).slice(0, CONFIG.maxProfiles).forEach(id => {
        const profile = normalizeProfile(state.profiles[id]);
        profiles[profile.profile.userId] = profile;
      });
    }
    if (!Object.keys(profiles).length) {
      const profile = createProfileRecord(CONFIG.defaultProfileName, CONFIG.defaultAvatar);
      profiles[profile.profile.userId] = profile;
    }
    const activeProfileId = profiles[state && state.activeProfileId] ? state.activeProfileId : Object.keys(profiles)[0];
    return { schemaVersion: CONFIG.schemaVersion, activeProfileId, profiles };
  }

  function readState() {
    if (memoryState) return normalizeState(memoryState);
    try {
      const raw = global.localStorage.getItem(CONFIG.storageKey);
      memoryState = raw ? JSON.parse(raw) : null;
    } catch (error) {
      memoryState = null;
    }
    memoryState = normalizeState(memoryState);
    writeState(memoryState);
    return normalizeState(memoryState);
  }

  function writeState(state) {
    memoryState = normalizeState(state);
    try {
      global.localStorage.setItem(CONFIG.storageKey, JSON.stringify(memoryState));
    } catch (error) {
      // Keep the in-memory copy usable when storage is blocked or full.
    }
  }

  function emit(type, detail) {
    const payload = { type, detail: clone(detail) };
    listeners.forEach(listener => {
      try { listener(payload); } catch (error) { /* A listener must not break storage. */ }
    });
    try { global.dispatchEvent(new CustomEvent('examready:' + type, { detail: payload })); } catch (error) {}
  }

  function getActiveId() {
    return readState().activeProfileId;
  }

  function getProgress(profileId) {
    const state = readState();
    const profile = state.profiles[profileId || state.activeProfileId];
    return profile ? clone(profile) : null;
  }

  function saveProgress(progress, profileId) {
    const state = readState();
    const id = profileId || progress?.profile?.userId || state.activeProfileId;
    if (!state.profiles[id] || !progress || typeof progress !== 'object') return null;
    const next = normalizeProfile({ ...progress, profile: { ...progress.profile, userId: id, updatedAt: nowIso() } });
    state.profiles[id] = next;
    writeState(state);
    emit('progressSaved', { userId: id });
    return clone(next);
  }

  function logEvent(type, details, timestamp) {
    const safeType = cleanText(type, '', 60);
    if (!safeType || (!EVENT_TYPES.has(safeType) && !/^[a-z][A-Za-z0-9]{2,59}$/.test(safeType))) return null;
    const state = readState();
    const profile = state.profiles[state.activeProfileId];
    if (!profile) return null;
    const parsedTime = timestamp == null ? Date.now() : new Date(timestamp).getTime();
    const event = {
      id: makeId('event'),
      type: safeType,
      timestamp: Number.isFinite(parsedTime) ? new Date(parsedTime).toISOString() : nowIso(),
      details: sanitizeDetails(details || {}, 0)
    };
    profile.events = profile.events.concat(event).slice(-CONFIG.maxEventsPerProfile);
    profile.profile.updatedAt = nowIso();
    state.profiles[state.activeProfileId] = profile;
    writeState(state);
    emit('eventLogged', event);
    return clone(event);
  }

  function createProfile(name, avatar) {
    const state = readState();
    if (Object.keys(state.profiles).length >= CONFIG.maxProfiles) return null;
    const profile = createProfileRecord(name, avatar);
    state.profiles[profile.profile.userId] = profile;
    state.activeProfileId = profile.profile.userId;
    writeState(state);
    logEvent('profileCreated', { name: profile.profile.name });
    emit('profileChanged', profile.profile);
    return clone(profile.profile);
  }

  function updateProfile(fields, profileId) {
    const state = readState();
    const id = profileId || state.activeProfileId;
    const profile = state.profiles[id];
    if (!profile || !fields || typeof fields !== 'object') return null;
    profile.profile.name = cleanText(fields.name, profile.profile.name, 40);
    profile.profile.avatar = cleanAvatar(fields.avatar || profile.profile.avatar);
    profile.profile.updatedAt = nowIso();
    state.profiles[id] = profile;
    writeState(state);
    emit('profileChanged', profile.profile);
    return clone(profile.profile);
  }

  function setActiveProfile(profileId) {
    const state = readState();
    if (!state.profiles[profileId]) return null;
    state.activeProfileId = profileId;
    writeState(state);
    emit('profileChanged', state.profiles[profileId].profile);
    return clone(state.profiles[profileId].profile);
  }

  function deleteProfile(profileId) {
    const state = readState();
    const id = profileId || state.activeProfileId;
    if (!state.profiles[id] || Object.keys(state.profiles).length <= 1) return false;
    delete state.profiles[id];
    if (!state.profiles[state.activeProfileId]) state.activeProfileId = Object.keys(state.profiles)[0];
    writeState(state);
    emit('profileChanged', state.profiles[state.activeProfileId].profile);
    return true;
  }

  function getProfiles() {
    const state = readState();
    return Object.values(state.profiles).map(profile => ({
      userId: profile.profile.userId,
      name: profile.profile.name,
      avatar: profile.profile.avatar,
      createdAt: profile.profile.createdAt,
      updatedAt: profile.profile.updatedAt,
      active: profile.profile.userId === state.activeProfileId
    }));
  }

  function getActiveProfile() {
    const progress = getProgress();
    return progress ? clone(progress.profile) : null;
  }

  function getFlashcardSchedules() {
    const progress = getProgress();
    return progress && progress.flashcards && typeof progress.flashcards === 'object'
      ? clone(progress.flashcards)
      : {};
  }

  function getDueCardIds(cardIds, at) {
    const ids = Array.isArray(cardIds) ? cardIds : [];
    const schedules = getFlashcardSchedules();
    const now = at == null ? Date.now() : new Date(at).getTime();
    const timestamp = Number.isFinite(now) ? now : Date.now();
    return ids.filter(id => {
      const schedule = schedules[id];
      if (!schedule || !schedule.nextReviewAt) return true;
      const dueAt = new Date(schedule.nextReviewAt).getTime();
      return !Number.isFinite(dueAt) || dueAt <= timestamp;
    });
  }

  function reviewFlashcard(cardId, rating, details) {
    const id = cleanText(cardId, '', 120);
    const quality = ['again', 'hard', 'good', 'easy'].indexOf(String(rating || '').toLowerCase()) !== -1
      ? String(rating).toLowerCase()
      : '';
    if (!id || !quality) return null;
    const state = readState();
    const profile = state.profiles[state.activeProfileId];
    if (!profile) return null;
    profile.flashcards = profile.flashcards && typeof profile.flashcards === 'object' ? profile.flashcards : {};
    const previous = profile.flashcards[id] || { intervalDays: 0, ease: 2.5, repetitions: 0 };
    const ease = Math.max(1.3, Number(previous.ease) || 2.5);
    let intervalDays = Math.max(0, Number(previous.intervalDays) || 0);
    let nextEase = ease;
    if (quality === 'again') {
      intervalDays = 0;
      nextEase = Math.max(1.3, ease - 0.2);
    } else if (quality === 'hard') {
      intervalDays = Math.max(1, Math.round((intervalDays || 1) * 1.2));
      nextEase = Math.max(1.3, ease - 0.15);
    } else if (quality === 'good') {
      intervalDays = intervalDays ? Math.max(1, Math.round(intervalDays * ease)) : 1;
    } else if (quality === 'easy') {
      intervalDays = intervalDays ? Math.max(2, Math.round(intervalDays * ease * 1.3)) : 4;
      nextEase = Math.min(3.0, ease + 0.15);
    }
    const reviewedAt = Date.now();
    const nextReviewAt = new Date(reviewedAt + (intervalDays ? intervalDays * 86400000 : 10 * 60000)).toISOString();
    profile.flashcards[id] = {
      intervalDays,
      ease: Number(nextEase.toFixed(2)),
      repetitions: quality === 'again' ? 0 : (Number(previous.repetitions) || 0) + 1,
      lastReviewedAt: new Date(reviewedAt).toISOString(),
      nextReviewAt
    };
    profile.profile.updatedAt = nowIso();
    state.profiles[state.activeProfileId] = profile;
    writeState(state);
    const event = {
      cardId: id,
      rating: quality,
      intervalDays,
      ...(details && typeof details === 'object' ? details : {})
    };
    const logged = logEvent('cardReviewed', event, reviewedAt);
    return { schedule: clone(profile.flashcards[id]), event: logged };
  }

  function saveMistake(mistake) {
    if (!mistake || typeof mistake !== 'object') return null;
    const sourceId = cleanText(mistake.sourceId || mistake.cardId, '', 120);
    const sourceType = cleanText(mistake.sourceType, 'flashcard', 40);
    const prompt = cleanText(mistake.prompt || mistake.question || mistake.front, '', 4000);
    const answer = cleanText(mistake.answer || mistake.back, '', 4000);
    if (!sourceId || !prompt || !answer) return null;
    const state = readState();
    const profile = state.profiles[state.activeProfileId];
    if (!profile) return null;
    profile.mistakes = Array.isArray(profile.mistakes) ? profile.mistakes : [];
    const existing = profile.mistakes.find(item => item.sourceType === sourceType && item.sourceId === sourceId);
    const timestamp = nowIso();
    if (existing) {
      existing.prompt = prompt;
      existing.answer = answer;
      existing.hint = cleanText(mistake.hint, '', 500);
      existing.lastSeenAt = timestamp;
      existing.timesSeen = (Number(existing.timesSeen) || 0) + 1;
      existing.correctStreak = 0;
    } else {
      profile.mistakes.push({
        id: makeId('mistake'),
        sourceType,
        sourceId,
        prompt,
        answer,
        hint: cleanText(mistake.hint, '', 500),
        class: cleanText(mistake.class, '', 20),
        subject: cleanText(mistake.subject, '', 80),
        chapter: cleanText(mistake.chapter, '', 120),
        createdAt: timestamp,
        lastSeenAt: timestamp,
        timesSeen: 1,
        correctStreak: 0
      });
    }
    profile.profile.updatedAt = timestamp;
    state.profiles[state.activeProfileId] = profile;
    writeState(state);
    const saved = existing || profile.mistakes[profile.mistakes.length - 1];
    emit('mistakeSaved', saved);
    return clone(saved);
  }

  function getMistakes() {
    const progress = getProgress();
    return progress && Array.isArray(progress.mistakes) ? clone(progress.mistakes) : [];
  }

  function recordQuestionAnswer(details) {
    const data = details && typeof details === 'object' ? details : {};
    const questionId = cleanText(data.questionId || data.sourceId, '', 120);
    if (!questionId) return null;
    const correct = data.correct === true;
    const event = logEvent('questionAnswered', {
      questionId,
      quizId: cleanText(data.quizId, '', 120),
      class: cleanText(data.class, '', 20),
      subject: cleanText(data.subject, '', 80),
      chapter: cleanText(data.chapter, '', 120),
      correct,
      time: Math.max(0, Number(data.time) || 0)
    }, data.timestamp);
    if (!correct) {
      saveMistake({
        sourceType: 'question',
        sourceId: questionId,
        prompt: data.prompt,
        answer: data.correctAnswer,
        hint: data.explanation,
        class: data.class,
        subject: data.subject,
        chapter: data.chapter
      });
    }
    return event;
  }

  function recordQuizResult(details) {
    const data = details && typeof details === 'object' ? details : {};
    return logEvent('quizCompleted', {
      quizId: cleanText(data.quizId, '', 120),
      title: cleanText(data.title, '', 180),
      class: cleanText(data.class, '', 20),
      subject: cleanText(data.subject, '', 80),
      score: Math.max(0, Math.min(100, Number(data.score) || 0)),
      correct: Math.max(0, Number(data.correct) || 0),
      total: Math.max(0, Number(data.total) || 0),
      time: Math.max(0, Number(data.time) || 0)
    });
  }

  function answerMistake(mistakeId, correct) {
    const id = cleanText(mistakeId, '', 120);
    if (!id) return null;
    const state = readState();
    const profile = state.profiles[state.activeProfileId];
    const mistake = profile && Array.isArray(profile.mistakes)
      ? profile.mistakes.find(item => item.id === id) : null;
    if (!mistake) return null;
    mistake.lastSeenAt = nowIso();
    mistake.timesSeen = (Number(mistake.timesSeen) || 0) + 1;
    mistake.correctStreak = correct === true ? (Number(mistake.correctStreak) || 0) + 1 : 0;
    let cleared = false;
    if (mistake.correctStreak >= 2) {
      profile.mistakes = profile.mistakes.filter(item => item.id !== id);
      cleared = true;
    }
    profile.profile.updatedAt = nowIso();
    state.profiles[state.activeProfileId] = profile;
    writeState(state);
    logEvent(correct === true ? 'mistakeCleared' : 'mistakeReviewed', {
      mistakeId: id,
      correct: correct === true,
      cleared
    });
    emit(cleared ? 'mistakeCleared' : 'mistakeReviewed', { mistakeId: id, cleared });
    return { cleared, mistake: cleared ? null : clone(mistake) };
  }

  function removeMistake(mistakeId) {
    const id = cleanText(mistakeId, '', 120);
    const state = readState();
    const profile = state.profiles[state.activeProfileId];
    if (!profile || !Array.isArray(profile.mistakes)) return false;
    const before = profile.mistakes.length;
    profile.mistakes = profile.mistakes.filter(item => item.id !== id);
    if (before === profile.mistakes.length) return false;
    profile.profile.updatedAt = nowIso();
    state.profiles[state.activeProfileId] = profile;
    writeState(state);
    emit('mistakeRemoved', { mistakeId: id });
    return true;
  }

  function convertMistakeToPersonalFlashcard(mistakeId) {
    const id = cleanText(mistakeId, '', 120);
    const state = readState();
    const profile = state.profiles[state.activeProfileId];
    const mistake = profile && Array.isArray(profile.mistakes)
      ? profile.mistakes.find(item => item.id === id) : null;
    if (!mistake) return null;
    profile.personalFlashcards = profile.personalFlashcards && typeof profile.personalFlashcards === 'object'
      ? profile.personalFlashcards : {};
    const cardId = `personal_${id}`;
    profile.personalFlashcards[cardId] = {
      id: cardId,
      front: mistake.prompt,
      back: mistake.answer,
      hint: mistake.hint || '',
      sourceMistakeId: id,
      class: mistake.class || '',
      subject: mistake.subject || '',
      chapter: mistake.chapter || '',
      createdAt: profile.personalFlashcards[cardId]?.createdAt || nowIso()
    };
    profile.profile.updatedAt = nowIso();
    state.profiles[state.activeProfileId] = profile;
    writeState(state);
    emit('personalFlashcardSaved', profile.personalFlashcards[cardId]);
    return clone(profile.personalFlashcards[cardId]);
  }

  function getPersonalFlashcards() {
    const progress = getProgress();
    return progress && progress.personalFlashcards && typeof progress.personalFlashcards === 'object'
      ? clone(Object.values(progress.personalFlashcards)) : [];
  }

  function setDailyGoal(levelOrTarget) {
    const goals = CONFIG.dailyGoals || { casual: 5, regular: 10, serious: 20 };
    const numeric = Number(levelOrTarget);
    const level = typeof levelOrTarget === 'string' && goals[levelOrTarget] ? levelOrTarget
      : Object.keys(goals).find(key => Number(goals[key]) === numeric) || 'regular';
    const target = Number(goals[level]) || numeric || 10;
    const state = readState();
    const profile = state.profiles[state.activeProfileId];
    if (!profile) return null;
    const timestamp = nowIso();
    profile.dailyGoal = { level, target, createdAt: profile.dailyGoal?.createdAt || timestamp, updatedAt: timestamp };
    profile.profile.updatedAt = timestamp;
    state.profiles[state.activeProfileId] = profile;
    writeState(state);
    logEvent('dailyGoalSet', { level, target });
    emit('goalChanged', profile.dailyGoal);
    return clone(profile.dailyGoal);
  }

  function getDailyGoal() {
    const progress = getProgress();
    return progress && progress.dailyGoal ? clone(progress.dailyGoal) : null;
  }

  function setExamPause(enabled) {
    const state = readState();
    const profile = state.profiles[state.activeProfileId];
    if (!profile) return null;
    profile.settings = profile.settings && typeof profile.settings === 'object' ? profile.settings : {};
    const active = enabled === true;
    const timestamp = nowIso();
    profile.settings.examPause = active ? {
      active: true,
      startedAt: timestamp,
      endsAt: new Date(Date.now() + (Number(CONFIG.examPauseLimitDays) || 14) * 86400000).toISOString()
    } : {
      active: false,
      startedAt: profile.settings.examPause?.startedAt || timestamp,
      endsAt: timestamp
    };
    profile.profile.updatedAt = timestamp;
    state.profiles[state.activeProfileId] = profile;
    writeState(state);
    logEvent(active ? 'pauseStarted' : 'pauseEnded', { endsAt: profile.settings.examPause.endsAt });
    emit('pauseChanged', profile.settings.examPause);
    return clone(profile.settings.examPause);
  }

  function getStreakSummary(at) {
    const progress = getProgress();
    const profile = progress;
    const today = localDateKey(at == null ? Date.now() : at);
    const target = getGoalTarget(profile);
    const activityCounts = {};
    (profile?.events || []).forEach(event => {
      if (!['questionAnswered', 'cardReviewed'].includes(event.type)) return;
      const key = localDateKey(event.timestamp);
      if (key) activityCounts[key] = (activityCounts[key] || 0) + 1;
    });
    const statusByDate = {};
    let streak = 0;
    let longest = 0;
    let freezes = 0;
    const days = [];
    const start = addDaysKey(today, -119);
    for (let offset = 0; offset < 120; offset += 1) {
      const date = addDaysKey(start, offset);
      const count = activityCounts[date] || 0;
      const paused = isPauseDate(profile, date);
      let status = 'no-goal';
      if (target) {
        if (paused) {
          status = 'paused';
        } else if (count >= target) {
          streak += 1;
          longest = Math.max(longest, streak);
          status = 'met';
          if (streak > 0 && streak % 7 === 0) freezes = Math.min(Number(CONFIG.freezeLimit) || 2, freezes + 1);
        } else if (date === today) {
          status = 'today';
        } else if (freezes > 0 && streak > 0) {
          freezes -= 1;
          status = 'frozen';
        } else {
          streak = 0;
          status = 'missed';
        }
      }
      statusByDate[date] = status;
      days.push({ date, count, status, paused });
    }
    const todayCount = activityCounts[today] || 0;
    const todayDone = !!target && todayCount >= target;
    const todayDate = dateFromKey(today) || new Date();
    const monday = new Date(todayDate);
    const mondayOffset = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - mondayOffset);
    const week = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const key = localDateKey(date);
      return {
        date: key,
        label: date.toLocaleDateString(undefined, { weekday: 'short' }),
        count: activityCounts[key] || 0,
        status: statusByDate[key] || (key > today ? 'upcoming' : 'no-goal')
      };
    });
    return {
      target,
      today,
      todayCount,
      todayDone,
      currentStreak: target ? streak : 0,
      longestStreak: target ? longest : 0,
      freezesOwned: target ? freezes : 0,
      freezeLimit: Number(CONFIG.freezeLimit) || 2,
      risk: !!(target && !todayDone && streak > 0 && new Date().getHours() >= (Number(CONFIG.streakRiskHour) || 18)),
      paused: !!(profile?.settings?.examPause?.active),
      pause: profile?.settings?.examPause ? clone(profile.settings.examPause) : null,
      week,
      days
    };
  }

  function exportBackup() {
    const state = readState();
    const timestamp = nowIso();
    const active = state.profiles[state.activeProfileId];
    if (active) {
      active.backup = { lastExportAt: timestamp };
      state.profiles[state.activeProfileId] = active;
      writeState(state);
    }
    return {
      format: 'examready-student-backup',
      version: 1,
      exportedAt: timestamp,
      activeProfileId: state.activeProfileId,
      profiles: clone(state.profiles)
    };
  }

  function importBackup(backup) {
    if (!backup || backup.format !== 'examready-student-backup' || !backup.profiles || typeof backup.profiles !== 'object') return false;
    const imported = normalizeState({ activeProfileId: backup.activeProfileId, profiles: backup.profiles });
    writeState(imported);
    emit('progressImported', { activeProfileId: imported.activeProfileId });
    emit('profileChanged', imported.profiles[imported.activeProfileId].profile);
    return true;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  global.ExamReadyStorage = Object.freeze({
    getProgress,
    saveProgress,
    logEvent,
    getProfiles,
    getActiveProfile,
    getFlashcardSchedules,
    getDueCardIds,
    reviewFlashcard,
    saveMistake,
    getMistakes,
    recordQuestionAnswer,
    recordQuizResult,
    answerMistake,
    removeMistake,
    convertMistakeToPersonalFlashcard,
    getPersonalFlashcards,
    setDailyGoal,
    getDailyGoal,
    setExamPause,
    getStreakSummary,
    exportBackup,
    importBackup,
    createProfile,
    updateProfile,
    setActiveProfile,
    deleteProfile,
    subscribe,
    getConfig: () => clone(CONFIG)
  });
}(window));
