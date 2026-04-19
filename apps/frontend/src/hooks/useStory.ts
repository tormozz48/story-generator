import type { StoryDto } from '@story-generator/shared';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

const TERMINAL_STATUSES = new Set(['done', 'failed']);

export function useStory(storyId: string | null) {
  return useQuery<StoryDto>({
    queryKey: ['story', storyId],
    queryFn: () => apiClient.get<StoryDto>(`/stories/${storyId}`),
    enabled: !!storyId,
    // Poll every 3 s while the story is still generating; stop once terminal
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && TERMINAL_STATUSES.has(status) ? false : 3000;
    },
  });
}
