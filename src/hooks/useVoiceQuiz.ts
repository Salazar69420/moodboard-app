import { create } from 'zustand';
import { useCallback, useEffect } from 'react';
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
  getCategoryFields,
  getCategoryLabel,
  type QuizMessage,
  type FilledField,
} from '../utils/voice-quiz';

// ─── State types ─────────────────────────────────────────────────────────────

export type QuizStatus =
  | 'idle'
  | 'scoping'
  | 'mode-select'
  | 'analyzing'
  | 'thinking'
  | 'speaking'
  | 'listening'
  | 'processing'
  | 'monologue-recording'
  | 'monologue-processing'
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
  // Improvement 1 — Clarify mode
  clarifyMode: boolean;
  // Improvement 2 — Field ownership
  fieldOwnership: Record<string, 'decide' | 'ai' | 'skip'>;
  // Improvement 3 — Input mode
  inputMode: 'guided' | 'monologue';
  monologueTranscript: string;
  // Improvement 5 — Single field mode
  singleFieldMode: boolean;
  targetFieldId: string | null;
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
  clarifyMode: false,
  fieldOwnership: {},
  inputMode: 'guided',
  monologueTranscript: '',
  singleFieldMode: false,
  targetFieldId: null,
};

export const useVoiceQuizStore = create<VoiceQuizStore>((set) => ({
  ...initialState,
  _set: (partial) => set(partial),
  _reset: () => set({ ...initialState }),
}));

// ─── Saved fields store (persists across quiz sessions, reactive) ─────────────

interface SavedFieldsStore {
  record: Record<string, FilledField[]>;
  save: (noteId: string, fields: FilledField[]) => void;
}

export const useSavedFieldsStore = create<SavedFieldsStore>((set) => ({
  record: {},
  save: (noteId, fields) => set(state => ({
    record: { ...state.record, [noteId]: fields },
  })),
}));

// ─── Hook ────────────────────────────────────────────────────────────────────

// Module-level refs shared across all hook instances.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _recognitionRef = { current: null as any };
const _recorderRef    = { current: null as MediaRecorder | null };
const _audioRef       = { current: null as HTMLAudioElement | null };
const _streamRef      = { current: null as MediaStream | null };

// Persist filled fields per noteId across sessions
const _savedFields = new Map<string, FilledField[]>();
// Cross-node memory
const _sessionMeta = new Map<string, { imageId: string; categoryId: string; categoryLabel: string }>();
const _pauseTimerRef  = { current: null as ReturnType<typeof setTimeout> | null };
const _chunksRef      = { current: [] as BlobPart[] };

