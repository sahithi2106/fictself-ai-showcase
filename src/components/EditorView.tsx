import React, { useState, useEffect, useRef } from 'react';
import { Story, Chapter, Character, ChatMessage, StoryMemory, Persona, UserProfile, ChatSessionData } from '../types';
import { createChatSession, fetchStoryChatSessions, fetchChatMessages, sendChatMessage, clearChatMessages, editChatMessage, deleteChatSession, deleteChatMessage, regenerateChatMessage, branchChatFromMessage, pinChatMessage, unpinChatMessage, renameChatSession } from '../lib/api/chat';
import { fetchPersonas } from '../lib/api/personas';
import PinnedMemoriesPanel from './PinnedMemoriesPanel';
import PersonaSettingsModal from './PersonaSettingsModal';

import ReaderCommentsPanel from './ReaderCommentsPanel';
import {
  Bold, Italic, Underline, List, Quote, Link as LinkIcon, Undo, Redo, BookOpen, Sparkles, ChevronDown, User, Book, Pin, ArrowLeft, ChevronRight, ChevronLeft, Lock,
  X, Maximize2, Minimize2, MoreVertical, Send, GitBranch, AlertCircle, Edit2, Check, XCircle, PinOff, Brain, Database, Cpu, MessageSquare, Save, Search, Trash, Clock, Plus, Copy, RefreshCw
} from 'lucide-react';

const SimpleMarkdown = ({ content }: { content: string }) => {
  return (
    <div className="space-y-2">
      {(content || "").split('\n').map((paragraph, i) => {
        if (!paragraph.trim()) return <br key={i} />;

        // Split by asterisks. Even indices are normal text, odd indices are italicized.
        const parts = paragraph.split('*');
        return (
          <p key={i}>
            {parts.map((part, j) =>
              j % 2 === 1 && part.trim() !== '' ? <i key={j} className="text-slate-400 font-medium">{part}</i> : <span key={j}>{part}</span>
            )}
          </p>
        );
      })}
    </div>
  );
};

interface EditorViewProps {
  story: Story;
  chapter: Chapter;
  characters: Character[];
  setView: (view: string) => void;
  onSaveContent: (storyId: string, chapterId: string, updatedText: string, updatedTitle: string, status: 'draft' | 'published', isPinned: boolean) => void;
  onNavigateToCharacterManager: () => void;
  currentUser: UserProfile | null;
  mode?: 'view' | 'edit';
}

