import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { Image, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { usePalette, usePrefs, useThemedStyles } from '@/ui';
import { ITEM_SPRITES } from '@/juice';
import { useCatalogStore } from '../state/catalogStore';

import { makeStyles } from './_layout.styles';

// Warm the item sprites + room backdrops into the image cache once at startup so
// they don't decode-on-first-show (the per-screen pop-in). Uses RN's built-in
// prefetch — no extra dependency — and is fire-and-forget: a miss just means the
// old lazy behaviour for that asset.
const PRELOAD_ASSETS: number[] = [
  require('../../assets/scene/room-day.jpg'),
  require('../../assets/scene/room-delivery.jpg'),
  ...Object.values(ITEM_SPRITES),
];

// R-21 flag (Lane B): GestureHandlerRootView + SafeAreaProvider added at the root
// so the M1 drag-and-drop gestures work app-wide and screens can read safe-area
// insets. Both are required infra for Lane B's screens; no navigation behavior
// changed. Flagged in the B-M1 packet. (The responsive phone-width column lives in
// _layout.styles.ts alongside the rest of the frame styling.)

// Hold the native splash so the first painted frame already has the cozy fonts —
// otherwise the display face (Baloo 2) pops in a beat late and the wordmark
// renders in the system fallback first (device feel-gate 2026-07-08). Safe if the
// splash native module is absent: expo-router's SplashScreen wraps an optional
// module, so these calls no-op rather than throw.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  // Gate the first render on the fonts so no text is ever painted in the fallback
  // face. `fontError` still lets the app through (a font hiccup must never wall
  // the player out) — it just accepts the fallback in that rare case.
  const [fontsLoaded, fontError] = useFonts({
    Baloo2: require('../../assets/fonts/Baloo2.ttf'),
    Nunito: require('../../assets/fonts/Nunito.ttf'),
  });
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (typeof Image.resolveAssetSource !== 'function' || typeof Image.prefetch !== 'function') return;

    for (const mod of PRELOAD_ASSETS) {
      const source = Image.resolveAssetSource(mod);
      if (source?.uri) void Image.prefetch(source.uri).catch(() => undefined);
    }
  }, []);

  // Hydrate the permanent catalog once at boot. Every consumer (summary bests,
  // the album) reads this store, and recordRunEnd load-guards itself as the
  // authoritative backstop — this warm-up just ensures the normal flow always
  // sees real persisted bests instead of the pre-load empty catalog.
  useEffect(() => {
    void useCatalogStore.getState().loadCatalog().catch(() => undefined);
  }, []);

  // Hydrate presentation prefs (B-M7): reduced-motion / sound / haptics / large
  // text / high contrast. Writes are load-guarded, so this boot read is what lets
  // a later toggle persist instead of being skipped as a pre-hydration default.
  useEffect(() => {
    void usePrefs.getState().loadPrefs().catch(() => undefined);
  }, []);

  // Keep the splash up (return nothing) until the fonts resolve; the native
  // splash stays visible, so the player never sees a blank or a fallback flash.
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <View style={styles.backdrop}>
          <View style={styles.column}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: palette.wallCream },
              }}
            />
            {/* contentStyle threads usePalette() above so screen backgrounds
                re-theme with high contrast in step with the screens themselves */}
          </View>
        </View>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

