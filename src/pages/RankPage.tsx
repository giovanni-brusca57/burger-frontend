import { RankHero } from '@/components/rank/RankHero';
import { RankTable } from '@/components/rank/RankTable';
import { QuotaBonusSection } from '@/components/rank/QuotaBonusSection';
import { RankComparisonGrid } from '@/components/rank/RankComparisonGrid';

export default function RankPage() {
  return (
    <div className="space-y-8">
      <RankHero />
      <RankTable />
      <QuotaBonusSection />
      <RankComparisonGrid />
    </div>
  );
}
