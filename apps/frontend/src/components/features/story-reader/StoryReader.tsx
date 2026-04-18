'use client';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

import { GenerationProgress } from './GenerationProgress';

import { useStory } from '@/hooks/useStory';

type Props = { storyId: string; jobId?: string };

export function StoryReader({ storyId, jobId }: Props) {
  const { data: story, isPending, isError } = useStory(storyId);

  if (isPending) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Typography color="error" sx={{ mt: 4 }}>
        Не удалось загрузить историю.
      </Typography>
    );
  }

  if (story.status !== 'done') {
    return <GenerationProgress storyId={storyId} jobId={jobId ?? null} status={story.status} />;
  }

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {story.title ?? 'История'}
      </Typography>
      {/* TODO: Week 4 — render story text with inline SceneImage components */}
      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
        История загружается…
      </Typography>
    </Box>
  );
}
