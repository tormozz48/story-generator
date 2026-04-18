export type StoryStatus = 'queued' | 'planning' | 'writing' | 'imaging' | 'done' | 'failed';

export type Story = {
  id: string;
  ownerId: string | null;
  prompt: string;
  title: string | null;
  status: StoryStatus;
  targetLength: number;
  style: string;
  jobId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GenerationProgressEvent = {
  jobId: string;
  status: StoryStatus;
  progress: number; // 0-100
  message?: string;
};
