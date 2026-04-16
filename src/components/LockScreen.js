// src/components/LockScreen.js
// Phase 5: Biometric lock screen

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../themes/ThemeContext';
import { authenticateWithBiometrics, getBiometricCapability } from '../services/biometricLock';

export default function LockScreen({ onUnlock }) {
  const { theme } = useTheme();
  const [cap, setCap] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    getBiometricCapability().then(setCap);
    // Auto-prompt on mount
    setTimeout(() => triggerAuth(), 400);
  }, []);

  const triggerAuth = async () => {
    setFailed(false);
    try {
      const ok = await authenticateWithBiometrics('Unlock Chronicle');
      if (ok) {
        onUnlock();
      } else {
        setFailed(true);
        setAttempts(a => a + 1);
      }
    } catch {
      setFailed(true);
    }
  };

  const s = makeStyles(theme);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />

      <View style={s.container}>
        {/* App name */}
        <View style={s.topSection}>
          <Text style={s.appName}>Chronicle</Text>
          <Text style={s.tagline}>Your personal newspaper</Text>
        </View>

        {/* Lock icon */}
        <View style={[s.lockCircle, { borderColor: failed ? '#dc2626' : theme.accent }]}>
          <Ionicons
            name={cap?.icon || 'finger-print-outline'}
            size={52}
            color={failed ? '#dc2626' : theme.accent}
          />
        </View>

        {/* Status text */}
        <Text style={[s.statusText, { color: failed ? '#dc2626' : theme.textSecondary }]}>
          {failed
            ? attempts >= 3
              ? 'Too many attempts. Try again.'
              : 'Authentication failed. Try again.'
            : `Unlock with ${cap?.label || 'biometrics'}`
          }
        </Text>

        {/* Retry button */}
        <TouchableOpacity
          style={[s.retryBtn, { backgroundColor: theme.accent }]}
          onPress={triggerAuth}
          activeOpacity={0.8}
        >
          <Ionicons name="lock-open-outline" size={18} color={theme.accentText} />
          <Text style={[s.retryBtnText, { color: theme.accentText }]}>
            {failed ? 'Try Again' : 'Unlock'}
          </Text>
        </TouchableOpacity>

        <Text style={[s.hint, { color: theme.textSecondary }]}>
          You can also use your device PIN as fallback.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      gap: 20,
    },
    topSection: { alignItems: 'center', marginBottom: 20 },
    appName: {
      fontSize: 42,
      fontWeight: '900',
      color: theme.text,
      fontFamily: 'serif',
      letterSpacing: -1,
    },
    tagline: {
      fontSize: 14,
      color: theme.textSecondary,
      fontStyle: 'italic',
      marginTop: 4,
    },
    lockCircle: {
      width: 110,
      height: 110,
      borderRadius: 55,
      borderWidth: 2.5,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    statusText: {
      fontSize: 15,
      textAlign: 'center',
      lineHeight: 22,
    },
    retryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 28,
      paddingVertical: 14,
      borderRadius: 30,
      marginTop: 8,
    },
    retryBtnText: {
      fontSize: 15,
      fontWeight: '700',
    },
    hint: {
      fontSize: 12,
      textAlign: 'center',
      marginTop: 8,
    },
  });
}
