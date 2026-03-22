"use client";

import { useEffect } from "react";
import type { Board, Card, Column, Comment } from "@/types";
import { useBoardStore } from "@/store/boardStore";
import { useCardStore } from "@/store/cardStore";
import { useColumnStore } from "@/store/columnStore";
import { useCommentStore } from "@/store/commentStore";

type RealtimeEvent =
  | { type: "comment:created"; payload: { comment: Comment } }
  | { type: "comment:updated"; payload: { comment: Comment } }
  | { type: "comment:deleted"; payload: { comment: Comment } }
  | { type: "card:created"; payload: { card: Card } }
  | {
      type: "card:moved";
      payload: {
        cardId: string;
        fromColumnId: string;
        toColumnId: string;
        toIndex: number;
      };
    }
  | { type: "card:updated"; payload: { card: Card } }
  | { type: "card:deleted"; payload: { cardId: string } }
  | { type: "board:created"; payload: { board: Board } }
  | { type: "board:updated"; payload: { board: Board } }
  | { type: "board:deleted"; payload: { boardId: string } }
  | { type: "column:created"; payload: { column: Column } }
  | { type: "column:updated"; payload: { column: Column } }
  | { type: "column:deleted"; payload: { columnId: string } };

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
      switch (event.type) {
        case "comment:created":
          useCommentStore
            .getState()
            .applyRemoteCommentCreated(event.payload.comment);
          break;
        case "comment:updated":
          useCommentStore
            .getState()
            .applyRemoteCommentUpdated(event.payload.comment);
          break;
        case "comment:deleted":
          useCommentStore
            .getState()
            .applyRemoteCommentDeleted(event.payload.comment);
          break;
        case "card:created":
          useCardStore.getState().applyRemoteCardCreated(event.payload.card);
          break;
        case "card:moved":
          useCardStore.getState().applyRemoteCardMoved(
            event.payload.cardId,
            event.payload.fromColumnId,
            event.payload.toColumnId,
            event.payload.toIndex,
          );
          break;
        case "card:updated":
          useCardStore.getState().applyRemoteCardUpdated(event.payload.card);
          break;
        case "card:deleted":
          useCardStore.getState().applyRemoteCardDeleted(event.payload.cardId);
          break;
        case "board:created":
          useBoardStore.getState().applyRemoteBoardCreated(event.payload.board);
          break;
        case "board:updated":
          useBoardStore.getState().applyRemoteBoardUpdated(event.payload.board);
          break;
        case "board:deleted":
          useBoardStore.getState().applyRemoteBoardDeleted(event.payload.boardId);
          break;
        case "column:created":
          useColumnStore
            .getState()
            .applyRemoteColumnCreated(event.payload.column);
          break;
        case "column:updated":
          useColumnStore
            .getState()
            .applyRemoteColumnUpdated(event.payload.column);
          break;
        case "column:deleted":
          useColumnStore
            .getState()
            .applyRemoteColumnDeleted(event.payload.columnId);
          break;
      }
    };

    channel.addEventListener("message", handleMessage);

    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, []);
}

