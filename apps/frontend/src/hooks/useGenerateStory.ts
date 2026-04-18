import type { StoryGenerationRequest, StoryGenerationResponse } from '@story-generator/shared';
import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export function useGenerateStory() {
  return useMutation<StoryGenerationResponse, Error, StoryGenerationRequest>({
    mutationFn: (data) => apiClient.post<StoryGenerationResponse>('/stories', data),
  });
}
