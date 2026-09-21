import { getCurrentUser } from '@/server/auth';
import { redirect } from 'next/navigation';
import ReviewTodayBanner from '@/components/sets/ReviewTodayBanner';
import StatsOverview from '@/components/stats/StatsOverview';
import SetList from '@/components/sets/SetList';

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div>
      <ReviewTodayBanner />
      <StatsOverview />
      <SetList />
    </div>
  );
}

