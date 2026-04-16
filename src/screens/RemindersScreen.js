// src/screens/RemindersScreen.js — Phase 5
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Switch, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../themes/ThemeContext';
import {
  scheduleDailyReminder,
  cancelAllReminders,
  getReminderSettings,
  requestNotificationPermission,
} from '../services/notifications';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 10, 15, 20 ,30, 45];

function fmt12(hour, minute) {
  const period = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const m = String(minute).padStart(2, '0');
  return `${h}:${m} ${period}`;
}

const QUICK_TIMES = [
  { label: 'Morning',   emoji: '🌅', hour: 8,  minute: 0 },
  { label: 'Midday',    emoji: '☀️', hour: 12, minute: 0 },
  { label: 'Afternoon', emoji: '🌤️', hour: 15, minute: 0 },
  { label: 'Evening',   emoji: '🌆', hour: 19, minute: 0 },
  { label: 'Night',     emoji: '🌙', hour: 21, minute: 0 },
];

export default function RemindersScreen({ navigation }) {
  const { theme } = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getReminderSettings().then(s => {
      setEnabled(s.enabled);
      setHour(s.hour);
      setMinute(s.minute);
    });
  }, []);

  const handleToggle = async (value) => {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Permission needed',
          'Please enable notifications for Chronicle in your device Settings.',
        );
        return;
      }
      setSaving(true);
      try {
        await scheduleDailyReminder(hour, minute);
        setEnabled(true);
      } catch (e) {
        Alert.alert('Error', e.message);
      } finally {
        setSaving(false);
      }
    } else {
      await cancelAllReminders();
      setEnabled(false);
    }
  };

  const handleQuickTime = async (h, m) => {
    setHour(h);
    setMinute(m);
    if (enabled) {
      setSaving(true);
      try {
        await scheduleDailyReminder(h, m);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSaveTime = async () => {
    setSaving(true);
    try {
      await scheduleDailyReminder(hour, minute);
      setEnabled(true);
      Alert.alert('Reminder set!', `You'll be reminded to write daily at ${fmt12(hour, minute)}.`);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
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
        <Text style={s.headerTitle}>Writing Reminders</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 50 }}>

        {/* Main toggle */}
        <View style={[s.toggleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[s.toggleIcon, { backgroundColor: theme.accent + '20' }]}>
            <Ionicons name="notifications-outline" size={24} color={theme.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.toggleTitle, { color: theme.text }]}>Daily reminder</Text>
            <Text style={[s.toggleSub, { color: theme.textSecondary }]}>
              {enabled ? `Reminds you at ${fmt12(hour, minute)} every day` : 'Get nudged to write every day'}
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={handleToggle}
            trackColor={{ true: theme.accent }}
            thumbColor="#fff"
            disabled={saving}
          />
        </View>

        {/* Quick time presets */}
        <Text style={s.sectionTitle}>Quick Select</Text>
        <View style={s.quickRow}>
          {QUICK_TIMES.map(qt => {
            const active = hour === qt.hour && minute === qt.minute;
            return (
              <TouchableOpacity
                key={qt.label}
                style={[s.quickChip, { borderColor: active ? theme.accent : theme.border, backgroundColor: active ? theme.accent + '20' : theme.surface }]}
                onPress={() => handleQuickTime(qt.hour, qt.minute)}
                activeOpacity={0.75}
              >
                <Text style={s.quickEmoji}>{qt.emoji}</Text>
                <Text style={[s.quickLabel, { color: active ? theme.accent : theme.text }]}>{qt.label}</Text>
                <Text style={[s.quickTime, { color: active ? theme.accent : theme.textSecondary }]}>
                  {fmt12(qt.hour, qt.minute)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom time picker */}
        <Text style={s.sectionTitle}>Custom Time</Text>
        <View style={[s.timeCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[s.timeDisplay, { color: theme.text }]}>{fmt12(hour, minute)}</Text>

          <Text style={[s.pickerLabel, { color: theme.textSecondary }]}>Hour</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pickerRow}>
            {HOURS.map(h => (
              <TouchableOpacity
                key={h}
                style={[s.pickerItem, { borderColor: hour === h ? theme.accent : theme.border, backgroundColor: hour === h ? theme.accent : theme.surface }]}
                onPress={() => setHour(h)}
              >
                <Text style={[s.pickerText, { color: hour === h ? theme.accentText : theme.text }]}>
                  {String(h).padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[s.pickerLabel, { color: theme.textSecondary }]}>Minute</Text>
          <View style={s.minuteRow}>
            {MINUTES.map(m => (
              <TouchableOpacity
                key={m}
                style={[s.minuteItem, { borderColor: minute === m ? theme.accent : theme.border, backgroundColor: minute === m ? theme.accent : theme.surface }]}
                onPress={() => setMinute(m)}
              >
                <Text style={[s.pickerText, { color: minute === m ? theme.accentText : theme.text }]}>
                  :{String(m).padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[s.saveBtn, { backgroundColor: theme.accent }]}
            onPress={handleSaveTime}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Ionicons name={saving ? 'sync-outline' : 'alarm-outline'} size={18} color={theme.accentText} />
            <Text style={[s.saveBtnText, { color: theme.accentText }]}>
              {saving ? 'Saving…' : `Set reminder for ${fmt12(hour, minute)}`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tip */}
        <View style={[s.tipBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={s.tipEmoji}>💡</Text>
          <Text style={[s.tipText, { color: theme.textSecondary }]}>
            Consistent writers pick a time that fits their routine — morning pages, a lunch break note, or a nightly journal. Even 5 minutes a day builds a habit!
          </Text>
        </View>

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
    headerTitle: { fontSize: 17, fontWeight: '900', color: theme.headerText, fontFamily: 'serif' },
    toggleCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 22,
    },
    toggleIcon: { width: 44, height: 44, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    toggleTitle: { fontSize: 16, fontWeight: '700' },
    toggleSub: { fontSize: 12, marginTop: 2 },
    sectionTitle: {
      fontSize: 10, fontWeight: '800', letterSpacing: 1.5,
      textTransform: 'uppercase', color: theme.textSecondary,
      marginBottom: 10,
    },
    quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
    quickChip: {
      flex: 1, minWidth: '28%', borderWidth: 1, borderRadius: 20,
      padding: 10, alignItems: 'center',
    },
    quickEmoji: { fontSize: 20, marginBottom: 4 },
    quickLabel: { fontSize: 11, fontWeight: '800' },
    quickTime: { fontSize: 10, marginTop: 2 },
    timeCard: {
      borderWidth: 1, borderRadius: 20, padding: 18, marginBottom: 16,
    },
    timeDisplay: {
      fontSize: 36, fontWeight: '900', textAlign: 'center',
      fontFamily: 'serif', marginBottom: 16,
    },
    pickerLabel: {
      fontSize: 9, fontWeight: '800', letterSpacing: 1.5,
      textTransform: 'uppercase', marginBottom: 8,
    },
    pickerRow: { flexDirection: 'row', marginBottom: 14 },
    pickerItem: {
      width: 40, height: 40, borderWidth: 1, borderRadius: 20,
      alignItems: 'center', justifyContent: 'center', marginRight: 5,
    },
    pickerText: { fontSize: 13, fontWeight: '700' },
    minuteRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
    minuteItem: {
      flex: 1, height: 40, borderWidth: 1, borderRadius: 20,
      alignItems: 'center', justifyContent: 'center',
    },
    saveBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, borderRadius: 20, paddingVertical: 13,
    },
    saveBtnText: { fontSize: 14, fontWeight: '700' },
    tipBox: {
      flexDirection: 'row', gap: 10, alignItems: 'flex-start',
      borderWidth: 1, borderRadius: 20, padding: 14,
    },
    tipEmoji: { fontSize: 18 },
    tipText: { flex: 1, fontSize: 13, lineHeight: 20 },
  });
}
