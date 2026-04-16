// src/services/notifications.js
// Phase 5: Writing reminders via expo-notifications

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { setSetting, getSetting } from '../storage/db';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// ── PERMISSIONS ────────────────────────────────────────────

export async function requestNotificationPermission() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ── REMINDER MESSAGES ─────────────────────────────────────

const REMINDER_MESSAGES = [
  { title: '✍️ Chronicle awaits', body: 'What will you write today?' },
  { title: '📰 Today\'s edition', body: 'Your readers are waiting. (Just you, but still.)' },
  { title: '🖊️ The page is blank', body: 'A blank page is full of possibilities.' },
  { title: '📝 Daily dispatch', body: 'Time to write your Chronicle entry for today.' },
  { title: '🗞️ Breaking news', body: 'The most important story is the one you write today.' },
  { title: '✨ Keep the streak alive', body: 'You\'ve been writing every day. Don\'t stop now!' },
  { title: '📖 Story time', body: 'Your future self will thank you for writing this down.' },
  { title: '🌟 Chronicle reminder', body: 'Great writers write every day. You\'re a great writer.' },
];

function getRandomMessage() {
  return REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];
}

// ── SCHEDULE REMINDER ─────────────────────────────────────

export async function scheduleDailyReminder(hour, minute) {
  const granted = await requestNotificationPermission();
  if (!granted) {
    throw new Error('Notification permission denied. Enable it in your device Settings to use writing reminders.');
  }

  // Cancel any existing Chronicle reminders
  await cancelAllReminders();

  // Schedule repeating daily notification
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '✍️ Chronicle awaits',
      body: 'Your daily writing reminder.',
      data: { type: 'writing_reminder' },
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    },
  });

  await setSetting('reminder_enabled', 'true');
  await setSetting('reminder_hour', String(hour));
  await setSetting('reminder_minute', String(minute));
  await setSetting('reminder_id', id);

  return id;
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await setSetting('reminder_enabled', 'false');
  await setSetting('reminder_id', '');
}

export async function getReminderSettings() {
  const [enabled, hour, minute] = await Promise.all([
    getSetting('reminder_enabled'),
    getSetting('reminder_hour'),
    getSetting('reminder_minute'),
  ]);
  return {
    enabled: enabled === 'true',
    hour: parseInt(hour) || 9,
    minute: parseInt(minute) || 0,
  };
}

// ── STREAK NOTIFICATION ───────────────────────────────────

export async function sendStreakNotification(streak) {
  if (streak < 3) return; // only celebrate meaningful streaks
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔥 ${streak}-day streak!`,
      body: `You've written for ${streak} days in a row. Amazing!`,
      data: { type: 'streak' },
    },
    trigger: null, // immediate
  });
}
