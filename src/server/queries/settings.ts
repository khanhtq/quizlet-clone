import { db, userSettings } from '@/server/db';
import { eq } from 'drizzle-orm';

export interface UserSettingsData {
  userId: string;
  theme: 'system' | 'light' | 'dark';
  meaningLanguage: 'vi' | 'en' | 'both';
  newCardsPerDay: number;
  timezone: string;
  ttsAutoplay: boolean;
  defaultDirection: 'term' | 'definition' | 'mixed';
}

export type UpdateUserSettingsInput = Partial<
  Omit<UserSettingsData, 'userId'>
>;

export async function getUserSettings(userId: string): Promise<UserSettingsData> {
  const existing = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .get();

  if (existing) {
    return {
      userId: existing.userId,
      theme: existing.theme as 'system' | 'light' | 'dark',
      meaningLanguage: existing.meaningLanguage as 'vi' | 'en' | 'both',
      newCardsPerDay: existing.newCardsPerDay,
      timezone: existing.timezone,
      ttsAutoplay: Boolean(existing.ttsAutoplay),
      defaultDirection: existing.defaultDirection as 'term' | 'definition' | 'mixed',
    };
  }

  // Create default settings
  const defaults = {
    userId,
    theme: 'system' as const,
    meaningLanguage: 'both' as const,
    newCardsPerDay: 20,
    timezone: 'UTC',
    ttsAutoplay: false,
    defaultDirection: 'term' as const,
  };

  await db.insert(userSettings).values(defaults);
  return defaults;
}

export async function updateUserSettings(
  userId: string,
  data: UpdateUserSettingsInput
): Promise<UserSettingsData> {
  // Ensure settings row exists first
  await getUserSettings(userId);

  const updates: Record<string, unknown> = {};
  if (data.theme !== undefined) updates.theme = data.theme;
  if (data.meaningLanguage !== undefined) updates.meaningLanguage = data.meaningLanguage;
  if (data.newCardsPerDay !== undefined) updates.newCardsPerDay = data.newCardsPerDay;
  if (data.timezone !== undefined) updates.timezone = data.timezone;
  if (data.ttsAutoplay !== undefined) updates.ttsAutoplay = data.ttsAutoplay;
  if (data.defaultDirection !== undefined) updates.defaultDirection = data.defaultDirection;

  if (Object.keys(updates).length > 0) {
    await db
      .update(userSettings)
      .set(updates)
      .where(eq(userSettings.userId, userId));
  }

  return getUserSettings(userId);
}
