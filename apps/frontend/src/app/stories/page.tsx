import { StoryList } from '@/components/features/story-list/StoryList';
import { AppShell } from '@/components/layout/AppShell';

export default function StoriesPage() {
  return (
    <AppShell>
      <StoryList />
    </AppShell>
  );
}
