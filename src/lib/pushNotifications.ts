import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// VAPID public key from the generated keys (base64url format)
const VAPID_PUBLIC_KEY = 'BM2vbhroFFAULgUgFqSrUs1gEkp97N3yHyWIC7bb1ZwC5ipxX7FUU6dE7Th98Fzelj07gJaGeCVpLEWoz1jF0bU';

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

    // Check current permission status
    if (Notification.permission === 'denied') {
      toast.error('Notifications are blocked. Please enable them in your browser settings:\n1. Click the lock icon in the address bar\n2. Allow notifications for this site\n3. Refresh the page');
      return false;
    }

    const permission = await requestNotificationPermission();
    
    if (permission !== 'granted') {
      if (permission === 'denied') {
        toast.error('Notifications are blocked. Please enable them in your browser settings:\n1. Click the lock icon in the address bar\n2. Allow notifications for this site\n3. Refresh the page');
      } else {
        toast.error('Please accept the notification prompt that appears in your browser to enable alerts.');
      }
      return false;
    }

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    const registration = await navigator.serviceWorker.getRegistration();
    
    if (!registration) {
      toast.error('Service worker not found. Please refresh the page and try again.');
      return false;
    }

    console.log('Service worker ready:', registration);

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

/**
 * Validates that the current browser subscription matches what's stored in DB.
 * If mismatched (e.g., after VAPID key change), clears the old subscription.
 * Returns true if user needs to re-subscribe.
 */
export const validateAndCleanupSubscription = async (userEmail: string): Promise<boolean> => {
  try {
    // Check if there's a DB record for this user
    const { data: dbRecord } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_email', userEmail)
      .single();

    if (!dbRecord) {
      // No DB record - user should subscribe
      return true;
    }

    // Check browser's current subscription
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false; // Can't check, assume OK
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      // No service worker - delete stale DB record
      await supabase.from('push_subscriptions').delete().eq('user_email', userEmail);
      return true;
    }

    const browserSub = await registration.pushManager.getSubscription();
    
    if (!browserSub) {
      // Browser has no subscription but DB does - delete stale record
      await supabase.from('push_subscriptions').delete().eq('user_email', userEmail);
      console.log('Cleaned up stale subscription for', userEmail);
      return true;
    }

    // Compare endpoints - cast to access nested property
    const subscription = dbRecord.subscription as { endpoint?: string } | null;
    const dbEndpoint = subscription?.endpoint;
    if (dbEndpoint !== browserSub.endpoint) {
      // Mismatch - unsubscribe browser and delete DB record
      await browserSub.unsubscribe();
      await supabase.from('push_subscriptions').delete().eq('user_email', userEmail);
      console.log('Cleaned up mismatched subscription for', userEmail);
      return true;
    }

    return false; // All good
  } catch (error) {
    console.error('Error validating subscription:', error);
    return false;
  }
};
