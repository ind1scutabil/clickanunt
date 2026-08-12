import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { listingsApi } from '../api/client';
import { ListingPhotoImage } from '../components/ListingPhotoImage';
import type { RootStackParamList } from '../navigation/types';
import { THEME } from '../theme';
import type { OwnerAdminListingDto } from '../types';

/**
 * Native "Anunțurile mele" — GET /api/listings?userId=me&status=all
 * (same owner feed as dashboard listings on the website).
 */
export function MyListingsScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<OwnerAdminListingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await listingsApi.my();
      setItems(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nu am putut încărca anunțurile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={THEME.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>Anunțurile mele</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={THEME.colors.primary}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Nu ai anunțuri încă. Publică primul din Acasă.</Text>
        }
        contentContainerStyle={{ paddingBottom: 40, gap: 10 }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('ListingDetails', { listingId: item.id })}
          >
            <ListingPhotoImage photo={item.photos?.[0]} variant="thumb" style={styles.thumb} />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.meta}>
                {item.status}
                {item.moderationStatus ? ` · ${item.moderationStatus}` : ''}
              </Text>
              <Pressable
                onPress={() => navigation.navigate('ListingEdit', { listingId: item.id })}
                style={styles.editBtn}
              >
                <Text style={styles.editText}>Editează</Text>
              </Pressable>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background, paddingHorizontal: 14 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
  },
  title: {
    color: THEME.colors.textPrimary,
    fontWeight: '800',
    fontSize: 22,
    marginBottom: 10,
  },
  error: { color: THEME.colors.error, marginBottom: 8 },
  empty: { color: THEME.colors.textMuted, textAlign: 'center', marginTop: 40 },
  card: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.md,
    padding: 10,
  },
  thumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: THEME.colors.surfaceAlt },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { color: THEME.colors.textPrimary, fontWeight: '700' },
  meta: { color: THEME.colors.textMuted, fontSize: 12 },
  editBtn: { alignSelf: 'flex-start', marginTop: 4 },
  editText: { color: THEME.colors.accent, fontWeight: '700', fontSize: 13 },
});
