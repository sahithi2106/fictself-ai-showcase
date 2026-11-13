import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Edit3, Plus, Clock, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import {
  ReviewQueueItem, ReviewQueueItemCreate, ReviewQueueItemUpdate,
  fetchReviewItems, createReviewItem, updateReviewItem, approveReviewItem, rejectReviewItem
} from '../lib/api/reviewQueue';
import { Character, Chapter } from '../types';

interface Props {
  storyId: string;
  characters?: Character[];
  chapters?: Chapter[];
}

const SUGGESTION_TYPES = [
  { value: 'canon_fact',          label: 'Canon Fact',          color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { value: 'pinned_fact',         label: 'Pinned Fact',         color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { value: 'emotional_memory',    label: 'Emotional Memory',    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  { value: 'relationship_update', label: 'Relationship',        color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  { value: 'world_rule',          label: 'World Rule',          color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
  { value: 'secret',              label: 'Secret',              color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  { value: 'object_fact',         label: 'Object / Artifact',   color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
];

function getTypeStyle(stype?: string | null) {
  return SUGGESTION_TYPES.find(t => t.value === stype) ?? {
    label: stype ?? 'Unknown', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20'
  };
}

type TabKey = 'pending' | 'approved' | 'rejected';

export default function ReviewQueuePanel({ storyId, characters = [], chapters = [] }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add form state
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<string>('canon_fact');
  const [newCharId, setNewCharId] = useState('');
  const [newExcerpt, setNewExcerpt] = useState('');
  const [newTargetLabel, setNewTargetLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Edit state — per item
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Action loading
  const [actionIds, setActionIds] = useState<Set<string>>(new Set());

  const load = async (tab: TabKey) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchReviewItems(storyId, tab);
      setItems(data);
    } catch (e: any) {
      setError('Failed to load review queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(activeTab); }, [storyId, activeTab]);

  const handleAdd = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setIsSaving(true);
    try {
      const payload: ReviewQueueItemCreate = {
        title: newTitle,
        content: newContent,
        suggestion_type: newType,
        source_excerpt: newExcerpt || undefined,
        proposed_target_label: newTargetLabel || undefined,
        character_id: newCharId || undefined,
        created_by: 'manual_writer',
      };
      const created = await createReviewItem(storyId, payload);
      if (activeTab === 'pending') setItems(prev => [created, ...prev]);
      setIsAdding(false);
      setNewTitle(''); setNewContent(''); setNewExcerpt(''); setNewTargetLabel(''); setNewCharId('');
    } catch (e) {
      setError('Failed to add suggestion.');
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (item: ReviewQueueItem) => {
    setEditingId(item.id);
    setEditTitle(item.title ?? '');
    setEditContent(item.content ?? '');
  };

  const handleEditAndApprove = async (item: ReviewQueueItem) => {
    setActionIds(s => new Set(s).add(item.id));
    try {
      // First update the item
      if (editTitle !== item.title || editContent !== item.content) {
        await updateReviewItem(item.id, { title: editTitle, content: editContent });
      }
      // Then approve
      const updated = await approveReviewItem(item.id);
      setItems(prev => prev.filter(i => i.id !== updated.id));
      setEditingId(null);
    } catch (e: any) {
      setError(e?.message || 'Approve failed.');
    } finally {
      setActionIds(s => { const n = new Set(s); n.delete(item.id); return n; });
    }
  };

  const handleApprove = async (id: string) => {
    setActionIds(s => new Set(s).add(id));
    try {
      const updated = await approveReviewItem(id);
      setItems(prev => prev.filter(i => i.id !== updated.id));
    } catch (e: any) {
      setError(e?.message || 'Approve failed.');
    } finally {
      setActionIds(s => { const n = new Set(s); n.delete(id); return n; });
    }
  };

  const handleReject = async (id: string) => {
    setActionIds(s => new Set(s).add(id));
    try {
      const updated = await rejectReviewItem(id);
      setItems(prev => prev.filter(i => i.id !== updated.id));
    } catch (e: any) {
      setError(e?.message || 'Reject failed.');
    } finally {
      setActionIds(s => { const n = new Set(s); n.delete(id); return n; });
    }
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="space-y-4">
      {/* Header + Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-200">Memory Review Queue</h3>
          <p className="text-xs text-slate-500 mt-0.5">Suggested facts & memories awaiting your approval.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-400/50 bg-indigo-500/10 px-2.5 py-1.5 rounded-lg transition"
          id="review-queue-add-btn"
        >
          <Plus size={12} />
          {isAdding ? 'Cancel' : 'Add Suggestion'}
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="bg-[#0b0c10] border border-[#1a1a1e] rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1 block">Title / Short Label</label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. The Blue Pendant belongs to Saiki"
                className="w-full bg-[#141418] border border-[#2a2a2e] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1 block">Type</label>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value)}
                className="w-full bg-[#141418] border border-[#2a2a2e] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {SUGGESTION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            {(newType === 'emotional_memory') && (
              <div>
                <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1 block">Character</label>
                <select
                  value={newCharId}
                  onChange={e => setNewCharId(e.target.value)}
                  className="w-full bg-[#141418] border border-[#2a2a2e] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">— Select character —</option>
                  {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {(newType === 'emotional_memory') && (
              <div className="col-span-2">
                <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1 block">Target (person / object / event)</label>
                <input
                  type="text"
                  value={newTargetLabel}
                  onChange={e => setNewTargetLabel(e.target.value)}
                  placeholder="e.g. Mari, the pendant, the fire"
                  className="w-full bg-[#141418] border border-[#2a2a2e] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
            <div className="col-span-2">
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1 block">Content / Full Description</label>
              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                rows={3}
                placeholder="Full fact, rule, relationship detail, or memory description..."
                className="w-full bg-[#141418] border border-[#2a2a2e] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1 block">Source Excerpt (optional)</label>
              <input
                type="text"
                value={newExcerpt}
                onChange={e => setNewExcerpt(e.target.value)}
                placeholder="Paste the passage or moment that inspired this..."
                className="w-full bg-[#141418] border border-[#2a2a2e] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={isSaving || !newTitle.trim() || !newContent.trim()}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg transition"
            >
              {isSaving ? 'Saving...' : 'Add to Queue'}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1a1a1e] pb-0">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-xs font-semibold transition border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
          <AlertTriangle size={12} className="text-rose-400 shrink-0" />
          <span className="text-xs text-rose-400">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-rose-500 text-xs hover:text-rose-300">✕</button>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="text-xs text-slate-500 text-center py-8">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-[#1a1a1e] rounded-xl">
          <p className="text-xs text-slate-500">
            {activeTab === 'pending' ? 'No pending suggestions. Add one above.' : `No ${activeTab} items.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const typeInfo = getTypeStyle(item.suggestion_type);
            const isActing = actionIds.has(item.id);
            const isEditing = editingId === item.id;

            return (
              <div
                key={item.id}
                className="bg-[#0b0c10] border border-[#1a1a1e] rounded-xl p-4 space-y-2"
                id={`review-item-${item.id}`}
              >
                {/* Type badge + title */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className={`text-[9px] font-bold uppercase border rounded px-1.5 py-0.5 shrink-0 ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    <span className="text-xs font-semibold text-slate-200 truncate">{item.title}</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-600 shrink-0">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Content */}
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full bg-[#141418] border border-[#2a2a2e] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full bg-[#141418] border border-[#2a2a2e] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 leading-relaxed">{item.content}</p>
                )}

                {/* Source excerpt */}
                {item.source_excerpt && !isEditing && (
                  <div className="bg-[#141418] border-l-2 border-slate-700 px-3 py-1.5 rounded-r-lg">
                    <p className="text-[10px] text-slate-500 italic leading-relaxed">"{item.source_excerpt}"</p>
                  </div>
                )}

                {/* Meta: target, character */}
                {(item.proposed_target_label || item.character_id) && (
                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                    {item.proposed_target_label && <span>→ Target: <span className="text-slate-400">{item.proposed_target_label}</span></span>}
                    {item.character_id && characters.length > 0 && (
                      <span>Character: <span className="text-slate-400">{characters.find(c => c.id === item.character_id)?.name ?? item.character_id.slice(0, 8)}</span></span>
                    )}
                  </div>
                )}

                {/* Actions — Pending tab only */}
                {activeTab === 'pending' && (
                  <div className="flex gap-2 pt-1">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleEditAndApprove(item)}
                          disabled={isActing}
                          className="flex-1 flex items-center justify-center gap-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold py-1.5 rounded-lg transition disabled:opacity-50"
                        >
                          <CheckCircle2 size={11} />
                          {isActing ? 'Saving...' : 'Save & Approve'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 text-xs text-slate-400 hover:text-slate-200"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleApprove(item.id)}
                          disabled={isActing}
                          className="flex items-center gap-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
                        >
                          <CheckCircle2 size={11} />
                          Approve
                        </button>
                        <button
                          onClick={() => startEdit(item)}
                          className="flex items-center gap-1 bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 border border-slate-600/30 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition"
                        >
                          <Edit3 size={11} />
                          Edit & Approve
                        </button>
                        <button
                          onClick={() => handleReject(item.id)}
                          disabled={isActing}
                          className="flex items-center gap-1 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition disabled:opacity-50 ml-auto"
                        >
                          <XCircle size={11} />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Status pill for approved/rejected */}
                {activeTab !== 'pending' && (
                  <div className="flex items-center gap-1 text-[10px]">
                    {item.status === 'approved'
                      ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={10} /> Approved{item.reviewed_at ? ` · ${new Date(item.reviewed_at).toLocaleDateString()}` : ''}</span>
                      : <span className="text-rose-400 flex items-center gap-1"><XCircle size={10} /> Rejected{item.reviewed_at ? ` · ${new Date(item.reviewed_at).toLocaleDateString()}` : ''}</span>
                    }
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
