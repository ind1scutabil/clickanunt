import React from 'react';
import { StyleSheet, Text, TextInput, View, Pressable, Switch } from 'react-native';
import type { AttributeFieldDefContract } from '@clickanunt/api-contracts';
import { THEME } from '../theme';

type Props = {
  defs: AttributeFieldDefContract[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  errors?: Record<string, string>;
};

export function AttributeFields({ defs, values, onChange, errors }: Props): React.JSX.Element | null {
  if (!defs.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Detalii categorie</Text>
      {defs.map((def) => {
        const err = errors?.[def.key];
        const label = `${def.label}${def.required ? ' *' : ''}${def.unit ? ` (${def.unit})` : ''}`;
        if (def.type === 'boolean') {
          return (
            <View key={def.key} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Switch
                value={Boolean(values[def.key])}
                onValueChange={(v) => onChange(def.key, v || undefined)}
              />
              {err ? <Text style={styles.error}>{err}</Text> : null}
            </View>
          );
        }
        if (def.type === 'select' && def.options?.length) {
          return (
            <View key={def.key} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <View style={styles.chipRow}>
                {def.options.map((opt) => {
                  const active = values[def.key] === opt;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => onChange(def.key, active ? undefined : opt)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {err ? <Text style={styles.error}>{err}</Text> : null}
            </View>
          );
        }
        if (def.type === 'multiselect' && def.options?.length) {
          const selected = Array.isArray(values[def.key])
            ? (values[def.key] as string[])
            : [];
          return (
            <View key={def.key} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <View style={styles.chipRow}>
                {def.options.map((opt) => {
                  const active = selected.includes(opt);
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => {
                        const next = active
                          ? selected.filter((x) => x !== opt)
                          : [...selected, opt];
                        onChange(def.key, next.length ? next : undefined);
                      }}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {err ? <Text style={styles.error}>{err}</Text> : null}
            </View>
          );
        }
        const keyboard =
          def.type === 'number' || def.type === 'year' || def.type === 'range'
            ? 'numeric'
            : 'default';
        return (
          <View key={def.key} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={styles.input}
              placeholder={def.placeholder || def.label}
              placeholderTextColor={THEME.colors.textMuted}
              keyboardType={keyboard}
              value={
                values[def.key] === undefined || values[def.key] === null
                  ? ''
                  : String(values[def.key])
              }
              onChangeText={(text) => {
                if (!text) {
                  onChange(def.key, undefined);
                  return;
                }
                if (def.type === 'number' || def.type === 'year' || def.type === 'range') {
                  const n = Number(text);
                  onChange(def.key, Number.isFinite(n) ? n : text);
                } else {
                  onChange(def.key, text);
                }
              }}
            />
            {err ? <Text style={styles.error}>{err}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginTop: 4 },
  heading: { color: THEME.colors.textPrimary, fontSize: 14, fontWeight: '700' },
  row: { gap: 6 },
  label: { color: THEME.colors.textMuted, fontSize: 12, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: THEME.colors.textPrimary,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
  },
  chipText: { color: THEME.colors.textPrimary, fontSize: 12 },
  chipTextActive: { color: THEME.colors.primary, fontWeight: '700' },
  error: { color: '#fecaca', fontSize: 11 },
});
