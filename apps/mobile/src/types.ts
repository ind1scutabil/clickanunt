export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

export type User = {
  id: string;
  email: string;
  name?: string | null;
  role?: string;
};

export type Listing = {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  subcategory?: string | null;
  condition?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  mileage?: number | null;
  fuel?: string | null;
  transmission?: string | null;
  vin?: string | null;
  region?: string | null;
  contactPhone?: string | null;
  city?: string | null;
  county?: string | null;
  priceAmount?: number | null;
  priceCurrency?: string | null;
  photos?: string[];
  attributes?: Record<string, unknown> | null;
  views?: number;
  status?: string;
  isPromoted?: boolean;
  isFeatured?: boolean;
  createdAt?: string;
};

export type Conversation = {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string | null;
  listingId?: string;
  listingTitle?: string;
  lastMessage?: string | null;
  unreadCount?: number;
  updatedAt?: string;
};

export type MessageItem = {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
};

export type ListingPayload = {
  title: string;
  description?: string;
  category: string;
  priceAmount: number;
  priceCurrency: 'RON' | 'EUR' | 'USD';
  city?: string;
  county?: string;
  make?: string;
  model?: string;
  year?: number;
  photos: string[];
};

export type NotificationItem = {
  id: string;
  title?: string;
  message?: string;
  isRead: boolean;
  createdAt: string;
};
