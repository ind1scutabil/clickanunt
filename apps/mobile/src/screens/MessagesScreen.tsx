import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { messagesApi } from '../api/client';
import { useLiveSync } from '../hooks/useLiveSync';
import { THEME } from '../theme';
import type { Conversation } from '../types';

type Props = {
  onOpenConversation: (params: { userId: string; conversationId?: string; listingId?: string; title: string }) => void;
};

export function MessagesScreen({ onOpenConversation }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setItems(await messagesApi.conversations());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useLiveSync(load, { intervalMs: 7000 });

  return (
    <View style={styles.container}>
      <View style={[styles.headerBlock, { paddingTop: Math.max(8, insets.top + 4) }]}>
        <Text style={styles.headerTitle}>Mesaje</Text>
        <Text style={styles.headerSubtitle}>Actualizare automată la 7 secunde</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              onOpenConversation({
                userId: item.participantId ?? '',
                conversationId: item.id,
                listingId: item.listingId,
                title: item.participantName,
              })
            }
          >
            <View style={styles.rowTop}>
              <Text style={styles.title}>{item.participantName || 'Conversație'}</Text>
              {(item.unreadCount || 0) > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.subtitle} numberOfLines={1}>
              {item.lastMessage || 'Fără mesaje recente'}
            </Text>

            {item.listingTitle ? <Text style={styles.listingChip}>Anunț: {item.listingTitle}</Text> : null}
          </Pressable>
        )}
        ListEmptyComponent={!refreshing ? <Text style={styles.empty}>Nu ai conversații.</Text> : null}
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
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontWeight: '700', color: THEME.colors.textPrimary },
  subtitle: { color: THEME.colors.textSecondary, marginTop: 4 },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 11 },
  listingChip: {
    marginTop: 8,
    color: THEME.colors.accent,
    backgroundColor: 'rgba(0,209,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,209,255,0.35)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '600',
  },
  empty: { textAlign: 'center', marginTop: 30, color: THEME.colors.textMuted },
});