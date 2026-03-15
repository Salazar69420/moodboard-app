import { create } from 'zustand';
import { useRef, useCallback, useEffect } from 'react';
import { useBoardStore } from '../stores/useBoardStore';
import { useImageStore } from '../stores/useImageStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { imageToBase64 } from '../utils/ai-features';
import { SHOT_CATEGORIES, EDIT_CATEGORIES } from '../types';
import {
  analyzeImageForContext,
  generateNextQuestion,
  extractResolvedFields,
  transcribeAudio,
  speakText,
  getCategoryFields,
  getCategoryLabel,
  type QuizMessage,
  type FilledField,
} from '../utils/voice-quiz';

// ─── State types ─────────────────────────────────────────────────────────────

export type QuizStatus =
  | 'idle'
  | 'analyzing'
  | 'thinking'
  | 'speaking'
  | 'listening'
  | 'processing'
  | 'confirming'
  | 'error';

interface VoiceQuizState {
  isOpen: boolean;
  noteId: string | null;
  noteType: 'category' | 'edit' | null;
  categoryId: string | null;
  imageId: string | null;
  imageDescription: string;
  crossNodeContext: string;
  messages: QuizMessage[];
  liveTranscript: string;
  status: QuizStatus;
  filledFields: FilledField[];
  emptyFields: string[];
  allFields: string[];
  currentAudioUrl: string | null;
  errorMessage: string | null;
  lastQuestionWasConfused: boolean;
}

interface VoiceQuizStore extends VoiceQuizState {
  _set: (partial: Partial<VoiceQuizState>) => void;
  _reset: () => void;
}

const initialState: VoiceQuizState = {
  isOpen: false,
  noteId: null,
  noteType: null,
  categoryId: null,
  imageId: null,
  imageDescription: '',
  crossNodeContext: '',
  messages: [],
  liveTranscript: '',
  status: 'idle',
  filledFields: [],
  emptyFields: [],
  allFields: [],
  currentAudioUrl: null,
  errorMessage: null,
  lastQuestionWasConfused: false,
};

