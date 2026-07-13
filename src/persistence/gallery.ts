import { z } from 'zod';

import type { KeyValueStorage } from './index';

/**
 * B-M14 Picture Gallery persistence — a TINY, ISOLATED store holding only which
 * paintings have been "hung" (revealed-piece state is derived from the catalog,
 * so it is never persisted). Its own key, never touching the run save, the
 * catalog key, or any other blob. Fail-safe on every path (missing / corrupt /
 * version-mismatch all resolve to an empty hung set, never a crash and never a
 * write) so a bad gallery blob can never wall the player out or wipe anything.
 */

export const GallerySaveKey = 'luckyShelf:gallery:v1';
export const GallerySaveSchemaVersion = 1;

export const GallerySaveSchema = z
  .object({
    schemaVersion: z.literal(GallerySaveSchemaVersion),
    savedAt: z.string().min(1),
    hungPaintingIds: z.array(z.string().min(1)),
  })
  .strict();

export type GallerySave = z.infer<typeof GallerySaveSchema>;
export type LoadGalleryStatus = 'loaded' | 'missing' | 'corrupt' | 'versionMismatch';

export interface LoadGalleryResult {
  status: LoadGalleryStatus;
  hungPaintingIds: string[];
}

export interface GalleryPersistence {
  loadGallery(): Promise<LoadGalleryResult>;
  saveGallery(hungPaintingIds: readonly string[]): Promise<void>;
}

function classifyBadGallery(value: unknown): Exclude<LoadGalleryStatus, 'loaded' | 'missing'> {
  if (!value || typeof value !== 'object') return 'corrupt';
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== GallerySaveSchemaVersion) return 'versionMismatch';
  return 'corrupt';
}

export function createGalleryPersistence(storage: KeyValueStorage): GalleryPersistence {
  return {
    async loadGallery() {
      const raw = await storage.getItem(GallerySaveKey);
      if (raw === null) return { status: 'missing', hungPaintingIds: [] };

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(raw) as unknown;
      } catch {
        return { status: 'corrupt', hungPaintingIds: [] };
      }

      const parsed = GallerySaveSchema.safeParse(parsedJson);
      if (!parsed.success) {
        return { status: classifyBadGallery(parsedJson), hungPaintingIds: [] };
      }
      // De-dupe defensively; the writer already de-dupes.
      return { status: 'loaded', hungPaintingIds: [...new Set(parsed.data.hungPaintingIds)] };
    },

    async saveGallery(hungPaintingIds) {
      const save: GallerySave = {
        schemaVersion: GallerySaveSchemaVersion,
        savedAt: new Date().toISOString(),
        hungPaintingIds: [...new Set(hungPaintingIds)],
      };
      await storage.setItem(GallerySaveKey, JSON.stringify(save));
    },
  };
}
