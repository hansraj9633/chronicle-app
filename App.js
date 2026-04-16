// App.js — Phase 5: Biometric lock + notification setup
import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from './src/themes/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import LockScreen from './src/components/LockScreen';
import { getLockSettings, checkAndPromptLock } from './src/services/biometricLock';
import { requestNotificationPermission } from './src/services/notifications';

export default function App() {
  const [locked, setLocked] = useState(false);
  const [lockReady, setLockReady] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Check lock on app start
    getLockSettings().then(({ enabled, lockOnBackground }) => {
      if (enabled) {
        setLocked(true);
      }
      setLockReady(true);
    });

    // Request notification permission silently on startup
    requestNotificationPermission().catch(() => {});

    // Lock when app comes back to foreground
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        const { enabled, lockOnBackground } = await getLockSettings();
        if (enabled && lockOnBackground) {
          setLocked(true);
        }
      }
      appState.current = nextState;
    });

    return () => sub.remove();
  }, []);

  const handleUnlock = () => setLocked(false);

  if (!lockReady) return null; // brief splash while reading settings

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        {locked ? (
          <LockScreen onUnlock={handleUnlock} />
        ) : (
          <AppNavigator />
        )}
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
