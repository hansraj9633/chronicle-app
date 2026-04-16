// src/services/biometricLock.js
// Phase 5: Biometric / PIN lock for Chronicle

import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';
import { getSetting, setSetting } from '../storage/db';

// ── CAPABILITY CHECK ──────────────────────────────────────

export async function getBiometricCapability() {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

  const hasFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
  const hasFaceId = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  const hasIris = types.includes(LocalAuthentication.AuthenticationType.IRIS);

  return {
    compatible,
    enrolled,
    hasFingerprint,
    hasFaceId,
    hasIris,
    label: hasFaceId ? 'Face ID' : hasFingerprint ? 'Fingerprint' : hasIris ? 'Iris' : 'Biometrics',
    icon: hasFaceId ? 'scan-outline' : 'finger-print-outline',
  };
}

// ── AUTHENTICATE ──────────────────────────────────────────

export async function authenticateWithBiometrics(reason = 'Unlock Chronicle') {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    fallbackLabel: 'Use PIN',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
  return result.success;
}

// ── LOCK SETTINGS ─────────────────────────────────────────

export async function getLockSettings() {
  const [enabled, lockOnBackground] = await Promise.all([
    getSetting('lock_enabled'),
    getSetting('lock_on_background'),
  ]);
  return {
    enabled: enabled === 'true',
    lockOnBackground: lockOnBackground !== 'false', // default true
  };
}

export async function setLockEnabled(enabled) {
  if (enabled) {
    const cap = await getBiometricCapability();
    if (!cap.compatible) {
      Alert.alert('Not supported', 'Your device does not have biometric hardware.');
      return false;
    }
    if (!cap.enrolled) {
      Alert.alert(
        'No biometrics enrolled',
        'Please set up fingerprint or face recognition in your device Settings first.',
      );
      return false;
    }
    // Verify they can actually authenticate before enabling
    const ok = await authenticateWithBiometrics('Enable Chronicle lock');
    if (!ok) return false;
  }
  await setSetting('lock_enabled', enabled ? 'true' : 'false');
  return true;
}

export async function setLockOnBackground(value) {
  await setSetting('lock_on_background', value ? 'true' : 'false');
}

// ── LOCK SCREEN LOGIC ─────────────────────────────────────

// Call this on app foreground if lock is enabled
export async function checkAndPromptLock() {
  const { enabled } = await getLockSettings();
  if (!enabled) return true; // not locked, allow access

  const success = await authenticateWithBiometrics('Unlock Chronicle to continue');
  return success;
}
