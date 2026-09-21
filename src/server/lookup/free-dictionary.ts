import { MeaningItem } from './types';

export interface FreeDictionaryResult {
  phonetic?: string;
  audioUrl?: string;
  meanings: MeaningItem[];
}

export async function fetchFreeDictionary(word: string): Promise<FreeDictionaryResult | null> {
  const url = `https://api.dictionaryapi.dev/v2/entries/en/${encodeURIComponent(word)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.status === 404 || !res.ok) {
      return null;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const entry = data[0];

    // Find phonetic text
    let phonetic = entry.phonetic;
    if (!phonetic && Array.isArray(entry.phonetics)) {
      const found = entry.phonetics.find((p: { text?: string }) => Boolean(p.text));
      if (found) phonetic = found.text;
    }

    // Find audio URL
    let audioUrl: string | undefined;
    if (Array.isArray(entry.phonetics)) {
      const foundAudio = entry.phonetics.find(
        (p: { audio?: string }) => p.audio && p.audio.trim().length > 0
      );
      if (foundAudio) audioUrl = foundAudio.audio;
    }

    const meanings: MeaningItem[] = [];
    if (Array.isArray(entry.meanings)) {
      for (const m of entry.meanings) {
        const pos = m.partOfSpeech || 'other';
        if (Array.isArray(m.definitions)) {
          for (const def of m.definitions.slice(0, 2)) {
            meanings.push({
              pos,
              en: def.definition,
              exampleEn: def.example,
            });
          }
        }
      }
    }

    return {
      phonetic,
      audioUrl,
      meanings,
    };
  } catch {
    return null;
  }
}
