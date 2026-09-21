import { describe, it, expect } from 'vitest';
import {
  parseBulkText,
  parseCSV,
  exportToCSV,
  detectSeparator,
} from '../lib/parsers';

describe('Parsers & Exporters Unit Tests', () => {
  describe('detectSeparator', () => {
    it('detects tab separator', () => {
      const lines = ['apple\tquả táo', 'banana\tquả chuối'];
      expect(detectSeparator(lines)).toBe('\t');
    });

    it('detects dash separator', () => {
      const lines = ['cat - con mèo', 'dog - con chó'];
      expect(detectSeparator(lines)).toBe(' - ');
    });

    it('detects semicolon separator', () => {
      const lines = ['sun; mặt trời', 'moon; mặt trăng'];
      expect(detectSeparator(lines)).toBe(';');
    });

    it('detects comma separator', () => {
      const lines = ['water, nước', 'fire, lửa'];
      expect(detectSeparator(lines)).toBe(',');
    });
  });

  describe('parseBulkText', () => {
    it('parses tab separated lines', () => {
      const input = `
        apple\tquả táo
        banana\tquả chuối
        orange\tquả cam
      `;
      const result = parseBulkText(input, '\t');
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ term: 'apple', definition: 'quả táo' });
      expect(result[1]).toEqual({ term: 'banana', definition: 'quả chuối' });
      expect(result[2]).toEqual({ term: 'orange', definition: 'quả cam' });
    });

    it('parses " - " separated lines', () => {
      const input = `hello - xin chào\ngoodbye - tạm biệt`;
      const result = parseBulkText(input, ' - ');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ term: 'hello', definition: 'xin chào' });
      expect(result[1]).toEqual({ term: 'goodbye', definition: 'tạm biệt' });
    });

    it('parses semicolon separated lines', () => {
      const input = `red; màu đỏ\nblue; màu xanh`;
      const result = parseBulkText(input, ';');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ term: 'red', definition: 'màu đỏ' });
      expect(result[1]).toEqual({ term: 'blue', definition: 'màu xanh' });
    });

    it('parses comma separated lines', () => {
      const input = `read, đọc sách\nwrite, viết bài`;
      const result = parseBulkText(input, ',');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ term: 'read', definition: 'đọc sách' });
      expect(result[1]).toEqual({ term: 'write', definition: 'viết bài' });
    });

    it('handles lines with only a term (empty definition)', () => {
      const input = `
        ubiquitous
        ephemeral - phù du
        serendipity
      `;
      const result = parseBulkText(input, ' - ');
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ term: 'ubiquitous', definition: '' });
      expect(result[1]).toEqual({ term: 'ephemeral', definition: 'phù du' });
      expect(result[2]).toEqual({ term: 'serendipity', definition: '' });
    });

    it('auto-detects separator when set to auto', () => {
      const input = `table - cái bàn\nchair - cái ghế`;
      const result = parseBulkText(input, 'auto');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ term: 'table', definition: 'cái bàn' });
    });

    it('strips surrounding quotes on term and definition', () => {
      const input = `"run"\t"chạy nhanh"`;
      const result = parseBulkText(input, '\t');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ term: 'run', definition: 'chạy nhanh' });
    });

    it('returns empty array on empty or whitespace string', () => {
      expect(parseBulkText('')).toEqual([]);
      expect(parseBulkText('   \n  \t \n')).toEqual([]);
    });
  });

  describe('parseCSV', () => {
    it('parses standard CSV with header', () => {
      const csv = `term,definition,phonetic,part_of_speech,example
hello,xin chào,/həˈloʊ/,noun,Hello world
world,thế giới,/wɜːrld/,noun,A brave new world`;

      const result = parseCSV(csv);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        term: 'hello',
        definition: 'xin chào',
        phonetic: '/həˈloʊ/',
        partOfSpeech: 'noun',
        example: 'Hello world',
      });
      expect(result[1].term).toBe('world');
      expect(result[1].definition).toBe('thế giới');
    });

    it('parses CSV without header (2 columns: term, definition)', () => {
      const csv = `cat,con mèo\ndog,con chó`;
      const result = parseCSV(csv);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ term: 'cat', definition: 'con mèo' });
      expect(result[1]).toEqual({ term: 'dog', definition: 'con chó' });
    });

    it('handles embedded commas and escaped quotes within fields', () => {
      const csv = `"term, with comma","definition ""with quotes"" and , comma"`;
      const result = parseCSV(csv);
      expect(result).toHaveLength(1);
      expect(result[0].term).toBe('term, with comma');
      expect(result[0].definition).toBe('definition "with quotes" and , comma');
    });

    it('handles multiline values in CSV', () => {
      const csv = `"line1\nline2",definition`;
      const result = parseCSV(csv);
      expect(result).toHaveLength(1);
      expect(result[0].term).toBe('line1\nline2');
      expect(result[0].definition).toBe('definition');
    });

    it('strips UTF-8 BOM cleanly', () => {
      const csv = '\uFEFFterm,definition\nsun,mặt trời';
      const result = parseCSV(csv);
      expect(result).toHaveLength(1);
      expect(result[0].term).toBe('sun');
      expect(result[0].definition).toBe('mặt trời');
    });
  });

  describe('exportToCSV & Roundtrip', () => {
    it('exports cards with headers, UTF-8 BOM, and quotes special characters', () => {
      const cards = [
        {
          term: 'simple',
          definition: 'đơn giản',
          phonetic: '/ˈsɪmpl/',
          partOfSpeech: 'adj',
          example: 'It is simple.',
        },
        {
          term: 'complex, with comma',
          definition: 'phức tạp "có ngoặc kép"',
          phonetic: null,
          partOfSpeech: null,
          example: 'Line 1\nLine 2',
        },
      ];

      const csv = exportToCSV(cards);
      expect(csv.charCodeAt(0)).toBe(0xfeff); // BOM

      // Roundtrip test
      const parsed = parseCSV(csv);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].term).toBe('simple');
      expect(parsed[0].definition).toBe('đơn giản');
      expect(parsed[1].term).toBe('complex, with comma');
      expect(parsed[1].definition).toBe('phức tạp "có ngoặc kép"');
      expect(parsed[1].example).toBe('Line 1\nLine 2');
    });
  });
});
