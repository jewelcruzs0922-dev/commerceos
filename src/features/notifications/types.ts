export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationSummary = {
  items: NotificationItem[];
  unreadCount: number;
};
