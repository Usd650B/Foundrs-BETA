import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';

interface NotificationBellProps {
  userId: string;
}

export const NotificationBell = ({ userId }: NotificationBellProps) => {
  return <NotificationDropdown userId={userId} />;
};
