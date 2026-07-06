import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { palette } from '@/ui/tokens';

// R-21 flag (Lane B): GestureHandlerRootView + SafeAreaProvider added at the root
// so the M1 drag-and-drop gestures work app-wide and screens can read safe-area
// insets. Both are required infra for Lane B's screens; no navigation behavior
// changed. Flagged in the B-M1 packet.
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.wallCream },
          }}
        />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
