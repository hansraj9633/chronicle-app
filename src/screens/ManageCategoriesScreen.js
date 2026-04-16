import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../themes/ThemeContext';
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from '../storage/db';

export default function ManageCategoriesScreen({ navigation }) {
  const { theme } = useTheme();
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    const items = await getCategories();
    setCategories(items);
    if (editingId && !items.some(item => item.id === editingId)) {
      setEditingId(null);
      setEditingName('');
    }
  }, [editingId]);

  useFocusEffect(useCallback(() => {
    loadCategories();
  }, [loadCategories]));

  const handleAdd = async () => {
    setSaving(true);
    try {
      await addCategory(newCategory);
      setNewCategory('');
      await loadCategories();
    } catch (error) {
      Alert.alert('Could not add category', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (id) => {
    setSaving(true);
    try {
      await updateCategory(id, editingName);
      setEditingId(null);
      setEditingName('');
      await loadCategories();
    } catch (error) {
      Alert.alert('Could not update category', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Delete category?',
      `Posts already using "${item.name}" will keep that label, but it will no longer appear in category pickers.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await deleteCategory(item.id);
              await loadCategories();
            } catch (error) {
              Alert.alert('Could not delete category', error.message);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditingName(item.name);
  };

  const s = makeStyles(theme);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.headerBg} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.headerText} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Manage Categories</Text>
        <View style={s.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={[s.introCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={s.introLabel}>Appearance</Text>
          <Text style={s.introText}>
            Add, rename, or retire the sections that shape your Chronicle.
          </Text>
        </View>

        <View style={[s.addCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={s.sectionTitle}>Add Category</Text>
          <View style={[s.inputWrap, { borderColor: theme.border, backgroundColor: theme.bg }]}>
            <TextInput
              style={s.input}
              placeholder="New category name"
              placeholderTextColor={theme.textSecondary}
              value={newCategory}
              onChangeText={setNewCategory}
              editable={!saving}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: theme.accent }, saving && s.disabled]}
              onPress={handleAdd}
              disabled={saving}
            >
              <Text style={[s.actionBtnText, { color: theme.accentText }]}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[s.listCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={s.sectionTitle}>Saved Categories</Text>
          {categories.map((item, index) => (
            <View key={item.id}>
              {index > 0 && <View style={[s.divider, { backgroundColor: theme.border }]} />}
              <View style={s.row}>
                <View style={[s.dot, { backgroundColor: theme.accent }]} />
                <View style={s.rowMain}>
                  {editingId === item.id ? (
                    <TextInput
                      style={[s.inlineInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
                      value={editingName}
                      onChangeText={setEditingName}
                      autoFocus
                      editable={!saving}
                      returnKeyType="done"
                      onSubmitEditing={() => handleSaveEdit(item.id)}
                    />
                  ) : (
                    <Text style={s.categoryName}>{item.name}</Text>
                  )}
                </View>
                {editingId === item.id ? (
                  <View style={s.actions}>
                    <TouchableOpacity onPress={() => { setEditingId(null); setEditingName(''); }} style={s.iconBtnSmall}>
                      <Ionicons name="close-outline" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleSaveEdit(item.id)} style={s.iconBtnSmall}>
                      <Ionicons name="checkmark-outline" size={20} color={theme.accent} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={s.actions}>
                    <TouchableOpacity onPress={() => startEditing(item)} style={s.iconBtnSmall}>
                      <Ionicons name="create-outline" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item)} style={s.iconBtnSmall}>
                      <Ionicons name="trash-outline" size={18} color="#b45309" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))}
          {categories.length === 0 && (
            <Text style={s.emptyText}>No categories yet. Add one above to begin.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.headerBg,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: theme.rule,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: theme.headerText,
      fontFamily: theme.titleFont === 'monospace' ? 'monospace' : 'serif',
    },
    headerSpacer: { width: 30 },
    iconBtn: { padding: 4 },
    content: { padding: 18, paddingBottom: 40, gap: 16 },
    introCard: {
      borderWidth: 1,
      borderRadius: 20,
      padding: 14,
    },
    introLabel: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: theme.accent,
      marginBottom: 6,
    },
    introText: {
      fontSize: 14,
      lineHeight: 22,
      color: theme.textSecondary,
      fontStyle: 'italic',
    },
    addCard: {
      borderWidth: 1,
      borderRadius: 20,
      padding: 14,
    },
    listCard: {
      borderWidth: 1,
      borderRadius: 20,
      paddingVertical: 8,
    },
    sectionTitle: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: theme.textSecondary,
      marginBottom: 10,
      paddingHorizontal: 14,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 10,
      overflow: 'hidden',
    },
    input: {
      flex: 1,
      minHeight: 46,
      paddingHorizontal: 12,
      color: theme.text,
      fontSize: 15,
    },
    actionBtn: {
      height: 46,
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    actionBtnText: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    disabled: { opacity: 0.6 },
    divider: { height: 1, marginHorizontal: 14 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 10,
    },
    dot: { width: 8, height: 8, borderRadius: 4 },
    rowMain: { flex: 1 },
    categoryName: {
      fontSize: 16,
      color: theme.text,
      fontWeight: '700',
      fontFamily: theme.titleFont === 'monospace' ? 'monospace' : 'serif',
    },
    inlineInput: {
      borderWidth: 1,
      borderRadius: 4,
      minHeight: 40,
      paddingHorizontal: 10,
      fontSize: 15,
    },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    iconBtnSmall: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      paddingHorizontal: 14,
      paddingBottom: 10,
      fontSize: 13,
      color: theme.textSecondary,
      fontStyle: 'italic',
    },
  });
}
