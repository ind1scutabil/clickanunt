import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { notificationsApi } from '../api/client';
import { useLiveSync } from '../hooks/useLiveSync';
import { THEME } from '../theme';
import type { NotificationItem } from '../types';

const formatRelativeDate = (iso: string): string => {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'acum';
  if (diffMin < 60) return `${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD} z`; 
};

export function NotificationsScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setItems(await notificationsApi.list());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useLiveSync(load, { intervalMs: 10000 });

  return (
    <View style={styles.container}>
      <View style={[styles.headerBlock, { paddingTop: Math.max(8, insets.top + 4) }]}>
        <Text style={styles.headerTitle}>Notificări</Text>
        <Text style={styles.headerSubtitle}>Actualizare automată la 10 secunde</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <View style={[styles.card, !item.isRead && styles.unreadCard]}>
            <View style={styles.topRow}>
              <Text style={styles.title}>{item.title || 'Notificare'}</Text>
              {!item.isRead ? <View style={styles.dot} /> : null}
            </View>
            <Text style={styles.subtitle} numberOfLines={2}>
              {item.message || 'Ai o notificare nouă.'}
            </Text>
            <Text style={styles.dateText}>{formatRelativeDate(item.createdAt)}</Text>
          </View>
        )}
        ListEmptyComponent={!refreshing ? <Text style={styles.empty}>Nu ai notificări.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  headerBlock: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: THEME.colors.textPrimary },
  headerSubtitle: { color: THEME.colors.accent, fontSize: 12, marginTop: 2, fontWeight: '600' },
  content: { padding: 12, gap: 10 },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 12,
    ...THEME.shadow.card,
  },
  unreadCard: { borderColor: THEME.colors.accent, backgroundColor: '#0F1E32' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: THEME.colors.accent },
  title: { fontWeight: '700', color: THEME.colors.textPrimary },
  subtitle: { color: THEME.colors.textSecondary, marginTop: 4 },
  dateText: { color: THEME.colors.textMuted, marginTop: 8, fontSize: 11 },
  empty: { textAlign: 'center', marginTop: 30, color: THEME.colors.textMuted },
});