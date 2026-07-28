import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useCallback } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { MOBILE_CONFIG } from '../config';
import { ConversationScreen } from '../screens/ConversationScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ListingDetailsScreen } from '../screens/ListingDetailsScreen';
import { ListingFormScreen } from '../screens/ListingFormScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { THEME } from '../theme';
import type { RootStackParamList } from '../navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Acasă: 'home',
  Favorite: 'heart',
  Mesaje: 'chatbubbles',
  Notificări: 'notifications',
  Cont: 'person',
};

function TabIcon({ name, focused, color }: { name: keyof typeof Ionicons.glyphMap; focused: boolean; color: string }) {
  return (
    <View
      style={{
        width: focused ? 42 : 34,
        height: focused ? 34 : 30,
        borderRadius: THEME.radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? 'rgba(255, 90, 0, 0.10)' : 'transparent',
        borderWidth: focused ? 1 : 0,
        borderColor: focused ? 'rgba(255, 90, 0, 0.28)' : 'transparent',
        ...(focused ? THEME.shadow.card : {}),
      }}
    >
      <Ionicons name={name} size={focused ? 20 : 18} color={color} />
    </View>
  );
}

function openSitePath(path: string): void {
  const base = MOBILE_CONFIG.siteUrl;
  const p = path.startsWith('/') ? path : `/${path}`;
  void Linking.openURL(`${base}${p}`);
}

function AccountTab(): React.JSX.Element {
  const { user, logout, resendVerification } = useAuth();
  const roleNorm = (user?.role ?? '').trim().toLowerCase();
  const isAdmin = roleNorm === 'admin' || roleNorm === 'owner';

  const badgeLabel = !user
    ? '—'
    : isAdmin
      ? 'ADMIN'
      : user.name
        ? user.name
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 3)
        : (user.email?.slice(0, 2).toUpperCase() ?? 'U');

  const openSite = useCallback((path: string) => {
    openSitePath(path);
  }, []);

  const menuRow = (icon: keyof typeof Ionicons.glyphMap, label: string, path: string) => (
    <Pressable
      onPress={() => openSite(path)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: THEME.radius.md,
        borderWidth: 1,
        borderColor: THEME.colors.border,
        backgroundColor: pressed ? 'rgba(255, 255, 255, 0.06)' : THEME.colors.surface,
        marginBottom: 8,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: THEME.radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(24, 24, 27, 0.9)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.08)',
        }}
      >
        <Ionicons name={icon} size={20} color={THEME.colors.accent} />
      </View>
      <Text style={{ flex: 1, color: THEME.colors.textPrimary, fontSize: 15, fontWeight: '600' }}>{label}</Text>
      <Ionicons name="open-outline" size={18} color={THEME.colors.textMuted} />
    </Pressable>
  );

  const adminRow = (icon: keyof typeof Ionicons.glyphMap, label: string, path: string) => (
    <Pressable
      onPress={() => openSite(path)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: THEME.radius.md,
        borderWidth: 1,
        borderColor: 'rgba(167, 139, 250, 0.35)',
        backgroundColor: pressed ? 'rgba(139, 92, 246, 0.12)' : 'rgba(76, 29, 149, 0.35)',
        marginBottom: 8,
      })}
    >
      <Ionicons name={icon} size={20} color={THEME.colors.adminText} />
      <Text style={{ flex: 1, color: THEME.colors.adminText, fontSize: 14, fontWeight: '600' }}>{label}</Text>
      <Ionicons name="open-outline" size={18} color={THEME.colors.textMuted} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: THEME.colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ color: THEME.colors.textPrimary, fontSize: 26, fontWeight: '800', marginBottom: 4 }}>Cont</Text>
        <Text style={{ color: THEME.colors.textMuted, fontSize: 12, marginBottom: 16 }}>
          Aceleași rute ca pe site — se deschid în browser.
        </Text>

        {user && user.emailVerified === false ? (
          <View
            style={{
              marginBottom: 16,
              borderRadius: THEME.radius.md,
              borderWidth: 1,
              borderColor: 'rgba(245, 158, 11, 0.45)',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              padding: 14,
              gap: 10,
            }}
          >
            <Text style={{ color: THEME.colors.textPrimary, fontWeight: '700' }}>
              Email neverificat
            </Text>
            <Text style={{ color: THEME.colors.textMuted, fontSize: 13 }}>
              Poți folosi aplicația fără verificare. Confirmă emailul pentru mai multă încredere.
            </Text>
            <Pressable
              onPress={() => {
                void resendVerification()
                  .then((r) => {
                    Alert.alert('Verificare email', r.message || 'Cerere trimisă.');
                  })
                  .catch(() => {
                    openSite('/auth/verify-email');
                  });
              }}
              style={{
                alignSelf: 'flex-start',
                backgroundColor: THEME.colors.accent,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: THEME.radius.sm,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Retrimite verificare</Text>
            </Pressable>
            <Pressable onPress={() => openSite('/auth/verify-email')}>
              <Text style={{ color: THEME.colors.accent, fontWeight: '600' }}>
                Deschide pagina web
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View
          style={{
            borderRadius: THEME.radius.lg,
            borderWidth: 1,
            borderColor: THEME.colors.border,
            backgroundColor: THEME.colors.surface,
            padding: 16,
            marginBottom: 20,
            ...THEME.shadow.card,
          }}
        >
          <Text style={{ color: THEME.colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.2 }}>
            STARE SESIUNE
          </Text>
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 6 }}>
            {user?.email ?? '—'}
          </Text>
          <View
            style={{
              alignSelf: 'flex-start',
              marginTop: 10,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: THEME.radius.pill,
              borderWidth: 1,
              borderColor: isAdmin ? 'rgba(167, 139, 250, 0.45)' : 'rgba(52, 211, 153, 0.45)',
              backgroundColor: isAdmin ? 'rgba(76, 29, 149, 0.45)' : 'rgba(6, 78, 59, 0.45)',
            }}
          >
            <Text style={{ color: isAdmin ? THEME.colors.adminText : '#a7f3d0', fontSize: 11, fontWeight: '800' }}>
              {badgeLabel}
            </Text>
          </View>
        </View>

        <Text style={{ color: THEME.colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 }}>
          CONT (SITE)
        </Text>
        {menuRow('home-outline', 'Pagina principală', '/')}
        {menuRow('person-circle-outline', 'Contul meu', '/dashboard')}
        {menuRow('document-text-outline', 'Anunțurile mele', '/dashboard/listings')}
        {menuRow('settings-outline', 'Setări', '/dashboard/settings')}

        {isAdmin ? (
          <>
            <Text
              style={{
                color: THEME.colors.adminText,
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 1.2,
                marginTop: 12,
                marginBottom: 8,
              }}
            >
              ADMINISTRARE (SITE)
            </Text>
            {adminRow('speedometer-outline', 'Admin — Dashboard', '/admin/dashboard')}
            {adminRow('pricetag-outline', 'Admin — Promoții', '/admin/promotions')}
            {adminRow('receipt-outline', 'Admin — Facturi', '/admin/invoices')}
            {adminRow('shield-checkmark-outline', 'Admin — Moderare', '/admin/moderation')}
          </>
        ) : null}

        <Pressable
          style={({ pressed }) => ({
            marginTop: 20,
            height: 48,
            borderRadius: THEME.radius.md,
            borderWidth: 1,
            borderColor: 'rgba(248, 113, 113, 0.35)',
            backgroundColor: pressed ? 'rgba(127, 29, 29, 0.45)' : 'rgba(69, 10, 10, 0.35)',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
          })}
          onPress={() => {
            logout().catch(() => {});
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#fecaca" />
          <Text style={{ color: '#fecaca', fontWeight: '700', fontSize: 15 }}>Deconectare</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function MainTabs({ navigation }: { navigation: any }): React.JSX.Element {
  return (
    <Tabs.Navigator id="main-tabs"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          left: 10,
          right: 10,
          bottom: 10,
          height: 76,
          paddingTop: 10,
          paddingBottom: 6,
          borderRadius: THEME.radius.lg,
          backgroundColor: 'rgba(9, 9, 11, 0.92)',
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: THEME.colors.border,
          ...THEME.shadow.card,
        },
        tabBarActiveTintColor: THEME.colors.primary,
        tabBarInactiveTintColor: THEME.colors.textMuted,
        tabBarLabelStyle: {
          fontWeight: '700',
          fontSize: 10,
          marginBottom: 4,
        },
        tabBarItemStyle: {
          borderRadius: THEME.radius.md,
          marginHorizontal: 2,
        },
        tabBarIcon: ({ focused, color }) => <TabIcon name={TAB_ICONS[route.name] || 'ellipse'} focused={focused} color={color} />,
      })}
    >
      <Tabs.Screen name="Acasă">
        {() => (
          <HomeScreen
            onOpenListing={(listingId) => navigation.navigate('ListingDetails', { listingId })}
            onOpenCreateListing={() => navigation.navigate('ListingCreate')}
          />
        )}
      </Tabs.Screen>
      <Tabs.Screen name="Favorite" component={FavoritesScreen} />
      <Tabs.Screen name="Mesaje">
        {() => (
          <MessagesScreen
            onOpenConversation={(params) => navigation.navigate('Conversation', params)}
          />
        )}
      </Tabs.Screen>
      <Tabs.Screen name="Notificări" component={NotificationsScreen} />
      <Tabs.Screen name="Cont" component={AccountTab} />
    </Tabs.Navigator>
  );
}

