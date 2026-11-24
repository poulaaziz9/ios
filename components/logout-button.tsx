"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";

import { logout } from "@/app/(auth)/actions";
import { removePushSubscription } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";

/**
 * Signs out. First unlinks this device from push notifications, so on a
 * shared family phone the next person doesn't get this user's reminders.
 */
export function LogoutButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      className="border-destructive/40 text-destructive hover:bg-destructive/10"
      onClick={() =>
        start(async () => {
          try {
            const reg = await navigator.serviceWorker?.getRegistration();
            const sub = await reg?.pushManager?.getSubscription();
            if (sub) {
              await removePushSubscription(sub.endpoint);
              await sub.unsubscribe();
            }
          } catch {
            // Signing out must not depend on push support.
          }
          await logout();
        })
      }
    >
      <LogOut />
      {pending ? strings.common.loading : strings.profile.logout}
    </Button>
  );
}
