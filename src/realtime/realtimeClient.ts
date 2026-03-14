"use client";

import { useEffect } from "react";
import type { Card } from "@/types";
import { useCardStore } from "@/store/cardStore";

type RealtimeEvent =
  | {
      type: "card:created";
      payload: {
        card: Card;
      };
    }
  | {
      type: "card:moved";
      payload: {
        cardId: string;
        fromColumnId: string;
        toColumnId: string;
        toIndex: number;
      };
    };

type RealtimeEnvelope = {
  clientId: string;
  eventId: string;
  timestamp: number;
  event: RealtimeEvent;
};

const CHANNEL_NAME = "knowledge-board-realtime";

let clientId: string | null = null;

function getClientId() {
  if (clientId) return clientId;
  if (typeof window === "undefined") {
    clientId = "server";
    return clientId;
  }
  clientId = crypto.randomUUID();
  return clientId;
}

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!("BroadcastChannel" in window)) return null;
  return new BroadcastChannel(CHANNEL_NAME);
}

export function publishRealtime(event: RealtimeEvent) {
  const channel = getChannel();
  if (!channel) return;
  const envelope: RealtimeEnvelope = {
    clientId: getClientId(),
    eventId: crypto.randomUUID(),
    timestamp: Date.now(),
    event,
  };
  channel.postMessage(envelope);
}

export function useRealtimeSubscription() {
  useEffect(() => {
    const channel = getChannel();
    if (!channel) return;

    const localClientId = getClientId();

    const handleMessage = (message: MessageEvent<RealtimeEnvelope>) => {
      const data = message.data;
      if (!data || data.clientId === localClientId) {
        return;
      }

      const { event } = data;
      if (event.type === "card:created") {
        const { card } = event.payload;
        useCardStore.getState().applyRemoteCardCreated(card);
      } else if (event.type === "card:moved") {
        const { cardId, fromColumnId, toColumnId, toIndex } = event.payload;
        useCardStore.getState().applyRemoteCardMoved(
          cardId,
          fromColumnId,
          toColumnId,
          toIndex,
        );
      }
    };

    channel.addEventListener("message", handleMessage);

    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, []);
}

