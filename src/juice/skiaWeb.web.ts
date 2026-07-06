import { useEffect, useState } from 'react';

/**
 * Skia-on-web needs the CanvasKit wasm loaded before any canvas renders. On
 * native, `skiaWeb.ts` resolves immediately and avoids importing CanvasKit.
 */

type SkiaStatus = 'ready' | 'loading' | 'unavailable';

/**
 * Flip to true only once the CanvasKit wasm is actually served for web (public
 * asset copy / metro config). Until then the loader is skipped on web: this dev
 * env does not serve the wasm, and CanvasKit's emscripten `abort()` escapes a
 * normal try/catch as an uncaught error. Device (iOS/Android) never runs this
 * path because Metro resolves `skiaWeb.ts` for native.
 */
const WEB_SKIA_ENABLED = false;

let sharedPromise: Promise<boolean> | null = null;

async function loadSkiaWeb(): Promise<boolean> {
  if (!WEB_SKIA_ENABLED) return false;
  try {
    const mod = await import('@shopify/react-native-skia/lib/module/web');
    await mod.LoadSkiaWeb();
    return true;
  } catch {
    // wasm blocked / offline / unsupported; fall back to the view frame.
    return false;
  }
}

export function ensureSkiaLoaded(): Promise<boolean> {
  if (!sharedPromise) {
    sharedPromise = loadSkiaWeb();
  }
  return sharedPromise;
}

export function useSkiaReady(): SkiaStatus {
  const [status, setStatus] = useState<SkiaStatus>('loading');

  useEffect(() => {
    let alive = true;
    void ensureSkiaLoaded().then((ok) => {
      if (alive) setStatus(ok ? 'ready' : 'unavailable');
    });
    return () => {
      alive = false;
    };
  }, []);

  return status;
}
