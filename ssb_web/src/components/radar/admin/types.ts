export type AdminItem = {
  id: string; title: string; body: string; conductedBy: string; service: string; exam: string;
  opens?: string; lastDate?: string; examDate?: string; confidence: "official" | "tentative" | "expected";
  sourceUrl?: string; officialApplyUrl?: string; applyLabel: string; status: "draft" | "published" | "archived";
  verifiedBy?: string; verifiedOn?: string; version: number; updatedAt: string; problems?: string[];
};
export type Change = { from: string | null; to: string | null };
export type HistoryRow = { id: number; action: string; changedBy?: string; changes: Record<string, Change>; createdAt: string };
export type Review = { id: number; sourceUrl: string; label: string; notificationId?: string; diff: { added: string[]; removed: string[] }; createdAt: string };
