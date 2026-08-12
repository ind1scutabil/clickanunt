import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToListingDetails(listingId: string): boolean {
  if (!navigationRef.isReady()) {
    return false;
  }
  navigationRef.navigate('ListingDetails', { listingId });
  return true;
}
