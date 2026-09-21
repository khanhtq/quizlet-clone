import { z } from 'zod';

export interface MeaningItem {
  pos: string; // e.g. 'noun', 'verb', 'adjective', 'adverb'
  vi?: string;
  en?: string;
  exampleEn?: string;
  exampleVi?: string;
}

export interface LookupResult {
  word: string;
  phonetic?: string;
  audioUrl?: string;
  meanings: MeaningItem[];
  source: 'cache' | 'api';
  notice?: string;
}

export interface MeaningProvider {
  getMeanings(word: string, userId: string): Promise<MeaningItem[]>;
}

// Validation: letters, spaces, hyphens and apostrophes only, at most 60 chars and at most 4 words
export const lookupInputSchema = z
  .string()
  .trim()
  .min(1, 'Từ cần tra không được để trống')
  .max(60, 'Độ dài tối đa 60 ký tự')
  .regex(
    /^[a-zA-ZÀ-ỹ\s'\-]+$/,
    'Từ chỉ được chứa chữ cái, dấu cách, dấu gạch nối và dấu nháy đơn'
  )
  .refine(
    (val) => val.split(/\s+/).filter(Boolean).length <= 4,
    'Tối đa 4 từ'
  );
