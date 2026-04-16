// src/components/FormatToolbar.js
import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../themes/ThemeContext';

const TABS = ['Format', 'Insert', 'Style'];

export default function FormatToolbar({ onAction }) {
  const { theme } = useTheme();
  const [tab, setTab] = useState('Format');

  const s = makeStyles(theme);

  const Btn = ({ icon, label, action, isIcon = true }) => (
    <TouchableOpacity
      style={[s.btn, { borderColor: theme.border, backgroundColor: theme.surface }]}
      onPress={() => onAction(action)}
      activeOpacity={0.7}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      {isIcon ? (
        <Ionicons name={icon} size={18} color={theme.text} />
      ) : (
        <Text style={[s.btnLabel, { color: theme.text }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[s.wrap, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      {/* Tab row */}
      <View style={[s.tabRow, { borderBottomColor: theme.border }]}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t}
            style={[
              s.tab,
              tab === t && {
                borderBottomColor: theme.accent,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setTab(t)}
            activeOpacity={0.8}
          >
            <Text style={[s.tabText, { color: tab === t ? theme.accent : theme.textSecondary }]}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={s.row}
      >
        {tab === 'Format' && (
          <>
            <Btn isIcon={false} label="B" action="bold" />
            <Btn isIcon={false} label="I" action="italic" />
            <Btn isIcon={false} label="U̲" action="underline" />
            <Btn icon="code-slash-outline" action="code" />
            <Btn isIcon={false} label="H1" action="h1" />
            <Btn isIcon={false} label="H2" action="h2" />
            <Btn isIcon={false} label="H3" action="h3" />
            <Btn icon="remove-outline" action="hr" />
          </>
        )}

        {tab === 'Insert' && (
          <>
            <Btn isIcon={false} label="•" action="bullet" />
            <Btn isIcon={false} label="1." action="numbered" />
            <Btn isIcon={false} label="☑" action="checklist" />
            <Btn isIcon={false} label="❝" action="blockquote" />
            <Btn isIcon={false} label="{ }" action="codeblock" />
            <Btn icon="image-outline" action="image" />
            {/* <Btn icon="mic-outline" action="voice" /> */}
          </>
        )}

        {tab === 'Style' && (
          <>
            <Btn isIcon={false} label="¶" action="paragraph" />
            <Btn icon="arrow-undo-outline" action="undo" />
            <Btn icon="arrow-redo-outline" action="redo" />
            <Btn icon="cut-outline" action="clear" />
            <Btn icon="eye-outline" action="preview" />
            <Btn icon="expand-outline" action="fullscreen" />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    wrap: {
      borderTopWidth: 1,
      paddingBottom: Platform.OS === 'android' ? 2 : 0,
    },
    tabRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 6,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    row: {
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      alignItems: 'center',
    },
    btn: {
      width: 38,
      height: 38,
      borderWidth: 1,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnLabel: {
      fontSize: 13,
      fontWeight: '800',
    },
  });
}