export function AppNavigator(): React.JSX.Element {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.colors.background }}>
        <ActivityIndicator size="large" color={THEME.colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: THEME.colors.primary,
          background: THEME.colors.background,
          card: THEME.colors.surface,
          text: THEME.colors.textPrimary,
          border: THEME.colors.border,
          notification: THEME.colors.accent,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '600' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '800' },
        },
      }}
    >
      {!user ? (
        <Stack.Navigator id="auth-stack"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: THEME.colors.background },
          }}
        >
          <Stack.Screen name="MainTabs" component={LoginScreen as any} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator id="app-stack"
          screenOptions={{
            headerStyle: {
              backgroundColor: 'rgba(24, 24, 27, 0.96)',
            },
            headerTintColor: THEME.colors.textPrimary,
            headerTitleStyle: { fontWeight: '700' },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: THEME.colors.background },
          }}
        >
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="ListingDetails"
            component={ListingDetailsScreen as any}
            options={{ title: 'Detalii anunț' }}
          />
          <Stack.Screen name="ListingCreate" options={{ title: 'Publică anunț' }}>
            {({ navigation }) => <ListingFormScreen mode="create" onSuccess={() => navigation.goBack()} />}
          </Stack.Screen>
          <Stack.Screen name="ListingEdit" options={{ title: 'Editează anunț' }}>
            {({ navigation, route }) => (
              <ListingFormScreen
                mode="edit"
                listingId={route.params.listingId}
                onSuccess={() => navigation.goBack()}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Conversation" options={({ route }) => ({ title: route.params.title || 'Conversație' })}>
            {({ route }) => (
              <ConversationScreen
                currentUserId={user.id}
                userId={route.params.userId}
                conversationId={route.params.conversationId}
                listingId={route.params.listingId}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
