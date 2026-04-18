import type { Story } from '@story-generator/shared';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export function useStory(storyId: string | null) {
  return useQuery<Story>({
    queryKey: ['story', storyId],
    queryFn: () => apiClient.get<Story>(`/stories/${storyId}`),
    enabled: !!storyId,
    // TODO: Week 2 — disable polling once SSE progress hook handles updates
    refetchInterval: false,
  });
}
