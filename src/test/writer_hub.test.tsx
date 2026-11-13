import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MyStoriesView from '../components/MyStoriesView';
import { Story, UserProfile } from '../types';

describe('Writer Hub (MyStoriesView) Component', () => {
  const mockUser: UserProfile = {
    id: 'user-writer-1',
    username: 'writer_jane',
    displayName: 'Jane Writer',
    email: 'jane@example.com',
    role: 'Writer',
    coins: 50,
    themePreference: 'dark',
    profileImage: '',
    bio: '',
    isVerified: true,
    isActive: true,
    createdAt: '2026-01-01',
    lastLogin: '2026-01-01',
  };

  const mockStories: Story[] = [
    {
      id: 'story-1',
      title: 'Echoes of the Void',
      description: 'A gripping sci-fi adventure across forgotten stars.',
      tagline: 'Beyond the edge of space',
      coverUrl: '',
      author: 'Jane Writer',
      authorId: 'user-writer-1',
      genre: 'Sci-Fi',
      tags: ['space', 'adventure'],
      status: 'Ongoing',
      isPublished: true,
      publishedCount: 5,
      draftCount: 0,
      wordCount: 4500,
      views: 120,
      likes: 42,
      favorites: 10,
      followers: 5,
      rating: 4.8,
      chapters: [],
    },
    {
      id: 'story-2',
      title: 'Whispering Shadows',
      description: 'A dark gothic mystery in an abandoned manor.',
      tagline: 'Some secrets should stay buried',
      coverUrl: '',
      author: 'Jane Writer',
      authorId: 'user-writer-1',
      genre: 'Mystery',
      tags: ['ghosts', 'mystery'],
      status: 'Ongoing',
      isPublished: true,
      publishedCount: 1,
      draftCount: 0,
      wordCount: 1200,
      views: 5,
      likes: 0,
      favorites: 0,
      followers: 0,
      rating: 0,
      chapters: [],
    },
  ];

  const defaultProps = {
    stories: mockStories,
    setStories: vi.fn(),
    characters: [],
    currentUser: mockUser,
    setView: vi.fn(),
    setSelectedStoryId: vi.fn(),
    setSelectedChapterId: vi.fn(),
    handleDeleteStory: vi.fn(),
    handleDuplicateStory: vi.fn(),
    handleArchiveStory: vi.fn(),
    handleUpdateStory: vi.fn(),
    handlePublishStoryToggle: vi.fn(),
    handleAddNewChapter: vi.fn(),
    handleAddCharacter: vi.fn(),
    handleDeleteCharacter: vi.fn(),
    handleUpdateCharacter: vi.fn(),
    canModifyStory: () => true,
  };

  it('renders story cards with titles, synopsis, and status', () => {
    render(<MyStoriesView {...defaultProps} />);

    expect(screen.getAllByText('Echoes of the Void')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Whispering Shadows')[0]).toBeInTheDocument();
    expect(screen.getByText('A gripping sci-fi adventure across forgotten stars.')).toBeInTheDocument();
  });

  it('renders empty state when no stories exist', () => {
    render(<MyStoriesView {...defaultProps} stories={[]} />);

    expect(screen.getByText(/You haven't created any stories yet/i)).toBeInTheDocument();
  });

  it('filtering stories by status updates the active stories displayed', () => {
    render(<MyStoriesView {...defaultProps} />);

    // Click 'Completed' filter button when all stories are Ongoing
    const completedFilterBtn = screen.getByRole('button', { name: 'Completed' });
    fireEvent.click(completedFilterBtn);

    expect(screen.getByText(/No stories matching "Completed"/i)).toBeInTheDocument();
    expect(screen.queryByText('A gripping sci-fi adventure across forgotten stars.')).not.toBeInTheDocument();
  });

  it('clicking Create New Story Blueprint button triggers navigation to new story flow', () => {
    render(<MyStoriesView {...defaultProps} />);

    const newBlueprintBtn = screen.getByText(/Create New Story Blueprint/i);
    fireEvent.click(newBlueprintBtn);

    expect(defaultProps.setView).toHaveBeenCalledWith('new-story-flow');
  });

  it('clicking on a story card selects it and navigates to story dashboard', () => {
    render(<MyStoriesView {...defaultProps} />);

    const storyTitle = screen.getAllByText('Echoes of the Void')[0];
    fireEvent.click(storyTitle);

    expect(defaultProps.setSelectedStoryId).toHaveBeenCalledWith('story-1');
    expect(defaultProps.setView).toHaveBeenCalledWith('story-dashboard');
  });
});