export function useVoiceQuiz() {
  const store = useVoiceQuizStore();
  const recognitionRef = _recognitionRef;
  const recorderRef    = _recorderRef;
  const audioRef       = _audioRef;
  const streamRef      = _streamRef;
  const pauseTimerRef  = _pauseTimerRef;
  const chunksRef      = _chunksRef;

  useEffect(() => {
    return () => { stopAllMedia(); };
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
    const allCats = [...SHOT_CATEGORIES, ...EDIT_CATEGORIES];
    const parts: string[] = [];

    const allNotes = noteType === 'category'
      ? boardState.categoryNotes.filter(n => n.imageId === imageId && n.id !== noteId && n.text.trim())
      : boardState.editNotes.filter(n => n.imageId === imageId && n.id !== noteId && n.text.trim());

    for (const n of allNotes) {
      const cat = allCats.find(c => c.id === n.categoryId);
      parts.push(`${cat?.label || n.categoryId}: ${n.text.trim()}`);
    }

    for (const [siblingId, meta] of _sessionMeta.entries()) {
      if (siblingId === noteId || meta.imageId !== imageId) continue;
      if (allNotes.some(n => n.id === siblingId)) continue;
      const fields = _savedFields.get(siblingId);
      if (!fields || fields.length === 0) continue;
      const activeFields = fields.filter(f => !f.wasRejected);
      if (activeFields.length === 0) continue;
      const summary = activeFields.map(f => `${f.fieldLabel}: ${f.value}`).join(', ');
      parts.push(`${meta.categoryLabel} (from voice session): ${summary}`);
    }

    return parts.length > 0 ? parts.join('\n') : 'No other nodes filled yet.';
  }

  // ─── Open quiz — goes to scoping screen ────────────────────────────────────

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

    _set({ isOpen: true, status: 'analyzing', errorMessage: null, messages: [], filledFields: [], liveTranscript: '' });

    try {
      const note = noteType === 'category'
        ? boardState.categoryNotes.find(n => n.id === noteId)
        : boardState.editNotes.find(n => n.id === noteId);
      if (!note) throw new Error('Note not found');

      const categoryId = note.categoryId;
      const imageId = note.imageId;

      const crossNodeContext = buildCrossNodeContext(noteId, noteType, imageId);
      const allFields = getCategoryFields(categoryId);
      const previouslyFilled = _savedFields.get(noteId) || [];
      const previousLabels = new Set(previouslyFilled.filter(f => !f.wasRejected).map(f => f.fieldLabel));
      const emptyFields = allFields.filter(f => !previousLabels.has(f));

      // Initialize ownership: already-filled fields default to 'skip', unfilled to 'decide'
      const fieldOwnership: Record<string, 'decide' | 'ai' | 'skip'> = {};
      allFields.forEach(f => {
        fieldOwnership[f] = previousLabels.has(f) ? 'skip' : 'decide';
      });

      _sessionMeta.set(noteId, {
        imageId,
        categoryId,
        categoryLabel: getCategoryLabel(categoryId),
      });

      _set({
        noteId, noteType, categoryId, imageId,
        crossNodeContext, allFields, emptyFields, fieldOwnership,
        filledFields: previouslyFilled,
        singleFieldMode: false, targetFieldId: null,
        status: 'scoping',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      _set({ status: 'error', errorMessage: msg });
    }
  }, []);

  // ─── Start from ownership — called after scoping screen ────────────────────

  const startFromOwnership = useCallback(() => {
    const { fieldOwnership, allFields } = useVoiceQuizStore.getState();
    const decideFields = allFields.filter(f => (fieldOwnership[f] ?? 'decide') === 'decide');
    useVoiceQuizStore.getState()._set({
      emptyFields: decideFields,
      status: 'mode-select',
    });
  }, []);

  // ─── Select input mode — called after mode-select screen ───────────────────

  const selectMode = useCallback(async (mode: 'guided' | 'monologue') => {
    const state = useVoiceQuizStore.getState();
    const openRouterKey = useSettingsStore.getState().apiKey;

    state._set({ inputMode: mode, status: 'analyzing' });

    try {
      const images = useImageStore.getState().images;
      const image = images.find(img => img.id === state.imageId);
      if (!image) throw new Error('Image not found');

      const imgData = await imageToBase64(image.blobId);
      if (!imgData) throw new Error('Image load failed');

      const imageDescription = await analyzeImageForContext(openRouterKey, imgData.base64, imgData.mimeType);
      state._set({ imageDescription });

      if (mode === 'guided') {
        await generateAndAsk();
      } else {
        state._set({ status: 'monologue-recording', monologueTranscript: '' });
        startMonologueRecording();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed';
      state._set({ status: 'error', errorMessage: msg });
    }
  }, []);

  // ─── Open single-field re-record session ───────────────────────────────────

  const openSingleFieldQuiz = useCallback(async (
    noteId: string,
    noteType: 'category' | 'edit',
    fieldId: string,
    fieldLabel: string,
  ) => {
    const { _set } = useVoiceQuizStore.getState();
    const boardState = useBoardStore.getState();
    const openRouterKey = useSettingsStore.getState().apiKey;
    const openAiKey = useSettingsStore.getState().openAiApiKey;

    if (!openRouterKey || !openAiKey) {
      _set({ isOpen: true, status: 'error', errorMessage: 'API keys not set. Open Settings.' });
      return;
    }

    const note = noteType === 'category'
      ? boardState.categoryNotes.find(n => n.id === noteId)
      : boardState.editNotes.find(n => n.id === noteId);
    if (!note) return;

    _set({
      isOpen: true, noteId, noteType,
      categoryId: note.categoryId, imageId: note.imageId,
      status: 'analyzing', errorMessage: null, messages: [],
      filledFields: [], liveTranscript: '',
      singleFieldMode: true, targetFieldId: fieldId,
      emptyFields: [fieldLabel], allFields: [fieldLabel],
      fieldOwnership: { [fieldLabel]: 'decide' },
      inputMode: 'guided',
    });

    try {
      const images = useImageStore.getState().images;
      const image = images.find(img => img.id === note.imageId);
      if (!image) throw new Error('Image not found');

      const imgData = await imageToBase64(image.blobId);
      if (!imgData) throw new Error('Image load failed');

      const crossNodeContext = buildCrossNodeContext(noteId, noteType, note.imageId);
      const imageDescription = await analyzeImageForContext(openRouterKey, imgData.base64, imgData.mimeType);

      _sessionMeta.set(noteId, {
        imageId: note.imageId,
        categoryId: note.categoryId,
        categoryLabel: getCategoryLabel(note.categoryId),
      });

      useVoiceQuizStore.getState()._set({ imageDescription, crossNodeContext });
      await generateAndAsk();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed';
      _set({ status: 'error', errorMessage: msg });
    }
  }, []);

  // ─── Generate next question and begin listening ─────────────────────────────

  async function generateAndAsk(clarifyFieldLabel?: string) {
    const state = useVoiceQuizStore.getState();
    const openRouterKey = useSettingsStore.getState().apiKey;

    state._set({ status: 'thinking' });

    try {
      const question = await generateNextQuestion(openRouterKey, {
        nodeLabel: getCategoryLabel(state.categoryId || ''),
        imageDescription: state.imageDescription,
        crossNodeContext: state.crossNodeContext,
        emptyFields: state.emptyFields,
        messages: state.messages,
        lastAnswerWasConfused: state.lastQuestionWasConfused,
        clarifyFieldLabel,
      });

      if (question.trim() === 'COMPLETE') {
        state._set({ status: 'confirming' });
        return;
      }

      const newMessages = [...state.messages, { role: 'ai' as const, text: question }];
      state._set({ messages: newMessages });

      if (!useVoiceQuizStore.getState().isOpen) return;
      startListening();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Question generation failed';
      state._set({ status: 'error', errorMessage: msg });
    }
  }

  // ─── Speech recognition ────────────────────────────────────────────────────

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

    recognition.onerror = () => { /* ignore */ };
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

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      streamRef.current = stream;

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
      recorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  // ─── Process director's spoken answer ──────────────────────────────────────

  async function processDirectorAnswer(audioBlob: Blob) {
    const state = useVoiceQuizStore.getState();
    const openAiKey = useSettingsStore.getState().openAiApiKey;
    const openRouterKey = useSettingsStore.getState().apiKey;

    state._set({ status: 'processing' });

    try {
      const finalText = await transcribeAudio(openAiKey, audioBlob);

      if (!finalText.trim()) {
        await generateAndAsk();
        return;
      }

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

      const newMessages = [...state.messages, { role: 'director' as const, text: finalText }];
      state._set({ messages: newMessages, liveTranscript: '', lastQuestionWasConfused: false });

      const resolved = await extractResolvedFields(
        openRouterKey,
        newMessages,
        state.emptyFields,
        state.allFields,
      );

      // ── Improvement 1: CLARIFY MODE ──────────────────────────────────────
      // If clarifyMode is on and any extracted fields are inferred, re-ask
      // with a targeted clarification question instead of saving the guess.
      if (state.clarifyMode && resolved.length > 0) {
        const inferredNew = resolved.filter(f => f.wasInferred && !f.wasRejected);
        const confirmedNew = resolved.filter(f => !f.wasInferred && !f.wasRejected);

        if (inferredNew.length > 0) {
          // Save confirmed fields only
          const existingIds = new Set(state.filledFields.map(f => f.fieldId));
          const newFilled = [...state.filledFields];
          const newEmpty = [...state.emptyFields];

          for (const f of confirmedNew) {
            if (!existingIds.has(f.fieldId)) {
              newFilled.push(f);
              existingIds.add(f.fieldId);
            } else {
              const idx = newFilled.findIndex(x => x.fieldId === f.fieldId);
              if (idx >= 0) newFilled[idx] = f;
            }
            const emptyIdx = newEmpty.findIndex(e => e.toLowerCase() === f.fieldLabel.toLowerCase());
            if (emptyIdx >= 0) newEmpty.splice(emptyIdx, 1);
          }

          state._set({ filledFields: newFilled, emptyFields: newEmpty });
          // Re-ask with clarification about the first inferred field
          await generateAndAsk(inferredNew[0].fieldLabel);
          return;
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      const existingIds = new Set(state.filledFields.map(f => f.fieldId));
      const newFilled = [...state.filledFields];
      const newEmpty = [...state.emptyFields];

      if (resolved.length > 0) {
        for (const f of resolved) {
          if (!existingIds.has(f.fieldId)) {
            newFilled.push(f);
            existingIds.add(f.fieldId);
          } else {
            const idx = newFilled.findIndex(x => x.fieldId === f.fieldId);
            if (idx >= 0) newFilled[idx] = f;
          }
          const emptyIdx = newEmpty.findIndex(e => e.toLowerCase() === f.fieldLabel.toLowerCase());
          if (emptyIdx >= 0) newEmpty.splice(emptyIdx, 1);
        }
      } else if (newEmpty.length > 0) {
        const skippedLabel = newEmpty[0];
        newEmpty.splice(0, 1);
        newFilled.push({
          fieldId: skippedLabel.toLowerCase().replace(/\s+/g, '-'),
          fieldLabel: skippedLabel,
          value: finalText,
          sourceWords: finalText,
          wasInferred: true,
          wasRejected: false,
        });
      }

      state._set({ filledFields: newFilled, emptyFields: newEmpty });
      // Guard: if all fields resolved, go straight to confirming — no extra API round-trip
      if (newEmpty.length === 0) {
        useVoiceQuizStore.getState()._set({ status: 'confirming' });
      } else {
        await generateAndAsk();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Processing failed';
      state._set({ status: 'error', errorMessage: msg });
    }
  }

  // ─── Monologue recording ────────────────────────────────────────────────────

  function startMonologueRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      streamRef.current = stream;

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
        await processMonologue(audioBlob);
      };
      recorder.start();
      recorderRef.current = recorder;
    }).catch(() => {
      useVoiceQuizStore.getState()._set({ status: 'error', errorMessage: 'Microphone access denied' });
    });
  }

  const stopMonologue = useCallback(() => {
    useVoiceQuizStore.getState()._set({ status: 'monologue-processing' });

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  async function processMonologue(audioBlob: Blob) {
    const state = useVoiceQuizStore.getState();
    const openAiKey = useSettingsStore.getState().openAiApiKey;
    const openRouterKey = useSettingsStore.getState().apiKey;

    try {
      const transcript = await transcribeAudio(openAiKey, audioBlob);

      if (!transcript.trim()) {
        state._set({ status: 'error', errorMessage: 'No speech detected. Try again.' });
        return;
      }

      state._set({ monologueTranscript: transcript });

      const { extractFromMonologue } = await import('../utils/monologue-extractor');
      const fieldDefs = state.allFields.map(label => ({
        id: label.toLowerCase().replace(/\s+/g, '-'),
        label,
      }));

      const extracted = await extractFromMonologue(
        openRouterKey,
        transcript,
        fieldDefs,
        state.imageDescription,
      );

      const describedLabels = new Set(extracted.map(f => f.fieldLabel));
      const emptyAfterMonologue = state.emptyFields.filter(f => !describedLabels.has(f));

      state._set({
        filledFields: extracted,
        emptyFields: emptyAfterMonologue,
        status: 'confirming',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Processing failed';
      state._set({ status: 'error', errorMessage: msg });
    }
  }

  // Continue with guided Q&A for fields not described in monologue
  const continueWithGuidedAfterMonologue = useCallback(async () => {
    useVoiceQuizStore.getState()._set({ inputMode: 'guided' });
    await generateAndAsk();
  }, []);

  // ─── Confirm and write fields ───────────────────────────────────────────────

  // closeQuiz: hard discard — stop everything and reset. Used by backdrop, X, and Discard button.
  const closeQuiz = useCallback(() => {
    stopAllMedia();
    useVoiceQuizStore.getState()._reset();
  }, []);

  // endSession: called by "End Session" button mid-quiz.
  // If fields have been captured → stop mic and go to the review screen (confirming).
  // The director can then review, edit, and write to node exactly like a normal completion.
  // If nothing captured yet → just close.
  const endSession = useCallback(() => {
    const state = useVoiceQuizStore.getState();
    const hasCaptured = state.filledFields.filter(f => !f.wasRejected).length > 0;

    // Stop mic/recorder so the UI is no longer actively listening
    stopAllMedia();

    if (hasCaptured) {
      // Go to review — director sees cards, confirms inferred fields, then writes
      useVoiceQuizStore.getState()._set({ status: 'confirming', liveTranscript: '' });
    } else {
      // Nothing captured — just close
      useVoiceQuizStore.getState()._reset();
    }
  }, []);

  const confirmFields = useCallback(async (confirmedFields: FilledField[]) => {
    const state = useVoiceQuizStore.getState();
    const boardStore = useBoardStore.getState();

    const activeFields = confirmedFields.filter(f => !f.wasRejected);

    if (state.singleFieldMode && state.noteId) {
      // Merge with previously saved fields — replace only the target field
      const prevFields = _savedFields.get(state.noteId) || [];
      const mergedFields = prevFields.filter(f => f.fieldId !== state.targetFieldId);
      mergedFields.push(...activeFields);

      const finalText = mergedFields.map(f => f.value).join('. ');

      if (state.noteType === 'category') {
        await boardStore.updateCategoryNote(state.noteId, { text: finalText });
      } else if (state.noteType === 'edit') {
        await boardStore.updateEditNote(state.noteId, { text: finalText });
      }

      _savedFields.set(state.noteId, mergedFields);
      useSavedFieldsStore.getState().save(state.noteId, mergedFields);
    } else {
      const noteText = activeFields.map(f => f.value).join('. ');

      if (state.noteType === 'category' && state.noteId) {
        await boardStore.updateCategoryNote(state.noteId, { text: noteText });
      } else if (state.noteType === 'edit' && state.noteId) {
        await boardStore.updateEditNote(state.noteId, { text: noteText });
      }

      if (state.noteId) {
        _savedFields.set(state.noteId, [...confirmedFields]);
        useSavedFieldsStore.getState().save(state.noteId, [...confirmedFields]);
      }
    }

    stopAllMedia();
    useVoiceQuizStore.getState()._reset();
  }, []);

  // ─── Field editing / rejection ──────────────────────────────────────────────

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

  // Improvement 4 — mark an inferred field as confirmed by the director
  const confirmInferredField = useCallback((fieldId: string) => {
    const state = useVoiceQuizStore.getState();
    state._set({
      filledFields: state.filledFields.map(f =>
        f.fieldId === fieldId ? { ...f, isConfirmedByDirector: true } : f
      ),
    });
  }, []);

  // ─── Ownership controls ─────────────────────────────────────────────────────

  const setClarifyMode = useCallback((on: boolean) => {
    useVoiceQuizStore.getState()._set({ clarifyMode: on });
  }, []);

  const setFieldOwnership = useCallback((fieldLabel: string, ownership: 'decide' | 'ai' | 'skip') => {
    const { fieldOwnership } = useVoiceQuizStore.getState();
    useVoiceQuizStore.getState()._set({
      fieldOwnership: { ...fieldOwnership, [fieldLabel]: ownership },
    });
  }, []);

  const setAllOwnership = useCallback((ownership: 'decide' | 'ai' | 'skip') => {
    const { fieldOwnership } = useVoiceQuizStore.getState();
    const next = { ...fieldOwnership };
    Object.keys(next).forEach(k => { next[k] = ownership; });
    useVoiceQuizStore.getState()._set({ fieldOwnership: next });
  }, []);

  const retryQuestion = useCallback(() => { generateAndAsk(); }, []);
  const manualStopListening = useCallback(() => { stopListening(); }, []);

  return {
    ...store,
    openQuiz,
    closeQuiz,
    endSession,
    confirmFields,
    editField,
    rejectField,
    retryQuestion,
    manualStopListening,
    startListening,
    // New
    startFromOwnership,
    selectMode,
    stopMonologue,
    continueWithGuidedAfterMonologue,
    openSingleFieldQuiz,
    confirmInferredField,
    setClarifyMode,
    setFieldOwnership,
    setAllOwnership,
  };
}
