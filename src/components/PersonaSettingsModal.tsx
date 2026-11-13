import React, { useState, useRef } from 'react';
import { Persona } from '../types';
import { createPersona, updatePersona, deletePersona, uploadPersonaAvatar } from '../lib/api/personas';
import { X, User, Edit2, Trash, Plus, Check, Image as ImageIcon } from 'lucide-react';

interface PersonaSettingsModalProps {
  personas: Persona[];
  activePersonaId: string;
  onSelectPersona: (personaId: string) => void;
  onRefreshPersonas: () => Promise<void>;
  onClose: () => void;
}

export default function PersonaSettingsModal({
  personas,
  activePersonaId,
  onSelectPersona,
  onRefreshPersonas,
  onClose
}: PersonaSettingsModalProps) {
  const [viewMode, setViewMode] = useState<'list' | 'edit' | 'create'>('list');
  const [editingPersonaId, setEditingPersonaId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [backgroundText, setBackgroundText] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenCreate = () => {
    setDisplayName('');
    setBackgroundText('');
    setIsDefault(false);
    setAvatarFile(null);
    setErrorMsg('');
    setViewMode('create');
  };

  const handleOpenEdit = (persona: Persona) => {
    setEditingPersonaId(persona.id);
    setDisplayName(persona.display_name);
    setBackgroundText(persona.background_text || '');
    setIsDefault(persona.is_default);
    setAvatarFile(null);
    setErrorMsg('');
    setViewMode('edit');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMsg('Display name is required');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      let savedPersona: Persona;

      if (viewMode === 'create') {
        savedPersona = await createPersona({
          display_name: displayName.trim(),
          background_text: backgroundText.trim() || undefined,
          is_default: isDefault
        });
      } else if (viewMode === 'edit' && editingPersonaId) {
        savedPersona = await updatePersona(editingPersonaId, {
          display_name: displayName.trim(),
          background_text: backgroundText.trim() || undefined,
          is_default: isDefault
        });
      } else {
        return;
      }

      if (avatarFile) {
        await uploadPersonaAvatar(savedPersona.id, avatarFile);
      }

      await onRefreshPersonas();
      setViewMode('list');
    } catch (err) {
      console.error('Failed to save persona:', err);
      setErrorMsg('Failed to save persona');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, persona: Persona) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the persona "${persona.display_name}"?`)) {
      return;
    }

    try {
      await deletePersona(persona.id);
      await onRefreshPersonas();
      // active persona fallback is handled in EditorView if the active one is deleted
    } catch (err) {
      console.error('Failed to delete persona:', err);
      setErrorMsg('Failed to delete persona. It might be in use.');
    }
  };

  const handleSetDefault = async (e: React.MouseEvent, persona: Persona) => {
    e.stopPropagation();
    try {
      await updatePersona(persona.id, { is_default: true });
      await onRefreshPersonas();
    } catch (err) {
      console.error('Failed to set default persona:', err);
      setErrorMsg('Failed to update persona');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#0c0c0e] flex flex-col animate-fade-in text-slate-200">
      <div className="p-3 border-b border-[#1c1c1e] flex items-center justify-between shrink-0 bg-[#0c0c0e]">
        <h4 className="font-bold text-xs flex items-center gap-2">
          <User size={14} /> 
          {viewMode === 'list' ? 'Personas' : viewMode === 'edit' ? 'Edit Persona' : 'New Persona'}
        </h4>
        <div className="flex items-center gap-3">
          {viewMode === 'list' && (
            <button onClick={handleOpenCreate} className="text-blue-400 hover:text-blue-300 transition text-[11px] font-semibold flex items-center gap-1">
              <Plus size={12} /> New
            </button>
          )}
          {viewMode !== 'list' && (
            <button onClick={() => setViewMode('list')} className="text-slate-400 hover:text-white transition text-[11px]">
              Cancel
            </button>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 bg-[#0a0a0c]">
        {errorMsg && (
          <div className="mb-3 p-2 bg-red-900/20 border border-red-900/50 text-red-400 text-[11px] rounded-lg">
            {errorMsg}
          </div>
        )}

        {viewMode === 'list' && (
          <div className="space-y-2">
            {!Array.isArray(personas) ? (
              <div className="text-center text-xs text-slate-500 py-4">Could not load personas.</div>
            ) : personas.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-4">No personas found.</div>
            ) : (
              personas.map(persona => {
                const isActive = activePersonaId === persona.id;
                return (
                  <div 
                    key={persona.id} 
                    className={`p-3 rounded-xl border text-left cursor-pointer transition flex flex-col gap-2 group ${isActive ? 'bg-indigo-600/10 border-indigo-600/30' : 'bg-[#141416] border-[#222] hover:border-[#333]'}`}
                    onClick={() => onSelectPersona(persona.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <img 
                          src={persona.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80'} 
                          alt="avatar" 
                          className="w-6 h-6 rounded-full object-cover shrink-0 filter grayscale"
                          referrerPolicy="no-referrer"
                        />
                        <span className={`font-semibold text-xs truncate ${isActive ? 'text-indigo-400' : 'text-slate-200'}`}>
                          {persona.display_name}
                        </span>
                        {isActive && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-indigo-500/20 text-indigo-400 tracking-wider">ACTIVE</span>}
                        {persona.is_default && !isActive && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-800 text-slate-400 tracking-wider">DEFAULT</span>}
                      </div>

                      <div className="shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition pl-2">
                        {!persona.is_default && (
                          <button
                            onClick={(e) => handleSetDefault(e, persona)}
                            className="p-1 text-slate-400 hover:text-white transition"
                            title="Set as Default"
                          >
                            <Check size={11} />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenEdit(persona); }}
                          className="p-1 text-slate-400 hover:text-indigo-400 transition"
                          title="Edit"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, persona)}
                          className="p-1 text-slate-400 hover:text-red-400 transition ml-1"
                          title="Delete"
                        >
                          <Trash size={11} />
                        </button>
                      </div>
                    </div>
                    {persona.background_text && (
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed ml-8">
                        {persona.background_text}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {(viewMode === 'edit' || viewMode === 'create') && (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Display Name</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#141416] border border-[#222] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-colors"
                placeholder="e.g. Writer, Narrator, Observer..."
                disabled={isSaving}
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Background Context (Optional)</label>
              <textarea 
                value={backgroundText}
                onChange={(e) => setBackgroundText(e.target.value)}
                className="w-full bg-[#141416] border border-[#222] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-colors min-h-[80px] resize-none"
                placeholder="Details about this persona's point of view, tone, or history..."
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Avatar (Optional)</label>
              <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-[#141416] hover:bg-[#1c1c1e] border border-[#222] rounded-lg text-[11px] font-semibold text-slate-300 transition flex items-center gap-2"
                  disabled={isSaving}
                >
                  <ImageIcon size={12} /> {avatarFile ? avatarFile.name : 'Choose File...'}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input 
                type="checkbox" 
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-[#333] bg-[#141416] text-indigo-500 focus:ring-0 focus:ring-offset-0"
                disabled={isSaving}
              />
              <span className="text-[11px] text-slate-300 font-medium">Make this my default persona</span>
            </label>

            <div className="pt-4 mt-4 border-t border-[#1c1c1e] flex justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setViewMode('list')}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition disabled:opacity-50"
                disabled={isSaving || !displayName.trim()}
              >
                {isSaving ? 'Saving...' : 'Save Persona'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
