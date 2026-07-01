import { Platform, View } from 'react-native';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as Updates from 'expo-updates';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { NetworkProvider } from '../context/NetworkContext';

export { ErrorBoundary } from 'expo-router';

// ─── Silent OTA update check ─────────────────────────────────────────────────
// Runs once on app launch. If a new JS bundle is available on the EAS Update
// channel it downloads silently. On next launch the employee gets the new code
// without needing to reinstall the APK.
async function checkForUpdate() {
  if (__DEV__) return; // skip in local development
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync(); // restart app with new bundle
    }
  } catch (e) {
    // Never crash the app over a failed update check
    console.warn('[OTA] Update check failed:', e.message);
  }
}

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)/dashboard');
    }
  }, [user, loading, segments]);

  // Check for OTA update after auth is resolved
  useEffect(() => {
    if (!loading) {
      checkForUpdate();
    }
  }, [loading]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgMain }}>
      <StatusBar style={colors.statusBar} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <NetworkProvider>
              <RootLayoutNav />
              <Toast />
            </NetworkProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
