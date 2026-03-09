import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { favoritesApi, getLastDataSource } from '../api/client';
import { useLiveSync } from '../hooks/useLiveSync';
import { THEME } from '../theme';
import type { Listing } from '../types';

export function FavoritesScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Listing[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setItems(await favoritesApi.list());
      setOfflineMode(getLastDataSource('favorites.list') === 'cache');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useLiveSync(load, { intervalMs: 15000 });

  return (
    <View style={styles.container}>
      <View style={[styles.headerBlock, { paddingTop: Math.max(8, insets.top + 4) }]}>
        <Text style={styles.headerTitle}>Favorite</Text>
        <Text style={styles.headerSubtitle}>Sincronizare automată</Text>
      </View>

      {offlineMode ? <Text style={styles.offlineHint}>Afișăm ultimele date salvate.</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.city || 'Localitate neprecizată'}</Text>
            <Text style={styles.price}> 
              {item.priceAmount ? `${item.priceAmount.toLocaleString('ro-RO')} ${item.priceCurrency || 'RON'}` : 'Preț la cerere'}
            </Text>
          </View>
        )}
        ListEmptyComponent={!refreshing ? <Text style={styles.empty}>Nu ai favorite încă.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  headerBlock: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: THEME.colors.textPrimary },
  headerSubtitle: { color: THEME.colors.accent, fontSize: 12, marginTop: 2, fontWeight: '600' },
  offlineHint: { color: THEME.colors.warning, paddingHorizontal: 12, paddingBottom: 6, fontWeight: '600' },
  content: { padding: 12, gap: 10 },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 12,
    ...THEME.shadow.card,
  },
  title: { fontWeight: '700', color: THEME.colors.textPrimary },
  subtitle: { color: THEME.colors.textSecondary, marginTop: 4 },
  price: { color: THEME.colors.accent, fontWeight: '800', marginTop: 8 },
  empty: { textAlign: 'center', marginTop: 30, color: THEME.colors.textMuted },
});