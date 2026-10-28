"use client";

import { useState } from "react";
import { fetchJson } from "@/lib/api-client";
import {
  ItemsResponseSchema,
  SubmitReportsResponseSchema,
  type Item,
  type SubmitReportsInput,
  type SubmittedIssue,
} from "../schemas";

// 제출 후 배지를 갱신하려고 품목 목록을 다시 받는다
export function useSubmitReports(onItemsUpdated: (items: Item[]) => void) {
  const [pending, setPending] = useState(false);

  async function submit(input: SubmitReportsInput): Promise<SubmittedIssue[]> {
    setPending(true);
    try {
      const { issues } = await fetchJson("/api/reports", SubmitReportsResponseSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const { items } = await fetchJson("/api/items", ItemsResponseSchema);
      onItemsUpdated(items);
      return issues;
    } finally {
      setPending(false);
    }
  }

  return { submit, pending };
}
