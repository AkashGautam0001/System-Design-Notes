"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { insforge } from "@/lib/insforge";

type EventHandler = (payload: Record<string, unknown>) => void;

export function useRealtime(roomCode: string | null) {
  const handlersRef = useRef<Map<string, EventHandler[]>>(new Map());
  const readyPromiseRef = useRef<Promise<void> | null>(null);
  const [ready, setReady] = useState(false);

  const channel = roomCode ? `room:${roomCode}` : null;

  useEffect(() => {
    if (!channel) return;

    let cancelled = false;

    readyPromiseRef.current = (async () => {
      try {
        await insforge.realtime.connect();
        if (cancelled) return;
        const subResult = await insforge.realtime.subscribe(channel);
        console.log("[Realtime] subscribe result:", subResult);
        if (cancelled) return;
        setReady(true);
        console.log("[Realtime] connected and subscribed to", channel);

        // Debug: log ALL incoming events
        insforge.realtime.on("connect", () => console.log("[Realtime] connected"));
        insforge.realtime.on("disconnect", (r: unknown) => console.log("[Realtime] disconnected:", r));
        insforge.realtime.on("error", (e: unknown) => console.log("[Realtime] error:", e));
      } catch (err) {
        console.error("Realtime setup failed:", err);
      }
    })();

    return () => {
      cancelled = true;
      setReady(false);
      try { insforge.realtime.unsubscribe(channel); } catch {}
    };
  }, [channel]);

  const on = useCallback(
    (event: string, handler: EventHandler) => {
      const handlers = handlersRef.current.get(event) || [];
      handlers.push(handler);
      handlersRef.current.set(event, handlers);

      const wrappedHandler = (message: Record<string, unknown>) => {
        console.log(`[Realtime] event "${event}" received:`, JSON.stringify(message));
        // Try to extract payload - server may wrap it
        const data = (message?.payload as Record<string, unknown>) || message || {};
        handler(data);
      };

      insforge.realtime.on(event, wrappedHandler);

      return () => {
        insforge.realtime.off(event, wrappedHandler);
        const remaining = handlersRef.current.get(event)?.filter((h) => h !== handler) || [];
        handlersRef.current.set(event, remaining);
      };
    },
    []
  );

  const publish = useCallback(
    async (event: string, data: Record<string, unknown>) => {
      if (!channel) return;
      if (readyPromiseRef.current) {
        await readyPromiseRef.current;
      }
      console.log(`[Realtime] publishing "${event}" to ${channel}:`, data);
      await insforge.realtime.publish(channel, event, data);
    },
    [channel]
  );

  return { on, publish, ready };
}