export default function EditorView({
  story,
  chapter,
  characters,
  setView,
  onSaveContent,
  onNavigateToCharacterManager,
  currentUser,
  mode = 'edit'
}: EditorViewProps) {

  // Chapter State Ref, enables easy undo/redo and tracking changes
  const [editorText, setEditorText] = useState(chapter.content.replace(/<[^>]*>/g, '\n').trim());
  const [chapterTitle, setChapterTitle] = useState(chapter.title);
  const [status, setStatus] = useState<'draft' | 'published'>(chapter.status);
  const [isPinned, setIsPinned] = useState(chapter.isPinned);

  // Undo/Redo stack mockup
  const [historyStack, setHistoryStack] = useState<string[]>([chapter.content.replace(/<[^>]*>/g, '\n').trim()]);
  const [historyPointer, setHistoryPointer] = useState(0);

  // Auto save status & logs
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Saved just now');

  // AI Sidebar tabs: profile, events, memories, context
  const [activeTab, setActiveTab] = useState<'profile' | 'events' | 'memories' | 'context'>('profile');
  const [pinRefreshCounter, setPinRefreshCounter] = useState(0);

  // Independent editor theme state
  const [editorTheme, setEditorTheme] = useState<'light' | 'dark' | 'paper' | 'sepia'>(() => {
    const saved = localStorage.getItem('fictself-editor-theme');
    return (saved as 'light' | 'dark' | 'paper' | 'sepia') || 'dark';
  });

  // Track editorTheme changes to update localStorage
  useEffect(() => {
    localStorage.setItem('fictself-editor-theme', editorTheme);
  }, [editorTheme]);

  // Currently Selected AI companion (strictly story-scoped)
  const storyCharacters = characters.filter(c => c.storyId === story.id);
  const [selectedCharId, setSelectedCharId] = useState<string>('');

  useEffect(() => {
    if (storyCharacters.length > 0) {
      setSelectedCharId(prev => {
        if (storyCharacters.some(c => c.id === prev)) return prev;
        return storyCharacters[0].id;
      });
    } else {
      setSelectedCharId('');
    }
  }, [story.id, characters]);

  const activeCharacter = storyCharacters.find(c => c.id === selectedCharId) || storyCharacters[0];

  // Mobile sidebar visibility
  const [isMobileAiOpen, setIsMobileAiOpen] = useState(false);
  const [isCompanionMenuOpen, setIsCompanionMenuOpen] = useState(false);
  const [isCreatingNewChat, setIsCreatingNewChat] = useState(false);

  // Right sidebar tab state
  const [activeRightTab, setActiveRightTab] = useState<'companion' | 'comments'>('companion');

  // Resizable Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('fictself_character_companion_width');
    return saved ? parseInt(saved, 10) : 360;
  });
  const isResizingRef = useRef(false);

  useEffect(() => {
    localStorage.setItem('fictself_character_companion_width', sidebarWidth.toString());
  }, [sidebarWidth]);

  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = document.body.clientWidth - moveEvent.clientX;
      if (newWidth >= 320 && newWidth <= 750) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
  };

  // Pinned Events list
  const [pinnedEvents, setPinnedEvents] = useState([
    { title: 'The Bio-Thermal Vault Breach', desc: 'Aria accidentally tripped the dock bio-sensors triggering Thorne private drones.', chap: 'Chapter 2' },
    { title: 'The Cobalt Prosthetic Attachment', desc: 'Gideon soldered the experimental military cobalt alloy to Aria’s amputated shoulder.', chap: 'Character Bible' }
  ]);

  // Story Memory (summaries used by AI to guarantee outline timeline rules)
  const recentChaptersMemory: StoryMemory[] = story.chapters.map(c => ({
    id: `mem-${c.id}`,
    storyId: story.id,
    chapterNumber: c.sequence,
    summary: c.summary,
    memoryStatus: c.status === 'published' ? 'active' : 'archived'
  }));

  // Chat window state
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [chatMessages, setChatMessages] = useState<{ [charId: string]: ChatMessage[] }>({});
  const [chatSessionIds, setChatSessionIds] = useState<{ [charId: string]: string }>({});
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showPinnedMemories, setShowPinnedMemories] = useState(false);
  const [showPersonaPlaceholder, setShowPersonaPlaceholder] = useState(false);
  const [historySessions, setHistorySessions] = useState<ChatSessionData[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageContent, setEditMessageContent] = useState('');

  // Personas
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');

  const refreshPersonas = async () => {
    try {
      const data = await fetchPersonas();
      setPersonas(data);
      // Fallback if active persona was deleted
      if (selectedPersonaId && !data.find(p => p.id === selectedPersonaId)) {
        const defaultPersona = data.find(p => p.is_default);
        if (defaultPersona) {
          setSelectedPersonaId(defaultPersona.id);
        } else if (data.length > 0) {
          setSelectedPersonaId(data[0].id);
        } else {
          setSelectedPersonaId('');
        }
      }
    } catch (err) {
      console.error("Failed to load personas:", err);
    }
  };

  useEffect(() => {
    refreshPersonas();
  }, []);

  const handleSelectPersona = async (newPersonaId: string) => {
    if (!activeCharacter) return;
    
    const messages = chatMessages[activeCharacter.id] || [];
    
    if (messages.length > 0) {
      // Need confirmation
      if (!window.confirm("Start a new chat with this persona?")) {
        return;
      }
      // Set new persona
      setSelectedPersonaId(newPersonaId);
      // Start a new chat immediately using this persona
      await handleNewChatWithPersona(newPersonaId);
    } else {
      // Just swap
      setSelectedPersonaId(newPersonaId);
    }
  };

  // Dedicated helper to start a new chat when persona is swapped,
  // since state updates are async and handleNewChat might use old selectedPersonaId.
  // NOTE: createChatSession takes positional args, not an object.
  const handleNewChatWithPersona = async (personaId: string) => {
    if (!activeCharacter) return;
    setIsCreatingNewChat(true);
    try {
      const newSession = await createChatSession(
        story.id,
        activeCharacter.id,
        chapter.id,
        personaId,
        'New Chat'
      );
      setChatSessionIds(prev => ({ ...prev, [activeCharacter.id]: newSession.id }));
      setChatMessages(prev => ({ ...prev, [activeCharacter.id]: [] }));
      setHistorySessions(prev => [newSession, ...prev]);
    } catch (err) {
      console.error("Failed to create new chat session with persona:", err);
    } finally {
      setIsCreatingNewChat(false);
      setIsCompanionMenuOpen(false);
    }
  };

  // Use a ref to snapshot chatSessionIds so the load-session effect does NOT
  // re-run every time setChatSessionIds is called (which caused session reverts).
  const chatSessionIdsRef = useRef(chatSessionIds);
  useEffect(() => { chatSessionIdsRef.current = chatSessionIds; }, [chatSessionIds]);

  useEffect(() => {
    if (!activeCharacter) return;
    const charId = activeCharacter.id;

    // Don't re-fetch if we already have a session for this character in state.
    // Read the ref, not the state variable, to avoid this effect re-running on every session change.
    if (chatSessionIdsRef.current[charId]) return;

    const loadChatSession = async () => {
      try {
        const sessions = await fetchStoryChatSessions(story.id);
        // Find the most recent session for this character.
        const sorted = sessions
          .filter(s => s.character_id === charId)
          .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
        let charSession = sorted[0];

        if (!charSession) {
          const pId = selectedPersonaId || undefined;
          charSession = await createChatSession(story.id, charId, chapter.id, pId, `${activeCharacter.name} Session`);
        }

        const sessionId = charSession.id;
        setChatSessionIds(prev => ({ ...prev, [charId]: sessionId }));

        const activePersona = personas.find(p => p.id === selectedPersonaId);
        const resolvedName = activePersona ? activePersona.display_name : (currentUser?.displayName || 'You');
        let personaAvatar = activePersona?.avatar_url;
        if (personaAvatar && personaAvatar.startsWith('/uploads')) {
          personaAvatar = `http://127.0.0.1:8000${personaAvatar}`;
        }
        const resolvedAvatar = personaAvatar || currentUser?.profileImage || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80';

        const messages = await fetchChatMessages(
          sessionId,
          activeCharacter.name,
          activeCharacter.avatar,
          resolvedName,
          resolvedAvatar
        );

        setChatMessages(prev => ({ ...prev, [charId]: messages }));
      } catch (err) {
        console.error("Failed to load chat session:", err);
      }
    };

    loadChatSession();
    // IMPORTANT: chatSessionIds is intentionally omitted from deps to prevent the effect
    // from re-running and reverting a manually selected session. We use chatSessionIdsRef instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCharacter?.id, story.id]);

  // Auto Save Simulation: Runs 20 seconds after last keystroke stops (or instantly on state switches)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTextChange = (text: string) => {
    setEditorText(text);
    setSaveStatus('saving');

    // Manage undo/redo states
    if (text !== historyStack[historyPointer]) {
      const newStack = historyStack.slice(0, historyPointer + 1);
      newStack.push(text);
      setHistoryStack(newStack);
      setHistoryPointer(newStack.length - 1);
    }

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (mode === 'view') return;
    autoSaveTimerRef.current = setTimeout(() => {
      triggerSave(text, chapterTitle, status, isPinned);
    }, 3000); // Debounce to 3s for quick feedback, although spec requests 20s or typing-stop indicator
  };

  const triggerSave = (
    text: string,
    title: string,
    currentStatus: 'draft' | 'published',
    pinnedState: boolean
  ) => {
    setSaveStatus('saving');
    // Convert text back to simple outer HTML paragraph nodes for mock database storage
    const wrappedHtml = text
      .split('\n\n')
      .map(p => p.trim() ? `<p>${p.trim()}</p>` : '')
      .join('');

    onSaveContent(story.id, chapter.id, wrappedHtml || `<p>${text}</p>`, title, currentStatus, pinnedState);

    setTimeout(() => {
      setSaveStatus('saved');
      setLastSavedTime(`Saved at ${new Date().toLocaleTimeString()}`);
    }, 450);
  };

  // Immediate save trigger
  const forceSave = () => {
    triggerSave(editorText, chapterTitle, status, isPinned);
  };

  const handleTitleBlur = () => {
    triggerSave(editorText, chapterTitle, status, isPinned);
  };

  const handleStatusChange = (newStatus: 'draft' | 'published') => {
    setStatus(newStatus);
    triggerSave(editorText, chapterTitle, newStatus, isPinned);
  };

  const handlePinToggle = () => {
    const nextPin = !isPinned;
    setIsPinned(nextPin);
    triggerSave(editorText, chapterTitle, status, nextPin);
  };

  // Metrics calculators
  const wordCount = editorText.split(/\s+/).filter(w => w.length > 0).length;
  const charCount = editorText.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 220)); // Averaging 220 WPM

  // Undo / Redo Actions
  const handleUndo = () => {
    if (historyPointer > 0) {
      const prevIdx = historyPointer - 1;
      setHistoryPointer(prevIdx);
      setEditorText(historyStack[prevIdx]);
    }
  };

  const handleRedo = () => {
    if (historyPointer < historyStack.length - 1) {
      const nextIdx = historyPointer + 1;
      setHistoryPointer(nextIdx);
      setEditorText(historyStack[nextIdx]);
    }
  };

  // Rich Text Mockup helpers (appends markers around selection or current text)
  const applyFormattingMark = (tag: string) => {
    const textarea = document.getElementById('story-markdown-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editorText.substring(start, end);

    let replacement = '';
    if (tag === 'bold') replacement = `**${selectedText || 'bold text'}**`;
    else if (tag === 'italic') replacement = `*${selectedText || 'italic text'}*`;
    else if (tag === 'underline') replacement = `<u>${selectedText || 'underlined text'}</u>`;
    else if (tag === 'quote') replacement = `\n> ${selectedText || 'quoted paragraph'}\n`;
    else if (tag === 'list') replacement = `\n- ${selectedText || 'bullet item'}\n`;
    else if (tag === 'link') replacement = `[${selectedText || 'link description'}](url)`;

    const updated = editorText.substring(0, start) + replacement + editorText.substring(end);
    handleTextChange(updated);

    // reset selection cursor focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 2, start + 2 + (selectedText || replacement).length);
    }, 50);
  };

  // AI Response generator
  const handleSendMessage = async (e: any) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const currentQuery = userInput;
    setUserInput('');
    setIsAiTyping(true);

    const activeCharMsgs = chatMessages[activeCharacter.id] || [];

    const activePersona = personas.find(p => p.id === selectedPersonaId);
    const resolvedName = activePersona ? activePersona.display_name : (currentUser?.displayName || 'You');
    let personaAvatar = activePersona?.avatar_url;
    if (personaAvatar && personaAvatar.startsWith('/uploads')) {
      personaAvatar = `http://127.0.0.1:8000${personaAvatar}`;
    }
    const resolvedAvatar = personaAvatar || currentUser?.profileImage || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80';

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      senderName: resolvedName,
      avatar: resolvedAvatar,
      content: currentQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Optimistically update
    setChatMessages(prev => ({
      ...prev,
      [activeCharacter.id]: [...(prev[activeCharacter.id] || []), userMsg]
    }));

    try {
      let sessionId = chatSessionIds[activeCharacter.id];
      if (!sessionId) {
        console.log(`[Chat Debug] No active session for character ${activeCharacter.name}. Creating new session...`);
        const pId = selectedPersonaId || undefined;
        const newSession = await createChatSession(story.id, activeCharacter.id, chapter.id, pId, `${activeCharacter.name} Session`);
        sessionId = newSession.id;
        setChatSessionIds(prev => ({ ...prev, [activeCharacter.id]: sessionId }));
        console.log(`[Chat Debug] Created new session ID: ${sessionId}`);
      } else {
        console.log(`[Chat Debug] Reusing existing session ID: ${sessionId}`);
      }

      console.log(`[Chat Debug] Sending user message to backend...`);
      const backendResponse = await sendChatMessage(sessionId, currentQuery);
      console.log(`[Chat Debug] Received backend response:`, backendResponse);

      // Re-fetch the entire conversation thread to sync real database UUIDs into local state.
      // This ensures that the optimistically added user message gets its real ID, preventing
      // 422 validation errors on subsequent edit requests.
      const refreshedMessages = await fetchChatMessages(
        sessionId,
        activeCharacter.name,
        activeCharacter.avatar,
        resolvedName,
        resolvedAvatar
      );

      setChatMessages(prev => ({
        ...prev,
        [activeCharacter.id]: refreshedMessages
      }));
    } catch (err) {
      console.error("Failed to send message", err);
      // Optional: Remove optimistic message or show error
    } finally {
      setIsAiTyping(false);
    }
  };

  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(null);
  const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null);


  const handleSelectSession = async (sessionId: string) => {
    if (!activeCharacter) return;
    try {
      setChatSessionIds(prev => ({ ...prev, [activeCharacter.id]: sessionId }));
      setShowHistoryPanel(false);

      const activePersona = personas.find(p => p.id === selectedPersonaId);
      const resolvedName = activePersona ? activePersona.display_name : (currentUser?.displayName || 'You');
      const resolvedAvatar = activePersona?.avatar_url || currentUser?.profileImage || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80';

      const messages = await fetchChatMessages(
        sessionId,
        activeCharacter.name,
        activeCharacter.avatar,
        resolvedName,
        resolvedAvatar
      );
      setChatMessages(prev => ({ ...prev, [activeCharacter.id]: messages }));
    } catch (err) {
      console.error("Failed to fetch session messages:", err);
      console.error("Could not load chat history.");
    }
  };

  const handleNewChat = async () => {
    if (!activeCharacter) return;
    setIsCreatingNewChat(true);
    try {
        const newSession = await createChatSession(
          story.id,
          activeCharacter.id,
          undefined,
          selectedPersonaId || undefined,
          "New Chat"
        );
      setChatSessionIds(prev => ({ ...prev, [activeCharacter.id]: newSession.id }));
      setChatMessages(prev => ({ ...prev, [activeCharacter.id]: [] }));
      setHistorySessions(prev => [newSession, ...prev]);
      setShowHistoryPanel(false);
      setIsCompanionMenuOpen(false);
    } catch (err) {
      console.error("Failed to create new chat session:", err);
    } finally {
      setIsCreatingNewChat(false);
    }
  };

  const handleRenameSession = async (sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      const updated = await renameChatSession(sessionId, newTitle);
      setHistorySessions(prev => prev.map(s => s.id === sessionId ? updated : s));
    } catch (err) {
      console.error("Failed to rename session:", err);
    }
  };

  const handleDeleteHistorySession = async (sessionId: string) => {
    if (!confirm("Permanently delete this chat session?")) return;
    try {
      await deleteChatSession(sessionId);
      setHistorySessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (chatSessionIds[activeCharacter?.id || ""] === sessionId) {
        setChatMessages(prev => {
          const next = { ...prev };
          delete next[activeCharacter!.id];
          return next;
        });
        setChatSessionIds(prev => {
          const next = { ...prev };
          delete next[activeCharacter!.id];
          return next;
        });
      }
    } catch (err: any) {
      console.error("Failed to delete session:", err?.message || err);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!activeCharacter) return;
    const sessionId = chatSessionIds[activeCharacter.id];
    if (!sessionId) return;

    setLoadingMessageId(msgId);
    try {
      await deleteChatMessage(sessionId, msgId);
      setChatMessages(prev => ({
        ...prev,
        [activeCharacter.id]: (prev[activeCharacter.id] || []).filter(m => m.id !== msgId)
      }));
    } catch (err) {
      console.error("Failed to delete message", err);
      alert("Failed to delete message.");
    } finally {
      setLoadingMessageId(null);
      setOpenMessageMenuId(null);
    }
  };

  const handleRegenerateMessage = async (msgId: string) => {
    if (!activeCharacter) return;
    const sessionId = chatSessionIds[activeCharacter.id];
    if (!sessionId) return;

    setLoadingMessageId(msgId);
    try {
      const backendResponse = await regenerateChatMessage(sessionId, msgId);

      const aiMsg: ChatMessage = {
        id: backendResponse.id,
        role: 'assistant',
        senderName: activeCharacter.name,
        avatar: activeCharacter.avatar,
        content: backendResponse.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        memoryContextSnapshot: backendResponse.memory_context_snapshot ?? null,
        isPinned: backendResponse.is_pinned ?? false
      };

      setChatMessages(prev => {
        const msgs = prev[activeCharacter.id] || [];
        const idx = msgs.findIndex(m => m.id === msgId);
        if (idx === -1) return prev;

        // Remove old message and all messages after it, replace with new one
        const updatedMessages = msgs.slice(0, idx);
        updatedMessages.push(aiMsg);

        return {
          ...prev,
          [activeCharacter.id]: updatedMessages
        };
      });
    } catch (err) {
      console.error("Failed to regenerate", err);
      alert("Failed to regenerate response.");
    } finally {
      setLoadingMessageId(null);
      setOpenMessageMenuId(null);
    }
  };

  const handleBranchChat = async (msgId: string) => {
    if (!activeCharacter) return;
    const sessionId = chatSessionIds[activeCharacter.id];
    if (!sessionId) return;

    setLoadingMessageId(msgId);
    try {
      const newSession = await branchChatFromMessage(sessionId, msgId);

      // Update session ID and reload thread
      setChatSessionIds(prev => ({ ...prev, [activeCharacter.id]: newSession.id }));

      const activePersona = personas.find(p => p.id === selectedPersonaId);
      const resolvedName = activePersona ? activePersona.display_name : (currentUser?.displayName || 'You');
      const resolvedAvatar = activePersona?.avatar_url || currentUser?.profileImage || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80';

      const messages = await fetchChatMessages(
        newSession.id,
        activeCharacter.name,
        activeCharacter.avatar,
        resolvedName,
        resolvedAvatar
      );

      setChatMessages(prev => ({ ...prev, [activeCharacter.id]: messages }));
    } catch (err) {
      console.error("Failed to branch chat", err);
      alert("Failed to create new chat branch.");
    } finally {
      setLoadingMessageId(null);
      setOpenMessageMenuId(null);
    }
  };

  const handleTogglePin = async (msgId: string, isCurrentlyPinned: boolean) => {
    if (!activeCharacter) return;
    const sessionId = chatSessionIds[activeCharacter.id];
    if (!sessionId) return;

    // Optimistic update
    setChatMessages(prev => {
      const msgs = prev[activeCharacter.id] || [];
      return {
        ...prev,
        [activeCharacter.id]: msgs.map(m => m.id === msgId ? { ...m, isPinned: !isCurrentlyPinned } : m)
      };
    });

    setOpenMessageMenuId(null);

    try {
      if (isCurrentlyPinned) {
        await unpinChatMessage(sessionId, msgId);
      } else {
        await pinChatMessage(sessionId, msgId);
      }
      setPinRefreshCounter(c => c + 1);
    } catch (err) {
      console.error("Failed to toggle pin", err);
      // Revert on failure
      setChatMessages(prev => {
        const msgs = prev[activeCharacter.id] || [];
        return {
          ...prev,
          [activeCharacter.id]: msgs.map(m => m.id === msgId ? { ...m, isPinned: isCurrentlyPinned } : m)
        };
      });
      alert("Failed to pin/unpin message.");
    }
  };

  const handleMemoryDeleted = (memory: any) => {
    if (memory.sourceType === 'chat_message' && memory.chatMessageId) {
      setChatMessages(prev => {
        const charId = activeCharacter?.id;
        if (!charId) return prev;
        const msgs = prev[charId] || [];
        return {
          ...prev,
          [charId]: msgs.map(m => m.id === memory.chatMessageId ? { ...m, isPinned: false } : m)
        };
      });
    }
  };

  const handleMemoryUpdated = (memory: any) => {
    if (memory.sourceType === 'chat_message' && memory.chatMessageId) {
      setChatMessages(prev => {
        const charId = activeCharacter?.id;
        if (!charId) return prev;
        const msgs = prev[charId] || [];
        return {
          ...prev,
          [charId]: msgs.map(m => m.id === memory.chatMessageId ? { ...m, isPinned: memory.isActive } : m)
        };
      });
    }
  };

  const handleClearChat = async () => {
    if (!activeCharacter) return;
    const sessionId = chatSessionIds[activeCharacter.id];
    if (!sessionId) return;

    if (!confirm("Clear this conversation thread? Story and character memory stay intact.")) return;

    try {
      await clearChatMessages(sessionId);
      setChatMessages(prev => ({ ...prev, [activeCharacter.id]: [] }));
      console.log(`[Chat Debug] Cleared visible thread for session ${sessionId}. Memories intact.`);
    } catch (err) {
      console.error("Failed to clear chat", err);
    }
  };

  const handleDeleteSession = async () => {
    if (!activeCharacter) return;
    const sessionId = chatSessionIds[activeCharacter.id];
    if (!sessionId) return;

    if (!confirm("Permanently delete this chat session? All conversational history will be destroyed.")) return;

    try {
      await deleteChatSession(sessionId);

      // Reset local state for this character
      setChatSessionIds(prev => {
        const next = { ...prev };
        delete next[activeCharacter.id];
        return next;
      });
      setChatMessages(prev => {
        const next = { ...prev };
        delete next[activeCharacter.id];
        return next;
      });

      console.log(`[Chat Debug] Permanently deleted session ${sessionId}.`);
    } catch (err) {
      console.error("Failed to delete chat session", err);
    }
  };

  const handleEditMessageSave = async (msgId: string) => {
    if (!activeCharacter || !editMessageContent.trim()) {
      setEditingMessageId(null);
      return;
    }
    const sessionId = chatSessionIds[activeCharacter.id];
    if (!sessionId) return;

    setIsAiTyping(true);
    setEditingMessageId(null);

    const charMsgs = chatMessages[activeCharacter.id] || [];
    const msgIndex = charMsgs.findIndex(m => m.id === msgId);
    if (msgIndex === -1) {
      setIsAiTyping(false);
      return;
    }

    // Prune UI locally
    const updatedMessages = charMsgs.slice(0, msgIndex + 1);
    updatedMessages[msgIndex].content = editMessageContent;

    setChatMessages(prev => ({
      ...prev,
      [activeCharacter.id]: updatedMessages
    }));

    try {
      const backendResponse = await editChatMessage(sessionId, msgId, editMessageContent);
      console.log(`[Chat Debug] Edit successful, received new regenerated reply:`, backendResponse);

      const aiMsg: ChatMessage = {
        id: backendResponse.id || (Date.now() + 1).toString(),
        role: 'assistant',
        senderName: activeCharacter.name,
        avatar: activeCharacter.avatar,
        content: backendResponse.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages(prev => ({
        ...prev,
        [activeCharacter.id]: [...(prev[activeCharacter.id] || []), aiMsg]
      }));
    } catch (err) {
      console.error("Failed to edit message", err);
    } finally {
      setIsAiTyping(false);
    }
  };

  // Scroll to chat bottom as messages load
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiTyping, selectedCharId]);

  // Load history sessions whenever the history panel opens (or character changes while panel is open)
  useEffect(() => {
    if (!showHistoryPanel || !activeCharacter) return;
    const fetchHistory = async () => {
      setIsFetchingHistory(true);
      try {
        const sessions = await fetchStoryChatSessions(story.id);
        const charSessions = sessions
          .filter(s => s.character_id === activeCharacter.id)
          .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
        setHistorySessions(charSessions);
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        setIsFetchingHistory(false);
      }
    };
    fetchHistory();
  }, [showHistoryPanel, activeCharacter?.id, story.id]);

  const renderCompanionOverlays = () => (
    <>
      {/* History Panel Overlay */}
      {showHistoryPanel && (
        <div className="absolute inset-0 z-50 bg-[#0c0c0e] flex flex-col animate-fade-in">
          <div className="p-3 border-b border-[#1c1c1e] flex items-center justify-between shrink-0">
            <h4 className="font-semibold text-xs text-slate-200 flex items-center gap-2">
              <Clock size={12} /> Chat History
            </h4>
            <div className="flex items-center gap-2">
              <button onClick={handleNewChat} className="text-slate-400 hover:text-white transition" title="New Chat">
                <Plus size={14} />
              </button>
              <button onClick={() => setShowHistoryPanel(false)} className="text-slate-400 hover:text-white transition" title="Close History">
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isFetchingHistory ? (
              <div className="text-center text-xs text-slate-500 py-4">Loading history...</div>
            ) : historySessions.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-4">No previous chats yet.</div>
            ) : (
              historySessions.map(session => {
                const isActive = chatSessionIds[activeCharacter.id] === session.id;
                return (
                  <div key={session.id} className={`p-2 rounded-xl border text-left cursor-pointer transition flex justify-between items-start group ${isActive ? 'bg-indigo-600/10 border-indigo-600/30' : 'bg-[#141416] border-[#222] hover:border-[#333]'}`}>
                    <div className="flex-1 min-w-0" onClick={() => handleSelectSession(session.id)}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-medium text-[11px] truncate ${isActive ? 'text-indigo-400' : 'text-slate-300'}`}>
                          {session.title || "Chat Session"}
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5 truncate">
                        {isActive ? 'Current chat' : new Date(session.started_at).toLocaleString()}
                      </div>
                      {session.summary && (
                        <div className="text-[10px] text-slate-400 mt-1 truncate">
                          {session.summary}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition pl-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newTitle = prompt("Enter new session title:", session.title || "");
                          if (newTitle !== null) {
                            handleRenameSession(session.id, newTitle);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-400 transition"
                        title="Rename"
                      >
                        <Edit2 size={10} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHistorySession(session.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-400 transition ml-1"
                        title="Delete"
                      >
                        <Trash size={10} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Pinned Memories Overlay */}
      {showPinnedMemories && (
        <div className="absolute inset-0 z-50 bg-[#0c0c0e] flex flex-col animate-fade-in">
          <div className="p-3 border-b border-[#1c1c1e] flex items-center justify-between shrink-0">
            <h4 className="font-semibold text-xs text-slate-200 flex items-center gap-2">
              <Brain size={12} /> Important Memories
            </h4>
            <button onClick={() => setShowPinnedMemories(false)} className="text-slate-400 hover:text-white transition" title="Close Memories">
              <X size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <PinnedMemoriesPanel
              storyId={story.id}
              characterId={activeCharacter.id}
              onMemoryDeleted={handleMemoryDeleted}
              onMemoryUpdated={handleMemoryUpdated}
              refreshTrigger={pinRefreshCounter}
            />
          </div>
        </div>
      )}

      {/* Persona Settings Overlay */}
      {showPersonaPlaceholder && (
        <PersonaSettingsModal
          personas={personas}
          activePersonaId={selectedPersonaId}
          onSelectPersona={handleSelectPersona}
          onRefreshPersonas={refreshPersonas}
          onClose={() => setShowPersonaPlaceholder(false)}
        />
      )}
    </>
  );

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] bg-[#0a0a0a] overflow-hidden select-none" id="fictself-studio-container">

      {/* LEFT AREA: Rich Text Editor Workspace (75% Width) */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-[#1a1a1a] select-none">

        {/* Chapter Header Topbar */}
        <div className="flex items-center justify-between border-b border-[#1a1a1a] p-3 h-14 bg-[#0c0c0c] backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => setView('story-dashboard')}
              className="p-1.5 px-2.5 rounded-lg hover:bg-[#1a1a1a] text-slate-400 hover:text-slate-200 shrink-0 border border-[#222] cursor-pointer text-xs font-bold flex items-center gap-1.5"
              title="Return to Story Dashboard"
              id="editor-back-to-dashboard"
            >
              <ArrowLeft size={14} />
              <span>Back to Story</span>
            </button>
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 font-medium select-none shrink min-w-0 px-1 border-r border-[#1c1c1e] mr-1 truncate">
              <span className="shrink-0">Workspace</span>
              <span className="font-mono text-[9px] text-slate-700 shrink-0">&gt;</span>
              <button onClick={() => setView('my-stories')} className="hover:text-violet-400 font-medium text-slate-500 cursor-pointer shrink-0">My Stories</button>
              <span className="font-mono text-[9px] text-slate-700 shrink-0">&gt;</span>
              <button onClick={() => setView('story-dashboard')} className="hover:text-violet-400 font-medium text-slate-500 cursor-pointer truncate">{story.title}</button>
              <span className="font-mono text-[9px] text-slate-700 shrink-0">&gt;</span>
            </div>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <input
                type="text"
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                onBlur={handleTitleBlur}
                readOnly={mode === 'view'}
                className={`font-bold text-sm tracking-tight text-white bg-transparent border-b border-transparent rounded px-2 py-0.5 truncate outline-none w-full max-w-[200px] sm:max-w-xs transition-all ${mode === 'edit' ? 'hover:border-[#222] focus:border-blue-500 hover:bg-[#111]/40 focus:bg-[#111]/80' : ''}`}
                id="chapter-title-editable"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {mode === 'edit' && (
              <button
                onClick={handlePinToggle}
                className={`p-1.5 rounded hover:bg-[#1a1a1a] text-slate-450 group relative shrink-0 cursor-pointer transition-colors ${isPinned ? 'text-blue-400 bg-blue-500/10' : ''
                  }`}
                title="Pin this Chapter"
                id="chapter-pin-toggle"
              >
                <Pin size={14} fill={isPinned ? 'currentColor' : 'none'} />
              </button>
            )}

            {/* Draft / Published status */}
            <div className="flex items-center" id="chapter-editor-status-display">
              {status === 'published' ? (
                <span className="text-[11px] font-bold bg-[#102a1e] text-emerald-450 px-2 sm:px-2.5 py-1 rounded-lg border border-emerald-500/20 shadow-sm animate-fade-in">
                  Published
                </span>
              ) : (
                <span className="text-[11px] font-bold bg-[#2a2115] text-amber-400 px-2 sm:px-2.5 py-1 rounded-lg border border-amber-500/20 shadow-sm animate-fade-in">
                  Draft
                </span>
              )}
            </div>

            {/* Last saved time */}
            {mode === 'edit' && (
              <span className="hidden xl:inline-flex items-center gap-1 bg-[#121214] border border-[#222] rounded-lg px-2.5 py-1 text-[11px] font-medium text-slate-400 shadow-sm animate-fade-in" id="chapter-editor-save-time">
                <Clock size={11} className="text-slate-500" />
                {saveStatus === 'saving' ? (
                  <span className="text-blue-300 font-semibold animate-pulse font-sans">Saving...</span>
                ) : (
                  <span className="truncate font-sans">{lastSavedTime}</span>
                )}
              </span>
            )}

            {/* Change Status Action Button (Publish Button) */}
            {mode === 'edit' && (
              status === 'draft' ? (
                <button
                  onClick={() => handleStatusChange('published')}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-650 hover:bg-blue-600 text-white text-xs font-bold transition shadow duration-150 cursor-pointer active:scale-95"
                  id="chapter-publish-toggle-btn"
                >
                  Publish
                </button>
              ) : (
                <button
                  onClick={() => handleStatusChange('draft')}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold transition shadow duration-150 cursor-pointer active:scale-95"
                  id="chapter-publish-toggle-btn"
                >
                  Revert to Draft
                </button>
              )
            )}

            {/* Mobile Open floating AI sidebar button */}
            <button
              onClick={() => setIsMobileAiOpen(true)}
              className="lg:hidden p-1.5 rounded-lg bg-blue-605 font-bold text-white relative shadow cursor-pointer text-xs flex items-center justify-center animate-pulse"
              title="Open Character Companion"
              id="ai-companion-drawer-open-btn"
            >
              <Sparkles size={13} />
            </button>
          </div>
        </div>

        {/* Rich Text Toolbar Options */}
        {mode === 'edit' && (
          <div className="flex items-center justify-between border-b border-[#1a1a1a] p-2 bg-[#0c0c0c] select-none shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1">
            <button
              onClick={() => applyFormattingMark('bold')}
              className="p-1.5 rounded hover:bg-[#1a1a1a] text-slate-450 hover:text-slate-200 cursor-pointer"
              title="Bold text"
            >
              <Bold size={14} />
            </button>
            <button
              onClick={() => applyFormattingMark('italic')}
              className="p-1.5 rounded hover:bg-[#1a1a1a] text-slate-450 hover:text-slate-200 cursor-pointer"
              title="Italic text"
            >
              <Italic size={14} />
            </button>
            <button
              onClick={() => applyFormattingMark('underline')}
              className="p-1.5 rounded hover:bg-[#1a1a1a] text-slate-450 hover:text-slate-200 cursor-pointer"
              title="Underline text"
            >
              <Underline size={14} />
            </button>
            <span className="w-px h-4 bg-[#1a1a1a] mx-1.5" />
            <button
              onClick={() => applyFormattingMark('list')}
              className="p-1.5 rounded hover:bg-[#1a1a1a] text-slate-450 hover:text-slate-200 cursor-pointer"
              title="Bullet list"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => applyFormattingMark('quote')}
              className="p-1.5 rounded hover:bg-[#1a1a1a] text-slate-450 hover:text-slate-200 cursor-pointer"
              title="Quote block"
            >
              <Quote size={14} />
            </button>
            <button
              onClick={() => applyFormattingMark('link')}
              className="p-1.5 rounded hover:bg-[#1a1a1a] text-slate-450 hover:text-slate-200 cursor-pointer"
              title="Insert link"
            >
              <LinkIcon size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono pr-2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-450 font-sans hidden sm:inline">Writing Mood:</span>
              <select
                id="editor-theme-select-tool"
                value={editorTheme}
                onChange={(e) => setEditorTheme(e.target.value as 'light' | 'dark' | 'paper' | 'sepia')}
                className="bg-[#141414] border border-[#222] text-slate-300 text-[10px] font-semibold py-1 px-2 rounded focus:outline-none cursor-pointer"
                title="Change editor theme independently from app theme"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="paper">Paper Mode</option>
                <option value="sepia">Sepia Mode</option>
              </select>
            </div>

            <span className="w-px h-4 bg-[#1a1a1a]" />

            <button
              onClick={handleUndo}
              disabled={historyPointer === 0}
              className="p-1 rounded hover:bg-[#1a1a1a] text-slate-450 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="Undo"
            >
              <Undo size={13} />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyPointer === historyStack.length - 1}
              className="p-1 rounded hover:bg-[#1a1a1a] text-slate-450 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="Redo"
            >
              <Redo size={13} />
            </button>
          </div>
        </div>
        )}

        {/* THE WRITING TEXTAREA BODY */}
        <div className={`flex-1 p-6 md:p-10 overflow-y-auto select-text flex justify-center transition-all duration-300 editor-theme-${editorTheme}`}>
          <div className="w-full max-w-2xl flex flex-col space-y-4">
            <textarea
              id="story-markdown-textarea"
              value={editorText}
              onChange={(e) => handleTextChange(e.target.value)}
              readOnly={mode === 'view'}
              placeholder="Start writing your chapter here... Your thoughts, your story."
              className="w-full h-full flex-1 bg-transparent font-serif placeholder-slate-400 text-base md:text-lg tracking-normal leading-relaxed resize-none focus:outline-none"
            />
          </div>
        </div>

        {/* Tiny Status Bar Info */}
        <div className="h-9 px-4 border-t border-[#1a1a1a] bg-[#0c0c0c] text-[10px] text-slate-400 font-mono flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-4">
            <span>Words: <b className="text-slate-200">{wordCount}</b></span>
            <span>Characters: <b className="text-slate-200">{charCount}</b></span>
          </div>
          <div className="flex items-center gap-1.5">
            <BookOpen size={10} />
            <span>Est. Reading Time: <b>{readingTime} min</b></span>
          </div>
        </div>

      </div>

      {/* RIGHT AREA: AI Character Companion Panel */}
      {isSidebarCollapsed ? (
        <div className="hidden lg:flex flex-col bg-[#0c0c0e] border-l border-[#1c1c1e] h-full items-center py-4 w-12 shrink-0">
          <button
            onClick={() => setIsSidebarCollapsed(false)}
            className="p-2 rounded text-slate-500 hover:text-slate-300 hover:bg-[#1a1a1c] transition"
            title="Expand Character Companion"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="mt-4 flex flex-col items-center gap-4">
            <Sparkles size={16} className={activeRightTab === 'companion' ? "text-indigo-400" : "text-slate-600"} />
            <div className="w-px h-12 bg-[#1c1c1e]" />
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest" style={{ writingMode: 'vertical-rl' }}>Companion</span>
            <div className="w-px h-12 bg-[#1c1c1e]" />
            <MessageSquare size={16} className={activeRightTab === 'comments' ? "text-violet-400" : "text-slate-600"} />
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest" style={{ writingMode: 'vertical-rl' }}>Comments</span>
          </div>
        </div>
      ) : (
        <div
          className="hidden lg:flex flex-col bg-[#0c0c0e] border-l border-[#1c1c1e] h-full overflow-hidden shrink-0 relative"
          style={{ width: `${sidebarWidth}px` }}
          id="ai-sidebar-container"
        >
          {/* Drag Handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500/50 z-50 transition-colors"
            onMouseDown={handleSidebarMouseDown}
            title="Drag to resize sidebar"
          />

          {/* Tab Selector */}
          <div className="flex border-b border-[#1c1c1e] bg-[#0c0c0e] shrink-0">
            <button
              onClick={() => setActiveRightTab('companion')}
              className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeRightTab === 'companion' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-[#141416]' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Sparkles size={14} /> Companion
            </button>
            <button
              onClick={() => setActiveRightTab('comments')}
              className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeRightTab === 'comments' ? 'text-violet-400 border-b-2 border-violet-500 bg-[#141416]' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <MessageSquare size={14} /> Comments
            </button>
          </div>

          {activeRightTab === 'comments' ? (
            <ReaderCommentsPanel chapterId={chapter.id} />
          ) : !activeCharacter ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <span className="text-2xl">👥</span>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-202">No Character Companions</h4>
                <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                  Connect or design character profiles on the FictSelf story dashboard to begin AI conversations.
                </p>
              </div>
              <button
                onClick={() => setView('my-stories')}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-550 text-white text-[10px] font-bold transition cursor-pointer"
              >
                Configure Codex
              </button>
            </div>
          ) : (
            <div className="flex flex-col h-full font-sans relative">

              {/* Elegant Selector resembling ChatGPT model select drop-down */}
              <div className="p-3 border-b border-[#1c1c1e] bg-[#0c0c0e] flex flex-col gap-2 shrink-0 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest font-mono">Character Companion</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setIsSidebarCollapsed(true)}
                      className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-[#1a1a1c] transition"
                      title="Collapse Sidebar"
                    >
                      <ChevronRight size={12} />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setIsCompanionMenuOpen(prev => !prev)}
                        className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-[#1a1a1c] transition"
                        title="More Actions"
                      >
                        <MoreVertical size={12} />
                      </button>

                      {isCompanionMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg shadow-xl z-50 flex flex-col py-1 overflow-hidden animate-fade-in">
                          <button
                            onClick={handleNewChat}
                            className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2"
                            disabled={isCreatingNewChat}
                          >
                            <Plus size={12} /> {isCreatingNewChat ? "Creating..." : "New chat"}
                          </button>
                          <button
                            onClick={() => {
                              setShowHistoryPanel(true);
                              setIsCompanionMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-[#2c2c2e] transition-colors flex items-center gap-2"
                          >
                            <Clock size={12} /> History
                          </button>
                          <button
                            onClick={() => {
                              setShowPinnedMemories(true);
                              setIsCompanionMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-[#2c2c2e] transition-colors flex items-center gap-2"
                          >
                            <Brain size={12} /> Important Memories
                          </button>
                          <button
                            onClick={() => {
                              setShowPersonaPlaceholder(true);
                              setIsCompanionMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-[#2c2c2e] transition-colors flex items-center gap-2"
                          >
                            <User size={12} /> Persona settings
                          </button>
                          <div className="h-px bg-[#2c2c2e] my-1 mx-2" />
                          <button
                            onClick={() => {
                              handleClearChat();
                              setIsCompanionMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-orange-900/50 hover:text-orange-400 transition-colors flex items-center gap-2"
                          >
                            <Trash size={12} /> Clear chat
                          </button>
                          <button
                            onClick={() => {
                              handleDeleteSession();
                              setIsCompanionMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors flex items-center gap-2"
                          >
                            <Trash size={12} strokeWidth={3} /> Delete session
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {storyCharacters.length > 0 && (
                  <div className="relative">
                    <select
                      value={selectedCharId}
                      onChange={(e) => setSelectedCharId(e.target.value)}
                      className="w-full appearance-none bg-[#141416] hover:bg-[#1a1a1c] border border-[#2c2c2e] rounded-xl py-2 pl-3.5 pr-8 text-[11px] font-bold text-slate-300 focus:outline-none transition-all cursor-pointer"
                    >
                      {storyCharacters.map(char => (
                        <option key={char.id} value={char.id}>
                          Talk to {char.name} ({char.role})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                )}

                {/* Persona Chip */}
                {personas.length > 0 && (
                  <button 
                    onClick={() => setShowPersonaPlaceholder(true)}
                    className="mt-1 flex items-center gap-1.5 px-2 py-1 bg-[#141416] hover:bg-[#1a1a1c] border border-[#2c2c2e] rounded-lg text-[9px] font-bold text-slate-400 transition cursor-pointer self-start"
                  >
                    <User size={10} className="text-indigo-400" />
                    Persona: <span className="text-slate-300">{personas.find(p => p.id === selectedPersonaId)?.display_name || 'Chat as Yourself'}</span>
                  </button>
                )}


              </div>



              {/* Conversation list takes entire vertical space */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none" id="companion-chat-scroller">

                {/* Chat Message Logs */}
                {(chatMessages[activeCharacter.id] || []).map((msg, idx) => {
                  const isAssistant = msg.role === 'assistant';
                  return (
                    <div key={idx} className={`flex gap-2 text-left items-start ${isAssistant ? '' : 'flex-row-reverse'}`}>
                      <img
                        src={msg.avatar || undefined}
                        alt={msg.senderName}
                        referrerPolicy="no-referrer"
                        className="w-5 h-5 rounded-full object-cover shrink-0 filter grayscale mt-0.5"
                      />
                      <div className="min-w-0 max-w-[85%] flex flex-col space-y-0.5 relative group">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] text-slate-500 font-mono capitalize flex items-center gap-1">
                            {msg.senderName}
                            {msg.isPinned && <Pin size={10} className="text-indigo-400" title="Pinned message" />}
                          </span>

                          {/* 3-dot menu button */}
                          {msg.id && (
                            <div className="relative">
                              <button
                                onClick={() => setOpenMessageMenuId(openMessageMenuId === msg.id ? null : msg.id)}
                                className="p-0.5 rounded text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical size={12} />
                              </button>

                              {/* Dropdown Menu */}
                              {openMessageMenuId === msg.id && (
                                <div className="absolute right-0 top-full mt-1 w-40 bg-[#1a1a1c] border border-[#2c2c2e] rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                                  <button onClick={() => { navigator.clipboard.writeText(msg.content); setOpenMessageMenuId(null); }} className="w-full text-left px-3 py-1.5 text-[10px] text-slate-300 hover:bg-[#2c2c2e] flex items-center gap-2">
                                    <Copy size={10} /> Copy
                                  </button>

                                  {!isAssistant && (
                                    <button onClick={() => { setEditingMessageId(msg.id); setEditMessageContent(msg.content); setOpenMessageMenuId(null); }} className="w-full text-left px-3 py-1.5 text-[10px] text-slate-300 hover:bg-[#2c2c2e] flex items-center gap-2">
                                      <Edit2 size={10} /> Edit message
                                    </button>
                                  )}

                                  {isAssistant && (
                                    <button onClick={() => handleRegenerateMessage(msg.id)} disabled={loadingMessageId === msg.id} className="w-full text-left px-3 py-1.5 text-[10px] text-slate-300 hover:bg-[#2c2c2e] flex items-center gap-2 disabled:opacity-50">
                                      <RefreshCw size={10} className={loadingMessageId === msg.id ? "animate-spin" : ""} /> Regenerate response
                                    </button>
                                  )}

                                  <button onClick={() => handleBranchChat(msg.id)} disabled={loadingMessageId === msg.id} className="w-full text-left px-3 py-1.5 text-[10px] text-slate-300 hover:bg-[#2c2c2e] flex items-center gap-2 disabled:opacity-50">
                                    <GitBranch size={10} /> New chat from here
                                  </button>

                                  <button onClick={() => handleTogglePin(msg.id, !!msg.isPinned)} className="w-full text-left px-3 py-1.5 text-[10px] text-slate-300 hover:bg-[#2c2c2e] flex items-center gap-2">
                                    <PinOff size={10} /> {msg.isPinned ? 'Unpin' : 'Pin'}
                                  </button>

                                  <div className="h-px bg-[#2c2c2e] my-1" />

                                  <button onClick={() => handleDeleteMessage(msg.id)} disabled={loadingMessageId === msg.id} className="w-full text-left px-3 py-1.5 text-[10px] text-red-400 hover:bg-red-500/10 flex items-center gap-2 disabled:opacity-50">
                                    <Trash size={10} /> Delete {isAssistant ? 'response' : 'message'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className={`p-2.5 rounded-xl text-[11.5px] leading-relaxed relative ${isAssistant
                            ? 'bg-[#141416] text-slate-200 border border-[#222]'
                            : 'bg-indigo-600 text-white font-medium'
                          } ${loadingMessageId === msg.id ? 'opacity-50' : ''}`}>
                          {editingMessageId === msg.id ? (
                            <div className="flex flex-col gap-2">
                              <textarea
                                value={editMessageContent}
                                onChange={(e) => setEditMessageContent(e.target.value)}
                                className="bg-indigo-700 text-white p-2 rounded text-xs outline-none min-h-[60px] resize-none scrollbar-none"
                                autoFocus
                              />
                              <div className="flex justify-end gap-2">
                                <button onClick={() => setEditingMessageId(null)} className="text-[10px] text-indigo-200 hover:text-white px-2 py-1 cursor-pointer">Cancel</button>
                                <button onClick={() => handleEditMessageSave(msg.id)} className="text-[10px] bg-white text-indigo-600 px-2 py-1 rounded font-bold hover:bg-indigo-50 cursor-pointer shadow-sm">Save & Regenerate</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <SimpleMarkdown content={msg.content} />
                              {loadingMessageId === msg.id && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl backdrop-blur-[1px]">
                                  <RefreshCw size={14} className="animate-spin text-white" />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isAiTyping && (
                  <div className="flex gap-2 items-start opacity-75">
                    <img
                      src={activeCharacter.avatar || undefined}
                      alt={activeCharacter.name}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full object-cover animate-pulse filter grayscale"
                    />
                    <div className="p-2 rounded-xl bg-[#141416] border border-[#222] flex items-center gap-1.5">
                      <span className="w-1 h-1 bg-[#818cf8] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 bg-[#818cf8] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 bg-[#818cf8] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>


              {/* Message send form block */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-[#1c1c1e] bg-[#0c0c0e] flex gap-2 shrink-0 select-none">
                <input
                  type="text"
                  placeholder={`Ask ${activeCharacter.name}...`}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className="flex-1 bg-[#141416] text-xs border border-[#222] focus:border-indigo-500 rounded-xl px-3 py-2 outline-none font-medium placeholder-slate-650 focus:ring-1 focus:ring-indigo-500 text-slate-200"
                  id="ai-chat-text-input"
                />
                <button
                  type="submit"
                  className="px-3 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl shrink-0 transition cursor-pointer flex items-center justify-center shadow-sm"
                  id="ai-chat-send-submit-btn"
                >
                  <Send size={11} />
                </button>
              </form>
            </div>
          )}
          {renderCompanionOverlays()}
        </div>
      )}

      {/* MOBILE DRAWER SIDEBAR: Opened via top button */}
      {isMobileAiOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setIsMobileAiOpen(false)}
        />
      )}

      <div className={`lg:hidden fixed inset-y-0 right-0 w-80 max-w-[90vw] bg-[#0c0c0e] border-l border-[#1c1c1e] z-50 transform transition-transform duration-300 h-full ${isMobileAiOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
        <div className="relative h-full flex flex-col justify-between overflow-hidden">
          {/* Top selection drawer title */}
          <div className="p-3 border-b border-[#1c1c1e] flex items-center justify-between shrink-0 bg-[#0c0c0e] select-none">
            <span className="font-bold text-xs text-slate-200">Character Companion</span>
            <button
              onClick={() => setIsMobileAiOpen(false)}
              className="p-1 rounded bg-[#141416] text-slate-400"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {!activeCharacter ? (
              <div className="flex-1 p-6 text-center flex flex-col items-center justify-center space-y-4 bg-[#0a0a0c]">
                <span className="text-2xl">👥</span>
                <p className="text-xs text-slate-300 font-bold">No Character Companions</p>
                <p className="text-[11px] text-slate-500 leading-normal font-sans">Setup character cards inside your FictSelf dashboard to activate mobile studio dialogue chat.</p>
              </div>
            ) : (
              <div className="flex-col flex h-full overflow-hidden bg-[#0c0c0e]">

                {/* Selector */}
                <div className="p-3 border-b border-[#1c1c1e] bg-[#0c0c0e] flex flex-col gap-2 shrink-0 select-none">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Talk to Character</span>
                  <div className="relative">
                    <select
                      value={selectedCharId}
                      onChange={(e) => setSelectedCharId(e.target.value)}
                      className="w-full appearance-none bg-[#141416] border border-[#2c2c2e] rounded-xl py-2 pl-3 pr-10 text-xs font-semibold text-slate-200 focus:outline-none"
                    >
                      {storyCharacters.map(char => (
                        <option key={char.id} value={char.id}>
                          {char.name} ({char.role})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <img src={activeCharacter.avatar || undefined} alt={activeCharacter.name} referrerPolicy="no-referrer" className="w-6 h-6 rounded-full object-cover filter grayscale" />
                    <div className="min-w-0 flex-1 text-left">
                      <h4 className="font-semibold text-xs text-slate-200 truncate">{activeCharacter.name}</h4>
                      <p className="text-[9px] text-slate-500 font-mono capitalize">{activeCharacter.role}</p>
                    </div>
                  </div>
                  {personas.length > 0 && (
                    <button 
                      onClick={() => setShowPersonaPlaceholder(true)}
                      className="mt-1 flex items-center gap-1.5 px-2 py-1 bg-[#141416] hover:bg-[#1a1a1c] border border-[#1c1c1e] rounded-lg text-[9px] font-bold text-slate-400 transition cursor-pointer self-start"
                    >
                      <User size={10} className="text-indigo-400" />
                      Persona: <span className="text-slate-300">{personas.find(p => p.id === selectedPersonaId)?.display_name || 'Chat as Yourself'}</span>
                    </button>
                  )}
                </div>

                {/* Chat Body view (compact) */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto scrollbar-none bg-[#0a0a0c]">

                  {(chatMessages[activeCharacter.id] || []).map((msg, idx) => {
                    const isAssistant = msg.role === 'assistant';
                    return (
                      <div key={idx} className={`flex gap-2 text-left items-start ${isAssistant ? '' : 'flex-row-reverse'}`}>
                        <img src={msg.avatar || undefined} alt={msg.senderName} referrerPolicy="no-referrer" className="w-5 h-5 rounded-full object-cover shrink-0 filter grayscale mt-0.5" />
                        <div className="min-w-0 max-w-[80%] flex flex-col">
                          <div className={`p-2 rounded-xl text-xs ${isAssistant ? 'bg-[#141416] text-slate-200 border border-[#222]' : 'bg-indigo-600 text-white font-medium'}`}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Chat input footer drawer component */}
          {activeCharacter && (
            <form onSubmit={handleSendMessage} className="p-3 bg-[#0c0c0e] border-t border-[#1c1c1e] flex gap-2 h-14 shrink-0 select-none">
              <input
                type="text"
                placeholder={`Chat with ${activeCharacter.name}...`}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="flex-1 bg-[#141416] text-xs border border-[#222] rounded-xl px-3 outline-none text-slate-200"
              />
              <button type="submit" className="px-3 bg-indigo-600 rounded-xl text-white flex items-center justify-center cursor-pointer">
                <Send size={12} />
              </button>
            </form>
          )}
          {renderCompanionOverlays()}
        </div>
      </div>

    </div>
  );
}
