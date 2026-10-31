import { connection } from "next/server";
import { annotateNow, matchesExam } from "@/data/radar";
import { fetchRadar } from "@/data/radar-api";
import { ApplicationsBoard } from "./applications-board";
import { ExamBoard } from "./exam-board";
import { RadarBoard } from "./radar-board";
import { RadarPreview } from "./radar-preview";

/** Resolves "today" per request so statuses and countdowns are never stale. */
async function load() {
  await connection();
  const r = await fetchRadar();
  return { ...r, items: annotateNow(r.items) };
}

export const LoadError = ({ what = "notifications" }: { what?: string }) => (
  <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6">
    <p className="font-semibold">We could not load the {what} right now.</p>
    <p className="mt-1 text-sm text-muted-foreground">This is a problem on our side, not a sign that nothing is open. Please check the official sites directly and try again in a few minutes.</p>
  </div>
);

export async function RadarFull() {
  const { items, error } = await load();
  return error ? <LoadError /> : <RadarBoard items={items} />;
}

export async function RadarLanding() {
  const { items, error } = await load();
  return error ? <LoadError /> : <RadarPreview items={items} />;
}

export async function ApplicationsData() {
  const { items, error } = await load();
  return error ? <LoadError what="notification details" /> : <ApplicationsBoard items={items} />;
}

export async function ExamData({ exam }: { exam: string }) {
  const { items, error } = await load();
  return error ? <LoadError /> : <ExamBoard exam={exam} items={items.filter((i) => matchesExam(i, exam))} />;
}

export async function LiveCount() {
  const { items } = await load();
  return items;
}
