import { Character, Chapter } from '../types';
import { 
  ArrowLeft, 
  Sparkles, 
  Clock, 
  Tag, 
  User, 
  Heart, 
  ShieldAlert, 
  BookOpen, 
  FileText, 
  Brain, 
  Layers, 
  Workflow, 
  Mic, 
  Compass, 
  HelpCircle,
  Cpu,
  BadgeAlert
} from 'lucide-react';

interface CharacterProfileViewProps {
  character: Character;
  storyName: string;
  chapters: Chapter[];
  onClose: () => void;
}

export default function CharacterProfileView({ 
  character, 
  storyName, 
  chapters, 
  onClose 
}: CharacterProfileViewProps) {
  
  // Calculate mockup values for relationships count and pinned events count
  const relationshipsArray = character.relationships.split(',').map(r => r.trim()).filter(Boolean);
  const relationshipsCount = relationshipsArray.length || 1;
  const pinnedEventsCount = 3; // Mocked robust count for FictSelf lore database

  // Mocked associated events
  const mockPinnedEvents = [
    { id: 'evt-1', title: 'The Neural Link Synchronization Failure', desc: `${character.name} experienced a critical cerebral feedback overflow, revealing repressed timeline fragments.`, time: 'Timeline epoch -3' },
    { id: 'evt-2', title: 'The High-District Penthouse Confrontation', desc: `A high-stakes debate between ${character.name} and top Grid enforcers regarding sovereign intelligence assets.`, time: 'Chapter 2' },
    { id: 'evt-3', title: 'The Safehouse Reconstruction Pact', desc: `Co-signed an outline sequence ensuring temporary immunity from Silas Thorne's grid scanners.`, time: 'Chapter 4' }
  ];

  // Story appearances: filter chapters where character is mentioned, or list default ones
  const appearances = chapters.filter(c => {
    const text = c.content.toLowerCase() + c.title.toLowerCase();
    const charName = character.name.toLowerCase().split(' ')[0]; // match first name
    return text.includes(charName);
  });

  const displayedAppearances = appearances.length > 0 ? appearances : chapters.slice(0, 2);

  return (
    <div className="max-w-5xl mx-auto px-1 py-4 select-none animate-fade-in" id="character-bulletin-bible-profile">
      
      {/* Back Header navigation */}
      <div className="flex flex-col gap-2 pb-4 border-b border-[#111] shrink-0 mb-6 font-sans">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 select-none pb-1">
          <button 
            onClick={onClose}
            className="hover:text-white text-slate-400 transition cursor-pointer font-bold flex items-center gap-1.5 bg-transparent border-0 p-0"
            id="profile-close-back-btn"
          >
            &larr; Back to Character Codex
          </button>
          <span className="text-slate-700">|</span>
          <span className="text-slate-500">Workspace</span>
          <span className="text-slate-700 font-mono">&gt;</span>
          <button 
            onClick={onClose}
            className="hover:text-violet-400 text-slate-500 transition cursor-pointer bg-transparent border-0 p-0 font-medium"
          >
            Character Codex
          </button>
          <span className="text-slate-705 font-mono">&gt;</span>
          <span className="text-indigo-400 font-semibold">{character.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: BASIC INFORMATION & COMPACT METRICS */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card Frame */}
          <div className="bg-[#0d0d0d] border border-[#1c1c1c] rounded-2xl p-6 text-center space-y-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
            
            {/* 1. Basic Information Block */}
            <div className="space-y-4">
              <div className="relative inline-block">
                <img 
                  src={character.avatar || undefined} 
                  alt={character.name} 
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 rounded-full mx-auto object-cover outline outline-4 outline-indigo-500/10 shadow-lg object-top"
                />
                <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-4 border-[#0d0d0d] flex items-center justify-center text-[8px] font-bold text-white shadow-md cursor-pointer" title="AI Model Sync Active" />
              </div>

              <div>
                <h1 className="text-xl font-extrabold text-white tracking-tight">{character.name}</h1>
                <p className="text-xs text-indigo-400 font-mono font-semibold mt-1">📖 {storyName}</p>
              </div>

              <div className="flex justify-center items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full outline outline-1 outline-[#222] bg-[#141414] text-[10px] font-mono text-slate-400">
                  Age {character.age}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-600/10 text-indigo-300 outline outline-1 outline-indigo-500/15 text-[10px] font-mono font-bold uppercase tracking-wider">
                  {character.role}
                </span>
              </div>
            </div>

            {/* Metrics summary counts */}
            <div className="border-t border-[#161616] pt-4 grid grid-cols-2 gap-2 text-center text-xs font-mono select-none">
              <div className="p-2.5 rounded-lg bg-[#141414] border border-[#1e1e1e]">
                <span className="text-slate-500 text-[9px] uppercase font-bold block mb-0.5">RELATIONS</span>
                <span className="text-base font-extrabold text-[#f3f4f6]" id="profile-relations-count">
                  {relationshipsCount}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#141414] border border-[#1e1e1e]">
                <span className="text-slate-500 text-[9px] uppercase font-bold block mb-0.5">PINNED EVENTS</span>
                <span className="text-base font-extrabold text-indigo-300" id="profile-pinned-events-count">
                  {pinnedEventsCount}
                </span>
              </div>
            </div>

            {/* AI Vector Memory Status (Section 12) */}
            <div className="border-t border-[#161616] pt-4 space-y-3 text-left">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider font-mono block">
                🧠 Section 12: AI Core Memory Status
              </span>
              <div className="p-3 bg-[#111111] border border-[#1e1e1e] rounded-xl space-y-2 text-[11px] font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-455">Biographical Sync</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    ● ACTIVE
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-455">Coherence Index</span>
                  <span className="text-indigo-400 font-extrabold">98.4%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-455">Chronos Buffer</span>
                  <span className="text-slate-300">128 tokens</span>
                </div>
                <div className="w-full bg-[#1c1c1c] h-1 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-indigo-500 h-full w-[98%]" />
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: CORE NARRATIVE FIELDS */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* 2. Personality */}
            <div className="p-5 rounded-xl bg-[#0d0d0d] border border-[#1c1c1c] space-y-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block flex items-center gap-1.5 leading-none">
                <Compass size={13} className="text-indigo-400 shrink-0" />
                Section 2: Personality Matrix
              </span>
              <div className="space-y-2.5">
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {character.personality || "Quiet nature with dry, sarcastic undertones."}
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                  <div className="p-2 rounded bg-[#141414]">
                    <span className="text-slate-500 font-extrabold block uppercase mb-0.5">Strengths</span>
                    <span className="text-[#34d399] font-medium">{character.strengths || "Resourceful, calm"}</span>
                  </div>
                  <div className="p-2 rounded bg-[#141414]">
                    <span className="text-slate-500 font-extrabold block uppercase mb-0.5">Weaknesses</span>
                    <span className="text-[#f87171] font-medium">{character.weaknesses || "Stubborn, cynical"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Goals */}
            <div className="p-5 rounded-xl bg-[#0d0d0d] border border-[#1c1c1c] space-y-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block flex items-center gap-1.5 leading-none">
                <Layers size={13} className="text-indigo-400 shrink-0" />
                Section 3: Narrative Ambitions & Goals
              </span>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {character.goals || "Establish sovereignty over the remaining cybernetic districts."}
              </p>
            </div>

            {/* 4. Fears */}
            <div className="p-5 rounded-xl bg-[#0d0d0d] border border-[#1c1c1c] space-y-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block flex items-center gap-1.5 leading-none">
                <ShieldAlert size={13} className="text-rose-450 shrink-0" />
                Section 4: Deep Fears & Triggers
              </span>
              <p className="text-xs text-slate-300 leading-relaxed text-rose-100 font-sans">
                {character.fears || "Losing agency over memory archives and identity core."}
              </p>
            </div>

            {/* 5. Values */}
            <div className="p-5 rounded-xl bg-[#0d0d0d] border border-[#1c1c1c] space-y-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block flex items-center gap-1.5 leading-none">
                <Brain size={13} className="text-indigo-400 shrink-0" />
                Section 5: Core Values & Morals
              </span>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {character.values || "Preservation of human choice, defiance against mechanical determinism."}
              </p>
            </div>

            {/* 6. Speech Style */}
            <div className="p-5 rounded-xl bg-[#0d0d0d] border border-[#1c1c1c] space-y-2.5 md:col-span-2 relative overflow-hidden">
              <div className="absolute top-2 right-2 flex items-center gap-1 select-none font-mono text-[8px] text-indigo-450 bg-indigo-500/5 px-2 py-0.5 rounded-full border border-indigo-500/10">
                <Mic size={10} className="animate-pulse" /> LIVE SYNTH TUNING
              </div>
              <span className="text-[10px] uppercase font-bold text-indigo-450 font-mono block flex items-center gap-1.5 leading-none">
                Section 6: Speech Style & AI Dialogue dynamics
              </span>
              <div className="space-y-2">
                <div className="p-3 bg-[#111] rounded-lg border border-[#1a1a1a] font-serif italic text-xs leading-relaxed text-slate-250">
                  " {character.speechStyle || "Brief, calm responses, uses engineering syntax references when analytical."} "
                </div>
                <p className="text-[11px] text-slate-455 font-mono">
                  Synthesized speech model injects this signature pattern into all AI workspace prompts.
                </p>
              </div>
            </div>

            {/* 7. Relationships */}
            <div className="p-5 rounded-xl bg-[#0d0d0d] border border-[#1c1c1c] space-y-2.5 md:col-span-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block flex items-center gap-1.5 leading-none">
                <Workflow size={13} className="text-indigo-400 shrink-0" />
                Section 7: Relationships & Strategic Connections
              </span>
              <div className="flex flex-wrap gap-2 pt-1 font-sans">
                {relationshipsArray.length > 0 ? (
                  relationshipsArray.map((rel, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#222] text-xs font-semibold text-slate-300 flex items-center gap-1.5"
                    >
                      <User size={12} className="text-indigo-400" />
                      {rel}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">No defined companion connections yet for this story context.</span>
                )}
              </div>
            </div>

            {/* 8. Backstory */}
            <div className="p-5 rounded-xl bg-[#0d0d0d] border border-[#1c1c1c] space-y-2.5 md:col-span-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block flex items-center gap-1.5 leading-none">
                <FileText size={13} className="text-indigo-400 shrink-0" />
                Section 8: History & Background Backstory
              </span>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {character.background || "Discovered in the low cyber docks with no digital stamp. Reconstructed by local allies."}
              </p>
            </div>

            {/* 9. Character Arc */}
            <div className="p-5 rounded-xl bg-[#0d0d0d] border border-[#1c1c1c] space-y-2.5 md:col-span-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block flex items-center gap-1.5 leading-none">
                <Cpu size={13} className="text-indigo-400 shrink-0" />
                Section 9: Narrative Arc Progression
              </span>
              <p className="text-xs text-slate-300 leading-relaxed font-sans font-medium">
                {character.characterArc || "Learning to delegate mechanical trust and embrace emotional choices."}
              </p>
            </div>

            {/* 10. Pinned Events */}
            <div className="p-5 rounded-xl bg-[#0d0d0d] border border-[#1c1c1c] space-y-3.5 md:col-span-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block flex items-center gap-1.5 leading-none select-none">
                <Tag size={13} className="text-indigo-400 shrink-0" />
                Section 10: Pinned Events Summary History
              </span>
              <div className="space-y-3 font-sans">
                {mockPinnedEvents.map((evt) => (
                  <div key={evt.id} className="p-3 bg-[#111111] border border-[#1a1a1a] rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-200">{evt.title}</h4>
                      <span className="text-[9px] font-mono text-indigo-400 font-semibold">{evt.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{evt.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 11. Story Appearances */}
            <div className="p-5 rounded-xl bg-[#0d0d0d] border border-[#1c1c1c] space-y-3 md:col-span-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block flex items-center gap-1.5 leading-none select-none">
                <BookOpen size={13} className="text-indigo-400 shrink-0" />
                Section 11: Story Appearances & Chapters list
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {displayedAppearances.map(chap => {
                  const tagStyle = chap.status === 'published' 
                    ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/15'
                    : 'bg-amber-600/10 text-amber-300 border-amber-500/15';

                  return (
                    <div key={chap.id} className="p-3 rounded-xl bg-[#141414] border border-[#1f1f1f] space-y-1 opacity-90">
                      <div className="flex items-center justify-between">
                        <span className={`px-1.5 py-0.5 rounded border text-[8px] font-mono uppercase font-bold ${tagStyle}`}>
                          {chap.status}
                        </span>
                        <span className="text-[8px] font-mono text-slate-500">{chap.wordCount} words</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-200 truncate">{chap.title}</h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1 leading-normal font-sans">{chap.summary}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 13. Dynamic RAG Notes */}
            {character.notes && (
              <div className="p-5 rounded-xl bg-[#0d0d0d] border border-[#1c1c1c] space-y-2.5 md:col-span-2">
                <span className="text-[10px] uppercase font-bold text-violet-400 font-mono block flex items-center gap-1.5 leading-none select-none">
                  <BadgeAlert size={13} className="text-violet-400 shrink-0" />
                  Section 13: Extra Codex Notes & AI Memory Anchors
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                  {character.notes}
                </p>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
