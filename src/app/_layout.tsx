import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { palette, shadows } from '@/ui/tokens';
import { ITEM_SPRITES } from '@/juice';

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
// changed. Flagged in the B-M1 packet.
//
// Responsive frame: portrait is the whole design, so on wider viewports we center
// a phone-width column against a warm backdrop (like the shop sitting on a wooden
// counter) instead of stretching the UI. On phones (< COLUMN_MAX) the column is
// full-bleed, so mobile is untouched.
const COLUMN_MAX = 460;

export default function RootLayout() {
  // Load the cozy fonts; render regardless (they swap in on load) so a font
  // hiccup can never blank the app — a brief fallback flash is the worst case.
  useFonts({
    Baloo2: require('../../assets/fonts/Baloo2.ttf'),
    Nunito: require('../../assets/fonts/Nunito.ttf'),
  });

  useEffect(() => {
    for (const mod of PRELOAD_ASSETS) {
      const source = Image.resolveAssetSource(mod);
      if (source?.uri) void Image.prefetch(source.uri).catch(() => undefined);
    }
  }, []);

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
          </View>
        </View>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    alignItems: 'center',
    backgroundColor: palette.woodDark,
    flex: 1,
  },
  column: {
    backgroundColor: palette.wallCream,
    flex: 1,
    maxWidth: COLUMN_MAX,
    overflow: 'hidden',
    width: '100%',
    ...shadows.lifted,
  },
});
