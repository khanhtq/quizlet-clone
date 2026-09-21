import { db, users, userSettings, sets, cards } from './index';
import { hashPassword } from '../auth/session';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';

export interface SeedCardData {
  term: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  starred?: boolean;
}

export const DEMO_CARDS: SeedCardData[] = [
  {
    term: 'ephemeral',
    phonetic: '/ɪˈfem.ər.əl/',
    partOfSpeech: 'adj',
    definition: 'phù du, ngắn ngủi, chóng tàn',
    example: 'Fame in the world of pop music is often ephemeral.',
    starred: true,
  },
  {
    term: 'serendipity',
    phonetic: '/ˌser.ənˈdɪp.ə.ti/',
    partOfSpeech: 'noun',
    definition: 'sự may mắn tình cờ, duyên may',
    example: 'Finding my dream job while walking in the park was pure serendipity.',
    starred: true,
  },
  {
    term: 'resilience',
    phonetic: '/rɪˈzɪl.jəns/',
    partOfSpeech: 'noun',
    definition: 'khả năng phục hồi, tính kiên cường',
    example: 'Courage and resilience helped her overcome severe hardship.',
  },
  {
    term: 'ubiquitous',
    phonetic: '/juːˈbɪk.wɪ.təs/',
    partOfSpeech: 'adj',
    definition: 'phổ biến khắp nơi, nhan nhản',
    example: 'Smartphones have become ubiquitous in modern daily life.',
  },
  {
    term: 'pragmatic',
    phonetic: '/præɡˈmæt.ɪk/',
    partOfSpeech: 'adj',
    definition: 'thực tế, thực dụng, trọng thực tiễn',
    example: 'We need to adopt a pragmatic approach to solve this issue quickly.',
  },
  {
    term: 'meticulous',
    phonetic: '/məˈtɪk.jə.ləs/',
    partOfSpeech: 'adj',
    definition: 'tỉ mỉ, cẩn thận từng chi tiết',
    example: 'The researcher kept meticulous records of all experimental findings.',
  },
  {
    term: 'eloquent',
    phonetic: '/ˈel.ə.kwənt/',
    partOfSpeech: 'adj',
    definition: 'hùng biện, lưu loát, truyền cảm',
    example: 'She gave an eloquent speech advocating for children education.',
  },
  {
    term: 'lucid',
    phonetic: '/ˈluː.sɪd/',
    partOfSpeech: 'adj',
    definition: 'rõ ràng, mạch lạc, dễ hiểu',
    example: 'The professor gave a remarkably lucid explanation of quantum physics.',
  },
  {
    term: 'perseverance',
    phonetic: '/ˌpɜː.sɪˈvɪə.rəns/',
    partOfSpeech: 'noun',
    definition: 'sự kiên trì, bền bỉ, nhẫn nại',
    example: 'Through perseverance and hard work, he achieved his biggest dream.',
    starred: true,
  },
  {
    term: 'empathy',
    phonetic: '/ˈem.pə.θi/',
    partOfSpeech: 'noun',
    definition: 'sự thấu cảm, khả năng đồng cảm',
    example: 'Great leaders show empathy and genuine care for their team members.',
  },
  {
    term: 'scrutinize',
    phonetic: '/ˈskruː.tɪ.naɪz/',
    partOfSpeech: 'verb',
    definition: 'xem xét kỹ lưỡng, khảo sát tỉ mỉ',
    example: 'The auditor will scrutinize all financial statements before approval.',
  },
  {
    term: 'versatile',
    phonetic: '/ˈvɜː.sə.taɪl/',
    partOfSpeech: 'adj',
    definition: 'đa năng, linh hoạt, toàn diện',
    example: 'He is a versatile actor capable of playing both comedy and tragedy.',
  },
  {
    term: 'benevolent',
    phonetic: '/bəˈnev.əl.ənt/',
    partOfSpeech: 'adj',
    definition: 'nhân từ, rộng lượng, hay làm từ thiện',
    example: 'The scholarship was funded by a benevolent local entrepreneur.',
  },
  {
    term: 'candid',
    phonetic: '/ˈkæn.dɪd/',
    partOfSpeech: 'adj',
    definition: 'thẳng thắn, chân thành, bộc trực',
    example: 'To be candid with you, I do not believe this strategy will succeed.',
  },
  {
    term: 'diligence',
    phonetic: '/ˈdɪl.ɪ.dʒəns/',
    partOfSpeech: 'noun',
    definition: 'sự siêng năng, cần cù, cần mẫn',
    example: 'His diligence in studying was rewarded with top honors at graduation.',
  },
  {
    term: 'innovative',
    phonetic: '/ˈɪn.ə.və.tɪv/',
    partOfSpeech: 'adj',
    definition: 'sáng tạo, mang tính đổi mới đột phá',
    example: 'The startup introduced an innovative solution for renewable energy storage.',
  },
  {
    term: 'profound',
    phonetic: '/prəˈfaʊnd/',
    partOfSpeech: 'adj',
    definition: 'sâu sắc, uyên thâm, thâm thúy',
    example: 'The book had a profound influence on my perspective on life.',
  },
  {
    term: 'coherent',
    phonetic: '/kəʊˈhɪə.rənt/',
    partOfSpeech: 'adj',
    definition: 'mạch lạc, chặt chẽ, có tính liên kết',
    example: 'Make sure your essay presents a clear and coherent argument.',
  },
  {
    term: 'tenacious',
    phonetic: '/təˈneɪ.ʃəs/',
    partOfSpeech: 'adj',
    definition: 'ngoan cường, kiên trì, không chùn bước',
    example: 'The team was tenacious in their defense until the final whistle.',
  },
  {
    term: 'aesthetic',
    phonetic: '/esˈθet.ɪk/',
    partOfSpeech: 'adj',
    definition: 'mang tính thẩm mỹ, có gu thẩm mỹ cao',
    example: 'The new cafe design blends minimalist and vintage aesthetics.',
  },
];

