import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CharacterView from '../components/CharacterView';
import { Character, Story } from '../types';

describe('Character Manager Component (CharacterView)', () => {
  const mockStories: Story[] = [
    {
      id: 'story-alpha',
      author_id: 'user-1',
      title: 'Neon Odyssey',
      synopsis: 'A cyberpunk thriller',
      genre: 'Cyberpunk',
      tags: ['neon', 'future'],
      status: 'Ongoing',
      is_published: true,
      chapters_count: 3,
      likes_count: 5,
      views_count: 20,
      favorites_count: 2,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    },
    {
      id: 'story-beta',
      author_id: 'user-1',
      title: 'Solar Winds',
      synopsis: 'An epic space odyssey',
      genre: 'Sci-Fi',
      tags: ['space'],
      status: 'Ongoing',
      is_published: true,
      chapters_count: 1,
      likes_count: 1,
      views_count: 10,
      favorites_count: 0,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    },
  ];

  const mockCharacters: Character[] = [
    {
      id: 'char-1',
      storyId: 'story-alpha',
      name: 'Kaelen Vance',
      role: 'Hero',
      age: '28',
      personality: 'Stoic, analytical',
      goals: 'Discover the lost nexus',
      fears: 'System collapse',
      values: 'Truth',
      strengths: 'Tactical thinking',
      weaknesses: 'Emotionally guarded',
      relationships: 'Allied with Lyra',
      speechStyle: 'Measured and precise',
      background: 'Ex-cybernetic operative',
      characterArc: 'Learning trust',
      avatar: '',
    },
    {
      id: 'char-2',
      storyId: 'story-alpha',
      name: 'Vespera',
      role: 'Custom',
      age: 'Ageless',
      personality: 'Enigmatic rogue AI',
      goals: 'Digital ascension',
      fears: 'Memory erasure',
      values: 'Freedom',
      strengths: 'Sub-net infiltration',
      weaknesses: 'Volatile energy core',
      relationships: 'Uneasy truce with Kaelen',
      speechStyle: 'Cryptic and echoing',
      background: 'Synthesized in Sector 9',
      characterArc: 'Seeking true sentience',
      avatar: '',
    },
    {
      id: 'char-3',
      storyId: 'story-beta',
      name: 'Captain Reynolds',
      role: 'Mentor',
      age: '55',
      personality: 'Gruff but caring',
      goals: 'Protect the fleet',
      fears: 'Losing his crew',
      values: 'Duty',
      strengths: 'Navigation mastery',
      weaknesses: 'Stubborn',
      relationships: 'Respected commander',
      speechStyle: 'Booming voice',
      background: 'Veteran of the Frontier Wars',
      characterArc: 'Passing the mantle',
      avatar: '',
    },
  ];

  it('renders characters scoped strictly to the active selected story', () => {
    render(
      <CharacterView
        characters={mockCharacters}
        stories={mockStories}
        onAddCharacter={vi.fn()}
        onDeleteCharacter={vi.fn()}
        onUpdateCharacter={vi.fn()}
        initialSelectedStoryId="story-alpha"
      />
    );

    // Characters for story-alpha should be visible
    expect(screen.getByText('Kaelen Vance')).toBeInTheDocument();
    expect(screen.getByText('Vespera')).toBeInTheDocument();

    // Characters for story-beta should NOT be visible
    expect(screen.queryByText('Captain Reynolds')).not.toBeInTheDocument();
  });

  it('renders custom narrative role correctly on character card', () => {
    render(
      <CharacterView
        characters={mockCharacters}
        stories={mockStories}
        onAddCharacter={vi.fn()}
        onDeleteCharacter={vi.fn()}
        onUpdateCharacter={vi.fn()}
        initialSelectedStoryId="story-alpha"
      />
    );

    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Hero')).toBeInTheDocument();
  });

  it('clicking Add Character button opens the character creation form with role options', () => {
    render(
      <CharacterView
        characters={mockCharacters}
        stories={mockStories}
        onAddCharacter={vi.fn()}
        onDeleteCharacter={vi.fn()}
        onUpdateCharacter={vi.fn()}
        initialSelectedStoryId="story-alpha"
      />
    );

    const addBtn = screen.getByText(/Add Story Character/i);
    fireEvent.click(addBtn);

    // Full name and role fields should appear
    expect(screen.getByPlaceholderText(/e\.g\. Silas Thorne/i)).toBeInTheDocument();
    expect(screen.getByText(/Hero \(Protagonist\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Custom Archetype/i)).toBeInTheDocument();
  });

  it('submitting character form with custom role calls onAddCharacter with Custom role', () => {
    const onAddCharacter = vi.fn();

    render(
      <CharacterView
        characters={mockCharacters}
        stories={mockStories}
        onAddCharacter={onAddCharacter}
        onDeleteCharacter={vi.fn()}
        onUpdateCharacter={vi.fn()}
        initialSelectedStoryId="story-alpha"
      />
    );

    // Open creation form
    fireEvent.click(screen.getByText(/Add Story Character/i));

    // Fill name
    const nameInput = screen.getByPlaceholderText(/e\.g\. Silas Thorne/i);
    fireEvent.change(nameInput, { target: { value: 'Shadow Arbiter' } });

    // Select custom role
    const roleSelect = screen.getByDisplayValue(/Hero \(Protagonist\)/i);
    fireEvent.change(roleSelect, { target: { value: 'Custom' } });

    // Submit form
    const saveButton = screen.getByText(/Save Character/i);
    fireEvent.click(saveButton);

    expect(onAddCharacter).toHaveBeenCalled();
    const passedCharacter: Character = onAddCharacter.mock.calls[0][0];
    expect(passedCharacter.name).toBe('Shadow Arbiter');
    expect(passedCharacter.role).toBe('Custom');
    expect(passedCharacter.storyId).toBe('story-alpha');
  });
});
