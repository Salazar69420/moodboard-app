import { create } from 'zustand';
import type { BoardImage } from '../types';
import * as dbOps from '../utils/db-operations';
import { revokeBlobUrl } from '../utils/image';
import { getDB } from '../utils/db';

interface ImageStore {
  images: BoardImage[];
  isLoaded: boolean;

  loadImages: (projectId: string) => Promise<void>;
  addImage: (image: BoardImage) => void;
  removeImage: (imageId: string) => Promise<void>;
  updatePosition: (imageId: string, x: number, y: number) => void;
  updateSize: (imageId: string, displayWidth: number, displayHeight: number) => void;
  persistPosition: (imageId: string) => Promise<void>;
  updateLabel: (imageId: string, label: string) => Promise<void>;
  updateAccentColor: (imageId: string, color: string) => Promise<void>;
  updateShotOrder: (imageId: string, order: number) => Promise<void>;
  updateImageFields: (imageId: string, updates: Partial<BoardImage>) => Promise<void>;
  reorderImages: (orderedIds: string[]) => Promise<void>;
  duplicateImage: (imageId: string) => Promise<string | null>;
  moveImageToProject: (imageId: string, targetProjectId: string) => Promise<void>;
  updateImageBlob: (imageId: string, newBlob: Blob, newW: number, newH: number) => Promise<void>;
  // Remote-safe mutations (no Yjs write-back)
  upsertImageFromRemote: (image: BoardImage) => void;
  removeImageFromRemote: (imageId: string) => void;
  clear: () => void;
}

