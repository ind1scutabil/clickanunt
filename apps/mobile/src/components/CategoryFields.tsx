import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ALL_CATEGORY_LABELS, subcategoriesForCategory } from '../constants/categoryOptions';
import { THEME } from '../theme';

type Props = {
  category: string;
  subcategory: string;
  categoryLabels?: string[];
  /** When true, empty subcategory ("Toate") is not offered — required for create. */
  requireSubcategory?: boolean;
  onCategoryChange: (category: string) => void;
  onSubcategoryChange: (subcategory: string) => void;
};

export function CategoryFields({
  category,
  subcategory,
  categoryLabels,
  requireSubcategory = true,
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
          <Text style={[styles.label, styles.labelSpaced]}>
            Subcategorie{requireSubcategory ? ' *' : ''}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {!requireSubcategory ? (
              <Pressable
                onPress={() => onSubcategoryChange('')}
                style={[styles.chip, !subcategory && styles.chipActive]}
              >
                <Text style={[styles.chipText, !subcategory && styles.chipTextActive]}>Toate</Text>
              </Pressable>
            ) : null}
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
  wrap: { gap: 8 },
  label: { color: THEME.colors.textMuted, fontSize: 13, fontWeight: '600' },
  labelSpaced: { marginTop: 4 },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: {
    maxWidth: 160,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
  },
  chipText: { color: THEME.colors.text, fontSize: 12 },
  chipTextActive: { color: THEME.colors.primary, fontWeight: '700' },
  hint: { color: THEME.colors.textMuted, fontSize: 11, marginTop: 4 },
});
