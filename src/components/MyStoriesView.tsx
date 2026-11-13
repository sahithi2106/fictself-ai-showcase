import React, { useState, useEffect } from 'react';
import { Story, Chapter, Character, UserProfile, CharacterRole } from '../types';
import { 
  BookOpen, 
  PenTool, 
  Archive, 
  Plus, 
  Star, 
  Trash2, 
  Edit3, 
  MoreVertical, 
  FileText, 
  Users, 
  Bookmark, 
  Eye, 
  Heart, 
  Calendar, 
  CheckCircle2, 
  ChevronRight, 
  Save, 
  Workflow, 
  Sparkles,
  MapPin, 
  Compass, 
  RotateCcw,
  Clock,
  Shield,
  HelpCircle,
  Copy
} from 'lucide-react';
import CharacterView from './CharacterView';
import StoryCoverView from './StoryCoverView';
import StoryEditModal from './StoryEditModal';

interface MyStoriesViewProps {
  stories: Story[];
  setStories: React.Dispatch<React.SetStateAction<Story[]>>;
  characters: Character[];
  currentUser: UserProfile | null;
  setView: (view: string) => void;
  setSelectedStoryId: (id: string) => void;
  setSelectedChapterId: (id: string) => void;
  handleDeleteStory: (storyId: string) => void;
  handleDuplicateStory: (storyId: string) => void;
  handleArchiveStory: (storyId: string, isArchiving: boolean) => void;
  handleUpdateStory: (updated: Story) => void;
  handlePublishStoryToggle: (storyId: string) => void;
  handleAddNewChapter: (storyId: string) => void;
  handleAddCharacter: (char: Character, avatarFile?: File) => void;
  handleDeleteCharacter: (id: string) => void;
  handleUpdateCharacter: (char: Character, avatarFile?: File) => void;
  canModifyStory: (storyId: string | undefined) => boolean;
  initialTab?: string;
  storiesLoading?: boolean;
}

export interface StoryBible {
  worldBuilding: string;
  lore: string;
  timeline: string;
  locations: string;
  rules: string;
  relationships: string;
}

export const getStoryBibleData = (story: Story): StoryBible => {
  try {
    const data = JSON.parse(story.characterBible);
    if (data && typeof data === 'object' && 'worldBuilding' in data) {
      return {
        worldBuilding: data.worldBuilding || '',
        lore: data.lore || '',
        timeline: data.timeline || '',
        locations: data.locations || '',
        rules: data.rules || '',
        relationships: data.relationships || '',
      };
    }
  } catch (e) {
    // Keep it as raw text
  }
  
  // Return default structured templates based on story attributes if not valid JSON
  return {
    worldBuilding: `### World Setting: ${story.genre || 'Epic Setting'}\n\n${story.description || 'Provide key world concepts, system parameters, architectural descriptions, and faction power grids.'}`,
    lore: story.characterBible || `### Historical Archives & Deep Lore\n\nDeep historical chronicles for ${story.title}. Add legends, ancient events, and cultural norms here.`,
    timeline: `### Chronology & Story Timeline\n\n- **Era I / Backstory**: Core setups, faction shifts.\n- **Act 1 / Part I**: The inciting incident and introductory plot.\n- **Act 2 / Part II**: Main conflicts, character progressions, and climax setups.\n- **Act 3 / Part III**: Resolution, system reboots, and final fates.`,
    locations: `### Locations Directory\n\n1. **Core Hub**: Central trading/cybernetic grid docks.\n2. **Shadow Spires**: High-technology executive suites.\n3. **Border Plains**: Low-density wasteland outskirt bases.`,
    rules: `### System Architecture & Rules (Tech/Magic)\n\n1. Protocols must be encrypted via local nodes.\n2. BioTech augments decay at terminal cybernetic thresholds.\n3. Spellcasting / code injections trigger severe neural feedback.`,
    relationships: `### Factions & Relationship Map\n\n- **Primary Characters**: Allied nodes working to reveal synthetic conspiracies.\n- **Opposing Fronts**: Corporational executive enforcers safeguarding security secrets.`,
  };
};

