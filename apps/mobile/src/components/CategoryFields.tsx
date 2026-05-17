import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ALL_CATEGORY_LABELS, subcategoriesForCategory } from '../constants/categoryOptions';
import { THEME } from '../theme';

type Props = {
  category: string;
  subcategory: string;
  categoryLabels?: string[];
  onCategoryChange: (category: string) => void;
  onSubcategoryChange: (subcategory: string) => void;
};

export function CategoryFields({
  category,
  subcategory,
  categoryLabels,
  onCategoryChange,
  onSubcategoryChange,
}: Props): React.JSX.Element {
  const labels = categoryLabels?.length ? categoryLabels : ALL_CATEGORY_LABELS;
  const subs = subcategoriesForCategory(category);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Categorie</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {labels.map((label) => {
          const active = category === label;
          return (
            <Pressable
              key={label}
              onPress={() => {
                onCategoryChange(label);
                onSubcategoryChange('');
              }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={2}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {subs.length > 0 ? (
        <>
          <Text style={[styles.label, styles.labelSpaced]}>Subcategorie</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Pressable
              onPress={() => onSubcategoryChange('')}
              style={[styles.chip, !subcategory && styles.chipActive]}
            >
              <Text style={[styles.chipText, !subcategory && styles.chipTextActive]}>Toate</Text>
            </Pressable>
            {subs.map((sub) => {
              const active = subcategory === sub;
              return (
                <Pressable
                  key={sub}
                  onPress={() => onSubcategoryChange(sub)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={2}>
                    {sub}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {subcategory && !subs.includes(subcategory) ? (
            <Text style={styles.hint}>Subcategorie curentă (păstrată): {subcategory}</Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: THEME.colors.textPrimary },
  labelSpaced: { marginTop: 4 },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: {
    maxWidth: 220,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
  },
  chipActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(255, 90, 0, 0.12)',
  },
  chipText: { fontSize: 12, fontWeight: '600', color: THEME.colors.textMuted },
  chipTextActive: { color: THEME.colors.primary },
  hint: { fontSize: 11, color: THEME.colors.textMuted },
});
