import { create } from 'zustand';

import type { Catalog } from '../contracts';
import { pictureGalleryEnabled } from '../ui/featureFlags';
import type { GalleryPersistence, LoadGalleryStatus } from '../persistence/gallery';
import {
  PAINTINGS,
  paintingProgress,
  type GalleryModelDeps,
  type PaintingProgress,
} from './galleryModel';

/**
 * B-M14 Picture Gallery store — the ONLY new persisted gallery state: which
 * paintings have been "hung" (revealed pieces are derived from the catalog, so
 * they are never stored). Isolated from the run save and the catalog key.
 *
 * Every persistence scar applied:
 * - Flag-gated: when `pictureGalleryEnabled()` is false, `loadGallery` and
 *   `hangPainting` are no-ops that never touch storage (byte-identical flag-off).
 * - Load-guarded (the record-without-load overwrite scar): `hangPainting`
 *   hydrates first if the store hasn't loaded, so a hang can never persist a
 *   fresh empty set over a real save on disk.
 * - Corrupt-tolerant: persistence resolves bad data to an empty set without
 *   wiping anything else (see persistence/gallery.ts).
 */

export interface GalleryStoreState {
  hungPaintingIds: string[];
  loadStatus: LoadGalleryStatus | 'idle' | 'loading' | 'disabled';
  loaded: boolean;
  loadGallery(): Promise<void>;
  /** Persist a painting as hung (idempotent). Returns the new hung set. No-op
   *  when the flag is off. */
  hangPainting(paintingId: string): Promise<string[]>;
}

export const gallerySelectors = {
  hungPaintingIds: (s: GalleryStoreState) => s.hungPaintingIds,
} as const;

interface GalleryStoreOptions {
  persistence?: GalleryPersistence;
  /** Test seam: override the live flag read. */
  enabled?: () => boolean;
}

let cachedDefaultPersistence: Promise<GalleryPersistence> | null = null;
async function defaultPersistence(): Promise<GalleryPersistence> {
  cachedDefaultPersistence ??= import('../persistence/asyncStorage').then(
    (m) => m.asyncStorageGalleryPersistence,
  );
  return cachedDefaultPersistence;
}

export function createGalleryStore(options: GalleryStoreOptions = {}) {
  const getPersistence = async () => options.persistence ?? defaultPersistence();
  const isEnabled = options.enabled ?? pictureGalleryEnabled;

  return create<GalleryStoreState>()((set, get) => ({
    hungPaintingIds: [],
    loadStatus: 'idle',
    loaded: false,

    async loadGallery() {
      // Flag off ⇒ the store is never read or written.
      if (!isEnabled()) {
        set({ loadStatus: 'disabled', loaded: false });
        return;
      }
      set({ loadStatus: 'loading' });
      const result = await (await getPersistence()).loadGallery();
      set({ hungPaintingIds: result.hungPaintingIds, loadStatus: result.status, loaded: true });
    },

    async hangPainting(paintingId) {
      if (!isEnabled()) return get().hungPaintingIds;
      // Load-guard: never persist over an unloaded (empty) store — that would
      // wipe previously-hung paintings on disk (the record-without-load scar).
      if (!get().loaded) await get().loadGallery();
      if (get().hungPaintingIds.includes(paintingId)) return get().hungPaintingIds;
      const next = [...get().hungPaintingIds, paintingId];
      set({ hungPaintingIds: next });
      await (await getPersistence()).saveGallery(next);
      return next;
    },
  }));
}

export const useGalleryStore = createGalleryStore();

// --- View model: join catalog-derived progress with the hung set. ---

export interface GalleryPaintingView extends PaintingProgress {
  /** Persisted: this painting has been assembled and hung. */
  hung: boolean;
  /** Ready for the assembly ceremony: all pieces revealed, not yet hung. */
  readyToAssemble: boolean;
  /** Plain-language progress caption ("6 of 9"). */
  progressLabel: string;
}

/**
 * The gallery's per-painting rows. Pure derive: catalog progress + the persisted
 * hung set in, view rows out. The screen consumes this via the store boundary
 * and never imports `@/items` / `@/sim` values itself.
 */
export function galleryView(
  catalog: Catalog,
  hungPaintingIds: readonly string[],
  deps?: GalleryModelDeps,
): GalleryPaintingView[] {
  const hung = new Set(hungPaintingIds);
  return PAINTINGS.map((def) => {
    const progress = paintingProgress(def, catalog, deps);
    const isHung = hung.has(def.id);
    return {
      ...progress,
      hung: isHung,
      readyToAssemble: progress.complete && !isHung,
      progressLabel: `${progress.piecesRevealed} of ${progress.total}`,
    };
  });
}
