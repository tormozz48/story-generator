import { StoryReader } from '@/components/features/story-reader/StoryReader';
import { AppShell } from '@/components/layout/AppShell';

type Props = {
  params: { id: string };
  searchParams: { jobId?: string };
};

export default function StoryPage({ params, searchParams }: Props) {
  return (
    <AppShell>
      <StoryReader storyId={params.id} jobId={searchParams.jobId} />
    </AppShell>
  );
}