export async function seedDatabase() {
  const demoEmail = 'demo@quizlet.local';
  const demoPassword = 'Demo123456';
  const now = Date.now();

  console.log(`🌱 Seeding database for demo user: ${demoEmail}...`);

  // Check if demo user already exists
  const existingUsers = await db
    .select()
    .from(users)
    .where(eq(users.email, demoEmail))
    .limit(1);

  let userId: string;

  if (existingUsers.length > 0) {
    userId = existingUsers[0].id;
    console.log(`ℹ️ Demo user already exists (id: ${userId}). Cleaning up previous demo sets...`);
    // Delete existing sets for demo user to ensure clean idempotent seed
    await db.delete(sets).where(eq(sets.userId, userId));
  } else {
    userId = nanoid();
    const passwordHash = await hashPassword(demoPassword);

    await db.insert(users).values({
      id: userId,
      email: demoEmail,
      passwordHash,
      createdAt: now,
    });

    await db.insert(userSettings).values({
      userId,
      theme: 'system',
      meaningLanguage: 'both',
      newCardsPerDay: 20,
      timezone: 'Asia/Ho_Chi_Minh',
      ttsAutoplay: false,
      defaultDirection: 'term',
    });

    console.log(`✅ Demo user created (id: ${userId}).`);
  }

  // Create demo set
  const setId = nanoid();
  await db.insert(sets).values({
    id: setId,
    userId,
    title: '20 Từ vựng tiếng Anh thông dụng (Oxford 3000 / Academic)',
    description:
      'Bộ từ vựng mẫu chất lượng cao có sẵn phiên âm IPA, từ loại, định nghĩa tiếng Việt và ví dụ song ngữ minh họa.',
    isPublic: false,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`✅ Demo set created (id: ${setId}).`);

  // Insert 20 cards
  const cardsToInsert = DEMO_CARDS.map((card, index) => ({
    id: nanoid(),
    setId,
    userId,
    term: card.term,
    definition: card.definition,
    phonetic: card.phonetic,
    partOfSpeech: card.partOfSpeech,
    example: card.example,
    position: index,
    starred: card.starred ?? false,
    createdAt: now,
    updatedAt: now,
  }));

  await db.insert(cards).values(cardsToInsert);

  console.log(`✅ Successfully seeded ${cardsToInsert.length} cards.`);
  console.log(`🎉 Seeding completed successfully!`);
  console.log(`-----------------------------------------------`);
  console.log(`Demo credentials:`);
  console.log(`Email:    ${demoEmail}`);
  console.log(`Password: ${demoPassword}`);
  console.log(`-----------------------------------------------`);
}

// Run if called directly via CLI
if (require.main === module || process.argv[1]?.includes('seed')) {
  seedDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error during seeding:', err);
      process.exit(1);
    });
}
