"use client";

import React, { useRef, useEffect } from "react";
import {
  SplashedPushNotifications,
  SplashedPushNotificationsHandle,
} from "./splashed-push-notifications";
import { toast } from "@/lib/toast-service";

export function ToastProvider({ children }: { children?: React.ReactNode }) {
  const ref = useRef<SplashedPushNotificationsHandle | null>(null);

  useEffect(() => {
    toast.register(ref.current);
    return () => {
      toast.register(null);
    };
  }, []);

  return (
    <>
      {children}
      <SplashedPushNotifications
        ref={ref}
        timerColor="rgba(255,255,255,0.9)"
        timerBgColor="rgba(255,255,255,0.25)"
      />
    </>
  );
}
