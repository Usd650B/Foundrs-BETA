import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Convert base64 string to Uint8Array
const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser');
  }

  return navigator.serviceWorker.register('/sw.js', {
    scope: '/',
  });
};

export const subscribeToPushNotifications = async (userId: string): Promise<PushSubscription | null> => {
  if (!VAPID_PUBLIC_KEY) {
    console.error('VAPID_PUBLIC_KEY is not defined');
    return null;
  }
  try {
    // Register service worker
    const registration = await registerServiceWorker();
    if (!registration) return null;

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!)
    });

    // Convert subscription to plain object for storage
    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
      }
    };

    // Save subscription to database
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        { 
          user_id: userId, 
          subscription: subscriptionData as unknown as Json,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return null;
  }
};

export const initializePushNotifications = async (userId: string): Promise<boolean> => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications are not supported in this browser');
    return false;
  }

  try {
    // Check for existing subscription
    const { data: existingSubscription } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single();

    if (existingSubscription?.subscription) {
      // Check if the subscription is still valid
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        return true; // Already subscribed and valid
      }
    }

    // If no valid subscription exists, subscribe the user
    const subscription = await subscribeToPushNotifications(userId);
    return subscription !== null;
  } catch (error) {
    console.error('Error initializing push notifications:', error);
    return false;
  }
};

export const sendPushNotification = async (userId: string, title: string, body: string) => {
  try {
    const { data: subscription, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single();

    if (error || !subscription) {
      console.error('No push subscription found for user:', userId);
      return false;
    }

    const response = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.subscription,
        title,
        body,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
};
