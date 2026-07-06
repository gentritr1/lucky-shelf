import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Skia-on-web needs the CanvasKit wasm loaded before any canvas renders. On
 * native, Skia is ready immediately. This module loads the wasm once and lets
 * the scene fall back to a Reanimated/RN-view frame if it fails — the drag feel
 * and idle motion never depend on Skia, so web verification always stands and
 * the Skia visuals are a swappable enhancement layer (device is the real target).
 */

type SkiaStatus = 'ready' | 'loading' | 'unavailable';

/**
 * Flip to true only once the CanvasKit wasm is actually served for web (public
 * asset copy / metro config). Until then the loader is skipped on web: this dev
 * env does not serve the wasm, and CanvasKit's emscripten `abort()` escapes a
 * normal try/catch as an uncaught error. Device (iOS/Android) never runs this
 * path — Skia is native there. So web stays on the fallback frame and the Skia
 * visuals are device-verify-only (flagged in the B-M1 packet).
 */
const WEB_SKIA_ENABLED = false;

let sharedPromise: Promise<boolean> | null = null;

async function loadSkiaWeb(): Promise<boolean> {
  if (Platform.OS !== 'web') return true;
  if (!WEB_SKIA_ENABLED) return false;
  try {
    const mod = await import('@shopify/react-native-skia/lib/module/web');
    await mod.LoadSkiaWeb();
    return true;
  } catch {
    // wasm blocked / offline / unsupported — fall back to the view frame.
    return false;
  }
}

export function ensureSkiaLoaded(): Promise<boolean> {
  if (!sharedPromise) {
    sharedPromise = loadSkiaWeb();
  }
  return sharedPromise;
}

/** Ready-state for the Skia canvas; native starts ready, web resolves async. */
export function useSkiaReady(): SkiaStatus {
  const [status, setStatus] = useState<SkiaStatus>(
    Platform.OS === 'web' ? 'loading' : 'ready',
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
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
