import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { THEME } from '../theme';

type Props = {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  /** When true, first row clears the selection (filters / optional fields). */
  allowClear?: boolean;
  onChange: (next: string) => void;
};

/**
 * Searchable single-select used for county / city / make / model
 * (same option lists as web selects from lib/carData).
 */
export function OptionSelect({
  label,
  value,
  options,
  placeholder = 'Selectează',
  disabled,
  allowClear,
  onChange,
}: Props): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        disabled={disabled || (options.length === 0 && !allowClear)}
        onPress={() => {
          setQuery('');
          setOpen(true);
        }}
        accessibilityRole="button"
      >
        <Text style={value ? styles.triggerValue : styles.triggerPlaceholder}>
          {value || placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{label}</Text>
            <TextInput
              style={styles.search}
              placeholder="Caută…"
              placeholderTextColor={THEME.colors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
            {allowClear ? (
              <Pressable
                style={styles.optionRow}
                onPress={() => {
                  onChange('');
                  setOpen(false);
                }}
              >
                <Text style={styles.triggerPlaceholder}>{placeholder}</Text>
              </Pressable>
            ) : null}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.optionRow, item === value && styles.optionRowActive]}
                  onPress={() => {
                    Keyboard.dismiss();
                    onChange(item);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.optionText}>{item}</Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.empty}>Nicio opțiune. Verifică selecția anterioară.</Text>
              }
            />
            <Pressable style={styles.cancelBtn} onPress={() => setOpen(false)}>
              <Text style={styles.cancelText}>Închide</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { color: THEME.colors.textMuted, fontSize: 12, fontWeight: '600' },
  trigger: {
    minHeight: 46,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surfaceAlt,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerDisabled: { opacity: 0.45 },
  triggerValue: { color: THEME.colors.textPrimary, fontWeight: '600', flex: 1 },
  triggerPlaceholder: { color: THEME.colors.textMuted, flex: 1 },
  chevron: { color: THEME.colors.textMuted, marginLeft: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '80%',
    backgroundColor: THEME.colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 14,
    gap: 10,
  },
  modalTitle: { color: THEME.colors.textPrimary, fontWeight: '800', fontSize: 16 },
  search: {
    height: 44,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 12,
    color: THEME.colors.textPrimary,
    backgroundColor: THEME.colors.surfaceAlt,
  },
  optionRow: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.border,
  },
  optionRowActive: { backgroundColor: 'rgba(255, 90, 0, 0.12)' },
  optionText: { color: THEME.colors.textPrimary, fontSize: 15 },
  empty: { color: THEME.colors.textMuted, textAlign: 'center', marginTop: 24 },
  cancelBtn: {
    height: 44,
    borderRadius: THEME.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  cancelText: { color: THEME.colors.textSecondary, fontWeight: '700' },
});
