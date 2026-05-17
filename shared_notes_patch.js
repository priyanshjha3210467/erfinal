// =====================================================================
// EXAMREADY — NOTES PATCH (Guard Wrapper)
// =====================================================================
// This file previously re-declared DEFAULT_NOTES, getAllNotes(),
// saveAllNotes(), getNoteUrl(), and formatNoteContent() — causing:
//
//   1. Strict-mode "Identifier already declared" errors in Firefox/Safari
//      when notes-module-for-shared.js was also loaded on the same page
//      (subject.html, chapter.html, note-post.html).
//
//   2. A data inconsistency where note_1/note_2/note_3 IDs here differed
//      from note_demo_1/note_demo_2 etc. in notes-module-for-shared.js,
//      making default notes unpredictable depending on load order.
//
// FIX: This file now defers entirely to notes-module-for-shared.js.
//      It only defines the notes API if getAllNotes is not yet available,
//      acting purely as a fallback for pages that load shared.js alone.
// =====================================================================

(function () {
  // If notes-module-for-shared.js (or any other source) already provided
  // the notes API, do nothing. This prevents the duplicate-declaration crash.
  if (typeof window.getAllNotes === 'function') {
    return;
  }

  // ── Fallback default notes (only reached on pages that do NOT load
  //    notes-module-for-shared.js separately) ───────────────────────

  // Use window assignments instead of const/let so this block can be
  // evaluated multiple times without a strict-mode re-declaration error.
  window.DEFAULT_NOTES = window.DEFAULT_NOTES || [
    {
      id: 'note_1',
      title: 'Class 9 Maths: Real Numbers — Key Concepts',
      classNum: '9', subjectKey: 'math',
      summary: 'Essential properties of rational and irrational numbers, Euclid\'s lemma, and decimal expansions for quick revision.',
      content: `Every real number is either rational or irrational. Rational numbers have terminating or repeating decimal expansions; irrationals do not.

Euclid's Division Lemma: For any two positive integers a and b, we can write a = bq + r where 0 ≤ r < b. This is the base for finding HCF.

[TIP] To prove a number is irrational, assume it is rational and arrive at a contradiction.

Key facts to remember:
- sqrt(2), sqrt(3), sqrt(5) are all irrational
- Sum or product of a rational and an irrational is always irrational
- The product of two irrationals can be rational (e.g. sqrt(2) × sqrt(2) = 2)

[IMPORTANT] The Fundamental Theorem of Arithmetic: Every composite number can be expressed as a product of primes in exactly one way (order doesn't matter).`,
      tags: ['important', 'formula', 'exam-tips'],
      author: 'ExamReady Team', updatedAt: '2026-04-17', chapterId: ''
    },
    {
      id: 'note_2',
      title: 'Class 10 Science: Chemical Reactions — Quick Notes',
      classNum: '10', subjectKey: 'science',
      summary: 'Types of chemical reactions, balancing equations, and key observations for board exam answers.',
      content: `A chemical reaction involves breaking and forming of chemical bonds. Always identify reactants and products first.

Types of reactions you must know:
- Combination: A + B → AB
- Decomposition: AB → A + B
- Displacement: A + BC → AC + B
- Double Displacement: AB + CD → AD + CB
- Oxidation-Reduction (Redox): transfer of electrons

[TIP] Write observations before drawing conclusions in CBSE answers.

Balancing tip — balance in this order:
1. Balance metals first
2. Balance non-metals next
3. Balance hydrogen
4. Balance oxygen last

[IMPORTANT] Exothermic reactions release energy; endothermic reactions absorb energy. Respiration is exothermic, photosynthesis is endothermic.`,
      tags: ['exam-tips', 'formula'],
      author: 'ExamReady Team', updatedAt: '2026-04-17', chapterId: ''
    },
    {
      id: 'note_3',
      title: 'Class 12 Physics: Electrostatics Summary Notes',
      classNum: '12', subjectKey: 'physics',
      summary: 'Coulomb\'s law, electric field, potential, and capacitance formulas for rapid board exam revision.',
      content: `Coulomb's Law: F = k·q₁q₂/r² where k = 9×10⁹ N·m²/C²
Electric force acts along the line joining two point charges.

Electric Field (E) = F/q₀ = kQ/r² (due to point charge)
Direction: away from positive, towards negative.

Electric Potential (V) = W/q = kQ/r
V is a scalar quantity. SI unit: Volt.

[FORMULA] Energy stored in capacitor: U = ½CV² = Q²/2C = QV/2

Capacitors in series: 1/C = 1/C₁ + 1/C₂ + ...
Capacitors in parallel: C = C₁ + C₂ + ...

[TIP] Electric field lines never cross each other. They start on positive charges and end on negative charges.

[IMPORTANT] Conductors in electrostatic equilibrium: E inside = 0, all charge resides on surface, potential is same throughout the conductor.`,
      tags: ['formula', 'important'],
      author: 'ExamReady Team', updatedAt: '2026-04-17', chapterId: ''
    }
  ];

  // ── Core notes API (fallback) ────────────────────────────────────

  window.getAllNotes = function getAllNotes() {
    var stored = (typeof getData === 'function') ? getData('notes') : null;
    var notes  = Array.isArray(stored) ? stored : window.DEFAULT_NOTES;
    return JSON.parse(JSON.stringify(notes)).sort(function (a, b) {
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });
  };

  window.saveAllNotes = function saveAllNotes(notes) {
    if (typeof setData === 'function') setData('notes', Array.isArray(notes) ? notes : []);
  };

  window.getNotesByClassAndSubject = function getNotesByClassAndSubject(cls, subjectKey) {
    return window.getAllNotes().filter(function (n) {
      return n.classNum === cls && n.subjectKey === subjectKey;
    });
  };

  window.findNoteById = function findNoteById(noteId) {
    if (!noteId) return null;
    return window.getAllNotes().find(function (n) { return n.id === noteId; }) || null;
  };

  window.getNoteUrl = function getNoteUrl(noteOrId) {
    var id = typeof noteOrId === 'string' ? noteOrId : (noteOrId && noteOrId.id);
    return 'note-post.html?id=' + encodeURIComponent(id || '');
  };

  window.getNoteExcerpt = function getNoteExcerpt(note, maxLength) {
    maxLength = maxLength || 160;
    var raw = ((note && (note.summary || note.content)) || '')
      .replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim();
    if (!raw) return '';
    return raw.length > maxLength ? raw.slice(0, maxLength - 1) + '...' : raw;
  };

  // formatNoteContent is only in notes-module-for-shared.js (the richer version).
  // If it's missing here that's fine — shared_notes_patch.js never defined it anyway.

})();
