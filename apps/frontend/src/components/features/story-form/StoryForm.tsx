'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { StoryGenerationRequestSchema } from '@story-generator/shared';
import type { StoryGenerationRequest } from '@story-generator/shared';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { LengthSlider } from './LengthSlider';
import { PromptField } from './PromptField';
import { StylePicker } from './StylePicker';

import { useGenerateStory } from '@/hooks/useGenerateStory';

export function StoryForm() {
  const router = useRouter();
  const mutation = useGenerateStory();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<StoryGenerationRequest>({
    resolver: zodResolver(StoryGenerationRequestSchema),
    defaultValues: { prompt: '', targetLength: 2000, style: 'photorealistic' },
  });

  const onSubmit = async (data: StoryGenerationRequest) => {
    const result = await mutation.mutateAsync(data);
    router.push(`/stories/${result.storyId}?jobId=${result.jobId}`);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 680, mx: 'auto', p: 3 }}
    >
      <Typography variant="h4" component="h1">
        Создать историю
      </Typography>

      <PromptField control={control} error={errors.prompt} />
      <LengthSlider control={control} />
      <StylePicker control={control} />

      {mutation.isError && (
        <Typography color="error" variant="body2">
          {mutation.error.message}
        </Typography>
      )}

      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={mutation.isPending}
        startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : null}
      >
        {mutation.isPending ? 'Создаём…' : 'Создать историю'}
      </Button>
    </Box>
  );
}