export const useImageStore = create<ImageStore>((set, get) => ({
  images: [],
  isLoaded: false,

  loadImages: async (projectId) => {
    const images = await dbOps.getImagesByProject(projectId);
    set({ images, isLoaded: true });
  },

  addImage: (image) => {
    set((state) => ({ images: [...state.images, image] }));
  },

  removeImage: async (imageId) => {
    const image = get().images.find((i) => i.id === imageId);
    if (!image) return;
    revokeBlobUrl(image.blobId);
    await dbOps.deleteImage(imageId, image.blobId);
    set((state) => ({ images: state.images.filter((i) => i.id !== imageId) }));
  },

  updatePosition: (imageId, x, y) => {
    set((state) => ({
      images: state.images.map((i) =>
        i.id === imageId ? { ...i, x, y } : i
      ),
    }));
  },

  updateSize: (imageId, displayWidth, displayHeight) => {
    set((state) => ({
      images: state.images.map((i) =>
        i.id === imageId ? { ...i, displayWidth, displayHeight } : i
      ),
    }));
  },

  persistPosition: async (imageId) => {
    const image = get().images.find((i) => i.id === imageId);
    if (image) {
      await dbOps.updateImagePosition(imageId, image.x, image.y);
    }
  },

  updateLabel: async (imageId, label) => {
    await dbOps.updateImageLabel(imageId, label);
    set((state) => ({
      images: state.images.map((i) =>
        i.id === imageId ? { ...i, label } : i
      ),
    }));
  },

  updateAccentColor: async (imageId, color) => {
    const db = await getDB();
    const img = await db.get('images', imageId);
    if (img) {
      img.accentColor = color;
      await db.put('images', img);
      set((state) => ({
        images: state.images.map((i) =>
          i.id === imageId ? { ...i, accentColor: color } : i
        ),
      }));
    }
  },

  updateShotOrder: async (imageId, order) => {
    const db = await getDB();
    const img = await db.get('images', imageId);
    if (img) {
      img.shotOrder = order;
      await db.put('images', img);
      set((state) => ({
        images: state.images.map((i) =>
          i.id === imageId ? { ...i, shotOrder: order } : i
        ),
      }));
    }
  },

  updateImageFields: async (imageId, updates) => {
    const db = await getDB();
    const img = await db.get('images', imageId);
    if (img) {
      const updated = { ...img, ...updates };
      await db.put('images', updated);
      set((state) => ({
        images: state.images.map((i) => i.id === imageId ? updated : i),
      }));
    }
  },

  reorderImages: async (orderedIds) => {
    const db = await getDB();
    const imgs = get().images;
    const updated: BoardImage[] = [];
    for (let i = 0; i < orderedIds.length; i++) {
      const img = imgs.find((im) => im.id === orderedIds[i]);
      if (img) {
        const u = { ...img, shotOrder: i };
        await db.put('images', u);
        updated.push(u);
      }
    }
    // Add any images not in orderedIds at the end
    for (const img of imgs) {
      if (!orderedIds.includes(img.id)) {
        updated.push(img);
      }
    }
    set({ images: updated });
  },

  duplicateImage: async (imageId) => {
    const image = get().images.find((i) => i.id === imageId);
    if (!image) return null;

    const db = await getDB();
    // Read the blob
    const blobEntry = await db.get('blobs', image.blobId);
    if (!blobEntry) return null;

    const { nanoid } = await import('nanoid');
    const newBlobId = nanoid();
    const newImageId = nanoid();

    // Duplicate blob
    await db.put('blobs', { id: newBlobId, blob: blobEntry.blob });

    // Duplicate image with offset
    const newImage: BoardImage = {
      ...image,
      id: newImageId,
      blobId: newBlobId,
      x: image.x + 40,
      y: image.y + 40,
      label: image.label ? `${image.label} copy` : '',
      shotOrder: (image.shotOrder ?? 0) + 1,
      createdAt: Date.now(),
    };
    await db.put('images', newImage);
    set((state) => ({ images: [...state.images, newImage] }));
    return newImageId;
  },

  moveImageToProject: async (imageId, targetProjectId) => {
    const image = get().images.find((i) => i.id === imageId);
    if (!image) return;
    const db = await getDB();
    const imgRecord = await db.get('images', imageId);
    if (imgRecord) {
      imgRecord.projectId = targetProjectId;
      await db.put('images', imgRecord);
    }
    // Remove from current view
    set((state) => ({ images: state.images.filter((i) => i.id !== imageId) }));
  },

  clear: () => set({ images: [], isLoaded: false }),

  upsertImageFromRemote: (image) => {
    set((state) => {
      const exists = state.images.some((i) => i.id === image.id);
      if (exists) {
        return { images: state.images.map((i) => i.id === image.id ? { ...i, ...image } : i) };
      } else {
        return { images: [...state.images, image] };
      }
    });
    // Persist to IndexedDB (fire and forget)
    getDB().then(db => db.put('images', image)).catch(() => { });
  },

  removeImageFromRemote: (imageId) => {
    set((state) => ({ images: state.images.filter((i) => i.id !== imageId) }));
    // Remove from IndexedDB (fire and forget)
    getDB().then(db => db.delete('images', imageId)).catch(() => { });
  },

  updateImageBlob: async (imageId, newBlob, newW, newH) => {
    const image = get().images.find((i) => i.id === imageId);
    if (!image) return;
    const db = await getDB();
    // Replace blob data
    await db.put('blobs', { id: image.blobId, blob: newBlob });
    // Update image record
    const imgRecord = await db.get('images', imageId);
    if (imgRecord) {
      imgRecord.width = newW;
      imgRecord.height = newH;
      imgRecord.displayWidth = undefined;
      imgRecord.displayHeight = undefined;
      imgRecord.cropX = undefined;
      imgRecord.cropY = undefined;
      imgRecord.cropW = undefined;
      imgRecord.cropH = undefined;
      await db.put('images', imgRecord);
    }
    // Update in-memory
    set((state) => ({
      images: state.images.map((i) =>
        i.id === imageId
          ? { ...i, width: newW, height: newH, displayWidth: undefined, displayHeight: undefined, cropX: undefined, cropY: undefined, cropW: undefined, cropH: undefined }
          : i
      ),
    }));
    // Revoke old blob URL so it refreshes
    revokeBlobUrl(image.blobId);
  },
}));
