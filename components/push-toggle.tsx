"use client";

import { BellOff, BellRing } from "lucide-react";
import { useEffect, useState } from "react";

import { removePushSubscription, savePushSubscription } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";

const t = strings.notifications.push;

type State = "loading" | "unsupported" | "ios-install" | "denied" | "not-ready" | "off" | "on";

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function toServer(sub: PushSubscription) {
  const json = sub.toJSON();
  return { endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" };
}

/**
 * Turns push notifications on or off for this device. `publicKey` is the Web
 * Push key the server signs with (null until the reminders job first runs).
 */
export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) {
        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
        const installed = window.matchMedia("(display-mode: standalone)").matches;
        setState(ios && !installed ? "ios-install" : "unsupported");
        return;
      }
      if (!publicKey) return setState("not-ready");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        // Re-link the device to whoever is signed in now (shared phones).
        await savePushSubscription(toServer(sub));
        setState("on");
      } else setState("off");
    })().catch(() => setState("unsupported"));
  }, [publicKey]);

  async function enable() {
    setBusy(true);
    setFailed(false);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey!) }));
      const { ok } = await savePushSubscription(toServer(sub));
      if (!ok) throw new Error("save failed");
      setState("on");
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="flex items-center gap-2 font-semibold">
        <BellRing className="size-5 text-primary" />
        {t.title}
      </h2>
      <p className="text-sm text-muted-foreground">{t.hint}</p>
      {state === "on" && (
        <>
          <p className="text-sm font-medium text-emerald-600">{t.on}</p>
          <Button variant="outline" size="sm" className="self-start" onClick={disable} disabled={busy}>
            <BellOff />
            {busy ? t.working : t.disable}
          </Button>
        </>
      )}
      {state === "off" && (
        <Button className="self-start" onClick={enable} disabled={busy}>
          <BellRing />
          {busy ? t.working : t.enable}
        </Button>
      )}
      {state === "denied" && <p className="text-sm text-destructive">{t.denied}</p>}
      {state === "not-ready" && <p className="text-sm text-muted-foreground">{t.notReady}</p>}
      {state === "unsupported" && <p className="text-sm text-muted-foreground">{t.unsupported}</p>}
      {state === "ios-install" && <p className="text-sm text-muted-foreground">{t.iosHint}</p>}
      {failed && <p className="text-sm text-destructive">{t.failed}</p>}
    </section>
  );
}
