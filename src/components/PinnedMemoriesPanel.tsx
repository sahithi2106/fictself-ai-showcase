import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, X, Pin } from 'lucide-react';
import { PinnedMemory } from '../types';
import { fetchPinnedMemories, createPinnedMemory, updatePinnedMemory, deletePinnedMemory } from '../lib/api/pinnedMemory';

interface Props {
  storyId: string;
  characterId?: string; // Optional: to filter by character if we want
  forceOpen?: boolean;
  onCloseForceOpen?: () => void;
  onMemoryDeleted?: (memory: PinnedMemory) => void;
  onMemoryUpdated?: (memory: PinnedMemory) => void;
  refreshTrigger?: number;
}

export default function PinnedMemoriesPanel({ storyId, characterId, forceOpen, onCloseForceOpen, onMemoryDeleted, onMemoryUpdated, refreshTrigger }: Props) {
  const [memories, setMemories] = useState<PinnedMemory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedMemoryId, setExpandedMemoryId] = useState<string | null>(null);
  
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<PinnedMemory['memoryType']>('plot_fact');

  useEffect(() => {
    if (forceOpen) {
      setIsExpanded(true);
      setIsAdding(true);
    }
  }, [forceOpen]);

  useEffect(() => {
    if (storyId) {
      loadMemories();
    }
  }, [storyId, refreshTrigger]);

  const loadMemories = async () => {
    setIsLoading(true);
    try {
      const data = await fetchPinnedMemories(storyId);
      // Filter locally if characterId is provided (though backend could do this)
      const filtered = characterId 
        ? data.filter(m => !m.characterId || m.characterId === characterId) 
        : data.filter(m => !m.characterId);
      setMemories(filtered);
    } catch (error) {
      console.error('Failed to load pinned memories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    
    try {
      const memory = await createPinnedMemory(storyId, {
        title: newTitle,
        content: newContent,
        memoryType: newType,
        characterId,
        isActive: true
      });
      setMemories([memory, ...memories]);
      setIsAdding(false);
      setNewTitle('');
      setNewContent('');
    } catch (error) {
      console.error('Failed to create pinned memory:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this pinned memory?')) return;
    try {
      const memoryToDelete = memories.find(m => m.id === id);
      await deletePinnedMemory(id);
      setMemories(memories.filter(m => m.id !== id));
      if (memoryToDelete && onMemoryDeleted) {
        onMemoryDeleted(memoryToDelete);
      }
    } catch (error) {
      console.error('Failed to delete pinned memory:', error);
    }
  };

  const handleToggleActive = async (memory: PinnedMemory) => {
    try {
      const updated = await updatePinnedMemory(memory.id, { isActive: !memory.isActive });
      setMemories(memories.map(m => m.id === memory.id ? updated : m));
      if (onMemoryUpdated) {
        onMemoryUpdated(updated);
      }
    } catch (error) {
      console.error('Failed to toggle pinned memory:', error);
    }
  };

  if (isLoading && !isExpanded) {
    // Just a placeholder if not expanded and loading
  }

  const activeCount = memories.filter(m => m.isActive).length;

  // Phase 3: Hide the big empty panel if no memories and not forced open
  if (!isLoading && memories.length === 0 && !isExpanded && !forceOpen) {
    return null;
  }

  return (
    <div className="bg-[#0e0e10] rounded-lg border border-[#1e1e21] flex flex-col overflow-hidden">
      <div 
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[#141416] transition-colors"
        onClick={() => {
          setIsExpanded(!isExpanded);
          if (isExpanded && onCloseForceOpen) {
            onCloseForceOpen();
          }
        }}
      >
        <div className="flex items-center gap-1.5">
          <Pin size={11} className="text-amber-400" />
          <span className="text-[10px] font-semibold text-slate-400">Important Memories</span>
          {!isLoading && activeCount > 0 && (
            <>
              <span className="text-[9px] text-slate-600">·</span>
              <span className="text-[9px] text-slate-500">{activeCount} active</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isExpanded && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsAdding(!isAdding);
                if (!isAdding && onCloseForceOpen) {
                  onCloseForceOpen();
                }
              }}
              className={`text-[9px] flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                isAdding ? 'bg-[#1e1e21] text-slate-300 hover:bg-[#2a2a2e]' : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
              }`}
            >
              {isAdding ? <><X size={10} /> Cancel</> : <><Plus size={10} /> Add</>}
            </button>
          )}
          {isExpanded ? <ChevronDown size={10} className="text-slate-500" /> : <ChevronRight size={10} className="text-slate-500" />}
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 py-3 flex flex-col gap-3 border-t border-[#1e1e21]">
          {isAdding && (
            <div className="space-y-2 bg-[#141416] p-2 rounded border border-[#1e1e21]">
              <input
                type="text"
                placeholder="Fact Title (e.g., The Secret Key)"
                className="w-full bg-[#0c0c0e] border border-[#222] rounded px-2 py-1 text-[10px] text-slate-200 focus:outline-none focus:border-indigo-500"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
              />
              <select
                className="w-full bg-[#0c0c0e] border border-[#222] rounded px-2 py-1 text-[10px] text-slate-200 focus:outline-none focus:border-indigo-500"
                value={newType}
                onChange={e => setNewType(e.target.value as PinnedMemory['memoryType'])}
              >
                <option value="plot_fact">Plot Fact</option>
                <option value="relationship">Relationship</option>
                <option value="object">Object</option>
                <option value="world_rule">World Rule</option>
                <option value="secret">Secret</option>
                <option value="emotional">Emotional State</option>
                <option value="other">Other</option>
              </select>
              <textarea
                placeholder="Detailed fact content..."
                rows={3}
                className="w-full bg-[#0c0c0e] border border-[#222] rounded px-2 py-1 text-[10px] text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
              />
              <button 
                onClick={handleCreate}
                disabled={!newTitle.trim() || !newContent.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-bold py-1.5 rounded cursor-pointer"
              >
                Save Pinned Fact
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="text-center text-[10px] text-slate-500 py-2">Loading pinned memories...</div>
          ) : memories.length === 0 && !isAdding ? null : (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#222] scrollbar-track-transparent pr-1">
              {memories.map(memory => {
                const isMemoryExpanded = expandedMemoryId === memory.id;
                const showViewMore = memory.content.length > 90 || memory.content.includes('\n');
                
                return (
                  <div 
                    key={memory.id} 
                    className={`p-2 rounded border transition-colors ${
                      memory.isActive 
                        ? 'bg-[#141416] border-[#222]' 
                        : 'bg-[#0c0c0e] border-[#1e1e21] opacity-60'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <div className="font-medium text-slate-300 text-[10px] leading-tight">{memory.title}</div>
                      <div className="flex space-x-2 shrink-0">
                        <button 
                          onClick={() => handleToggleActive(memory)}
                          className="text-[10px] text-slate-400 hover:text-slate-200"
                          title={memory.isActive ? "Deactivate" : "Activate"}
                        >
                          {memory.isActive ? 'Active' : 'Muted'}
                        </button>
                        <button 
                          onClick={() => handleDelete(memory.id)}
                          className="text-[10px] text-rose-400 hover:text-rose-300"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2 mb-1.5">
                      <div className="text-[8px] font-bold text-amber-500 bg-amber-500/10 rounded px-1 w-fit uppercase tracking-wider">
                        {memory.memoryType.replace('_', ' ')}
                      </div>
                      {memory.sourceType === 'chat_message' ? (
                        <div className="text-[8px] font-bold text-indigo-400 bg-indigo-500/10 rounded px-1 w-fit uppercase tracking-wider flex items-center gap-0.5">
                          From Chat
                        </div>
                      ) : (
                        <div className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 rounded px-1 w-fit uppercase tracking-wider flex items-center gap-0.5">
                          Manual
                        </div>
                      )}
                    </div>
                    <div className={`text-slate-400 text-[10px] whitespace-pre-wrap leading-relaxed ${!isMemoryExpanded ? 'line-clamp-2' : ''}`}>
                      {memory.content}
                    </div>
                    {showViewMore && (
                      <button 
                        onClick={() => setExpandedMemoryId(isMemoryExpanded ? null : memory.id)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 mt-1.5 font-medium flex items-center gap-1"
                      >
                        {isMemoryExpanded ? 'Show less' : 'View more'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
