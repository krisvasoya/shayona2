import React from 'react';
import { Stack } from 'expo-router';
import { DrawerProvider, AppDrawer } from '@/src/components/navigation';

export default function AppLayout() {
  return (
    <DrawerProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="invoices/create"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
      <AppDrawer />
    </DrawerProvider>
  );
}
