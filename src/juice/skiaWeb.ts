type SkiaStatus = 'ready' | 'loading' | 'unavailable';

export function ensureSkiaLoaded(): Promise<boolean> {
  return Promise.resolve(true);
}

export function useSkiaReady(): SkiaStatus {
  return 'ready';
}
