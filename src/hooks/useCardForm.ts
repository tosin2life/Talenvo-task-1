import { useState, useEffect } from "react";
import type { Card } from "@/types";

export type CardFormState = {
  title: string;
  description: string;
  tags: string[];
  dueDate: string | null;
};

const toFormState = (c?: Partial<Card> | null): CardFormState => ({
  title: c?.title ?? "",
  description: c?.description ?? "",
  tags: c?.tags ?? [],
  dueDate: c?.dueDate ?? null,
});

export function useCardForm(initial?: Partial<Card> | null) {
  const [state, setState] = useState<CardFormState>(() => toFormState(initial));

  useEffect(() => {
    setState(toFormState(initial));
  }, [initial?.id]);

  return {
    state,
    setState,
  };
}

