import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  levenshteinDistance,
  checkTypedAnswer,
  generateDistractors,
  generateMultipleChoiceOptions,
  generateTrueFalseQuestion,
} from '../lib/study-engine';

describe('Study Engine - Typed Answer Checker & Distractor Generator', () => {

  describe('normalizeText', () => {
    it('normalizes case, whitespace, punctuation, and diacritics', () => {
      expect(normalizeText('  Xin Chào, Thế Giới!  ')).toBe('xin chao the gioi');
      expect(normalizeText('Quả Táo (Apple)...')).toBe('qua tao apple');
      expect(normalizeText('Đà Nẵng')).toBe('da nang');
    });
  });

  describe('levenshteinDistance', () => {
    it('calculates edit distances correctly', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
      expect(levenshteinDistance('apple', 'aple')).toBe(1);
      expect(levenshteinDistance('banana', 'bananas')).toBe(1);
    });
  });

  describe('checkTypedAnswer', () => {
    it('recognizes exact matches regardless of case, punctuation, or accents', () => {
      const res1 = checkTypedAnswer('quả táo', 'Quả táo');
      expect(res1.isCorrect).toBe(true);
      expect(res1.isExact).toBe(true);
      expect(res1.isClose).toBe(false);

      const res2 = checkTypedAnswer('qua tao!', 'Quả táo');
      expect(res2.isCorrect).toBe(true);
      expect(res2.isExact).toBe(true);
    });

    it('accepts edit distance 1 as "gần đúng" (isClose=true) for words longer than 5 chars', () => {
      // "beautiful" length is 9 > 5. Typo: "beautifull" (dist 1)
      const res = checkTypedAnswer('beautifull', 'beautiful');
      expect(res.isCorrect).toBe(true);
      expect(res.isExact).toBe(false);
      expect(res.isClose).toBe(true);

      // "serendipity" length 11 > 5. Missing 1 char: "serendipit" (dist 1)
      const res2 = checkTypedAnswer('serendipit', 'serendipity');
      expect(res2.isCorrect).toBe(true);
      expect(res2.isClose).toBe(true);
    });

    it('does NOT accept edit distance 1 as close for short words (length <= 5)', () => {
      // "cat" length is 3. "bat" is distance 1, but must NOT be accepted as correct
      const res = checkTypedAnswer('bat', 'cat');
      expect(res.isCorrect).toBe(false);
      expect(res.isClose).toBe(false);

      // "dog" vs "fog"
      const res2 = checkTypedAnswer('fog', 'dog');
      expect(res2.isCorrect).toBe(false);
    });

    it('rejects wrong answers with distance >= 2', () => {
      const res = checkTypedAnswer('orange', 'apple');
      expect(res.isCorrect).toBe(false);
      expect(res.isExact).toBe(false);
      expect(res.isClose).toBe(false);
    });
  });

  describe('generateDistractors', () => {
    const setCards = [
      { id: '1', definition: 'con chó' },
      { id: '2', definition: 'con mèo' },
      { id: '3', definition: 'con chim' },
      { id: '4', definition: 'con cá' },
    ];

    it('generates distractors from other cards in the same set', () => {
      const distractors = generateDistractors(setCards[0], setCards, [], 3);
      expect(distractors).toHaveLength(3);
      expect(distractors.includes('con chó')).toBe(false);
      expect(distractors.every((d) => ['con mèo', 'con chim', 'con cá'].includes(d))).toBe(true);
    });

    it('falls back to allUserCards when set has fewer than 4 cards', () => {
      const smallSet = [
        { id: '1', definition: 'màu đỏ' },
        { id: '2', definition: 'màu xanh' },
      ];
      const otherUserCards = [
        { id: '10', definition: 'màu vàng' },
        { id: '11', definition: 'màu tím' },
        { id: '12', definition: 'màu cam' },
      ];

      const distractors = generateDistractors(smallSet[0], smallSet, otherUserCards, 3);
      expect(distractors).toHaveLength(3);
      expect(distractors.includes('màu xanh')).toBe(true);
      expect(distractors.includes('màu đỏ')).toBe(false);
    });

    it('uses fewer options if still not enough available', () => {
      const smallSet = [
        { id: '1', definition: 'một' },
        { id: '2', definition: 'hai' },
      ];
      const distractors = generateDistractors(smallSet[0], smallSet, [], 3);
      expect(distractors).toHaveLength(1);
      expect(distractors[0]).toBe('hai');
    });
  });

  describe('generateMultipleChoiceOptions', () => {
    it('creates shuffled options containing the target and sets correctIndex', () => {
      const cards = [
        { id: '1', definition: 'quả táo' },
        { id: '2', definition: 'quả cam' },
        { id: '3', definition: 'quả chuối' },
        { id: '4', definition: 'quả dâu' },
      ];

      const { options, correctIndex } = generateMultipleChoiceOptions(cards[0], cards);
      expect(options).toHaveLength(4);
      expect(options[correctIndex]).toBe('quả táo');
    });
  });

  describe('generateTrueFalseQuestion', () => {
    const cards = [
      { id: '1', definition: 'quả táo' },
      { id: '2', definition: 'quả cam' },
    ];

    it('generates a true statement when forceResult is true', () => {
      const q = generateTrueFalseQuestion(cards[0], cards, [], true);
      expect(q.isCorrect).toBe(true);
      expect(q.displayedDefinition).toBe('quả táo');
    });

    it('generates a false statement when forceResult is false', () => {
      const q = generateTrueFalseQuestion(cards[0], cards, [], false);
      expect(q.isCorrect).toBe(false);
      expect(q.displayedDefinition).toBe('quả cam');
    });

    it('falls back to true if no distractors exist', () => {
      const single = [{ id: '1', definition: 'duy nhất' }];
      const q = generateTrueFalseQuestion(single[0], single, [], false);
      expect(q.isCorrect).toBe(true);
      expect(q.displayedDefinition).toBe('duy nhất');
    });
  });
});

