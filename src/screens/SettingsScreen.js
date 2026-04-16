// src/screens/SettingsScreen.js — Phase 5 (Final)
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../themes/ThemeContext';
import { getSetting, setSetting, getStats } from '../storage/db';
import { getLockSettings, setLockEnabled, getBiometricCapability } from '../services/biometricLock';
import { getReminderSettings } from '../services/notifications';

export default function SettingsScreen({ navigation }) {
  const { theme, themeId } = useTheme();
  const [fontSize, setFontSize] = useState(16);
  const [autoSave, setAutoSave] = useState(true);
  const [showWordCount, setShowWordCount] = useState(true);
  const [lockEnabled, setLockEnabledState] = useState(false);
  const [lockSupported, setLockSupported] = useState(false);
  const [lockLabel, setLockLabel] = useState('Biometrics');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('');
  const [stats, setStats] = useState({ posts: 0, words: 0, streak: 0 });

  useFocusEffect(useCallback(() => {
    Promise.all([
      getSetting('font_size'),
      getSetting('auto_save'),
      getSetting('show_word_count'),
      getStats(),
      getLockSettings(),
      getBiometricCapability(),
      getReminderSettings(),
    ]).then(([fs, as, swc, st, lock, cap, reminder]) => {
      if (fs) setFontSize(parseInt(fs));
      setAutoSave(as !== 'false');
      setShowWordCount(swc !== 'false');
      setStats(st);
      setLockEnabledState(lock.enabled);
      setLockSupported(cap.compatible && cap.enrolled);
      setLockLabel(cap.label || 'Biometrics');
      setReminderEnabled(reminder.enabled);
      if (reminder.enabled) {
        const h = reminder.hour;
        const m = reminder.minute;
        const period = h < 12 ? 'AM' : 'PM';
        const hr = h % 12 === 0 ? 12 : h % 12;
        setReminderTime(`${hr}:${String(m).padStart(2,'0')} ${period}`);
      }
    });
  }, []));

  const handleFontSize = async (delta) => {
    const next = Math.min(22, Math.max(13, fontSize + delta));
    setFontSize(next);
    await setSetting('font_size', next);
  };

  const handleLockToggle = async (value) => {
    const ok = await setLockEnabled(value);
    if (ok) setLockEnabledState(value);
  };

  const s = makeStyles(theme);

  const Divider = () => <View style={[s.divider, { backgroundColor: theme.border }]} />;

  const Row = ({ icon, iconBg, label, sublabel, children, onPress, danger }) => (
    <TouchableOpacity
      style={s.row}
      onPress={onPress}
      disabled={!onPress && !children}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[s.rowIcon, { backgroundColor: iconBg || theme.surface }]}>
        <Ionicons name={icon} size={18} color={danger ? '#dc2626' : theme.accent} />
      </View>
      <View style={s.rowMid}>
        <Text style={[s.rowLabel, danger && { color: '#dc2626' }]}>{label}</Text>
        {sublabel ? <Text style={[s.rowSub, { color: theme.textSecondary }]}>{sublabel}</Text> : null}
      </View>
      {children}
      {onPress && !children && <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />}
    </TouchableOpacity>
  );

  const Section = ({ title, children }) => (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={[s.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.headerBg} />

      <View style={s.header}>
        <Text style={s.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 }}>

        {/* Stats banner */}
        <View style={[s.statsBanner, { backgroundColor: theme.accent }]}>
          {[
            { val: stats.posts, lbl: 'Posts' },
            { val: (stats.words || 0).toLocaleString(), lbl: 'Words' },
            { val: `${stats.streak}🔥`, lbl: 'Streak' },
          ].map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={[s.bannerDiv, { backgroundColor: theme.accentText, opacity: 0.25 }]} />}
              <View style={s.bannerItem}>
                <Text style={[s.bannerVal, { color: theme.accentText }]}>{item.val}</Text>
                <Text style={[s.bannerLbl, { color: theme.accentText, opacity: 0.75 }]}>{item.lbl}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Appearance */}
        <Section title="Appearance">
          <Row icon="color-palette-outline" label="Theme" sublabel={themeId} onPress={() => navigation.navigate('Themes')} />
          <Divider />
          <Row icon="brush-outline" label="Customise Theme" sublabel="Accent, spacing, font" onPress={() => navigation.navigate('ThemeCustomize')} />
          <Divider />
          <Row
            icon="pricetags-outline"
            label="Manage Categories"
            sublabel="Add, edit, delete custom categories"
            onPress={() => navigation.navigate('ManageCategories')}
          />
          <Divider />
          <View style={s.row}>
            <View style={[s.rowIcon, { backgroundColor: theme.surface }]}>
              <Ionicons name="text-outline" size={18} color={theme.accent} />
            </View>
            <View style={s.rowMid}>
              <Text style={s.rowLabel}>Font Size</Text>
              <Text style={[s.rowSub, { color: theme.textSecondary }]}>{fontSize}pt</Text>
            </View>
            <View style={s.stepper}>
              <TouchableOpacity style={[s.stepBtn, { borderColor: theme.border }]} onPress={() => handleFontSize(-1)}>
                <Text style={[s.stepText, { color: theme.text }]}>−</Text>
              </TouchableOpacity>
              <Text style={[s.stepVal, { color: theme.text }]}>{fontSize}</Text>
              <TouchableOpacity style={[s.stepBtn, { borderColor: theme.border }]} onPress={() => handleFontSize(1)}>
                <Text style={[s.stepText, { color: theme.text }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Section>

        {/* Writing */}
        <Section title="Writing">
          <View style={s.row}>
            <View style={[s.rowIcon, { backgroundColor: theme.surface }]}>
              <Ionicons name="save-outline" size={18} color={theme.accent} />
            </View>
            <View style={s.rowMid}>
              <Text style={s.rowLabel}>Auto-save drafts</Text>
              <Text style={[s.rowSub, { color: theme.textSecondary }]}>Save while you type</Text>
            </View>
            <Switch value={autoSave} onValueChange={async v => { setAutoSave(v); await setSetting('auto_save', v); }} trackColor={{ true: theme.accent }} thumbColor="#fff" />
          </View>
          <Divider />
          <View style={s.row}>
            <View style={[s.rowIcon, { backgroundColor: theme.surface }]}>
              <Ionicons name="calculator-outline" size={18} color={theme.accent} />
            </View>
            <View style={s.rowMid}>
              <Text style={s.rowLabel}>Word count</Text>
              <Text style={[s.rowSub, { color: theme.textSecondary }]}>Show in editor footer</Text>
            </View>
            <Switch value={showWordCount} onValueChange={async v => { setShowWordCount(v); await setSetting('show_word_count', v); }} trackColor={{ true: theme.accent }} thumbColor="#fff" />
          </View>
        </Section>

        {/* Security */}
        <Section title="Security">
          <View style={s.row}>
            <View style={[s.rowIcon, { backgroundColor: theme.surface }]}>
              <Ionicons name="finger-print-outline" size={18} color={theme.accent} />
            </View>
            <View style={s.rowMid}>
              <Text style={s.rowLabel}>{lockLabel} lock</Text>
              <Text style={[s.rowSub, { color: theme.textSecondary }]}>
                {lockSupported ? 'Lock Chronicle on background' : 'No biometrics enrolled on device'}
              </Text>
            </View>
            <Switch
              value={lockEnabled}
              onValueChange={handleLockToggle}
              trackColor={{ true: theme.accent }}
              thumbColor="#fff"
              disabled={!lockSupported}
            />
          </View>
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <Row
            icon="alarm-outline"
            label="Writing reminders"
            sublabel={reminderEnabled ? `Daily at ${reminderTime}` : 'Get nudged to write every day'}
            onPress={() => navigation.navigate('Reminders')}
          />
        </Section>

        {/* Publishing */}
        <Section title="Publishing">
          {/* <Row icon="globe-outline" label="Medium & Substack" sublabel="Publish posts to your blog" onPress={() => navigation.navigate('Publish', { post: null })} />
          <Divider /> */}
          <Row icon="logo-google" label="Google Drive Backup" sublabel="Auto-backup to Drive" onPress={() => navigation.navigate('DriveBackup')} />
        </Section>

        {/* Data */}
        <Section title="Data">
          <Row icon="calendar-outline" label="Archive" sublabel="Browse by month" onPress={() => navigation.navigate('Archive')} />
          <Divider />
          <Row icon="cloud-download-outline" label="Backup & Restore" sublabel="Export/import JSON or Markdown" onPress={() => navigation.navigate('Backup')} />
        </Section>

        {/* About */}
        <Section title="About Chronicle">
          <Row icon="newspaper-outline" label="Chronicle" sublabel="Your personal blog" />
          <Divider />
          <Row icon="code-slash-outline" label="Version" sublabel="v1.0.0" />
          <Divider />
          <Row icon="construct-outline" label="Stack" sublabel="Expo · React Native · SQLite" />
        </Section>

        {/* Contact Us */}
        <Section title="Contact Us for Feedback!">
          <Row icon="mail-outline" label="Email" sublabel="thelittlespark.official@gmail.com" />
          
        </Section>

      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    header: {
      backgroundColor: theme.headerBg, paddingHorizontal: 18, paddingVertical: 14,
      borderBottomWidth: 2, borderBottomColor: theme.rule,
    },
    headerTitle: { fontSize: 22, fontWeight: '900', color: theme.headerText, fontFamily: 'serif' },
    statsBanner: {
      flexDirection: 'row', borderRadius: 20,
      overflow: 'hidden', marginBottom: 22,
    },
    bannerItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
    bannerVal: { fontSize: 22, fontWeight: '900' },
    bannerLbl: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 2 },
    bannerDiv: { width: 1, marginVertical: 10 },
    section: { marginBottom: 20 },
    sectionTitle: {
      fontSize: 10, fontWeight: '800', letterSpacing: 1.5,
      textTransform: 'uppercase', color: theme.textSecondary,
      marginBottom: 6, paddingHorizontal: 2,
    },
    sectionCard: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
    rowIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    rowMid: { flex: 1 },
    rowLabel: { fontSize: 15, color: theme.text, fontWeight: '500' },
    rowSub: { fontSize: 11, marginTop: 1 },
    divider: { height: 1, marginHorizontal: 14 },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    stepBtn: { width: 30, height: 30, borderWidth: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    stepText: { fontSize: 18, fontWeight: '700', lineHeight: 22 },
    stepVal: { fontSize: 15, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  });
}
