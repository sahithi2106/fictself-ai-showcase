export interface PrimaryGenreDef {
  name: string;
  emoji: string;
  color: string;
  subgenres: string[];
}

export const PRIMARY_GENRES: PrimaryGenreDef[] = [
  { name: 'Fantasy', emoji: '', color: 'from-amber-600 to-orange-700', subgenres: ['Epic Fantasy', 'Urban Fantasy', 'High Fantasy', 'Dark Fantasy'] },
  { name: 'Romance', emoji: '', color: 'from-pink-500 to-rose-700', subgenres: ['Contemporary Romance', 'Historical Romance', 'Fantasy Romance'] },
  { name: 'Science Fiction', emoji: '', color: 'from-violet-600 to-fuchsia-700', subgenres: ['Cyberpunk', 'Space Opera', 'Hard Sci-Fi', 'Dystopian'] },
  { name: 'Mystery', emoji: '', color: 'from-sky-500 to-teal-700', subgenres: ['Cozy Mystery', 'Hardboiled', 'Detective'] },
  { name: 'Thriller', emoji: '', color: 'from-red-650 to-rose-800', subgenres: ['Psychological Thriller', 'Techno-Thriller', 'Action Thriller'] },
  { name: 'Adventure', emoji: '', color: 'from-emerald-600 to-teal-700', subgenres: ['Survival', 'Exploration', 'High-Seas Adventure'] },
  { name: 'Horror', emoji: '', color: 'from-[#1e1135] to-[#040108]', subgenres: ['Cosmic Horror', 'Psychological Horror', 'Paranormal'] },
  { name: 'Fanfiction', emoji: '', color: 'from-pink-600 to-fuchsia-800', subgenres: ['Alternate Universe (AU)', 'Crossover', 'Self-Insert'] },
  { name: 'Historical Fiction', emoji: '', color: 'from-yellow-700 to-amber-800', subgenres: ['Ancient World', 'Medieval', 'Victorian'] },
  { name: 'Young Adult', emoji: '', color: 'from-emerald-500 to-green-600', subgenres: ['Coming of Age YA', 'Fantasy YA', 'Dystopian YA'] },
  { name: 'Contemporary', emoji: '', color: 'from-blue-500 to-slate-650', subgenres: ['Slice of Life', 'Contemporary Drama', 'Coming of Age'] },
  { name: 'Poetry', emoji: '', color: 'from-purple-600 to-indigo-800', subgenres: ['Slam Poetry', 'Free Verse', 'Sonnets'] }
];

import { Story } from './types';

// Recommender scoring system to calculate relevance indices
export function scoreStoryForUser(
  story: Story,
  genreHistory: string[],
  searchHistory: string[],
  readingHistory: string[],
  userTags: string[]
): number {
  let score = 0;

  // MVP approach: Exclude malformed or private/unpublished stories
  if (!story || !story.id || story.isArchived) return -9999;
  if (!story.isPublished && story.status !== 'Completed' && story.status !== 'Ongoing') {
    return -9999;
  }

  const genreStr = story.genre || '';
  const tagsArr = story.tags || [];

  const parts = genreStr.split(' / ');
  const primary = parts[0] || '';
  const sub = parts[1] || '';

  if (Array.isArray(genreHistory)) {
    genreHistory.forEach(g => {
      if (primary && g.toLowerCase() === primary.toLowerCase()) {
        score += 15;
      }
      if (sub && g.toLowerCase() === sub.toLowerCase()) {
        score += 8;
      }
    });
  }

  if (Array.isArray(searchHistory)) {
    searchHistory.forEach(term => {
      const q = term.toLowerCase();
      if (genreStr.toLowerCase().includes(q)) score += 5;
      tagsArr.forEach(t => {
        if (t.toLowerCase().includes(q)) score += 3;
      });
    });
  }

  if (Array.isArray(userTags)) {
    userTags.forEach(tag => {
      tagsArr.forEach(t => {
        if (t.toLowerCase() === tag.toLowerCase()) score += 10;
      });
    });
  }

  return score;
}
