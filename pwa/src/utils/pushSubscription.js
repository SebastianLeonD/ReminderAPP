import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BI690n3wejuU4KMJE4wHxNGveBFkctGg3x1P0wu0jOpQZqbH8O-ExLHN9Ka9mNjycRQWB7MSEvql0EDbhe9TMAU'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function getSubscriptionStatus() {
  if (!isPushSupported()) return null
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return subscription
  } catch {
    return null
  }
}

export async function subscribeToPush() {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported on this device. Try installing the app to your home screen.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission denied. Please enable notifications in your browser settings.')
  }

  const registration = await navigator.serviceWorker.ready

  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  await sendSubscriptionToServer(subscription)
  return subscription
}

export async function unsubscribeFromPush() {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    // Remove from server
    const sub = subscription.toJSON()
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', sub.endpoint)

    await subscription.unsubscribe()
  }
}

async function sendSubscriptionToServer(subscription) {
  const sub = subscription.toJSON()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth_key: sub.keys.auth,
      },
      { onConflict: 'user_id,endpoint' }
    )

  if (error) throw new Error(error.message || 'Failed to save push subscription')
}
