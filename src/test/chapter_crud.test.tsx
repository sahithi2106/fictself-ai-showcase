import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import DashboardView from '../components/DashboardView';
import { Story, Chapter, Character, UserProfile } from '../types';

describe('Chapter CRUD & Dashboard (DashboardView) Component', () => {
  const mockUser: UserProfile = {
    id: 'user-author-1',
    username: 'cosmic_writer',
    displayName: 'Cosmic Writer',
    email: 'author@fictself.com',
    role: 'Writer',
    coins: 100,
    themePreference: 'dark',
    profileImage: '',
    bio: '',
    isVerified: true,
    isActive: true,
    createdAt: '2026-01-01',
    lastLogin: '2026-01-01',
  };

  const mockChapters: Chapter[] = [
    {
      id: 'chap-1',
      storyId: 'story-genesis',
      title: 'The Silent Threshold',
      sequence: 1,
      content: 'In the quiet before the stars ignited...',
      wordCount: 850,
      charCount: 4200,
      lastSaved: '2026-01-01T12:00:00Z',
      status: 'published',
      isPinned: false,
      summary: 'Opening prologue.',
    },
    {
      id: 'chap-2',
      storyId: 'story-genesis',
      title: 'Whispers in the Circuitry',
      sequence: 2,
      content: 'A pulse echoed through the neural corridors...',
      wordCount: 1200,
      charCount: 6000,
      lastSaved: '2026-01-02T14:30:00Z',
      status: 'draft',
      isPinned: false,
      summary: 'Second chapter investigation.',
    },
  ];

  const mockStory: Story = {
    id: 'story-genesis',
    author: 'Cosmic Writer',
    authorId: 'user-author-1',
    title: 'Genesis Engine',
    description: 'The story of humanity and artificial creation.',
    tagline: 'When code becomes conscious',
    coverUrl: '',
    genre: 'Sci-Fi',
    tags: ['ai', 'cyberpunk', 'future'],
    status: 'Ongoing',
    isPublished: true,
    publishedCount: 1,
    draftCount: 1,
    wordCount: 2050,
    views: 50,
    likes: 10,
    favorites: 8,
    followers: 12,
    rating: 4.9,
    chapters: mockChapters,
  };

  const defaultProps = {
    story: mockStory,
    characters: [] as Character[],
    stories: [mockStory],
    setView: vi.fn(),
    setSelectedChapterId: vi.fn(),
    onNewChapter: vi.fn(),
    onDeleteStory: vi.fn(),
    onPublishStoryToggle: vi.fn(),
    onAddCharacter: vi.fn(),
    onDeleteCharacter: vi.fn(),
    onUpdateCharacter: vi.fn(),
    onUpdateStory: vi.fn(),
    currentUser: mockUser,
  };

  it('renders all chapters with sequence numbers, titles, and statuses', () => {
    render(<DashboardView {...defaultProps} />);

    expect(screen.getByText('Chapter 1')).toBeInTheDocument();
    expect(screen.getByText('The Silent Threshold')).toBeInTheDocument();
    expect(screen.getAllByText('Published')[0]).toBeInTheDocument();

    expect(screen.getByText('Chapter 2')).toBeInTheDocument();
    expect(screen.getByText('Whispers in the Circuitry')).toBeInTheDocument();
    expect(screen.getAllByText('Draft')[0]).toBeInTheDocument();
  });

  it('clicking New Chapter triggers the onNewChapter callback with story id', () => {
    render(<DashboardView {...defaultProps} />);

    const newChapterBtn = screen.getByText('New Chapter');
    fireEvent.click(newChapterBtn);

    expect(defaultProps.onNewChapter).toHaveBeenCalledWith('story-genesis');
  });

  it('filters chapters when clicking Published filter button', () => {
    render(<DashboardView {...defaultProps} />);

    const publishedFilterBtn = screen.getByRole('button', { name: /Published/i });
    fireEvent.click(publishedFilterBtn);

    expect(screen.getByText('The Silent Threshold')).toBeInTheDocument();
    expect(screen.queryByText('Whispers in the Circuitry')).not.toBeInTheDocument();
  });

  it('filters chapters when clicking Drafts filter button', () => {
    render(<DashboardView {...defaultProps} />);

    const draftFilterBtn = screen.getByRole('button', { name: /Drafts/i });
    fireEvent.click(draftFilterBtn);

    expect(screen.getByText('Whispers in the Circuitry')).toBeInTheDocument();
    expect(screen.queryByText('The Silent Threshold')).not.toBeInTheDocument();
  });

  it('clicking on Write button in chapter card navigates to writing-studio with that chapter selected', () => {
    render(<DashboardView {...defaultProps} />);

    const chapterCard = document.getElementById('chapter-card-chap-1');
    expect(chapterCard).not.toBeNull();
    const writeBtn = within(chapterCard!).getByText('Write');
    fireEvent.click(writeBtn);

    expect(defaultProps.setSelectedChapterId).toHaveBeenCalledWith('chap-1');
    expect(defaultProps.setView).toHaveBeenCalledWith('writing-studio');
  });
});
