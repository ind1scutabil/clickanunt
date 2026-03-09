import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { ConversationScreen } from '../screens/ConversationScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ListingDetailsScreen } from '../screens/ListingDetailsScreen';
import { ListingFormScreen } from '../screens/ListingFormScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { THEME } from '../theme';

type RootStackParamList = {
  MainTabs: undefined;
  ListingDetails: { listingId: string };
  ListingCreate: undefined;
  ListingEdit: { listingId: string };
  Conversation: { userId: string; conversationId?: string; listingId?: string; title?: string };
};

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
        backgroundColor: focused ? THEME.colors.surfaceAlt : 'transparent',
        borderWidth: focused ? 1 : 0,
        borderColor: focused ? THEME.colors.border : 'transparent',
        ...THEME.shadow.card,
      }}
    >
      <Ionicons name={name} size={focused ? 20 : 18} color={color} />
    </View>
  );
}

function AccountTab(): React.JSX.Element {
  const { user, logout } = useAuth();
  return (
    <View style={{ flex: 1, backgroundColor: THEME.colors.background, padding: 16, gap: 10 }}>
      <Text style={{ color: THEME.colors.textPrimary, fontSize: 24, fontWeight: '800' }}>Cont</Text>
      <Text style={{ color: THEME.colors.textSecondary }}>{user?.email || 'Utilizator'}</Text>
      <Pressable
        style={{
          marginTop: 12,
          height: 44,
          borderRadius: 10,
          backgroundColor: THEME.colors.primaryStrong,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onPress={() => {
          logout().catch(() => {});
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>Deconectare</Text>
      </Pressable>
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
          backgroundColor: THEME.colors.surface,
          borderTopColor: THEME.colors.border,
          borderTopWidth: 1,
          ...THEME.shadow.card,
        },
        tabBarActiveTintColor: THEME.colors.accent,
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
      <Tabs.Screen
        name="Acasă"
        children={() =>
          <HomeScreen
            onOpenListing={(listingId) => navigation.navigate('ListingDetails', { listingId })}
            onOpenCreateListing={() => navigation.navigate('ListingCreate')}
          />
        }
      />
      <Tabs.Screen name="Favorite" component={FavoritesScreen} />
      <Tabs.Screen
        name="Mesaje"
        children={() =>
          <MessagesScreen
            onOpenConversation={(params) => navigation.navigate('Conversation', params)}
          />
        }
      />
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
            headerStyle: { backgroundColor: THEME.colors.surface },
            headerTintColor: THEME.colors.textPrimary,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: THEME.colors.background },
          }}
        >
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="ListingDetails"
            component={ListingDetailsScreen as any}
            options={{ title: 'Detalii anunț' }}
          />
          <Stack.Screen
            name="ListingCreate"
            children={({ navigation }) => <ListingFormScreen mode="create" onSuccess={() => navigation.goBack()} />}
            options={{ title: 'Publică anunț' }}
          />
          <Stack.Screen
            name="ListingEdit"
            children={({ navigation }) => <ListingFormScreen mode="edit" onSuccess={() => navigation.goBack()} />}
            options={{ title: 'Editează anunț' }}
          />
          <Stack.Screen
            name="Conversation"
            children={({ route }) => (
              <ConversationScreen
                currentUserId={user.id}
                userId={route.params.userId}
                conversationId={route.params.conversationId}
                listingId={route.params.listingId}
              />
            )}
            options={({ route }) => ({ title: route.params.title || 'Conversație' })}
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
