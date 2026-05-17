// =====================================================================
// EXAMREADY — NOTES MODULE
// Append this entire block to the BOTTOM of shared.js
// Adds full notes support: storage, CRUD, rendering helpers
// =====================================================================

// ── Default sample notes ──────────────────────────────────────────────
const DEFAULT_NOTES = [
  {
    id: 'note_demo_1',
    title: 'Class 10 Maths: Real Numbers — Key Concepts & Formulas',
    classNum: '10', subjectKey: 'math',
    summary: 'Essential properties of rational and irrational numbers, Euclid\'s lemma, HCF/LCM, and decimal expansions for quick board revision.',
    content: `Every real number is either rational or irrational. Rational numbers have terminating or repeating decimal expansions; irrationals do not.

Euclid's Division Lemma: For any two positive integers a and b, we can write a = bq + r where 0 ≤ r < b. This is the foundation for finding HCF.

[TIP] To prove a number is irrational, assume it is rational and arrive at a contradiction using Euclid's Lemma.

Key facts to remember:
- sqrt(2), sqrt(3), sqrt(5) are all irrational
- Sum or product of a rational and an irrational is always irrational
- The product of two irrationals can be rational (sqrt(2) × sqrt(2) = 2)

[IMPORTANT] The Fundamental Theorem of Arithmetic: Every composite number can be expressed as a product of primes in exactly one way (order doesn't matter). This is used for LCM and HCF.

Formulas:
- HCF × LCM = Product of two numbers
- For three numbers: HCF × LCM ≠ product (use prime factorisation directly)

[WARNING] Many students confuse HCF and LCM. HCF is the largest common factor; LCM is the smallest common multiple.`,
    tags: ['important', 'formula', 'exam-tips'],
    author: 'ExamReady Team', updatedAt: '2026-04-17', chapterId: ''
  },
  {
    id: 'note_demo_2',
    title: 'Class 10 Science: Chemical Reactions — Types & Balancing',
    classNum: '10', subjectKey: 'science',
    summary: 'Types of chemical reactions, how to balance equations, key observations, and board exam answer format tips.',
    content: `A chemical reaction involves breaking and forming chemical bonds. Always identify reactants and products first before attempting to balance.

Types of reactions you must know for CBSE:
- Combination: A + B → AB (e.g., 2H₂ + O₂ → 2H₂O)
- Decomposition: AB → A + B (e.g., 2H₂O → 2H₂ + O₂)
- Displacement: A + BC → AC + B (e.g., Zn + CuSO₄ → ZnSO₄ + Cu)
- Double Displacement: AB + CD → AD + CB (forms precipitate)
- Oxidation-Reduction (Redox): simultaneous gain and loss of electrons

[TIP] Write observations before drawing conclusions in CBSE answers. Marks are awarded for stating colour change, gas evolved, or precipitate formed.

Balancing equations — do it in this order:
1. Balance metals first
2. Balance non-metals next
3. Balance hydrogen
4. Balance oxygen last

[IMPORTANT] Exothermic reactions release energy (respiration, burning). Endothermic reactions absorb energy (photosynthesis, decomposition of limestone). CBSE frequently asks you to identify which type a reaction belongs to.

[WARNING] Never change a subscript when balancing — only change coefficients. Changing subscripts changes the compound entirely.`,
    tags: ['exam-tips', 'formula', 'important'],
    author: 'ExamReady Team', updatedAt: '2026-04-17', chapterId: ''
  },
  {
    id: 'note_demo_3',
    title: 'Class 12 Physics: Electrostatics — Formulas & Concepts',
    classNum: '12', subjectKey: 'physics',
    summary: 'Coulomb\'s law, electric field, potential, and capacitance — all key formulas and concepts for rapid board exam revision.',
    content: `Coulomb's Law: F = kq₁q₂/r² where k = 9×10⁹ N·m²/C²
Electric force acts along the line joining two point charges.

Electric Field: E = F/q₀ = kQ/r²  (due to point charge)
Direction: away from positive charge, towards negative charge.

Electric Potential: V = W/q = kQ/r
V is a scalar quantity. SI unit: Volt (V).

[FORMULA] Relation between E and V: E = -dV/dr (E points in direction of decreasing V)

[FORMULA] Energy stored in capacitor: U = ½CV² = Q²/2C = QV/2

Capacitors in series: 1/C = 1/C₁ + 1/C₂ + ...
Capacitors in parallel: C = C₁ + C₂ + ...

[TIP] Electric field lines never cross each other. They start on positive charges and end on negative charges. Closer lines = stronger field.

[IMPORTANT] Conductors in electrostatic equilibrium:
- E inside conductor = 0
- All charge resides on the outer surface
- Potential is the same at every point inside and on the conductor
- E at surface is perpendicular to surface`,
    tags: ['formula', 'important', 'concept'],
    author: 'ExamReady Team', updatedAt: '2026-04-17', chapterId: ''
  },
  {
    id: 'note_demo_4',
    title: 'Class 9 Maths: Polynomials — Quick Revision Notes',
    classNum: '9', subjectKey: 'math',
    summary: 'Degree, zeroes, factor theorem, and remainder theorem — everything about polynomials condensed for quick revision.',
    content: `A polynomial in x is an expression of the form aₙxⁿ + aₙ₋₁xⁿ⁻¹ + ... + a₁x + a₀ where all exponents are non-negative integers.

Degree of a polynomial: the highest power of the variable.
- Linear: degree 1 (ax + b)
- Quadratic: degree 2 (ax² + bx + c)
- Cubic: degree 3 (ax³ + bx² + cx + d)

Zeroes of a polynomial: values of x that make p(x) = 0.
- A linear polynomial has exactly 1 zero
- A quadratic polynomial has at most 2 zeroes
- A polynomial of degree n has at most n zeroes

[IMPORTANT] Factor Theorem: (x - a) is a factor of p(x) if and only if p(a) = 0. This is used extensively in factorisation problems.

[FORMULA] Remainder Theorem: When p(x) is divided by (x - a), the remainder is p(a).

Factorisation identities to memorise:
- (a + b)² = a² + 2ab + b²
- (a - b)² = a² - 2ab + b²
- a² - b² = (a + b)(a - b)
- (a + b)³ = a³ + 3a²b + 3ab² + b³
- a³ + b³ = (a + b)(a² - ab + b²)
- a³ - b³ = (a - b)(a² + ab + b²)

[TIP] For CBSE questions asking to factorise, always check if the sum of coefficients = 0 (implies x = 1 is a zero) or alternating sum = 0 (implies x = -1 is a zero).`,
    tags: ['formula', 'concept', 'exam-tips'],
    author: 'ExamReady Team', updatedAt: '2026-04-17', chapterId: ''
  },
  {
    id: 'note_demo_5',
    title: 'Class 11 Chemistry: Chemical Bonding — Key Concepts',
    classNum: '11', subjectKey: 'chemistry',
    summary: 'Ionic, covalent, and metallic bonding explained with VSEPR theory, hybridisation rules, and bond properties.',
    content: `Chemical bonds form because atoms seek stable electronic configurations (usually an octet).

Types of bonds:
- Ionic: complete transfer of electrons (metal + non-metal). High melting points, conduct electricity when dissolved.
- Covalent: sharing of electrons (non-metals). Lower melting points, usually poor conductors.
- Metallic: delocalised electrons (metals). Good conductors, malleable, ductile.

[FORMULA] Formal charge = (Valence electrons) - (Non-bonding electrons) - ½(Bonding electrons)
The Lewis structure with minimum formal charges is most stable.

VSEPR Theory — predicting shapes:
- 2 bond pairs: linear (180°)
- 3 bond pairs: trigonal planar (120°)
- 4 bond pairs: tetrahedral (109.5°)
- 3 bond pairs + 1 lone pair: pyramidal (~107°)
- 2 bond pairs + 2 lone pairs: bent/V-shaped (~104.5°)

[IMPORTANT] Lone pairs repel more than bond pairs. This is why NH₃ (~107°) and H₂O (~104.5°) have bond angles less than the ideal tetrahedral 109.5°.

Hybridisation summary:
- sp: linear, 2 regions
- sp²: trigonal planar, 3 regions
- sp³: tetrahedral, 4 regions
- sp³d: trigonal bipyramidal, 5 regions
- sp³d²: octahedral, 6 regions

[TIP] Count regions of electron density (bonding + lone pairs) to determine hybridisation. Double/triple bonds count as ONE region.`,
    tags: ['formula', 'concept', 'important'],
    author: 'ExamReady Team', updatedAt: '2026-04-17', chapterId: ''
  }
];

