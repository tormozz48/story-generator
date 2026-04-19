export type StoryStatus =
  | 'queued'
  | 'planning'
  | 'writing'
  | 'portrait'
  | 'scenes'
  | 'done'
  | 'failed';

export type Story = {
  id: string;
  ownerId: string | null;
  prompt: string;
  title: string | null;
  status: StoryStatus;
  targetLength: number;
  style: string;
  jobId: string | null;
  generatedText: string | null;
  images: import('./schemas.js').ImageDto[];
  createdAt: string;
  updatedAt: string;
};

export type GenerationProgressEvent = {
  jobId: string;
  status: StoryStatus;
  progress: number; // 0-100
  message?: string;
};
