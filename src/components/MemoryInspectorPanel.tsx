import { useState } from 'react';
import { ChevronDown, ChevronRight, Brain, Pin, Heart, FileText, BookOpen, Clock } from 'lucide-react';

interface CharacterCoreSummary {
  name?: string;
  role?: string;
  personality_preview?: string;
  goals_preview?: string;
}

interface PinnedMemoryItem {
  type?: string;
  title?: string;
  content_preview?: string;
}

interface CanonMemoryItem {
  title?: string;
  content_preview?: string;
}

interface EmotionalMemoryItem {
  emotion?: string;
  intensity?: number;
  target_label?: string;
  trigger?: string;
  content_preview?: string;
  unresolved?: boolean;
}

interface StoryChunkItem {
  chapter_title?: string;
  text_preview?: string;
}

export interface MemorySnapshot {
  character_core_summary?: CharacterCoreSummary;
  pinned_memories_used?: PinnedMemoryItem[];
  canon_memories_used?: CanonMemoryItem[];
  emotional_memories_used?: EmotionalMemoryItem[];
  retrieved_story_chunks_used?: StoryChunkItem[];
  live_draft_excerpt_used?: string;
  recent_chat_history_count?: number;
}

interface Props {
  snapshot: MemorySnapshot | null;
}

function SectionHeader({ icon: Icon, label, count, color }: { icon: any; label: string; count?: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={11} className={color} />
      <span className="text-[10px] font-semibold text-slate-300">{label}</span>
      {count !== undefined && (
        <span className={`text-[9px] font-bold px-1 rounded ${count > 0 ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700/50 text-slate-500'}`}>
          {count}
        </span>
      )}
    </div>
  );
}

function IntensityBar({ value }: { value: number }) {
  const pct = Math.round((value / 10) * 100);
  const color = value >= 8 ? 'bg-rose-500' : value >= 5 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-slate-500 font-mono w-4 text-right">{value}</span>
    </div>
  );
}

