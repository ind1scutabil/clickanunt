import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  MainTabs: undefined;
  ListingDetails: { listingId: string };
  ListingCreate: undefined;
  ListingEdit: { listingId: string };
  Conversation: { userId: string; conversationId?: string; listingId?: string; title?: string };
};

export type MainTabParamList = {
  Acasă: undefined;
  Favorite: undefined;
  Mesaje: undefined;
  Notificări: undefined;
  Cont: undefined;
};

export type FavoritesScreenNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Favorite'>,
  NativeStackNavigationProp<RootStackParamList>
>;
