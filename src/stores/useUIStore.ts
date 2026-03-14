import { create } from 'zustand';

interface ContextMenu {
  visible: boolean;
  x: number;
  y: number;
  targetImageId: string | null;
}

interface UndoEntry {
  type: string;
  description: string;
  undo: () => void;
}

interface UIStore {
  selectedImageIds: Set<string>;
  contextMenu: ContextMenu;
  isCreatingProject: boolean;
  toastMessage: string | null;
  toastTimeout: ReturnType<typeof setTimeout> | null;
  activeTool: 'select' | 'connect' | 'text';

  // Focus mode
  focusedImageId: string | null;
  setFocusedImage: (id: string | null) => void;

  // Crop mode
  croppingImageId: string | null;
  setCroppingImage: (id: string | null) => void;

  // Search
  isSearchOpen: boolean;
  searchQuery: string;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;

  // Shot panel
  isShotPanelOpen: boolean;
  setShotPanelOpen: (open: boolean) => void;

  // Undo stack
  undoStack: UndoEntry[];
  pushUndo: (entry: UndoEntry) => void;
  popUndo: () => UndoEntry | undefined;

  // Redo stack (F7)
  redoStack: UndoEntry[];
  pushRedo: (entry: UndoEntry) => void;
  popRedo: () => UndoEntry | undefined;
  clearRedo: () => void;

  // Note display mode (U2): 'canvas' or 'sidebar'
  noteDisplayMode: 'canvas' | 'sidebar';
  setNoteDisplayMode: (mode: 'canvas' | 'sidebar') => void;

  // Quiet mode (U12)
  isQuietMode: boolean;
  setQuietMode: (quiet: boolean) => void;
  toggleQuietMode: () => void;

  // Auto Layout (F3)
  isAutoLayout: boolean;
  setAutoLayout: (active: boolean) => void;
  toggleAutoLayout: () => void;

  selectImage: (id: string, multi?: boolean) => void;
  selectAllImages: (ids: string[]) => void;
  clearSelection: () => void;
  showContextMenu: (x: number, y: number, imageId: string) => void;
  hideContextMenu: () => void;
  setCreatingProject: (v: boolean) => void;
  showToast: (message: string) => void;
  hideToast: () => void;
  setActiveTool: (tool: 'select' | 'connect' | 'text') => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  selectedImageIds: new Set<string>(),
  contextMenu: { visible: false, x: 0, y: 0, targetImageId: null },
  isCreatingProject: false,
  toastMessage: null,
  toastTimeout: null,
  activeTool: 'select',

  // Focus mode
  focusedImageId: null,
  setFocusedImage: (id) => set({ focusedImageId: id }),

  // Crop mode
  croppingImageId: null,
  setCroppingImage: (id) => set({ croppingImageId: id }),

  // Search
  isSearchOpen: false,
  searchQuery: '',
  setSearchOpen: (open) => set({ isSearchOpen: open, searchQuery: open ? '' : get().searchQuery }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Shot panel
  isShotPanelOpen: false,
  setShotPanelOpen: (open) => set({ isShotPanelOpen: open }),

  // Undo
  undoStack: [],
  pushUndo: (entry) => set((state) => ({
    undoStack: [...state.undoStack.slice(-29), entry], // keep max 30
  })),
  popUndo: () => {
    const stack = get().undoStack;
    if (stack.length === 0) return undefined;
    const entry = stack[stack.length - 1];
    set({ undoStack: stack.slice(0, -1) });
    return entry;
  },

  // Redo (F7)
  redoStack: [],
  pushRedo: (entry) => set((state) => ({
    redoStack: [...state.redoStack.slice(-29), entry],
  })),
  popRedo: () => {
    const stack = get().redoStack;
    if (stack.length === 0) return undefined;
    const entry = stack[stack.length - 1];
    set({ redoStack: stack.slice(0, -1) });
    return entry;
  },
  clearRedo: () => set({ redoStack: [] }),

  // Note display mode (U2)
  noteDisplayMode: 'canvas',
  setNoteDisplayMode: (mode) => set({ noteDisplayMode: mode }),

  // Quiet mode (U12)
  isQuietMode: false,
  setQuietMode: (quiet) => set({ isQuietMode: quiet }),
  toggleQuietMode: () => set((s) => ({ isQuietMode: !s.isQuietMode })),

  // Auto Layout (F3)
  isAutoLayout: false,
  setAutoLayout: (active) => set({ isAutoLayout: active }),
  toggleAutoLayout: () => set((s) => ({ isAutoLayout: !s.isAutoLayout })),

  setActiveTool: (tool) => set({ activeTool: tool }),

  selectImage: (id, multi = false) => {
    set((state) => {
      const next = new Set(multi ? state.selectedImageIds : []);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedImageIds: next };
    });
  },

  selectAllImages: (ids) => {
    set({ selectedImageIds: new Set(ids) });
  },

  clearSelection: () => set({ selectedImageIds: new Set() }),

  showContextMenu: (x, y, imageId) => {
    set({ contextMenu: { visible: true, x, y, targetImageId: imageId } });
  },

  hideContextMenu: () => {
    set({ contextMenu: { visible: false, x: 0, y: 0, targetImageId: null } });
  },

  setCreatingProject: (v) => set({ isCreatingProject: v }),

  showToast: (message) => {
    const prev = get().toastTimeout;
    if (prev) clearTimeout(prev);
    const timeout = setTimeout(() => {
      set({ toastMessage: null, toastTimeout: null });
    }, 2500);
    set({ toastMessage: message, toastTimeout: timeout });
  },

  hideToast: () => {
    const prev = get().toastTimeout;
    if (prev) clearTimeout(prev);
    set({ toastMessage: null, toastTimeout: null });
  },
}));
