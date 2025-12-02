import { useEffect, useState } from 'react';
import { requestNotificationPermission, initializePushNotifications } from '@/lib/push-notifications';
import { useToast } from '@/hooks/use-toast';

export const usePushNotifications = (userId: string) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if the browser supports service workers and push notifications
    const checkSupport = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        setIsSupported(true);
        
        // Check if notifications are already enabled
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setIsEnabled(true);
          
          // Initialize push notifications
          const success = await initializePushNotifications(userId);
          if (!success) {
            toast({
              title: 'Error',
              description: 'Failed to initialize push notifications',
              variant: 'destructive',
            });
          }
        }
      }
    };

    checkSupport();
  }, [userId, toast]);

  const enableNotifications = async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: 'Not supported',
        description: 'Push notifications are not supported in your browser',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const permission = await requestNotificationPermission();
      if (permission) {
        const success = await initializePushNotifications(userId);
        if (success) {
          setIsEnabled(true);
          toast({
            title: 'Success',
            description: 'Push notifications enabled',
          });
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable push notifications',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    isSupported,
    isEnabled,
    enableNotifications,
  };
};
