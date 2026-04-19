'use client';

import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import type { StoryStatus } from '@story-generator/shared';

import { useGenerationProgress } from '@/hooks/useGenerationProgress';

type Props = { storyId: string; jobId: string | null; status: StoryStatus };

const STATUS_LABELS: Record<StoryStatus, string> = {
  queued: 'В очереди…',
  planning: 'Составляем план…',
  writing: 'Пишем историю…',
  portrait: 'Создаём портрет персонажа…',
  scenes: 'Создаём иллюстрации…',
  done: 'Готово',
  failed: 'Ошибка генерации',
};

export function GenerationProgress({ jobId, status: initialStatus }: Props) {
  const { status, progress, message } = useGenerationProgress(jobId);
  const displayStatus = status === 'queued' ? initialStatus : status;

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', mt: 8, p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {STATUS_LABELS[displayStatus]}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{ mb: 1, height: 8, borderRadius: 4 }}
      />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
}