export const useVoiceQuizStore = create<VoiceQuizStore>((set) => ({
  ...initialState,
  _set: (partial) => set(partial),
  _reset: () => set(initialState),
}));

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useVoiceQuiz() {
  const store = useVoiceQuizStore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllMedia();
    };
  }, []);

  function stopAllMedia() {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* */ }
      recognitionRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch { /* */ }
      recorderRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    if (store.currentAudioUrl) {
      URL.revokeObjectURL(store.currentAudioUrl);
    }
  }

  function buildCrossNodeContext(noteId: string, noteType: 'category' | 'edit', imageId: string): string {
    const boardState = useBoardStore.getState();
    const allNotes = noteType === 'category'
      ? boardState.categoryNotes.filter(n => n.imageId === imageId && n.id !== noteId && n.text.trim())
      : boardState.editNotes.filter(n => n.imageId === imageId && n.id !== noteId && n.text.trim());

    if (allNotes.length === 0) return 'No other nodes filled yet.';

    const allCats = [...SHOT_CATEGORIES, ...EDIT_CATEGORIES];
    return allNotes.map(n => {
      const cat = allCats.find(c => c.id === n.categoryId);
      return `${cat?.label || n.categoryId}: ${n.text.trim()}`;
    }).join('\n');
  }

  const openQuiz = useCallback(async (noteId: string, noteType: 'category' | 'edit') => {
    const { _set } = useVoiceQuizStore.getState();
    const boardState = useBoardStore.getState();
    const openRouterKey = useSettingsStore.getState().apiKey;
    const openAiKey = useSettingsStore.getState().openAiApiKey;

    if (!openRouterKey) {
      _set({ isOpen: true, status: 'error', errorMessage: 'OpenRouter API key not set. Open Settings.' });
      return;
    }
    if (!openAiKey) {
      _set({ isOpen: true, status: 'error', errorMessage: 'OpenAI API key not set. Open Settings.' });
      return;
    }

    _set({ isOpen: true, noteId, noteType, status: 'analyzing', errorMessage: null, messages: [], filledFields: [], liveTranscript: '' });

    try {
      // 1. Get the note
      const note = noteType === 'category'
        ? boardState.categoryNotes.find(n => n.id === noteId)
        : boardState.editNotes.find(n => n.id === noteId);

      if (!note) throw new Error('Note not found');

      const categoryId = note.categoryId;
      const imageId = note.imageId;

      // 2. Get connected image
      const images = useImageStore.getState().images;
      const image = images.find(img => img.id === imageId);
      if (!image) throw new Error('Connected image not found');

      const imgData = await imageToBase64(image.blobId);
      if (!imgData) throw new Error('Could not load image data');

      // 3. Cross-node context
      const crossNodeContext = buildCrossNodeContext(noteId, noteType, imageId);

      // 4. Get fields for this category
      const allFields = getCategoryFields(categoryId);
      const emptyFields = [...allFields]; // start with all empty

      // 5. Analyze image
      const imageDescription = await analyzeImageForContext(openRouterKey, imgData.base64, imgData.mimeType);

      _set({
        categoryId,
        imageId,
        imageDescription,
        crossNodeContext,
        emptyFields,
        allFields,
      });

      // 6. Generate first question
      await generateAndAsk();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      _set({ status: 'error', errorMessage: msg });
    }
  }, []);

  async function generateAndAsk() {
    const state = useVoiceQuizStore.getState();
    const openRouterKey = useSettingsStore.getState().apiKey;
    const openAiKey = useSettingsStore.getState().openAiApiKey;

    state._set({ status: 'thinking' });

    try {
      const question = await generateNextQuestion(openRouterKey, {
        nodeLabel: getCategoryLabel(state.categoryId || ''),
        imageDescription: state.imageDescription,
        crossNodeContext: state.crossNodeContext,
        emptyFields: state.emptyFields,
        messages: state.messages,
        lastAnswerWasConfused: state.lastQuestionWasConfused,
      });

      if (question.trim() === 'COMPLETE') {
        state._set({ status: 'confirming' });
        return;
      }

      // Add AI message then go straight to listening (no TTS)
      const newMessages = [...state.messages, { role: 'ai' as const, text: question }];
      state._set({ messages: newMessages });

      if (!useVoiceQuizStore.getState().isOpen) return;
      startListening();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Question generation failed';
      state._set({ status: 'error', errorMessage: msg });
    }
  }

  // Spawns a fresh SpeechRecognition instance and auto-restarts on browser cutoff.
  // A fresh instance is required because browsers reject .start() on a used instance.
  function spawnRecognition() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      useVoiceQuizStore.getState()._set({ liveTranscript: transcript });
    };

    recognition.onerror = () => { /* ignore — onend will handle restart */ };

    // Browser silently ends recognition after silence even with continuous=true.
    // Restart with a NEW instance (calling .start() on a stopped instance fails).
    // Only restart if status is still 'listening' (manual stop sets it to 'processing' first).
    recognition.onend = () => {
      if (useVoiceQuizStore.getState().status === 'listening') {
        spawnRecognition();
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch { /* */ }
  }

  function startListening() {
    const state = useVoiceQuizStore.getState();
    state._set({ status: 'listening', liveTranscript: '' });

    spawnRecognition();

    // MediaRecorder for actual audio capture
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      streamRef.current = stream;

      // Determine supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = e => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const mime = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, { type: mime });
        await processDirectorAnswer(audioBlob);
      };
      recorder.start();
      recorderRef.current = recorder;
    }).catch(() => {
      useVoiceQuizStore.getState()._set({ status: 'error', errorMessage: 'Microphone access denied' });
    });
  }

  function stopListening() {
    // Flip status immediately so spawnRecognition's onend guard won't restart listening
    useVoiceQuizStore.getState()._set({ status: 'processing' });

    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* */ }
      recognitionRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop(); // triggers onstop → processDirectorAnswer
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  async function processDirectorAnswer(audioBlob: Blob) {
    const state = useVoiceQuizStore.getState();
    const openAiKey = useSettingsStore.getState().openAiApiKey;
    const openRouterKey = useSettingsStore.getState().apiKey;

    state._set({ status: 'processing' });

    try {
      const finalText = await transcribeAudio(openAiKey, audioBlob);

      if (!finalText.trim()) {
        // Empty transcription — re-ask
        await generateAndAsk();
        return;
      }

      // Detect special intents
      const isConfused = /don't understand|what do you mean|rephrase|simpler|plain|huh\??/i.test(finalText);
      const isSkip = /skip|don't know|not sure yet|leave it|pass|next/i.test(finalText);

      if (isConfused) {
        state._set({ lastQuestionWasConfused: true });
        await generateAndAsk();
        return;
      }

      if (isSkip) {
        const field = state.emptyFields[0];
        const newEmpty = state.emptyFields.filter(f => f !== field);
        state._set({
          emptyFields: newEmpty,
          messages: [
            ...state.messages,
            { role: 'director', text: finalText },
            { role: 'ai', text: `Noted — leaving ${field} open for now.` },
          ],
          lastQuestionWasConfused: false,
          liveTranscript: '',
        });
        await generateAndAsk();
        return;
      }

      // Add director answer to messages
      const newMessages = [...state.messages, { role: 'director' as const, text: finalText }];
      state._set({
        messages: newMessages,
        liveTranscript: '',
        lastQuestionWasConfused: false,
      });

      // Extract resolved fields
      const resolved = await extractResolvedFields(
        openRouterKey,
        newMessages,
        state.emptyFields,
        state.allFields,
      );

      if (resolved.length > 0) {
        // Merge with existing filled fields (avoid duplicates)
        const existingIds = new Set(state.filledFields.map(f => f.fieldId));
        const newFilled = [...state.filledFields];
        const newEmpty = [...state.emptyFields];

        for (const f of resolved) {
          if (!existingIds.has(f.fieldId)) {
            newFilled.push(f);
            existingIds.add(f.fieldId);
          } else {
            // Update existing
            const idx = newFilled.findIndex(x => x.fieldId === f.fieldId);
            if (idx >= 0) newFilled[idx] = f;
          }
          // Remove from empty
          const emptyIdx = newEmpty.indexOf(f.fieldLabel);
          if (emptyIdx >= 0) newEmpty.splice(emptyIdx, 1);
        }

        state._set({ filledFields: newFilled, emptyFields: newEmpty });
      }

      // Continue chain
      await generateAndAsk();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Processing failed';
      state._set({ status: 'error', errorMessage: msg });
    }
  }

  const closeQuiz = useCallback(() => {
    stopAllMedia();
    useVoiceQuizStore.getState()._reset();
  }, []);

  const confirmFields = useCallback(async (confirmedFields: FilledField[]) => {
    const state = useVoiceQuizStore.getState();
    const boardStore = useBoardStore.getState();

    const noteText = confirmedFields
      .filter(f => !f.wasRejected)
      .map(f => f.value)
      .join('. ');

    if (state.noteType === 'category' && state.noteId) {
      await boardStore.updateCategoryNote(state.noteId, { text: noteText });
    } else if (state.noteType === 'edit' && state.noteId) {
      await boardStore.updateEditNote(state.noteId, { text: noteText });
    }

    stopAllMedia();
    useVoiceQuizStore.getState()._reset();
  }, []);

  const editField = useCallback((fieldId: string, newValue: string) => {
    const state = useVoiceQuizStore.getState();
    state._set({
      filledFields: state.filledFields.map(f =>
        f.fieldId === fieldId ? { ...f, value: newValue } : f
      ),
    });
  }, []);

  const rejectField = useCallback((fieldId: string) => {
    const state = useVoiceQuizStore.getState();
    state._set({
      filledFields: state.filledFields.map(f =>
        f.fieldId === fieldId ? { ...f, wasRejected: true } : f
      ),
    });
  }, []);

  const retryQuestion = useCallback(() => {
    generateAndAsk();
  }, []);

  const manualStopListening = useCallback(() => {
    stopListening();
  }, []);

  return {
    ...store,
    openQuiz,
    closeQuiz,
    confirmFields,
    editField,
    rejectField,
    retryQuestion,
    manualStopListening,
    startListening,
  };
}
