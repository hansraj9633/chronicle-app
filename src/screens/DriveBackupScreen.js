// src/screens/DriveBackupScreen.js — Phase 5
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../themes/ThemeContext';
import { getSetting, setSetting } from '../storage/db';
import { signInWithGoogle, backupToDrive, listDriveBackups } from '../sharing/driveBackup';
import { importPosts } from '../storage/db';

export default function DriveBackupScreen({ navigation }) {
  const { theme } = useTheme();
  const [accessToken, setAccessToken] = useState(null);
  const [clientId, setClientId] = useState('');
  const [loading, setLoading] = useState(null);
  const [backups, setBackups] = useState([]);
  const [lastBackup, setLastBackup] = useState(null);

  useEffect(() => {
    Promise.all([
      getSetting('google_client_id'),
      getSetting('last_drive_backup'),
    ]).then(([cid, lb]) => {
      if (cid) setClientId(cid);
      if (lb) setLastBackup(lb);
    });
  }, []);

  const handleSignIn = async () => {
    setLoading('signin');
    try {
      const auth = await signInWithGoogle(clientId);
      setAccessToken(auth.accessToken);
      await setSetting('google_access_token', auth.accessToken);
      const files = await listDriveBackups(auth.accessToken);
      setBackups(files);
    } catch (e) {
      Alert.alert('Sign-in failed', e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleBackup = async () => {
    if (!accessToken) { Alert.alert('Sign in first', 'Connect your Google account first.'); return; }
    setLoading('backup');
    try {
      const result = await backupToDrive(accessToken);
      const now = new Date().toLocaleString();
      setLastBackup(now);
      await setSetting('last_drive_backup', now);
      const files = await listDriveBackups(accessToken);
      setBackups(files);
      Alert.alert(
        '✅ Backup complete!',
        `${result.postCount} posts backed up to Google Drive.\n\nFile: ${result.fileName}`,
        [
          { text: 'View in Drive', onPress: () => Linking.openURL('https://drive.google.com/drive/folders/' + result.folderId) },
          { text: 'Done' },
        ]
      );
    } catch (e) {
      Alert.alert('Backup failed', e.message);
    } finally {
      setLoading(null);
    }
  };

  const s = makeStyles(theme);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.headerBg} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={theme.headerText} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Google Drive Backup</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 50 }}>

        {/* Info banner */}
        <View style={[s.infoBanner, { backgroundColor: '#4285F4' + '15', borderColor: '#4285F4' + '40' }]}>
          <Ionicons name="cloud-outline" size={28} color="#4285F4" />
          <View style={{ flex: 1 }}>
            <Text style={[s.infoTitle, { color: theme.text }]}>Auto-backup to Google Drive</Text>
            <Text style={[s.infoSub, { color: theme.textSecondary }]}>
              Your Chronicle posts are backed up to a "Chronicle Backups" folder in your Drive.
            </Text>
          </View>
        </View>

        {/* Setup section */}
        {!accessToken ? (
          <View style={[s.setupCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[s.setupTitle, { color: theme.text }]}>Setup required</Text>
            <Text style={[s.setupBody, { color: theme.textSecondary }]}>
              To use Drive backup you need a Google OAuth Client ID.{'\n\n'}
              1. Visit console.cloud.google.com{'\n'}
              2. Create a project and enable Google Drive API{'\n'}
              3. Create OAuth credentials (Android){'\n'}
              4. Copy your Client ID below
            </Text>
            <TouchableOpacity
              style={[s.setupLink, { borderColor: '#4285F4' }]}
              onPress={() => Linking.openURL('https://console.cloud.google.com')}
            >
              <Ionicons name="open-outline" size={14} color="#4285F4" />
              <Text style={[s.setupLinkText, { color: '#4285F4' }]}>Open Google Cloud Console</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.signInBtn, { backgroundColor: '#4285F4' }]}
              onPress={handleSignIn}
              disabled={!!loading}
              activeOpacity={0.8}
            >
              {loading === 'signin'
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="logo-google" size={18} color="#fff" />
              }
              <Text style={s.signInBtnText}>
                {loading === 'signin' ? 'Signing in…' : 'Sign in with Google'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Connected */}
            <View style={[s.connectedCard, { backgroundColor: '#00ab6c' + '15', borderColor: '#00ab6c' + '40' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#00ab6c" />
              <Text style={[s.connectedText, { color: theme.text }]}>Connected to Google Drive</Text>
            </View>

            {/* Last backup */}
            {lastBackup && (
              <View style={[s.lastBackup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
                <Text style={[s.lastBackupText, { color: theme.textSecondary }]}>
                  Last backup: {lastBackup}
                </Text>
              </View>
            )}

            {/* Backup now button */}
            <TouchableOpacity
              style={[s.backupBtn, { backgroundColor: '#4285F4' }]}
              onPress={handleBackup}
              disabled={!!loading}
              activeOpacity={0.8}
            >
              {loading === 'backup'
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
              }
              <Text style={s.backupBtnText}>
                {loading === 'backup' ? 'Backing up…' : 'Back Up Now'}
              </Text>
            </TouchableOpacity>

            {/* Previous backups */}
            {backups.length > 0 && (
              <View style={{ marginTop: 20 }}>
                <Text style={s.sectionTitle}>Previous Backups</Text>
                {backups.map((file, i) => (
                  <View key={file.id} style={[s.fileRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Ionicons name="document-outline" size={18} color="#4285F4" />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.fileName, { color: theme.text }]} numberOfLines={1}>{file.name}</Text>
                      <Text style={[s.fileMeta, { color: theme.textSecondary }]}>
                        {new Date(file.createdTime).toLocaleDateString()}
                        {file.size ? ` · ${Math.round(file.size / 1024)}KB` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`https://drive.google.com/file/d/${file.id}/view`)}
                    >
                      <Ionicons name="open-outline" size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Disconnect */}
            <TouchableOpacity
              style={[s.disconnectBtn, { borderColor: theme.border }]}
              onPress={() => {
                Alert.alert('Disconnect Google Drive?', 'You can reconnect anytime.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Disconnect', style: 'destructive', onPress: () => { setAccessToken(null); setBackups([]); } },
                ]);
              }}
            >
              <Text style={[s.disconnectText, { color: theme.textSecondary }]}>Disconnect Google Account</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: theme.headerBg, paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 2, borderBottomColor: theme.rule,
    },
    headerTitle: { fontSize: 16, fontWeight: '900', color: theme.headerText, fontFamily: 'serif' },
    infoBanner: {
      flexDirection: 'row', gap: 12, alignItems: 'center',
      borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 16,
    },
    infoTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
    infoSub: { fontSize: 12, lineHeight: 18 },
    setupCard: { borderWidth: 1, borderRadius: 8, padding: 18, marginBottom: 14 },
    setupTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
    setupBody: { fontSize: 13, lineHeight: 22, marginBottom: 14 },
    setupLink: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderWidth: 1, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start', marginBottom: 16,
    },
    setupLinkText: { fontSize: 13, fontWeight: '700' },
    signInBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, borderRadius: 6, paddingVertical: 13,
    },
    signInBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    connectedCard: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      borderWidth: 1, borderRadius: 6, padding: 14, marginBottom: 10,
    },
    connectedText: { fontSize: 14, fontWeight: '700' },
    lastBackup: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderWidth: 1, borderRadius: 4, padding: 10, marginBottom: 14,
    },
    lastBackupText: { fontSize: 12 },
    backupBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, borderRadius: 6, paddingVertical: 14, marginBottom: 8,
    },
    backupBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    sectionTitle: {
      fontSize: 10, fontWeight: '800', letterSpacing: 1.5,
      textTransform: 'uppercase', color: theme.textSecondary, marginBottom: 8,
    },
    fileRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      borderWidth: 1, borderRadius: 4, padding: 12, marginBottom: 6,
    },
    fileName: { fontSize: 13, fontWeight: '600' },
    fileMeta: { fontSize: 11, marginTop: 2 },
    disconnectBtn: {
      alignItems: 'center', borderWidth: 1, borderRadius: 4,
      paddingVertical: 12, marginTop: 20,
    },
    disconnectText: { fontSize: 13 },
  });
}
