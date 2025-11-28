import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvRuwGWYWkSWQPjRnFCnRhJCNaXdyKBkqPLBwOZOiZNLqjEDLRDaWo';

export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
};

export const subscribeToPushNotifications = async (userEmail: string): Promise<boolean> => {
  try {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      toast.error('Your browser does not support notifications');
      return false;
    }

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      toast.error('Your browser does not support service workers');
      return false;
    }

    const permission = await requestNotificationPermission();
    
    if (permission !== 'granted') {
      toast.error('Please enable notifications in your browser settings');
      return false;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service worker registered:', registration);
    await navigator.serviceWorker.ready;
    console.log('Service worker ready');

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource
    });
    console.log('Push subscription created:', subscription);

    // Save subscription to database
    const { error } = await supabase
      .from('push_subscriptions')
      .insert({
        user_email: userEmail,
        subscription: subscription.toJSON() as any
      })
      .select()
      .single();

    if (error) {
      // If user already exists, update the subscription
      const { error: updateError } = await supabase
        .from('push_subscriptions')
        .update({
          subscription: subscription.toJSON() as any
        })
        .eq('user_email', userEmail);
        
      if (updateError) throw updateError;
    }

    console.log('Push subscription saved to database');
    toast.success('Notifications enabled! You will receive updates.');
    return true;

  } catch (error: any) {
    console.error('Error subscribing to push notifications:', error);
    if (error.message?.includes('subscription')) {
      toast.error('Failed to create push subscription. Please try again.');
    } else if (error.message?.includes('permission')) {
      toast.error('Notification permission denied. Please enable in browser settings.');
    } else {
      toast.error('Failed to enable notifications. Please try again.');
    }
    return false;
  }
};

export const unsubscribeFromPushNotifications = async (userEmail: string): Promise<boolean> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
    }

    // Remove subscription from database
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_email', userEmail);

    if (error) throw error;

    toast.success('Notifications disabled');
    return true;

  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    toast.error('Failed to disable notifications');
    return false;
  }
};

export const checkNotificationStatus = async (userEmail: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error

    return !!data;
  } catch (error) {
    console.error('Error checking notification status:', error);
    return false;
  }
};
