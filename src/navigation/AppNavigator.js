// src/navigation/AppNavigator.js — Phase 3
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../themes/ThemeContext';

import HomeScreen           from '../screens/HomeScreen';
import ComposeScreen        from '../screens/ComposeScreen';
import PostScreen           from '../screens/PostScreen';
import SettingsScreen       from '../screens/SettingsScreen';
import StatsScreen          from '../screens/StatsScreen';
import ThemesScreen         from '../screens/ThemesScreen';
import ArchiveScreen        from '../screens/ArchiveScreen';
import ThemeCustomizeScreen from '../screens/ThemeCustomizeScreen';
import BackupScreen         from '../screens/BackupScreen';
import ShareScreen          from '../screens/ShareScreen';
import PublishScreen        from '../screens/PublishScreen';
import DriveBackupScreen    from '../screens/DriveBackupScreen';
import RemindersScreen      from '../screens/RemindersScreen';
import ManageCategoriesScreen from '../screens/ManageCategoriesScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function TabNavigator() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.headerBg,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor:   theme.accent,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Feed:     focused ? 'newspaper'    : 'newspaper-outline',
            Archive:  focused ? 'calendar'     : 'calendar-outline',
            Stats:    focused ? 'bar-chart'    : 'bar-chart-outline',
            Settings: focused ? 'settings'     : 'settings-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Feed"     component={HomeScreen} />
      <Tab.Screen name="Archive"  component={ArchiveScreen} />
      <Tab.Screen name="Stats"    component={StatsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="Main"           component={TabNavigator} />
        <Stack.Screen name="Compose"        component={ComposeScreen}        options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Post"           component={PostScreen} />
        <Stack.Screen name="Share"          component={ShareScreen}          options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Publish"        component={PublishScreen}        options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Themes"         component={ThemesScreen} />
        <Stack.Screen name="ThemeCustomize" component={ThemeCustomizeScreen} />
        <Stack.Screen name="Backup"         component={BackupScreen} />
        <Stack.Screen name="DriveBackup"    component={DriveBackupScreen} />
        <Stack.Screen name="Reminders"      component={RemindersScreen} />
        <Stack.Screen name="ManageCategories" component={ManageCategoriesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
