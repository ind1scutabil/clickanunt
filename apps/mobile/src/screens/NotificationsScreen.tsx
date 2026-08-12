import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
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
  const [error, setError] = useState<string | null>(null);
  const [markAllBusy, setMarkAllBusy] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      setItems(await notificationsApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nu am putut încărca notificările.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useLiveSync(load, { intervalMs: 10000 });

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <View style={styles.container}>
      <View style={[styles.headerBlock, { paddingTop: Math.max(8, insets.top + 4) }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Notificări</Text>
            <Text style={styles.headerSubtitle}>Aceleași notificări ca pe website</Text>
          </View>
          {unreadCount > 0 ? (
            <Pressable
              style={styles.markAllBtn}
              disabled={markAllBusy}
              onPress={() => {
                void (async () => {
                  setMarkAllBusy(true);
                  try {
                    await notificationsApi.markAllRead();
                    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Nu am putut marca notificările.');
                  } finally {
                    setMarkAllBusy(false);
                  }
                })();
              }}
            >
              <Text style={styles.markAllText}>{markAllBusy ? '…' : 'Marchează citite'}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => void load()}>
            <Text style={styles.retry}>Reîncearcă</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, !item.isRead && styles.unreadCard]}
            onPress={() => {
              if (item.isRead) return;
              setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
              void notificationsApi.markRead(item.id).catch(() => {
                void load();
              });
            }}
          >
            <View style={styles.topRow}>
              <Text style={styles.title}>{item.title || 'Notificare'}</Text>
              {!item.isRead ? <View style={styles.dot} /> : null}
            </View>
            <Text style={styles.subtitle} numberOfLines={2}>
              {item.message || 'Ai o notificare nouă.'}
            </Text>
            <Text style={styles.dateText}>{formatRelativeDate(item.createdAt)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={!refreshing && !error ? <Text style={styles.empty}>Nu ai notificări.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  headerBlock: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: THEME.colors.textPrimary },
  headerSubtitle: { color: THEME.colors.accent, fontSize: 12, marginTop: 2, fontWeight: '600' },
  markAllBtn: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
  },
  markAllText: { color: THEME.colors.accent, fontWeight: '700', fontSize: 12 },
  errorRow: {
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  error: { flex: 1, color: THEME.colors.error },
  retry: { color: THEME.colors.accent, fontWeight: '700' },
  content: { padding: 12, gap: 10, paddingBottom: 100 },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 12,
    ...THEME.shadow.card,
  },
  unreadCard: {
    borderColor: 'rgba(255, 90, 0, 0.35)',
    backgroundColor: 'rgba(255, 90, 0, 0.06)',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: THEME.colors.primary },
  title: { fontWeight: '700', color: THEME.colors.textPrimary },
  subtitle: { color: THEME.colors.textSecondary, marginTop: 4 },
  dateText: { color: THEME.colors.textMuted, marginTop: 8, fontSize: 11 },
  empty: { textAlign: 'center', marginTop: 30, color: THEME.colors.textMuted },
});
