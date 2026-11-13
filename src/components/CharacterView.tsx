import React, { useState, useRef, useEffect } from 'react';
import { Character, CharacterRole, Story, UserProfile } from '../types';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  User, 
  ShieldAlert, 
  Heart, 
  RefreshCw, 
  Filter, 
  BookOpen, 
  ChevronRight,
  Workflow,
  Tag
} from 'lucide-react';
import CharacterProfileView from './CharacterProfileView';

interface CharacterViewProps {
  characters: Character[];
  stories: Story[];
  onAddCharacter: (character: Character, avatarFile?: File) => void;
  onDeleteCharacter: (id: string) => void;
  onUpdateCharacter: (character: Character, avatarFile?: File) => void;
  initialSelectedStoryId?: string;
  hideStorySelector?: boolean;
  currentUser?: UserProfile | null;
}

const AutoExpandingTextarea = ({
  value,
  onChange,
  placeholder,
  className,
  rows = 3
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      rows={rows}
      style={{ overflowY: 'hidden', resize: 'none' }}
    />
  );
};

export default function CharacterView({ 
  characters, 
  stories,
  onAddCharacter, 
  onDeleteCharacter,
  onUpdateCharacter,
  initialSelectedStoryId,
  hideStorySelector = false,
  currentUser
}: CharacterViewProps) {
  
  // Choose initial selected story or default to first story
  const [selectedStoryId, setSelectedStoryId] = useState<string>(() => {
    if (initialSelectedStoryId) return initialSelectedStoryId;
    return stories[0]?.id || 'story-1';
  });

  const canModifyCharacter = (charStoryId: string): boolean => {
    if (!currentUser) return true; // fallback
    if (currentUser.role === 'Admin') return true;
    if (currentUser.role === 'Reader') return false;
    const targetStory = stories.find(s => s.id === charStoryId);
    return targetStory ? targetStory.authorId === currentUser.id : false;
  };

  const [filterRole, setFilterRole] = useState<string>('All Roles');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Viewing detailed character profile bible state
  const [viewingProfileChar, setViewingProfileChar] = useState<Character | null>(null);

  // Deletion modal state
  const [characterToDelete, setCharacterToDelete] = useState<Character | null>(null);

  // Form Field State
  const [formName, setFormName] = useState('');
  const [formAge, setFormAge] = useState('');
  const [formRole, setFormRole] = useState<CharacterRole>('Hero');
  const [formPersonality, setFormPersonality] = useState('');
  const [formGoals, setFormGoals] = useState('');
  const [formFears, setFormFears] = useState('');
  const [formValues, setFormValues] = useState('');
  const [formStrengths, setFormStrengths] = useState('');
  const [formWeaknesses, setFormWeaknesses] = useState('');
  const [formRelationships, setFormRelationships] = useState('');
  const [formSpeechStyle, setFormSpeechStyle] = useState('');
  const [formBackground, setFormBackground] = useState('');
  const [formArc, setFormArc] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formAvatar, setFormAvatar] = useState('https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      
      if (!validTypes.includes(file.type)) {
        alert('Unsupported file format. Please upload JPG, JPEG, PNG, or WEBP.');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds the 10MB limit.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormAvatar(event.target.result as string);
          setSelectedAvatarFile(file);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const rolesList: (CharacterRole | 'All Roles')[] = ['All Roles', 'Hero', 'Villain', 'Mentor', 'Friend', 'Love Interest', 'Custom'];

  const avatarsPresets = [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80', // Hacker Blue
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', // Formal Suit
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', // Old Beard
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80', // Red jacket pilot
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', // Female neon glasses
    'https://images.unsplash.com/photo-1620121692029-d088224ddc74?auto=format&fit=crop&w=150&q=80'  // Digital grid background
  ];

  const currentSelectedStory = stories.find(s => s.id === selectedStoryId) || stories[0];

  const handleEditClick = (char: Character) => {
    setEditingId(char.id);
    setFormName(char.name);
    setFormAge(char.age);
    setFormRole(char.role);
    setFormPersonality(char.personality);
    setFormGoals(char.goals);
    setFormFears(char.fears);
    setFormValues(char.values);
    setFormStrengths(char.strengths);
    setFormWeaknesses(char.weaknesses);
    setFormRelationships(char.relationships);
    setFormSpeechStyle(char.speechStyle);
    setFormBackground(char.background);
    setFormArc(char.characterArc);
    setFormAvatar(char.avatar);
    setSelectedAvatarFile(null);
    setFormNotes(char.notes || '');
    setIsCreating(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    clearForm();
  };

  const clearForm = () => {
    setFormName('');
    setFormAge('');
    setFormRole('Hero');
    setFormPersonality('');
    setFormGoals('');
    setFormFears('');
    setFormValues('');
    setFormStrengths('');
    setFormWeaknesses('');
    setFormRelationships('');
    setFormSpeechStyle('');
    setFormBackground('');
    setFormArc('');
    setFormNotes('');
    setFormAvatar(avatarsPresets[0]);
    setSelectedAvatarFile(null);
  };

  const handleSave = (e: any) => {
    e.preventDefault();
    if (!formName.trim()) return;
    
    if (formAge && formAge.length > 100) {
      alert("Age description is too long (maximum 100 characters). Please shorten it.");
      return;
    }

    if (editingId) {
      const updated: Character = {
        id: editingId,
        storyId: selectedStoryId, // belongs to the currently active story selection
        name: formName,
        age: formAge || 'N/A',
        role: formRole,
        personality: formPersonality || 'Mysterious, unpredictable.',
        goals: formGoals || 'Not yet defined.',
        fears: formFears || 'Unknown.',
        values: formValues || 'Sovereignty and survival.',
        strengths: formStrengths || 'Resourceful.',
        weaknesses: formWeaknesses || 'Impulsive.',
        relationships: formRelationships || 'Intriguing contacts.',
        speechStyle: formSpeechStyle || 'Brief, snarky.',
        background: formBackground || 'Grew up on the Grid rails.',
        characterArc: formArc || 'Learning to compromise.',
        avatar: formAvatar,
        notes: formNotes
      };
      onUpdateCharacter(updated, selectedAvatarFile || undefined);
    } else {
      const brandNew: Character = {
        id: `char-new-${Date.now()}`,
        storyId: selectedStoryId, // belongs to the currently active story selection
        name: formName,
        age: formAge || '25',
        role: formRole,
        personality: formPersonality || 'Inquisitive character.',
        goals: formGoals || 'Dethrone existing challenges.',
        fears: formFears || 'Dreading neural failures.',
        values: formValues || 'Self-preservation.',
        strengths: formStrengths || 'Quick reactions.',
        weaknesses: formWeaknesses || 'Soft spot for pilot crew.',
        relationships: formRelationships || 'Works with loyal agents.',
        speechStyle: formSpeechStyle || 'Quiet, reserved.',
        background: formBackground || 'Local alliance member.',
        characterArc: formArc || 'Unraveling corporate conspiracies.',
        avatar: formAvatar,
        notes: formNotes
      };
      onAddCharacter(brandNew, selectedAvatarFile || undefined);
    }
    
    setIsCreating(false);
    setEditingId(null);
    clearForm();
  };

  // Filter ONLY characters belonging to the selected story 
  const storySpecificCharacters = characters.filter(char => char.storyId === selectedStoryId);

  // Apply narrative role filter as well
  const filteredCharacters = storySpecificCharacters.filter(char => {
    return filterRole === 'All Roles' || char.role === filterRole;
  });

  // Render the dedicated Character Bible template page if active
  if (viewingProfileChar) {
    return (
      <CharacterProfileView 
        character={viewingProfileChar}
        storyName={currentSelectedStory?.title || "FictSelf Universe"}
        chapters={currentSelectedStory?.chapters || []}
        onClose={() => setViewingProfileChar(null)}
      />
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-1 py-4 select-none animate-fade-in" id="fictself-character-view">
      
      {/* Redesigned story selection dropdown header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 border-b border-[#1a1a1a] pb-6">
        <div className="space-y-1.5 flex-1 pr-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest font-mono text-indigo-400 font-bold bg-indigo-505/10 px-2 py-0.5 rounded">Story Codex Module</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Character Codex</h1>
          <p className="text-xs text-slate-400">Characters are strictly scoped to their story universes inside FictSelf.</p>
        </div>

        {/* Dropdown element for FictSelf select story */}
        <div className="flex flex-wrap items-center gap-4">
          {!hideStorySelector ? (
            <div className="flex flex-col gap-1 min-w-[200px]" id="story-selection-dropdown-block">
              <label className="text-[9px] font-bold text-slate-405 font-mono uppercase tracking-wider">Current Story Context</label>
              <select
                value={selectedStoryId}
                onChange={(e) => {
                  setSelectedStoryId(e.target.value);
                  setFilterRole('All Roles'); // Reset roles filter
                }}
                className="w-full bg-[#0d0d0d] border border-[#222] hover:border-slate-800 text-slate-205 text-xs font-bold py-2 px-3.5 rounded-xl cursor-pointer focus:outline-none transition-colors"
              >
                {stories.map(s => (
                  <option key={s.id} value={s.id}>
                    📖 {s.title}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex flex-col gap-1 min-w-[200px]" id="story-selection-dropdown-block">
              <label className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider">Story Context</label>
              <div className="bg-[#141414]/90 border border-[#222] text-violet-300 text-xs font-extrabold py-2 px-3.5 rounded-xl select-text">
                📖 {currentSelectedStory?.title}
              </div>
            </div>
          )}

          {!isCreating && canModifyCharacter(selectedStoryId) && (
            <button 
              onClick={() => {
                clearForm();
                setIsCreating(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer h-10 mt-auto"
              id="add-character-btn"
            >
              <Plus size={16} />
              Add Story Character
            </button>
          )}
        </div>
      </div>

      {/* 2. Character creation / edit form */}
      {isCreating ? (
        <form onSubmit={handleSave} className="bg-[#0d0d0d] border border-[#1c1c1c] rounded-2xl p-6 space-y-6" id="character-creation-form">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2 border-b border-[#1c1c1c] pb-3.5 shrink-0">
            <Sparkles size={18} className="text-violet-400" />
            {editingId ? 'Edit Character Node' : `Design Character for “${currentSelectedStory?.title}”`}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            {/* Left Col: Name, role, age, avatar */}
            <div className="md:col-span-1 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Character Avatar</label>
                <div className="flex flex-col gap-3 p-4 bg-[#141414] border border-[#222] rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="relative group shrink-0">
                      <img 
                        src={formAvatar || undefined} 
                        alt="Avatar Preview" 
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-full object-cover outline outline-4 outline-violet-500/20 shadow-lg object-top"
                      />
                      <div 
                        onClick={() => avatarInputRef.current?.click()}
                        className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-250 cursor-pointer text-[9px] text-white font-bold"
                      >
                        Change
                      </div>
                    </div>
                    <div className="space-y-1">
                      <input 
                        type="file"
                        ref={avatarInputRef}
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        className="hidden"
                        onChange={handleAvatarFileChange}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-extrabold text-white transition flex items-center gap-1 cursor-pointer"
                          id="character-avatar-upload-trigger"
                        >
                          Upload Image
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormAvatar('');
                            setSelectedAvatarFile(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 text-[10px] font-extrabold text-red-305 transition flex items-center gap-1 cursor-pointer border border-red-900/30"
                        >
                          Remove
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-500 font-mono">PNG, JPG, WEBP • Max 10MB</p>
                    </div>
                  </div>
                  
                  {/* Preset Quick Selection */}
                  <div className="space-y-1 pt-1 border-t border-[#1e1e1e]">
                    <span className="text-[9px] font-bold text-slate-500 font-mono uppercase">Or Choose a Preset Avatar</span>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 select-none">
                      {avatarsPresets.map((avUrl, index) => (
                        <div 
                          key={index}
                          onClick={() => {
                            setFormAvatar(avUrl);
                            setSelectedAvatarFile(null);
                          }}
                          className={`w-10 h-10 rounded-full overflow-hidden cursor-pointer border-2 transition ${
                            formAvatar === avUrl && !selectedAvatarFile ? 'border-[#3b82f6] scale-102' : 'border-[#2c2c2c] hover:border-[#444]'
                          }`}
                        >
                          <img src={avUrl} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Full Name *</label>
                <input 
                  type="text" 
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Silas Thorne"
                  className="w-full bg-[#141414] border border-[#222] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-semibold text-xs py-2 px-3.5 rounded-lg outline-none text-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#f3f4f6] uppercase tracking-wider font-mono">Narrative Role</label>
                <select 
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as CharacterRole)}
                  className="w-full bg-[#141414] border border-[#222] text-slate-300 text-xs py-2 px-3.5 rounded-lg focus:outline-none cursor-pointer"
                >
                  <option value="Hero">Hero (Protagonist)</option>
                  <option value="Villain">Villain (Antagonist)</option>
                  <option value="Mentor">Mentor (Guide)</option>
                  <option value="Friend">Friend / Sidekick</option>
                  <option value="Love Interest">Love Interest</option>
                  <option value="Custom">Custom Archetype</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Age</label>
                <input 
                  type="text" 
                  value={formAge}
                  onChange={(e) => setFormAge(e.target.value)}
                  placeholder="e.g. 24, immortal, unknown"
                  maxLength={100}
                  className="w-full bg-[#141414] border border-[#222] focus:border-blue-500 rounded-lg text-xs py-2 px-3 outline-none text-slate-200"
                />
              </div>
            </div>

            {/* Right block: Traits inputs */}
            <div className="md:col-span-3 space-y-6">
              
              {/* Grid 1: Basic Codex Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-blue-400 font-mono uppercase tracking-wider block">PERSONALITY</label>
                  <AutoExpandingTextarea 
                    value={formPersonality}
                    onChange={(e) => setFormPersonality(e.target.value)}
                    placeholder="Describe their personality, quirks, and general temperament..."
                    className="w-full bg-[#141414] border border-[#222] rounded-lg text-xs p-3 outline-none focus:border-blue-500 text-slate-200 leading-relaxed font-sans"
                    rows={3}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-emerald-400 font-mono uppercase tracking-wider block">GOALS</label>
                  <AutoExpandingTextarea 
                    value={formGoals}
                    onChange={(e) => setFormGoals(e.target.value)}
                    placeholder="What drives this character? List their short-term goals and grand ambitions..."
                    className="w-full bg-[#141414] border border-[#222] rounded-lg text-xs p-3 outline-none focus:border-blue-500 text-slate-200 leading-relaxed font-sans"
                    rows={3}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-rose-450 font-mono uppercase tracking-wider block">FEARS</label>
                  <AutoExpandingTextarea 
                    value={formFears}
                    onChange={(e) => setFormFears(e.target.value)}
                    placeholder="List their past traumas, phobias, and deep fears..."
                    className="w-full bg-[#141414] border border-[#222] rounded-lg text-xs p-3 outline-none focus:border-blue-500 text-slate-200 leading-relaxed font-sans"
                    rows={3}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-yellow-400 font-mono uppercase tracking-wider block">VALUES</label>
                  <AutoExpandingTextarea 
                    value={formValues}
                    onChange={(e) => setFormValues(e.target.value)}
                    placeholder="What moral code guides their decisions? E.g., Truth, loyalty, survival..."
                    className="w-full bg-[#141414] border border-[#222] rounded-lg text-xs p-3 outline-none focus:border-blue-500 text-slate-200 leading-relaxed font-sans"
                    rows={3}
                  />
                </div>
              </div>

              {/* Grid 2: Performance and Connections Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block">STRENGTHS</label>
                  <AutoExpandingTextarea 
                    value={formStrengths}
                    onChange={(e) => setFormStrengths(e.target.value)}
                    placeholder="Key skills, talents, and positive attributes..."
                    className="w-full bg-[#141414] border border-[#222] rounded-lg text-xs p-3 outline-none focus:border-blue-500 text-slate-200 leading-relaxed font-sans"
                    rows={3}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block">WEAKNESSES</label>
                  <AutoExpandingTextarea 
                    value={formWeaknesses}
                    onChange={(e) => setFormWeaknesses(e.target.value)}
                    placeholder="Character flaws, physical limitations, and vulnerabilities..."
                    className="w-full bg-[#141414] border border-[#222] rounded-lg text-xs p-3 outline-none focus:border-blue-500 text-slate-200 leading-relaxed font-sans"
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block">RELATIONSHIPS</label>
                  <AutoExpandingTextarea 
                    value={formRelationships}
                    onChange={(e) => setFormRelationships(e.target.value)}
                    placeholder="Gideon (Mentor), Silas (Rival), Lyra (Friend)"
                  className="w-full bg-[#141414] border border-[#222] rounded-lg text-xs p-3 outline-none focus:border-blue-500 text-slate-200 leading-relaxed font-sans"
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-indigo-400 font-mono uppercase tracking-wider block">HOW THEY SPEAK</label>
                  <AutoExpandingTextarea 
                    value={formSpeechStyle}
                    onChange={(e) => setFormSpeechStyle(e.target.value)}
                    placeholder="Verbose, polite, uses colorful metaphors, or gives brief responses."
                  className="w-full bg-[#141414] border border-[#222] rounded-lg text-xs p-3 outline-none focus:border-blue-500 text-slate-200 leading-relaxed font-sans"
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block">BACKSTORY</label>
                  <AutoExpandingTextarea 
                    value={formBackground}
                    onChange={(e) => setFormBackground(e.target.value)}
                    placeholder="Where did they start? Detail their history and major life events..."
                  className="w-full bg-[#141414] border border-[#222] rounded-lg text-xs p-3 outline-none focus:border-blue-500 text-slate-200 leading-relaxed font-sans"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block">CHARACTER ARC</label>
                  <AutoExpandingTextarea 
                    value={formArc}
                    onChange={(e) => setFormArc(e.target.value)}
                    placeholder="How will this character grow or change throughout the story?"
                    className="w-full bg-[#141414] border border-[#222] rounded-lg text-xs p-3 outline-none focus:border-blue-500 text-slate-200 leading-relaxed font-sans"
                    rows={3}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-violet-400 font-mono uppercase tracking-wider block">EXTRA NOTES</label>
                  <AutoExpandingTextarea 
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Any extra details, clothing, or miscellaneous notes..."
                    className="w-full bg-[#141414] border border-[#222] rounded-lg text-xs p-3 outline-none focus:border-blue-500 text-slate-200 leading-relaxed font-sans"
                    rows={3}
                  />
                </div>
              </div>

            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#1c1c1c] shrink-0">
            <button 
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-550 text-white font-bold text-xs shadow-md cursor-pointer"
              id="save-new-character-submit"
            >
              <Save size={14} className="inline mr-1" />
              Save Character
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* Filter Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4 gap-4 shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Filter size={14} />
              <span>Filter Role Archetype:</span>
              <span className="text-[10px] text-slate-500">({storySpecificCharacters.length} total characters)</span>
            </div>
            
            <div className="flex gap-1 overflow-x-auto shrink-0 select-none pb-0">
              {rolesList.map(r => (
                <button
                  key={r}
                  onClick={() => setFilterRole(r)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition whitespace-nowrap border cursor-pointer ${
                    filterRole === r 
                      ? 'bg-blue-650/10 border-blue-500 text-blue-300' 
                      : 'bg-[#141414] border-[#222] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Bento-Cards */}
          {filteredCharacters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="characters-codex-grid">
              {filteredCharacters.map(char => {
                const bgRoleColor = char.role === 'Hero' 
                  ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' 
                  : char.role === 'Villain' 
                  ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                  : char.role === 'Mentor' 
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' 
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20';

                // Count relationships split by commas
                const relationshipsArray = char.relationships.split(',').map(r => r.trim()).filter(Boolean);
                const relsCount = relationshipsArray.length || 1;

                return (
                  <div 
                    key={char.id}
                    className="bg-[#0d0d0d] border border-[#1a1a1a] hover:border-[#282828] rounded-2xl p-5 flex flex-col justify-between hover:translate-y-[-2px] transition duration-200"
                  >
                    <div className="space-y-4">
                      {/* Character Identification bar */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <img 
                            src={char.avatar || undefined} 
                            alt={char.name} 
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-full object-cover outline outline-2 outline-blue-500/10 object-top"
                          />
                          <div>
                            <h3 className="font-extrabold text-slate-100 text-[15px]">{char.name}</h3>
                            <span className={`inline-block px-2 py-0.5 rounded border mt-1 font-mono text-[9px] font-bold ${bgRoleColor}`}>
                              {char.role.toUpperCase()} · Age {char.age}
                            </span>
                          </div>
                        </div>

                        {/* Top action buttons list */}
                        {canModifyCharacter(char.storyId) && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button 
                            onClick={() => handleEditClick(char)}
                            className="p-1.5 rounded-lg hover:bg-[#1a1a1a] text-slate-400 hover:text-slate-200 border border-[#222] cursor-pointer"
                            title="Edit Character matrix"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button 
                            onClick={() => setCharacterToDelete(char)}
                            className="p-1.5 rounded-lg hover:bg-rose-950/25 text-slate-500 hover:text-rose-400 border border-[#222] cursor-pointer"
                            title="Delete Character matrix"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        )}
                      </div>

                      {/* Highlights stats and goals */}
                      <div className="space-y-3 pt-1.5">
                        <div className="text-[12px] leading-relaxed text-slate-400">
                          <b className="text-slate-500 font-mono text-[9px] uppercase font-bold block mb-0.5">Personality Accent</b>
                          {char.personality}
                        </div>

                        <div className="grid grid-cols-2 gap-3.5 text-[11px] font-mono select-none">
                          <div className="p-2.5 rounded bg-[#141414] border border-[#222]">
                            <span className="text-slate-500 font-extrabold block mb-0.5 uppercase tracking-wide text-[8px]">AMBITION</span>
                            <span className="text-slate-200 font-medium truncate block">{char.goals}</span>
                          </div>
                          <div className="p-2.5 rounded bg-[#141414] border border-[#222]">
                            <span className="text-[#f87171]/90 font-extrabold block mb-0.5 uppercase tracking-wide text-[8px]">FEARS</span>
                            <span className="text-rose-300 font-medium truncate block">{char.fears}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom detail stats with Profile view trigger */}
                    <div className="mt-5 border-t border-[#1a1a1a] pt-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
                        <span className="flex items-center gap-1"><Workflow size={11} /> {relsCount} Relationships</span>
                        <span className="text-slate-700">•</span>
                        <span className="flex items-center gap-1"><Tag size={11} /> 3 Pinned Events</span>
                      </div>

                      <button
                        onClick={() => setViewingProfileChar(char)}
                        className="px-3 py-1.5 rounded bg-blue-600/10 hover:bg-blue-600 text-blue-300 hover:text-white text-[10px] font-bold border border-blue-500/20 font-sans transition-colors cursor-pointer"
                        id={`open-character-profile-${char.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        Character Profile & Bible
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-[#0d0d0d] border border-dashed border-[#222] max-w-lg mx-auto">
              <span className="text-3xl">👥</span>
              <h3 className="font-extrabold text-white text-sm mt-3">Empty Character Codex</h3>
              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                No characters belonging to “{currentSelectedStory?.title}” have been filed. Click "Add Story Character" at the top to configure one!
              </p>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {characterToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0d0d0d] border border-rose-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-2">
                <ShieldAlert size={24} />
              </div>
              <h3 className="text-xl font-extrabold text-white">Delete Character?</h3>
              <div className="text-sm text-slate-300 space-y-3">
                <p>Are you sure you want to delete <strong className="text-white">{characterToDelete.name}</strong>?</p>
                <div className="p-4 bg-rose-950/20 border border-rose-900/30 rounded-xl">
                  <p className="font-bold text-rose-400 mb-2">Deleting this character will also remove:</p>
                  <ul className="list-disc list-inside text-rose-300/90 space-y-1">
                    <li>their chat history</li>
                    <li>their character-specific memory records</li>
                    <li>their character review items</li>
                  </ul>
                </div>
                <p className="text-emerald-400/90 font-medium">But it will NOT delete the story or chapters.</p>
              </div>
            </div>
            <div className="p-4 bg-[#141414] border-t border-[#222] flex justify-end gap-3">
              <button
                onClick={() => setCharacterToDelete(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteCharacter(characterToDelete.id);
                  setCharacterToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-lg transition-colors cursor-pointer flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete Character
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
