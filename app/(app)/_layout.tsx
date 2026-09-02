import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
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
  );
}
