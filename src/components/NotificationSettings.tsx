import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface NotificationSettingsProps {
  userId: string;
}

export const NotificationSettings = ({ userId }: NotificationSettingsProps) => {
  const { isSupported, isEnabled, enableNotifications } = usePushNotifications(userId);

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md text-sm">
        Push notifications are not supported in your browser.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Push Notifications</h3>
      
      {isEnabled ? (
        <div className="flex items-center space-x-2 text-green-600">
          <Bell className="h-5 w-5" />
          <span>Push notifications are enabled</span>
        </div>
      ) : (
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-2 text-amber-600">
            <BellOff className="h-5 w-5" />
            <span>Push notifications are disabled</span>
          </div>
          <Button onClick={enableNotifications} className="w-fit">
            Enable Push Notifications
          </Button>
        </div>
      )}
    </div>
  );
};
