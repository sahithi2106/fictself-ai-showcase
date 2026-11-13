export type UserRole = 'Reader' | 'Writer' | 'Admin';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  profileImage: string;
  bio: string;
  aboutMe?: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  lastLogin: string;
  // SaaS Onboarding and Account Extensions
  followers?: number;
  following?: number;
  publishedStoriesCount?: number;
  draftStoriesCount?: number;
  favorites?: string[]; // list of story ids
  readingLists?: string[];
  achievements?: string[];
  interests?: string[];
  themePreference?: 'light' | 'dark';
  notificationSettings?: {
    emailUpdates: boolean;
    characterAlerts: boolean;
    communityReplies: boolean;
  };
  isOnboarded?: boolean;
}

export interface Chapter {
  id: string;
  storyId: string;
  title: string;
  content: string;
  status: 'draft' | 'published';
  isPinned: boolean;
  wordCount: number;
  charCount: number;
  lastSaved: string; // Timestamp
  summary: string; // Simulated short summary for AI story memory
  sequence: number; // For ordering chapters
}

export type CharacterRole = 'Hero' | 'Villain' | 'Mentor' | 'Friend' | 'Love Interest' | 'Custom';

export interface Character {
  id: string;
  storyId: string;
  name: string;
  age: string;
  role: CharacterRole;
  personality: string;
  goals: string;
  fears: string;
  values: string;
  strengths: string;
  weaknesses: string;
  relationships: string;
  speechStyle: string;
  background: string;
  characterArc: string;
  avatar: string;
  notes?: string;
}

export interface PinnedEvent {
  id: string;
  storyId: string;
  title: string;
  description: string;
  characterIds: string[];
}

export interface PinnedMemory {
  id: string;
  storyId: string;
  title: string;
  content: string;
  memoryType: 'plot_fact' | 'relationship' | 'object' | 'world_rule' | 'secret' | 'emotional' | 'other';
  characterId?: string;
  sourceChapterId?: string;
  sourceType?: string;
  chatMessageId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  sourceType?: string;
}

export interface StoryMemory {
  id: string;
  storyId: string;
  chapterNumber: number;
  summary: string;
  memoryStatus: 'active' | 'archived';
}

export interface Story {
  id: string;
  title: string;
  description: string;
  tagline: string;
  coverUrl: string;
  author: string;
  authorId?: string;
  isPublished: boolean;
  publishedCount: number;
  draftCount: number;
  wordCount: number;
  views: number;
  likes: number;
  favorites: number;
  followers: number;
  rating: number; // out of 5
  genre: string;
  subgenre?: string;
  tags: string[];
  lastUpdated: string;
  characterBible: string; // MD or HTML text for worldbuilding lore
  chapters: Chapter[];
  isArchived?: boolean;
  archivedAt?: string;
  language?: string;
  status?: 'Ongoing' | 'On Hold' | 'Planned' | 'Draft' | 'Completed' | 'Archived';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  senderName: string;
  avatar: string;
  content: string;
  timestamp: string;
  memoryContextSnapshot?: Record<string, any> | null;
  isPinned?: boolean;
}

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  author: string;
  category: 'Worldbuilding' | 'Character Arc' | 'Plot Help' | 'AI Prompting' | 'Feedback';
  likes: number;
  replies: number;
  timestamp: string;
}

export interface Notification {
  id: string;
  category: 'updates' | 'comments' | 'likes' | 'followers' | 'community' | 'insights';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface AIInsightData {
  chapterTitle: string;
  views: number;
  retention: number; // 0 to 100
  sentimentPositive: number; // 0 to 100
  sentimentNeutral: number; // 0 to 100
  sentimentNegative: number; // 0 to 100
  characterMentions: { [name: string]: number };
  popularRelationships: { pair: string; engagement: number }[];
  topTheme: string;
}

export interface ReadingList {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  storyIds: string[];
  coverUrl?: string;
  followersCount: number;
  creatorName: string;
  creatorId?: string;
  lastUpdated: string;
  isArchived?: boolean;
  isFollowing?: boolean;
}


export interface ChapterComment {
  id: string;
  chapter_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  is_edited: boolean;
  user: {
    id: string;
    username: string;
    display_name?: string | null;
    profile_image?: string | null;
  };
  replies?: ChapterComment[];
}

export interface Persona {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url?: string;
  background_text?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatSessionData {
  id: string;
  story_id: string;
  character_id: string;
  persona_id?: string;
  title?: string;
  status: string;
  started_at: string;
  ended_at?: string;
  summary?: string;
}

