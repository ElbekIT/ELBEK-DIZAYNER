
export enum OrderStatus {
  CHECKING = 'Checking',
  CHECKED = 'Checked',
  APPROVED = 'Approved',
  CANCELLED = 'Cancelled'
}

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  firstName: string;
  lastName?: string;
  gender: 'Male' | 'Female';
  phoneNumber: string;
  telegramUsername: string;
  designTypes: string[];
  game: string;
  message: string;
  totalPrice: number;
  promoCode?: string;
  status: OrderStatus;
  createdAt: string;
  cancelReason?: string;
}

export interface WorkingHours {
  start: string; // HH:mm format
  end: string;   // HH:mm format
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  isOwner: boolean;
}

export interface PortfolioItem {
  id: string;
  title: string;
  imageUrl: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  imageUrl?: string;
  attachmentUrl?: string; // For files/images
  link?: string;
  createdAt: string;
  type: 'global' | 'private';
  targetUid?: string;
}

export interface BlockStatus {
  isBlocked: boolean;
  blockedUntil: number; // Timestamp or -1 for permanent
}

export interface AppUserMetadata {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  lastLogin: string;
  blockStatus?: BlockStatus;
  readNotifications?: string[]; // IDs of read notifications
}
