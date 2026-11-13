import React, { useState, useEffect } from 'react';
import { Persona } from '../types';
import { fetchPersonas, createPersona, updatePersona, deletePersona, uploadPersonaAvatar } from '../lib/api/personas';
import { Plus, Edit2, Trash2, CheckCircle, Image as ImageIcon } from 'lucide-react';

interface PersonasViewProps {
  // Can add props if needed
}

export default function PersonasView({}: PersonasViewProps) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  
  const [displayName, setDisplayName] = useState('');
  const [backgroundText, setBackgroundText] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    try {
      setLoading(true);
      const data = await fetchPersonas();
      setPersonas(data);
    } catch (error) {
      console.error('Failed to load personas:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (persona?: Persona) => {
    if (persona) {
      setEditingPersona(persona);
      setDisplayName(persona.display_name);
      setBackgroundText(persona.background_text || '');
      setIsDefault(persona.is_default);
    } else {
      setEditingPersona(null);
      setDisplayName('');
      setBackgroundText('');
      setIsDefault(personas.length === 0); // first is default by default
    }
    setAvatarFile(null);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPersona(null);
    setErrorMsg(null);
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      let savedPersona: Persona;
      if (editingPersona) {
        savedPersona = await updatePersona(editingPersona.id, {
          display_name: displayName,
          background_text: backgroundText,
          is_default: isDefault
        });
      } else {
        savedPersona = await createPersona({
          display_name: displayName,
          background_text: backgroundText,
          is_default: isDefault
        });
      }

      if (avatarFile) {
        await uploadPersonaAvatar(savedPersona.id, avatarFile);
      }

      await loadPersonas();
      closeModal();
    } catch (error: any) {
      console.error('Failed to save persona:', error);
      setErrorMsg(error.message || 'Failed to save persona.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this persona?')) return;
    try {
      await deletePersona(id);
      await loadPersonas();
    } catch (error) {
      console.error('Failed to delete persona:', error);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await updatePersona(id, { is_default: true });
      await loadPersonas();
    } catch (error) {
      console.error('Failed to set default persona:', error);
    }
  };

  if (loading) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="flex-1 overflow-y-auto bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Writer Personas</h1>
            <p className="text-gray-400 mt-2">Manage your identities for chatting with characters in your stories.</p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            <Plus size={18} />
            New Persona
          </button>
        </div>

        {personas.length === 0 ? (
          <div className="bg-[#111] p-12 text-center rounded-xl border border-[#222]">
            <h2 className="text-xl font-bold mb-2">No Personas Yet</h2>
            <p className="text-gray-400 mb-6">Create a persona to start interacting with your characters from different perspectives.</p>
            <button
              onClick={() => openModal()}
              className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition"
            >
              Create Your First Persona
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {personas.map(persona => (
              <div key={persona.id} className={`bg-[#111] border ${persona.is_default ? 'border-blue-500' : 'border-[#222]'} rounded-xl p-6 relative group overflow-hidden`}>
                {persona.is_default && (
                  <div className="absolute top-0 right-0 bg-blue-500 text-xs font-bold px-3 py-1 rounded-bl-lg">
                    Default
                  </div>
                )}
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gray-800 overflow-hidden flex-shrink-0">
                    {persona.avatar_url ? (
                      <img 
                        src={persona.avatar_url.startsWith('/uploads') ? `http://127.0.0.1:8000${persona.avatar_url}` : persona.avatar_url} 
                        alt={persona.display_name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <ImageIcon size={24} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white truncate">{persona.display_name}</h3>
                    <p className="text-xs text-gray-400">Created: {new Date(persona.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="text-sm text-gray-400 line-clamp-3 mb-6 h-16">
                  {persona.background_text || <span className="italic text-gray-600">No background provided...</span>}
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-[#222]">
                  <button
                    onClick={() => openModal(persona)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-[#222] rounded transition flex-1 flex justify-center"
                    title="Edit Persona"
                  >
                    <Edit2 size={16} />
                  </button>
                  {!persona.is_default && (
                    <button
                      onClick={() => handleSetDefault(persona.id)}
                      className="p-2 text-gray-400 hover:text-blue-400 hover:bg-[#222] rounded transition flex-1 flex justify-center"
                      title="Set as Default"
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(persona.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-[#222] rounded transition flex-1 flex justify-center"
                    title="Delete Persona"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-[#333] rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-[#222]">
              <h2 className="text-xl font-bold">{editingPersona ? 'Edit Persona' : 'New Persona'}</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Display Name *</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g. The Creator, System, DM..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Avatar Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      setAvatarFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#222] file:text-white hover:file:bg-[#333]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Background / Context</label>
                <textarea
                  value={backgroundText}
                  onChange={e => setBackgroundText(e.target.value)}
                  rows={4}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Describe this persona. Are you an omniscient narrator? A side character? Give the AI context on who they are talking to."
                />
              </div>

              {errorMsg && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded-lg text-sm">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="defaultPersona"
                  checked={isDefault}
                  onChange={e => setIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-[#222] focus:ring-blue-500"
                  disabled={editingPersona?.is_default} // Cannot uncheck default directly, must check another one
                />
                <label htmlFor="defaultPersona" className="text-sm text-gray-300">Set as default persona</label>
              </div>
            </div>

            <div className="p-6 border-t border-[#222] flex justify-end gap-3 bg-[#0a0a0a] rounded-b-xl">
              <button
                onClick={closeModal}
                disabled={isSaving}
                className="px-4 py-2 text-gray-400 hover:text-white transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!displayName.trim() || isSaving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-lg font-medium transition flex items-center justify-center min-w-[140px]"
              >
                {isSaving ? 'Saving...' : 'Save Persona'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
