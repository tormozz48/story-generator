import type { GenerationProgressEvent, StoryStatus } from '@story-generator/shared';
import { useEffect, useState } from 'react';

type ProgressState = {
  status: StoryStatus;
  progress: number;
  message?: string;
};

const INITIAL_STATE: ProgressState = { status: 'queued', progress: 0 };

/**
 * Opens an SSE connection to GET /api/jobs/:jobId/events and tracks progress.
 * TODO: Week 2 — wire up once the backend SSE endpoint is implemented.
 */
export function useGenerationProgress(jobId: string | null): ProgressState {
  const [state, setState] = useState<ProgressState>(INITIAL_STATE);

  useEffect(() => {
    if (!jobId) return;

    const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
    const es = new EventSource(`${apiBase}/api/jobs/${jobId}/events`);

    es.onmessage = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as GenerationProgressEvent;
      setState({ status: data.status, progress: data.progress, message: data.message });
      if (data.status === 'done' || data.status === 'failed') {
        es.close();
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, [jobId]);

  return state;
}