export default function MemoryInspectorPanel({ snapshot }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  if (!snapshot) return null;

  const hasPinned = (snapshot.pinned_memories_used?.length ?? 0) + (snapshot.canon_memories_used?.length ?? 0) > 0;
  const hasEmotions = (snapshot.emotional_memories_used?.length ?? 0) > 0;
  const hasChunks = (snapshot.retrieved_story_chunks_used?.length ?? 0) > 0;
  const hasDraft = !!snapshot.live_draft_excerpt_used;
  const core = snapshot.character_core_summary;

  const totalSources = (snapshot.pinned_memories_used?.length ?? 0)
    + (snapshot.canon_memories_used?.length ?? 0)
    + (snapshot.emotional_memories_used?.length ?? 0)
    + (snapshot.retrieved_story_chunks_used?.length ?? 0)
    + (hasDraft ? 1 : 0);

  return (
    <div className="bg-[#0e0e10] rounded-lg border border-[#1e1e21] overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#141416] transition-colors"
        id="memory-inspector-toggle"
      >
        <div className="flex items-center gap-1.5">
          <Brain size={11} className="text-indigo-400" />
          <span className="text-[10px] font-semibold text-slate-400">Why this answer?</span>
          <span className="text-[9px] text-slate-600">·</span>
          <span className="text-[9px] text-slate-500">{totalSources} source{totalSources !== 1 ? 's' : ''} used</span>
        </div>
        {isOpen ? <ChevronDown size={10} className="text-slate-500" /> : <ChevronRight size={10} className="text-slate-500" />}
      </button>

      {isOpen && (
        <div className="border-t border-[#1e1e21] px-3 py-3 space-y-3">

          {/* 1. Character Core */}
          {core && (
            <div className="space-y-1">
              <SectionHeader icon={Brain} label="Character Core" color="text-violet-400" />
              <div className="pl-4 space-y-0.5">
                {core.role && <p className="text-[10px] text-slate-500">Role: <span className="text-slate-400">{core.role}</span></p>}
                {core.personality_preview && <p className="text-[10px] text-slate-500 leading-relaxed">{core.personality_preview}</p>}
              </div>
            </div>
          )}

          {/* 2. Pinned / Canon Memory */}
          {hasPinned && (
            <div className="space-y-1">
              <SectionHeader icon={Pin} label="Pinned / Canon Memory" count={(snapshot.pinned_memories_used?.length ?? 0) + (snapshot.canon_memories_used?.length ?? 0)} color="text-amber-400" />
              <div className="pl-4 space-y-1.5">
                {snapshot.pinned_memories_used?.map((m, i) => (
                  <div key={i} className="text-[10px]">
                    <span className="inline-block text-[8px] uppercase font-bold text-amber-500 bg-amber-500/10 rounded px-1 mr-1">{m.type}</span>
                    <span className="text-slate-300 font-medium">{m.title}</span>
                    {m.content_preview && <p className="text-slate-500 mt-0.5 leading-relaxed">{m.content_preview}</p>}
                  </div>
                ))}
                {snapshot.canon_memories_used?.map((m, i) => (
                  <div key={`c-${i}`} className="text-[10px]">
                    <span className="inline-block text-[8px] uppercase font-bold text-orange-500 bg-orange-500/10 rounded px-1 mr-1">canon</span>
                    <span className="text-slate-300 font-medium">{m.title}</span>
                    {m.content_preview && <p className="text-slate-500 mt-0.5 leading-relaxed">{m.content_preview}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Emotional Memory */}
          {hasEmotions && (
            <div className="space-y-1">
              <SectionHeader icon={Heart} label="Emotional Memory Triggered" count={snapshot.emotional_memories_used?.length} color="text-rose-400" />
              <div className="pl-4 space-y-2">
                {snapshot.emotional_memories_used?.map((em, i) => (
                  <div key={i} className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold uppercase text-rose-400">{em.emotion}</span>
                      {em.unresolved && <span className="text-[8px] text-rose-500/70 bg-rose-500/10 rounded px-1">unresolved</span>}
                      {em.target_label && <span className="text-[9px] text-slate-400">→ {em.target_label}</span>}
                    </div>
                    {em.intensity !== undefined && <IntensityBar value={em.intensity} />}
                    {em.content_preview && <p className="text-[10px] text-slate-500 leading-relaxed">{em.content_preview}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Live Draft Excerpt */}
          {hasDraft && (
            <div className="space-y-1">
              <SectionHeader icon={FileText} label="Current Draft Excerpt" color="text-teal-400" />
              <p className="pl-4 text-[10px] text-slate-500 leading-relaxed italic">{snapshot.live_draft_excerpt_used}</p>
            </div>
          )}

          {/* 5. Retrieved Story Chunks */}
          {hasChunks && (
            <div className="space-y-1">
              <SectionHeader icon={BookOpen} label="Retrieved Story Memory" count={snapshot.retrieved_story_chunks_used?.length} color="text-sky-400" />
              <div className="pl-4 space-y-1.5">
                {snapshot.retrieved_story_chunks_used?.map((c, i) => (
                  <div key={i} className="text-[10px]">
                    {c.chapter_title && <p className="text-sky-400/70 font-medium mb-0.5">{c.chapter_title}</p>}
                    {c.text_preview && <p className="text-slate-500 leading-relaxed">{c.text_preview}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Recent Chat History count */}
          {(snapshot.recent_chat_history_count ?? 0) > 0 && (
            <div className="space-y-1">
              <SectionHeader icon={Clock} label="Recent Chat Context" count={snapshot.recent_chat_history_count} color="text-slate-400" />
              <p className="pl-4 text-[10px] text-slate-500">{snapshot.recent_chat_history_count} recent message{snapshot.recent_chat_history_count !== 1 ? 's' : ''} included for conversational continuity.</p>
            </div>
          )}

          {totalSources === 0 && (
            <p className="text-[10px] text-slate-600 text-center py-1">No memory sources used for this reply.</p>
          )}
        </div>
      )}
    </div>
  );
}
