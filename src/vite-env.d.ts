/// <reference types="vite/client" />

declare interface ServiceWorkerRegistration {
  readonly pushManager: PushManager;
}

declare interface PushManager {
  getSubscription(): Promise<PushSubscription | null>;
  subscribe(options?: PushSubscriptionOptionsInit): Promise<PushSubscription>;
}
