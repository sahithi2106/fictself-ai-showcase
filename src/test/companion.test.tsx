import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PinnedMemoriesPanel from '../components/PinnedMemoriesPanel';
import * as pinnedMemoryApi from '../lib/api/pinnedMemory';
import { PinnedMemory } from '../types';

vi.mock('../lib/api/pinnedMemory', () => ({
  fetchPinnedMemories: vi.fn(),
  createPinnedMemory: vi.fn(),
  updatePinnedMemory: vi.fn(),
  deletePinnedMemory: vi.fn(),
}));

describe('Companion & Memory Panel (PinnedMemoriesPanel) Component', () => {
  const mockMemories: PinnedMemory[] = [
    {
      id: 'mem-1',
      storyId: 'story-100',
      characterId: 'char-200',
      title: 'Secret Treaty of Polaris',
      content: 'The alliance was signed under duress in 2045.',
      memoryType: 'plot_fact',
      isActive: true,
      pinnedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'mem-2',
      storyId: 'story-100',
      characterId: 'char-200',
      title: 'Kaelens True Identity',
      content: 'He is the estranged heir of the Thorne cyber-consortium.',
      memoryType: 'character_trait',
      isActive: false,
      pinnedAt: '2026-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders memory count and title in collapsed header', async () => {
    vi.mocked(pinnedMemoryApi.fetchPinnedMemories).mockResolvedValue(mockMemories);

    render(<PinnedMemoriesPanel storyId="story-100" characterId="char-200" />);

    await waitFor(() => {
      expect(screen.getByText('Important Memories')).toBeInTheDocument();
      expect(screen.getByText('1 active')).toBeInTheDocument();
    });
  });

  it('clicking header expands panel and shows memory items', async () => {
    vi.mocked(pinnedMemoryApi.fetchPinnedMemories).mockResolvedValue(mockMemories);

    render(<PinnedMemoriesPanel storyId="story-100" characterId="char-200" />);

    await waitFor(() => {
      expect(screen.getByText('Important Memories')).toBeInTheDocument();
    });

    const header = screen.getByText('Important Memories').closest('div');
    if (header) {
      fireEvent.click(header);
    }

    await waitFor(() => {
      expect(screen.getByText('Secret Treaty of Polaris')).toBeInTheDocument();
      expect(screen.getByText('Kaelens True Identity')).toBeInTheDocument();
    });
  });

  it('creates new pinned memory when submitting the add form', async () => {
    vi.mocked(pinnedMemoryApi.fetchPinnedMemories).mockResolvedValue(mockMemories);
    vi.mocked(pinnedMemoryApi.createPinnedMemory).mockResolvedValue({
      id: 'mem-3',
      storyId: 'story-100',
      characterId: 'char-200',
      title: 'Ancient Hyperdrive Core',
      content: 'Hidden inside the derelict cruiser in orbit.',
      memoryType: 'plot_fact',
      isActive: true,
      pinnedAt: '2026-01-03T00:00:00Z',
    });

    render(<PinnedMemoriesPanel storyId="story-100" characterId="char-200" forceOpen={true} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Title/i)).toBeInTheDocument();
    });

    // Fill form
    const titleInput = screen.getByPlaceholderText(/Title/i);
    fireEvent.change(titleInput, { target: { value: 'Ancient Hyperdrive Core' } });

    const contentInput = screen.getByPlaceholderText(/Detailed fact content/i);
    fireEvent.change(contentInput, { target: { value: 'Hidden inside the derelict cruiser in orbit.' } });

    // Click Save
    const saveButton = screen.getByText('Save Pinned Fact');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(pinnedMemoryApi.createPinnedMemory).toHaveBeenCalledWith('story-100', {
        title: 'Ancient Hyperdrive Core',
        content: 'Hidden inside the derelict cruiser in orbit.',
        memoryType: 'plot_fact',
        characterId: 'char-200',
        isActive: true,
      });
    });
  });

  it('toggles memory active status when clicking toggle button', async () => {
    vi.mocked(pinnedMemoryApi.fetchPinnedMemories).mockResolvedValue(mockMemories);
    vi.mocked(pinnedMemoryApi.updatePinnedMemory).mockResolvedValue({
      ...mockMemories[0],
      isActive: false,
    });

    render(<PinnedMemoriesPanel storyId="story-100" characterId="char-200" forceOpen={true} />);

    await waitFor(() => {
      expect(screen.getByText('Secret Treaty of Polaris')).toBeInTheDocument();
    });

    // The toggle button for mem-1
    const toggleButton = screen.getByTitle('Deactivate');
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(pinnedMemoryApi.updatePinnedMemory).toHaveBeenCalledWith('mem-1', {
        isActive: false,
      });
    });
  });
});