export default function MyStoriesView({
  stories,
  setStories,
  characters,
  currentUser,
  setView,
  setSelectedStoryId,
  setSelectedChapterId,
  handleDeleteStory,
  handleDuplicateStory,
  handleArchiveStory,
  handleUpdateStory,
  handlePublishStoryToggle,
  handleAddNewChapter,
  handleAddCharacter,
  handleDeleteCharacter,
  handleUpdateCharacter,
  canModifyStory,
  initialTab = 'stories',
  storiesLoading = false
}: MyStoriesViewProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [storyStatusFilter, setStoryStatusFilter] = useState<string>('All');
  const [draftStatusFilter, setDraftStatusFilter] = useState<string>('All');
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
  
  // Story Bible selected context state
  const [bibleStoryId, setBibleStoryId] = useState<string>(() => stories[0]?.id || 'story-1');
  const [selectedBibleSection, setSelectedBibleSection] = useState<'worldBuilding' | 'lore' | 'timeline' | 'locations' | 'rules' | 'relationships'>('worldBuilding');
  const [isEditingBible, setIsEditingBible] = useState(false);
  const [bibleEditText, setBibleEditText] = useState('');
  const [showBibleSavedAlert, setShowBibleSavedAlert] = useState(false);



  // Synchronize bible editing text when story context or category changes
  const activeBibleStory = stories.find(s => s.id === bibleStoryId) || stories[0];
  
  useEffect(() => {
    if (activeBibleStory) {
      const bible = getStoryBibleData(activeBibleStory);
      setBibleEditText(bible[selectedBibleSection]);
    }
  }, [bibleStoryId, selectedBibleSection, activeBibleStory]);

  const handleSaveBibleSection = () => {
    if (!activeBibleStory) return;
    const currentBible = getStoryBibleData(activeBibleStory);
    const updatedBible = {
      ...currentBible,
      [selectedBibleSection]: bibleEditText
    };
    
    const updatedStory: Story = {
      ...activeBibleStory,
      characterBible: JSON.stringify(updatedBible)
    };
    
    handleUpdateStory(updatedStory);
    setIsEditingBible(false);
    setShowBibleSavedAlert(true);
    setTimeout(() => setShowBibleSavedAlert(false), 2500);
  };

  // Get active stories
  const activeStoriesList = stories.filter(s => !s.isArchived);

  // Helper for formatting time ago
  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Recent';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      if (diffMs < 0) return 'Just now';
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMins < 60) return `${diffMins || 1}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) {
        if (diffDays === 0) return 'today';
        if (diffDays === 1) return 'yesterday';
        return `${diffDays}d ago`;
      }
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  // Helper for formatting word count (e.g. 1.6k)
  const formatWordCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    }
    return count.toString();
  };

  // Helper for status badge styling and emojis
  const getDraftStatusEmojiAndLabel = (status?: string) => {
    switch (status) {
      case 'Draft': return { emoji: '🟡', label: 'Draft', color: 'text-amber-400 border-amber-500/20 bg-amber-500/5' };
      case 'Ongoing': return { emoji: '🔵', label: 'Ongoing', color: 'text-blue-450 border-blue-500/20 bg-blue-500/5' };
      case 'Planned': return { emoji: '🟣', label: 'Planned', color: 'text-purple-400 border-purple-500/20 bg-purple-500/5' };
      case 'On Hold': return { emoji: '🟠', label: 'On Hold', color: 'text-orange-450 border-orange-500/20 bg-orange-500/5' };
      case 'Completed': return { emoji: '🟢', label: 'Completed', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' };
      default: return { emoji: '🟡', label: status || 'Draft', color: 'text-amber-400 border-amber-500/20 bg-amber-500/5' };
    }
  };

  // Filter drafts based on general status
  const filteredDraftStories = activeStoriesList.filter(story => {
    if (story.isPublished) return false;
    if (draftStatusFilter === 'All') return true;
    return story.status === draftStatusFilter;
  });
  const groupCharactersByStory = () => {
    const map: { [storyId: string]: Character[] } = {};
    stories.forEach(s => {
      map[s.id] = characters.filter(c => c.storyId === s.id);
    });
    return map;
  };

  const charactersGrouped = groupCharactersByStory();

  // Filter stories based on status
  const filteredActiveStories = activeStoriesList.filter(s => {
    if (!s.isPublished) return false;
    if (storyStatusFilter === 'All') return true;
    return s.status === storyStatusFilter;
  });

  // Approved statuses
  const statusFilters = ['All', 'Ongoing', 'On Hold', 'Completed', 'Draft', 'Planned'];

  const getStatusLabelEmoji = (status?: string) => {
    switch (status) {
      case 'On Hold': return '🟡';
      case 'Planned': return '🔵';
      case 'Draft': return '⚫';
      case 'Completed': return '🏁';
      default: return '🟢';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-2 select-none animate-fade-in" id="writer-hub-root-view">
      
      {/* Header and Brand */}
      <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <span className="text-[10px] font-mono font-bold text-violet-400 uppercase tracking-widest block mb-1">
            CREATIVE WORKSPACE
          </span>
          <h1 className="text-2xl font-extrabold text-white font-sans flex items-center gap-2">
            Writer Hub
          </h1>
        </div>
        
        <button 
          onClick={() => setView('new-story-flow')}
          className="px-4.5 py-2.5 rounded-xl bg-violet-650 hover:bg-violet-600 font-bold text-white text-xs flex items-center gap-1.5 cursor-pointer shadow-md duration-200"
          id="writer-hub-new-blueprint-btn"
        >
          <Plus size={15} />
          Create New Story Blueprint
        </button>
      </div>

      {/* Main Tab Switcher list */}
      <div className="flex bg-[#0b0c13] border border-slate-850 p-1.5 rounded-2xl overflow-x-auto gap-1 shadow-inner" id="writer-hub-tabs-list">
        {[
          { id: 'stories', label: 'Active Stories', icon: BookOpen, count: activeStoriesList.filter(s => s.isPublished).length },
          { id: 'drafts', label: 'Unpublished', icon: FileText, count: activeStoriesList.filter(s => !s.isPublished).length },
          { id: 'characters', label: 'Character Manager', icon: Users, count: characters.length },
          { id: 'bible', label: 'Story Bible', icon: Bookmark, count: undefined },
          { id: 'archived', label: 'Archived Stories', icon: Archive, count: stories.filter(s => s.isArchived).length }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-violet-650/15 text-violet-300 border border-violet-500/20 shadow bg-[#15122e]'
                  : 'text-slate-450 hover:text-slate-200'
              }`}
              id={`writer-hub-tab-${tab.id}`}
            >
              <Icon size={14} className={isActive ? 'text-violet-400' : 'text-slate-500'} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold ${isActive ? 'bg-violet-500/10 text-violet-300' : 'bg-slate-900 text-slate-500'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: STORIES PANEL */}
      {activeTab === 'stories' && (
        <div className="space-y-6 animate-fade-in" id="stories-tab-panel">
          {/* Status filtering tools */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#141722] pb-4 gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400">Filter stories by status:</span>
            </div>
            
            <div className="flex gap-1 overflow-x-auto select-none pb-1 sm:pb-0 scrollbar-none">
              {statusFilters.map(sf => (
                <button
                  key={sf}
                  onClick={() => setStoryStatusFilter(sf)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap border cursor-pointer ${
                    storyStatusFilter === sf
                      ? 'bg-violet-605/10 border-violet-500 text-violet-300 bg-[#16122d]'
                      : 'bg-[#0f111a] border-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sf}
                </button>
              ))}
            </div>
          </div>

          {storiesLoading ? (
            /* Loading skeleton */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-[#0c0d16]/80 border border-slate-850/60 rounded-2xl overflow-hidden h-64 animate-pulse">
                  <div className="h-28 bg-slate-900/60" />
                  <div className="p-4 space-y-3">
                    <div className="h-3 bg-slate-800 rounded w-3/4" />
                    <div className="h-2.5 bg-slate-800/60 rounded w-1/2" />
                    <div className="h-2 bg-slate-800/40 rounded w-full" />
                    <div className="h-2 bg-slate-800/40 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredActiveStories.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-14 text-center bg-[#0d0f17]/60 border border-slate-900 rounded-2xl space-y-4">
              <span className="text-3.5xl">📚</span>
              <div className="space-y-1 max-w-sm">
                <h3 className="font-bold text-sm text-slate-200">No active stories found</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {storyStatusFilter !== 'All'
                    ? `No stories matching "${storyStatusFilter}". Try a different filter or create a new one!`
                    : "You haven't created any stories yet. Start your first narrative here!"}
                </p>
              </div>
              {storyStatusFilter === 'All' && (
                <button
                  onClick={() => setView('new-story-flow')}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                >
                  <Plus size={13} /> Create Your First Story
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="stories-active-grid">
              {filteredActiveStories.map(story => {
                const isOwner = canModifyStory(story.id);
                
                return (
                  <div 
                    key={story.id} 
                    className="bg-[#0c0d16]/80 border border-slate-850/60 hover:border-slate-800 rounded-2xl overflow-hidden shadow duration-205 flex flex-col relative group"
                    id={`writer-story-${story.id}`}
                  >
                    {/* Story Cover and Status overlays */}
                    <div 
                      className="relative aspect-[16/10] bg-slate-900 overflow-hidden cursor-pointer"
                      onClick={() => {
                        setSelectedStoryId(story.id);
                        setView('story-dashboard');
                      }}
                    >
                      <StoryCoverView 
                        coverUrl={story.coverUrl} 
                        title={story.title} 
                        genre={story.genre} 
                        subgenre={story.subgenre}
                        author={story.author}
                        className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                      
                      {/* Genre badge bottom left */}
                      <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-[#0b0c14]/90 text-violet-300 font-mono text-[9px] font-bold border border-slate-805/40 uppercase">
                        {story.genre}
                      </span>

                      {/* Status badge top right */}
                      <span className={`absolute top-3 right-3 px-2 py-0.5 rounded text-[9px] font-bold uppercase border bg-[#0b0c14]/90 ${
                        story.status === 'Completed' 
                          ? 'border-emerald-500/20 text-emerald-400' 
                          : story.status === 'On Hold'
                          ? 'border-amber-500/20 text-amber-305'
                          : 'border-blue-500/20 text-blue-300'
                      }`}>
                        {getStatusLabelEmoji(story.status)} {story.status || 'Ongoing'}
                      </span>

                    </div>

                    {/* Metadata Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4 font-sans">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-extrabold text-white text-sm hover:text-violet-400 cursor-pointer transition truncate pr-2" onClick={() => {
                            setSelectedStoryId(story.id);
                            setView('story-dashboard');
                          }}>{story.title}</h3>
                          <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">Updated {new Date(story.lastUpdated || Date.now()).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal line-clamp-2">{story.description}</p>
                      </div>

                      {/* Counts / Interactions panel */}
                      <div className="flex items-center gap-4 text-[10.5px] text-slate-500 font-mono border-t border-slate-900/60 pt-3 select-none">
                        <span className="flex items-center gap-1.5 shrink-0">
                          <Eye size={12} />
                          {(story.views || 0).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          <Heart size={11} className="text-pink-500" />
                          {(story.likes || 0).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0 ml-auto text-violet-400">
                          {story.chapters?.length || 0} chapters
                        </span>
                      </div>

                      {/* Workspace Trigger Controls */}
                      <div className="flex gap-2 pt-1 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedStoryId(story.id);
                            setView('story-dashboard');
                          }}
                          className="flex-1 py-2 rounded-xl bg-violet-650/10 border border-violet-500/20 hover:bg-violet-650/20 text-violet-300 font-bold text-xs transition duration-150 cursor-pointer text-center"
                          id={`open-workspace-${story.id}`}
                        >
                          story workspace
                        </button>
                        
                        {isOwner && (
                          <div className="relative">
                            <button
                              onClick={() => setOpenCardMenuId(openCardMenuId === story.id ? null : story.id)}
                              className="p-2.5 rounded-xl border border-slate-805/50 bg-[#090b11] hover:bg-[#121622] text-slate-400 hover:text-white transition cursor-pointer"
                              title="More Options"
                            >
                              <MoreVertical size={13} />
                            </button>

                            {openCardMenuId === story.id && (
                              <div className="absolute bottom-11 right-0 w-44 bg-[#090b11] border border-slate-800 rounded-xl py-1.5 shadow-xl z-30 font-sans" id={`options-dropdown-${story.id}`}>
                                <button
                                  onClick={() => {
                                    setOpenCardMenuId(null);
                                    handleDuplicateStory(story.id);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-[11px] text-slate-350 hover:bg-slate-900 hover:text-slate-100 flex items-center gap-1.5 transition"
                                >
                                  <Copy size={11} /> Clone Blueprint
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenCardMenuId(null);
                                    handleArchiveStory(story.id, true);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-[11px] text-blue-405 hover:bg-slate-900 hover:text-blue-300 flex items-center gap-1.5 transition"
                                >
                                  <Archive size={11} /> Move to Archive
                                </button>
                                <hr className="border-slate-900 my-1"/>
                                <button
                                  onClick={() => {
                                    setOpenCardMenuId(null);
                                    if (confirm(`Are you absolutely sure you want to delete ${story.title}? This cannot be undone.`)) {
                                      handleDeleteStory(story.id);
                                    }
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-[11px] text-rose-450 hover:bg-rose-950/20 hover:text-rose-300 flex items-center gap-1.5 transition"
                                >
                                  <Trash2 size={11} /> Delete Story
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DRAFTS PANEL */}
      {activeTab === 'drafts' && (
        <div className="space-y-6 animate-fade-in" id="drafts-tab-panel">
          {/* Draft Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#141722] pb-4 gap-4">
            <div className="flex items-center gap-2 font-sans text-left">
              <span className="text-xs font-bold text-slate-400">Filter unpublished by status:</span>
              <span className="text-[10px] font-mono font-bold text-violet-400 uppercase bg-violet-650/10 px-2.5 py-0.5 rounded-full" id="drafts-universe-count">
                {activeStoriesList.filter(s => !s.isPublished).length} Unpublished Stories
              </span>
            </div>
            
            <div className="flex gap-1 overflow-x-auto select-none pb-1 sm:pb-0 scrollbar-none" id="drafts-status-filters-bar">
              {['All', 'Draft', 'Planned', 'Ongoing', 'On Hold', 'Completed'].map(df => (
                <button
                  key={df}
                  onClick={() => setDraftStatusFilter(df)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap border cursor-pointer ${
                    draftStatusFilter === df
                      ? 'bg-violet-605/10 border-violet-500 text-violet-300 bg-[#16122d]'
                      : 'bg-[#0f111a] border-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                  id={`draft-filter-btn-${df.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {df}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredDraftStories.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-14 text-center bg-[#0d0f17]/60 border border-slate-900 rounded-2xl space-y-4">
                <span className="text-2.5xl">📝</span>
                <div className="space-y-1 max-w-sm">
                  <h3 className="font-extrabold text-sm text-slate-200">No Unpublished Stories</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-sans">
                    No unpublished story blueprints match the "{draftStatusFilter}" status filter.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="drafts-stories-grid">
                {filteredDraftStories.map(story => {
                  const draftChapters = story.chapters.filter(c => c.status === 'draft');
                  const activeDraftsCount = draftChapters.length;
                  const sortedDrafts = [...draftChapters].sort((a, b) => new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime());
                  const latestDraft = sortedDrafts[0];
                  
                  const isOwner = canModifyStory(story.id);

                  const wordCountForm = formatWordCount(story.wordCount || 0);
                  const statusBanner = getDraftStatusEmojiAndLabel(story.status);

                  return (
                    <div 
                      key={story.id} 
                      className="bg-[#0c0d16]/80 border border-slate-850/60 hover:border-slate-800 rounded-2xl overflow-hidden shadow duration-205 flex flex-col relative group"
                      id={`draft-story-card-${story.id}`}
                    >
                      {/* Story Cover Image Container */}
                      <div 
                        className="relative aspect-[16/10] bg-slate-900 overflow-hidden cursor-pointer"
                        onClick={() => {
                          setSelectedStoryId(story.id);
                          setView('story-dashboard');
                        }}
                      >
                        <StoryCoverView 
                          coverUrl={story.coverUrl || undefined} 
                          title={story.title} 
                          genre={story.genre} 
                          subgenre={story.subgenre}
                          author={story.author}
                          className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                        

                        {/* Genre overlay bottom left */}
                        <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-[#0b0c14]/90 text-violet-300 font-mono text-[9px] font-bold border border-slate-805/40 uppercase">
                          {story.genre}
                        </span>

                        {/* Status tag overlay top right */}
                        <span className={`absolute top-3 right-3 px-2 py-0.5 rounded text-[9px] font-bold uppercase border bg-[#0b0c14]/90 ${statusBanner.color}`}>
                          {statusBanner.emoji} {statusBanner.label}
                        </span>
                      </div>

                      {/* Card Metadata info */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4 font-sans text-left">
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <h3 
                                className="font-extrabold text-white text-base hover:text-violet-400 cursor-pointer transition truncate pr-2" 
                                onClick={() => {
                                  setSelectedStoryId(story.id);
                                  setView('story-dashboard');
                                }}
                              >
                                📖 {story.title}
                              </h3>
                              <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                                {formatTimeAgo(story.lastUpdated)}
                              </span>
                            </div>
                          </div>

                          {/* Writing Progress details */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-mono border-b border-slate-900/60 pb-2 select-none">
                              <span className="text-slate-350 font-bold">
                                {story.chapters.length} Chapter{story.chapters.length === 1 ? '' : 's'} • {wordCountForm} Words
                              </span>
                              
                              <span className="text-violet-300 font-bold bg-violet-500/10 border border-violet-500/20 px-2 py-0.2 rounded-full text-[9px] font-mono">
                                {activeDraftsCount === 1 ? '1 Active Draft' : `${activeDraftsCount} Active Drafts`}
                              </span>
                            </div>

                            {/* Draft Preview panel */}
                            {latestDraft ? (
                              <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-850/50 text-left space-y-1">
                                <span className="block text-[8px] uppercase font-bold text-slate-500 font-mono tracking-widest">Latest Draft:</span>
                                <h4 
                                  className="text-xs font-bold text-slate-200 mt-0.5 font-sans truncate hover:text-violet-400 cursor-pointer"
                                  onClick={() => {
                                    setSelectedStoryId(story.id);
                                    setSelectedChapterId(latestDraft.id);
                                    setView('writing-studio');
                                  }}
                                >
                                  {latestDraft.title}
                                </h4>
                                <span className="text-[10px] font-mono text-slate-500 block">
                                  Last edited {formatTimeAgo(latestDraft.lastSaved)}
                                </span>
                              </div>
                            ) : (
                              <div className="p-3 rounded-xl bg-slate-900/20 border border-slate-850/40 text-center">
                                <span className="text-[10.5px] text-slate-505 italic block">No draft chapters created yet</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Interactive Buttons */}
                        <div className="flex gap-2 shrink-0 pt-2 select-none">
                          <button
                            onClick={() => {
                              setSelectedStoryId(story.id);
                              if (latestDraft) {
                                setSelectedChapterId(latestDraft.id);
                                setView('writing-studio');
                              } else {
                                // Default to first chapter or start draft block
                                if (story.chapters.length > 0) {
                                  setSelectedChapterId(story.chapters[0].id);
                                }
                                setView('writing-studio');
                              }
                            }}
                            className="flex-grow py-2.5 px-3.5 rounded-xl bg-violet-650 hover:bg-violet-605 text-white font-bold text-xs transition duration-150 cursor-pointer text-center flex items-center justify-center gap-1.5 shadow"
                            id={`resume-writing-draft-${story.id}`}
                          >
                            <PenTool size={12} />
                            Resume Writing
                          </button>

                          <button
                            onClick={() => {
                              setSelectedStoryId(story.id);
                              setView('story-dashboard');
                            }}
                            className="py-2.5 px-3 rounded-xl border border-slate-805/50 bg-[#090b11] hover:bg-[#121622] text-slate-300 font-bold text-xs transition duration-150 cursor-pointer text-center"
                            id={`draft-story-workspace-btn-${story.id}`}
                          >
                            Story Workspace
                          </button>

                          {/* Options dropdown portal */}
                          {isOwner && (
                            <div className="relative">
                              <button
                                onClick={() => setOpenCardMenuId(openCardMenuId === `draft-${story.id}` ? null : `draft-${story.id}`)}
                                className="p-2.5 rounded-xl border border-slate-855 bg-[#090b11] hover:bg-[#121622] text-slate-400 hover:text-white transition cursor-pointer flex items-center justify-center"
                                title="More Actions"
                              >
                                <MoreVertical size={13} />
                              </button>

                              {openCardMenuId === `draft-${story.id}` && (
                                <div className="absolute bottom-11 right-0 w-44 bg-[#090b11] border border-slate-800 rounded-xl py-1.5 shadow-xl z-30 font-sans text-left" id={`draft-card-options-dropdown-${story.id}`}>
                                  <button
                                    onClick={() => {
                                      setOpenCardMenuId(null);
                                      setEditingStory(story);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-[11px] text-slate-350 hover:bg-slate-900 hover:text-slate-100 flex items-center gap-1.5 transition"
                                  >
                                    <Edit3 size={11} /> Edit Story Details
                                  </button>

                                  {/* Inline Change Status sub-row */}
                                  <div className="px-3 py-1.5 border-b border-stone-900/60 bg-slate-900/20">
                                    <span className="text-[8px] font-bold text-slate-500 block font-mono uppercase tracking-wider mb-1">Change Status</span>
                                    <div className="flex gap-1.5">
                                      {[
                                        { id: 'Draft', color: 'bg-amber-400', title: 'Draft' },
                                        { id: 'Ongoing', color: 'bg-blue-500', title: 'Ongoing' },
                                        { id: 'Planned', color: 'bg-purple-550', title: 'Planned' },
                                        { id: 'On Hold', color: 'bg-orange-400', title: 'On Hold' },
                                        { id: 'Completed', color: 'bg-emerald-400', title: 'Completed' }
                                      ].map(st => (
                                        <button
                                          key={st.id}
                                          onClick={() => {
                                            setOpenCardMenuId(null);
                                            handleUpdateStory({ ...story, status: st.id as any });
                                          }}
                                          className={`w-3.5 h-3.5 rounded-full ${st.color} hover:scale-120 transition active:scale-90`}
                                          title={`Set status to ${st.title}`}
                                        />
                                      ))}
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => {
                                      setOpenCardMenuId(null);
                                      handleDuplicateStory(story.id);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-[11px] text-slate-350 hover:bg-slate-900 hover:text-slate-100 flex items-center gap-1.5 transition"
                                  >
                                    <Copy size={11} /> Duplicate Story
                                  </button>

                                  <button
                                    onClick={() => {
                                      setOpenCardMenuId(null);
                                      handleArchiveStory(story.id, true);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-[11px] text-blue-405 hover:bg-slate-900 hover:text-blue-300 flex items-center gap-1.5 transition"
                                  >
                                    <Archive size={11} /> Archive Story
                                  </button>

                                  <hr className="border-slate-900 my-1"/>
                                  
                                  <button
                                    onClick={() => {
                                      setOpenCardMenuId(null);
                                      if (confirm(`Are you absolutely sure you want to delete ${story.title}? This cannot be undone.`)) {
                                        handleDeleteStory(story.id);
                                      }
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-[11px] text-rose-450 hover:bg-rose-950/20 hover:text-rose-300 flex items-center gap-1.5 transition"
                                  >
                                    <Trash2 size={11} /> Delete Story
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CHARACTERS PANEL */}
      {activeTab === 'characters' && (
        <div className="animate-fade-in bg-transparent" id="characters-tab-panel">
          <CharacterView 
            characters={characters}
            stories={stories}
            initialSelectedStoryId={stories[0]?.id}
            hideStorySelector={false}
            onAddCharacter={handleAddCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onUpdateCharacter={handleUpdateCharacter}
          />
        </div>
      )}

      {/* TAB 4: STORY BIBLE REFERENCE HUB */}
      {activeTab === 'bible' && (
        <div className="space-y-6 animate-fade-in" id="bible-tab-panel">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="space-y-1 flex-1 pr-4">
              <span className="text-[9px] uppercase tracking-widest font-mono text-indigo-400 font-bold bg-indigo-505/10 px-2 py-0.5 rounded">Worldbuilding Reference</span>
              <h3 className="font-extrabold text-white text-base">Story Bible & Lore Nodes</h3>
              <p className="text-xs text-slate-400">Configure lore matrices, locations, timeline schedules, and rules constraints.</p>
            </div>

            {/* Selector context dropdown */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col gap-1 min-w-[220px]">
                <label className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-wider">Current Story Library</label>
                <select
                  value={bibleStoryId}
                  onChange={(e) => {
                    setBibleStoryId(e.target.value);
                    setIsEditingBible(false);
                  }}
                  className="w-full bg-[#0a0b12] border border-slate-850 hover:border-slate-800 text-slate-200 text-xs font-bold py-2.5 px-3.5 rounded-xl cursor-pointer outline-none"
                >
                  {stories.map(s => (
                    <option key={s.id} value={s.id}>
                      📖 {s.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
            {/* Sidebar list of 6 Bible Sub-Categories */}
            <div className="lg:col-span-4 bg-[#0a0c14] border border-slate-850 rounded-2xl p-4.5 space-y-1.5 shadow" id="bible-sections-sidebar">
              {[
                { id: 'worldBuilding', label: 'World Building', desc: 'Factions, environments, and core theme grids' },
                { id: 'lore', label: 'Lore & Background', desc: 'Underlying backstory, origins, and historic maps' },
                { id: 'timeline', label: 'Timeline & Eras', desc: 'Chronological indices and narrative progression' },
                { id: 'locations', label: 'Locations Directory', desc: 'Primary settings, coordinates, and local docks' },
                { id: 'rules', label: 'Magic Tech / Rules', desc: 'Conceptual laws, logic equations, and limits' },
                { id: 'relationships', label: 'Relationships & Factions', desc: 'Alignment grids, loyalties, and organizational boards' }
              ].map(sec => {
                const isActive = selectedBibleSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => {
                      setSelectedBibleSection(sec.id as any);
                      setIsEditingBible(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl transition duration-150 flex items-start gap-3 select-none cursor-pointer ${
                      isActive
                        ? 'bg-indigo-650/10 border border-indigo-500/20 text-indigo-300'
                        : 'hover:bg-[#11131e]/50 text-slate-450 border border-transparent'
                    }`}
                  >
                    <Bookmark size={15} className={`mt-0.5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-bold ${isActive ? 'text-[#f3f4f6]' : 'text-slate-350'}`}>{sec.label}</div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5 leading-normal">{sec.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Large editorial content workspace display */}
            <div className="lg:col-span-8 bg-[#0a0c14] border border-slate-850 rounded-2xl p-6 space-y-6 shadow min-h-[400px] flex flex-col justify-between" id="bible-sections-content">
              <div>
                <div className="flex items-center justify-between border-b border-slate-900 pb-4 gap-2">
                  <div className="space-y-0.5">
                    <h4 className="text-slate-100 font-extrabold text-sm capitalize font-sans">{selectedBibleSection.replace(/([A-Z])/g, ' $1')}</h4>
                    <p className="text-[11px] text-slate-500 uppercase font-mono">Reference sheet in “{activeBibleStory?.title}”</p>
                  </div>
                  
                  {canModifyStory(bibleStoryId) && !isEditingBible && (
                    <button
                      onClick={() => {
                        setIsEditingBible(true);
                        const bible = getStoryBibleData(activeBibleStory);
                        setBibleEditText(bible[selectedBibleSection]);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-[#11131e] border border-slate-800 text-slate-202 text-[10.5px] font-bold hover:bg-[#1a1c2d] hover:text-white transition cursor-pointer flex items-center gap-1 shadow"
                    >
                      <Edit3 size={11} /> Edit Section
                    </button>
                  )}
                </div>

                {showBibleSavedAlert && (
                  <div className="mt-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/10 text-emerald-400 text-xs font-mono font-bold flex items-center gap-2 animate-pulse">
                    <CheckCircle2 size={13} />
                    <span>Lore entry synchronized successfully on this story ledger!</span>
                  </div>
                )}

                {/* Main Content Pane */}
                <div className="mt-5 pr-1 text-slate-300 space-y-4">
                  {isEditingBible ? (
                    <div className="space-y-3.5">
                      <textarea
                        rows={14}
                        value={bibleEditText}
                        onChange={(e) => setBibleEditText(e.target.value)}
                        className="w-full bg-[#05060b] border border-slate-800 rounded-xl p-4 text-xs text-slate-200 outline-none focus:border-indigo-500 font-sans leading-relaxed resize-none"
                        placeholder="Write world guidelines or notes..."
                      />
                      <p className="text-[10px] text-slate-500 font-mono">Tip: Use standard spacing or markdown titles to partition concepts cleanly.</p>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap leading-relaxed text-xs font-serif text-slate-350 bg-black/10 rounded-xl p-5 border border-slate-950/40">
                      {getStoryBibleData(activeBibleStory)[selectedBibleSection] || (
                        <p className="italic text-slate-500">This bible section is currently empty. Click 'Edit Section' above to write guidelines.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Editing Action overlay */}
              {isEditingBible && (
                <div className="flex justify-end gap-3 pt-5 border-t border-slate-900 mt-6 shrink-0">
                  <button
                    onClick={() => setIsEditingBible(false)}
                    className="px-4 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition duration-150 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveBibleSection}
                    className="px-4.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition duration-150 cursor-pointer"
                    id="save-bible"
                  >
                    <Save size={13} className="inline mr-1" />
                    Save References
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* TAB 6: ARCHIVED STORAGE */}
      {activeTab === 'archived' && (
        <div className="space-y-6 animate-fade-in" id="archived-tab-panel">
          <div className="border-b border-[#141722] pb-3.5">
            <h3 className="font-extrabold text-white text-base">Archived Outlines</h3>
            <p className="text-xs text-slate-400">Shelved narratives and deconstructed draft outlines. Restore them to active writing at any time.</p>
          </div>

          {stories.filter(s => s.isArchived).length === 0 ? (
            <div className="flex flex-col items-center justify-center p-14 text-center bg-[#0d0f17]/60 border border-slate-900 rounded-2xl space-y-4">
              <span className="text-2.5xl">📦</span>
              <div className="space-y-1 max-w-sm">
                <h3 className="font-extrabold text-sm text-slate-200">No archived stories</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your archive is currently clean. Shelved stories and drafts will be stored securely here.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="archived-grid">
              {stories
                .filter(s => s.isArchived)
                .map(story => {
                  const isOwner = canModifyStory(story.id);
                  const formattedArchiveDate = story.archivedAt
                    ? new Date(story.archivedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                    : 'Recently';

                  return (
                    <div 
                      key={story.id}
                      className="bg-[#0b0c14]/80 border border-slate-900 rounded-2xl overflow-hidden shadow flex flex-col justify-between"
                      id={`archived-item-${story.id}`}
                    >
                      <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden">
                        <StoryCoverView 
                          coverUrl={story.coverUrl} 
                          title={story.title} 
                          genre={story.genre} 
                          subgenre={story.subgenre}
                          author={story.author}
                          className="w-full h-full object-cover pr-1"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4 font-sans">
                        <div className="space-y-1.5">
                          <span className="px-2 py-0.5 rounded bg-zinc-850 text-zinc-400 border border-zinc-800 font-mono text-[9px] font-bold uppercase tracking-wider block self-start w-fit">
                            {story.genre}
                          </span>
                          <h3 className="font-extrabold text-[#f3f4f6] text-sm pt-1 truncate">{story.title}</h3>
                          <p className="text-xs text-slate-400 leading-normal line-clamp-2">{story.description}</p>
                          <div className="pt-2 text-[10px] font-mono text-indigo-400 font-semibold" id={`archive-date-${story.id}`}>
                            Archived on: {formattedArchiveDate}
                          </div>
                        </div>

                        {/* Restore or Delete permanence */}
                        {isOwner && (
                          <div className="pt-3 border-t border-slate-950 flex gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleArchiveStory(story.id, false)}
                              className="flex-1 py-1.5 px-3 text-[10.5px] font-extrabold rounded-lg border border-violet-500/20 bg-violet-950/15 hover:bg-violet-950/30 text-violet-300 transition cursor-pointer text-center flex items-center justify-center gap-1 shadow"
                              id={`restore-archived-btn-${story.id}`}
                            >
                              <RotateCcw size={11} /> Restore Story
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Are you absolutely sure you want to permanently delete ${story.title}? All associated chapters and characters will be erased.`)) {
                                  handleDeleteStory(story.id);
                                }
                              }}
                              className="flex-1 py-1.5 px-3 text-[10.5px] font-extrabold rounded-lg border border-red-500/25 bg-red-950/10 hover:bg-red-950/35 text-red-300 transition cursor-pointer text-center flex items-center justify-center gap-1 shadow"
                              id={`delete-archived-btn-${story.id}`}
                            >
                              <Trash2 size={11} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {editingStory && (
        <StoryEditModal
          story={editingStory}
          isOpen={true}
          onClose={() => setEditingStory(null)}
          onSave={(updated) => {
            handleUpdateStory(updated);
            setEditingStory(null);
          }}
        />
      )}

    </div>
  );
}
