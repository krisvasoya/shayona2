import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, ActivityIndicator, AppState } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/src/services/supabase/client';
import { useAuthStore } from '@/src/store/authStore';
import { authService } from '@/src/services/auth.service';
import { networkService } from '@/src/services/network.service';
import { syncService } from '@/src/services/sync.service';
import { colors } from '@/src/theme/colors';
import { AppText } from '@/src/components/common';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  // Single QueryClient instance across app lifecycle
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30, // 30 seconds
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);
  const isInitialized = useAuthStore(state => state.isInitialized);
  const initialize = useAuthStore(state => state.initialize);
  const setSession = useAuthStore(state => state.setSession);

  // Initialize network listener and auth session on mount
  useEffect(() => {
    initialize();
    const unsubNetwork = networkService.init();

    // Listen to Supabase auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await authService.getUserProfile(session.user.id, session.user);
        setSession(session, profile);
        // Trigger sync when session established
        syncService.syncAll(session.user.id).catch(() => {});
      } else if (event === 'SIGNED_OUT') {
        setSession(null, null);
      }
    });

    // App state listener for foreground sync
    const appStateSub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        const currentUser = useAuthStore.getState().user;
        if (currentUser?.id && networkService.isOnline()) {
          syncService.syncAll(currentUser.id).catch(() => {});
        }
      }
    });

    return () => {
      unsubNetwork();
      appStateSub.remove();
      authListener.subscription.unsubscribe();
    };
  }, [initialize, setSession]);

  // Route protection and automatic navigation based on auth status
  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect unauthenticated user to login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect authenticated user to dashboard
      router.replace('/(app)/(tabs)');
      if (user?.id && networkService.isOnline()) {
        syncService.syncAll(user.id).catch(() => {});
      }
    }
  }, [isAuthenticated, isInitialized, segments, router, user?.id]);

  // Render splash/loading screen while checking stored session
  if (!isInitialized) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="light" />
        <Image
          source={require('@/assets/images/splash-icon.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color={colors.textInverse} style={styles.loader} />
        <AppText variant="bodyLargeBold" color={colors.textInverse}>
          Shayona Invoice
        </AppText>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
      </Stack>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 140,
    height: 140,
    marginBottom: 24,
  },
  loader: {
    marginVertical: 16,
  },
});
