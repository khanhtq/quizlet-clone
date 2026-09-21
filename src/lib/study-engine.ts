/**
 * Shared study engine utilities:
 * 1. Typed-answer checker with fuzzy normalization and edit distance 1 tolerance for words > 5 chars
 * 2. Distractor generator for multiple choice questions
 * 3. True / False question generator
 */

/**
 * Remove Vietnamese and Latin diacritics / accents for flexible comparison.
 */
export function stripDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Normalize text: lowercase, remove punctuation, strip diacritics, collapse whitespace.
 */
export function normalizeText(str: string, removeDiacritics = true): string {
  if (!str) return '';
  let res = str.toLowerCase();
  if (removeDiacritics) {
    res = stripDiacritics(res);
  }
  // Remove punctuation (keep letters and numbers)
  res = res.replace(/[^\p{L}\p{N}\s]/gu, '');
  // Collapse whitespace
  res = res.replace(/\s+/g, ' ').trim();
  return res;
}

/**
 * Compute Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export interface CheckAnswerResult {
  isCorrect: boolean;
  isExact: boolean;
  isClose: boolean; // Flagged as "gần đúng" (Levenshtein distance 1 for length > 5)
  normalizedInput: string;
  normalizedTarget: string;
}

/**
 * Check a typed answer against the target definition or term.
 * Prompt spec: "normalize case, whitespace, punctuation and diacritics.
 * Accept a match within edit distance 1 for answers longer than 5 characters,
 * flagged as 'gần đúng' with a one-tap 'tính là đúng'."
 */
export function checkTypedAnswer(input: string, target: string): CheckAnswerResult {
  const normInput = normalizeText(input, true);
  const normTarget = normalizeText(target, true);

  if (normInput === normTarget && normInput.length > 0) {
    return {
      isCorrect: true,
      isExact: true,
      isClose: false,
      normalizedInput: normInput,
      normalizedTarget: normTarget,
    };
  }

  // Check edit distance 1 for answers longer than 5 characters
  if (normTarget.length > 5) {
    const dist = levenshteinDistance(normInput, normTarget);
    if (dist === 1) {
      return {
        isCorrect: true, // Counts as correct/close
        isExact: false,
        isClose: true,
        normalizedInput: normInput,
        normalizedTarget: normTarget,
      };
    }
  }

  return {
    isCorrect: false,
    isExact: false,
    isClose: false,
    normalizedInput: normInput,
    normalizedTarget: normTarget,
  };
}

/**
 * Distractor generator per spec 6.5:
 * "Distractors come from other cards in the same set.
 * If the set has fewer than 4 cards, fall back to the user's other cards,
 * and use fewer options if still not enough."
 */
export function generateDistractors<T extends { id: string; definition: string }>(
  targetCard: T,
  setCards: T[],
  allUserCards: T[] = [],
  count = 3
): string[] {
  const targetDef = targetCard.definition.trim().toLowerCase();
  const seen = new Set<string>([targetDef]);
  const setCandidates: string[] = [];

  // 1. First priority: other cards in the same set
  for (const card of setCards) {
    if (card.id === targetCard.id) continue;
    const def = card.definition.trim();
    if (!def) continue;
    const normalizedDef = def.toLowerCase();
    if (!seen.has(normalizedDef)) {
      seen.add(normalizedDef);
      setCandidates.push(def);
    }
  }

  // If set candidates are enough, shuffle and return `count`
  if (setCandidates.length >= count) {
    const shuffled = [...setCandidates].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  // 2. Fall back to user's other cards to fill remaining slots
  const fallbackCandidates: string[] = [];
  if (allUserCards.length > 0) {
    for (const card of allUserCards) {
      if (card.id === targetCard.id) continue;
      const def = card.definition.trim();
      if (!def) continue;
      const normalizedDef = def.toLowerCase();
      if (!seen.has(normalizedDef)) {
        seen.add(normalizedDef);
        fallbackCandidates.push(def);
      }
    }
  }

  const remainingNeeded = count - setCandidates.length;
  const shuffledFallback = [...fallbackCandidates].sort(() => Math.random() - 0.5);
  const chosenFallback = shuffledFallback.slice(0, remainingNeeded);

  const combined = [...setCandidates, ...chosenFallback];
  return combined.sort(() => Math.random() - 0.5);
}


/**
 * Generate 4 multiple choice options (1 correct + up to 3 distractors), shuffled.
 */
export function generateMultipleChoiceOptions<T extends { id: string; definition: string }>(
  targetCard: T,
  setCards: T[],
  allUserCards: T[] = [],
  count = 3
): { options: string[]; correctIndex: number } {
  const distractors = generateDistractors(targetCard, setCards, allUserCards, count);
  const allOptions = [targetCard.definition, ...distractors];

  // Shuffle options
  const shuffled = allOptions
    .map((val) => ({ val, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ val }) => val);

  const correctIndex = shuffled.indexOf(targetCard.definition);
  return { options: shuffled, correctIndex };
}

export interface TrueFalseQuestion<T> {
  card: T;
  displayedDefinition: string;
  isCorrect: boolean;
}

/**
 * Generate a True/False question for a card.
 * If distractors exist, randomly picks either the correct definition or a distractor.
 */
export function generateTrueFalseQuestion<T extends { id: string; definition: string }>(
  targetCard: T,
  setCards: T[],
  allUserCards: T[] = [],
  forceResult?: boolean
): TrueFalseQuestion<T> {
  const distractors = generateDistractors(targetCard, setCards, allUserCards, 1);
  const shouldBeTrue =
    forceResult !== undefined
      ? forceResult
      : distractors.length === 0 || Math.random() < 0.5;

  if (shouldBeTrue || distractors.length === 0) {
    return {
      card: targetCard,
      displayedDefinition: targetCard.definition,
      isCorrect: true,
    };
  }

  return {
    card: targetCard,
    displayedDefinition: distractors[0],
    isCorrect: false,
  };
}