// ── Core Notes API ───────────────────────────────────────────────────
let _notesCache = null;

function getAllNotes() {
  if (_notesCache) return JSON.parse(JSON.stringify(_notesCache));
  const stored = getData('notes');
  const notes  = Array.isArray(stored) ? stored : DEFAULT_NOTES;
  _notesCache = notes.slice().sort((a, b) =>
    new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
  );
  return JSON.parse(JSON.stringify(_notesCache));
}

function invalidateNotesCache() { _notesCache = null; }

function saveAllNotes(notes) {
  setData('notes', Array.isArray(notes) ? notes : []);
  invalidateNotesCache();
}

function getNotesByClassAndSubject(cls, subjectKey) {
  return getAllNotes().filter(n => n.classNum === cls && n.subjectKey === subjectKey);
}

function findNoteById(noteId) {
  if (!noteId) return null;
  return getAllNotes().find(n => n.id === noteId) || null;
}

function getNoteUrl(noteOrId) {
  const id = typeof noteOrId === 'string' ? noteOrId : noteOrId?.id;
  return `note-post.html?id=${encodeURIComponent(id || '')}`;
}

function getNoteExcerpt(note, maxLength = 160) {
  const raw = (note?.summary || note?.content || '')
    .replace(/\[(TIP|WARNING|IMPORTANT)\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return '';
  return raw.length > maxLength ? raw.slice(0, maxLength - 1) + '...' : raw;
}

function formatNoteContent(content) {
  const normalized = String(content || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return '<p>Content will be added soon.</p>';

  return normalized.split(/\n\s*\n/).map(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return '';

    // Callout boxes: [TIP], [WARNING], [IMPORTANT]
    if (lines[0] && /^\[(TIP|WARNING|IMPORTANT)\]/i.test(lines[0])) {
      const type = lines[0].match(/^\[(TIP|WARNING|IMPORTANT)\]/i)[1].toLowerCase();
      const text = lines.map(l => l.replace(/^\[(TIP|WARNING|IMPORTANT)\]\s*/i, '')).join(' ');
      const icons = { tip: '💡', warning: '⚠️', important: '🔴' };
      return `<div class="note-callout ${type}"><p><strong>${icons[type]} ${type.charAt(0).toUpperCase() + type.slice(1)}:</strong> ${escapeHtml(text)}</p></div>`;
    }

    // Bullet list
    if (lines.every(l => l.startsWith('- '))) {
      return `<ul>${lines.map(l => `<li>${escapeHtml(l.slice(2))}</li>`).join('')}</ul>`;
    }
    // Numbered list
    if (lines.every(l => /^\d+\.\s/.test(l))) {
      return `<ol>${lines.map(l => `<li>${escapeHtml(l.replace(/^\d+\.\s/, ''))}</li>`).join('')}</ol>`;
    }
    return `<p>${lines.map(l => escapeHtml(l)).join('<br>')}</p>`;
  }).filter(Boolean).join('');
}
