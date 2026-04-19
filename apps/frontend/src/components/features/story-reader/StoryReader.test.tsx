import type { StoryDto } from '@story-generator/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { StoryReader } from './StoryReader';

// Mock hooks to avoid real network calls
vi.mock('@/hooks/useStory', () => ({
  useStory: vi.fn(),
}));
vi.mock('@/hooks/useGenerationProgress', () => ({
  useGenerationProgress: vi.fn().mockReturnValue({ status: 'done', progress: 100 }),
}));

import { useGenerationProgress } from '@/hooks/useGenerationProgress';
import { useStory } from '@/hooks/useStory';

const mockUseGenerationProgress = vi.mocked(useGenerationProgress);

const mockUseStory = vi.mocked(useStory);

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const DONE_STORY_NO_IMAGES: StoryDto = {
  id: 'story-uuid-1',
  ownerId: null,
  prompt: 'test prompt',
  title: 'Тестовая история',
  status: 'done',
  targetLength: 500,
  style: 'photorealistic',
  jobId: 'job-1',
  generatedText: 'Первый абзац текста.\n\nВторой абзац текста.\n\nТретий абзац.',
  images: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const REFERENCE_IMAGE = {
  id: 'img-ref-1',
  storyId: 'story-uuid-1',
  kind: 'reference' as const,
  sceneIndex: null,
  storageKey: 'images/story-uuid-1/reference.png',
  url: 'http://minio/reference.png',
  status: 'done' as const,
  createdAt: new Date().toISOString(),
};

const SCENE_IMAGES = [
  {
    id: 'img-scene-0',
    storyId: 'story-uuid-1',
    kind: 'scene' as const,
    sceneIndex: 0,
    storageKey: 'images/story-uuid-1/scene-0.png',
    url: 'http://minio/scene-0.png',
    status: 'done' as const,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'img-scene-1',
    storyId: 'story-uuid-1',
    kind: 'scene' as const,
    sceneIndex: 1,
    storageKey: 'images/story-uuid-1/scene-1.png',
    url: 'http://minio/scene-1.png',
    status: 'done' as const,
    createdAt: new Date().toISOString(),
  },
];

const FAILED_SCENE_IMAGE = {
  id: 'img-scene-2',
  storyId: 'story-uuid-1',
  kind: 'scene' as const,
  sceneIndex: 2,
  storageKey: '',
  url: '',
  status: 'failed' as const,
  createdAt: new Date().toISOString(),
};

describe('StoryReader', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  it('renders story title and text when done with no images', () => {
    mockUseStory.mockReturnValue({
      data: DONE_STORY_NO_IMAGES,
      isPending: false,
      isError: false,
    } as ReturnType<typeof useStory>);

    renderWithQuery(<StoryReader storyId="story-uuid-1" />);

    expect(screen.getByText('Тестовая история')).toBeInTheDocument();
    expect(screen.getByText('Первый абзац текста.')).toBeInTheDocument();
  });

  it('renders reference portrait when present', () => {
    mockUseStory.mockReturnValue({
      data: { ...DONE_STORY_NO_IMAGES, images: [REFERENCE_IMAGE] },
      isPending: false,
      isError: false,
    } as ReturnType<typeof useStory>);

    renderWithQuery(<StoryReader storyId="story-uuid-1" />);

    // Reference portrait should render as an image with the reference URL
    const imgs = screen.getAllByRole('img');
    const refImg = imgs.find((img) => img.getAttribute('src')?.includes('reference'));
    expect(refImg).toBeDefined();
  });

  it('renders scene images interleaved with story text', () => {
    const story: StoryDto = {
      ...DONE_STORY_NO_IMAGES,
      generatedText:
        'Абзац первый.\n\nАбзац второй.\n\nАбзац третий.\n\nАбзац четвёртый.\n\nАбзац пятый.',
      images: SCENE_IMAGES,
    };

    mockUseStory.mockReturnValue({
      data: story,
      isPending: false,
      isError: false,
    } as ReturnType<typeof useStory>);

    renderWithQuery(<StoryReader storyId="story-uuid-1" />);

    // Both scene images should be rendered
    const imgs = screen.getAllByRole('img');
    const sceneImgs = imgs.filter((img) => img.getAttribute('src')?.includes('scene'));
    expect(sceneImgs).toHaveLength(2);
  });

  it('skips failed scene images (does not render broken image elements)', () => {
    const story: StoryDto = {
      ...DONE_STORY_NO_IMAGES,
      images: [REFERENCE_IMAGE, SCENE_IMAGES[0]!, FAILED_SCENE_IMAGE],
    };

    mockUseStory.mockReturnValue({
      data: story,
      isPending: false,
      isError: false,
    } as ReturnType<typeof useStory>);

    renderWithQuery(<StoryReader storyId="story-uuid-1" />);

    // Only 1 succeeded scene image + reference portrait
    const imgs = screen.getAllByRole('img');
    const sceneImgs = imgs.filter((img) => img.getAttribute('src')?.includes('scene'));
    expect(sceneImgs).toHaveLength(1);
  });

  it('shows GenerationProgress when story is still generating', () => {
    mockUseStory.mockReturnValue({
      data: { ...DONE_STORY_NO_IMAGES, status: 'writing' },
      isPending: false,
      isError: false,
    } as ReturnType<typeof useStory>);

    mockUseGenerationProgress.mockReturnValue({ status: 'writing', progress: 50 });

    renderWithQuery(<StoryReader storyId="story-uuid-1" jobId="job-1" />);

    expect(screen.getByText('Пишем историю…')).toBeInTheDocument();
  });

  it('shows error state when story fetch fails', () => {
    mockUseStory.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    } as ReturnType<typeof useStory>);

    renderWithQuery(<StoryReader storyId="story-uuid-1" />);

    expect(screen.getByText(/не удалось загрузить/i)).toBeInTheDocument();
  });
});
