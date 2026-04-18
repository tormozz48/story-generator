'use client';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { GenerationProgress } from './GenerationProgress';

import { useGenerationProgress } from '@/hooks/useGenerationProgress';
import { useStory } from '@/hooks/useStory';

type Props = { storyId: string; jobId?: string };

export function StoryReader({ storyId, jobId }: Props) {
  const queryClient = useQueryClient();
  const { data: story, isPending, isError } = useStory(storyId);
  const { status: progressStatus } = useGenerationProgress(jobId ?? null);

  // Invalidate story query when SSE signals done so we fetch the final text
  useEffect(() => {
    if (progressStatus === 'done' || progressStatus === 'failed') {
      void queryClient.invalidateQueries({ queryKey: ['story', storyId] });
    }
  }, [progressStatus, storyId, queryClient]);

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
      <Divider sx={{ mb: 3 }} />
      <Typography
        variant="body1"
        sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: '1.05rem' }}
      >
        {story.generatedText ?? ''}
      </Typography>
    </Box>
  );
}
