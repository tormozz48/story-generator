'use client';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import type { ImageDto } from '@story-generator/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { GenerationProgress } from './GenerationProgress';
import { ReferencePortrait } from './ReferencePortrait';
import { SceneImage } from './SceneImage';

import { useGenerationProgress } from '@/hooks/useGenerationProgress';
import { useStory } from '@/hooks/useStory';

type Props = { storyId: string; jobId?: string };

/**
 * Splits story text into paragraphs and interleaves scene images evenly through the text.
 * Reference portrait is shown floated to the right in the header area.
 */
function buildInterleavedContent(
  text: string,
  sceneImages: ImageDto[]
): Array<{ type: 'text'; content: string } | { type: 'image'; image: ImageDto }> {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const result: Array<{ type: 'text'; content: string } | { type: 'image'; image: ImageDto }> = [];

  if (sceneImages.length === 0) {
    return paragraphs.map((p) => ({ type: 'text', content: p }));
  }

  // Insert image[i] after paragraph at position floor((i+1) * paragraphs.length / (sceneImages.length+1))
  const insertAfter = sceneImages.map((_, i) =>
    Math.floor(((i + 1) * paragraphs.length) / (sceneImages.length + 1))
  );

  for (let pi = 0; pi < paragraphs.length; pi++) {
    result.push({ type: 'text', content: paragraphs[pi]! });
    const imgIdx = insertAfter.indexOf(pi + 1);
    if (imgIdx !== -1) {
      result.push({ type: 'image', image: sceneImages[imgIdx]! });
    }
  }

  return result;
}

export function StoryReader({ storyId, jobId }: Props) {
  const queryClient = useQueryClient();
  const { data: story, isPending, isError } = useStory(storyId);
  const { status: progressStatus } = useGenerationProgress(jobId ?? null);

  // Invalidate story query when SSE signals done so we fetch the final text + images
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

  const images = story.images ?? [];
  const referencePortrait = images.find((img) => img.kind === 'reference' && img.status === 'done');
  const sceneImages = images
    .filter((img) => img.kind === 'scene' && img.status === 'done')
    .sort((a, b) => (a.sceneIndex ?? 0) - (b.sceneIndex ?? 0));

  const content = buildInterleavedContent(story.generatedText ?? '', sceneImages);

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {story.title ?? 'История'}
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Box sx={{ overflow: 'hidden' }}>
        {referencePortrait && (
          <ReferencePortrait src={referencePortrait.url} title={story.title ?? 'История'} />
        )}

        {content.map((item, idx) => {
          if (item.type === 'text') {
            return (
              <Typography
                key={idx}
                variant="body1"
                sx={{ mb: 2, lineHeight: 1.8, fontSize: '1.05rem' }}
              >
                {item.content}
              </Typography>
            );
          }
          return (
            <SceneImage
              key={idx}
              src={item.image.url}
              alt={`Иллюстрация сцены ${(item.image.sceneIndex ?? 0) + 1}`}
            />
          );
        })}
      </Box>
    </Box>
  );
}
