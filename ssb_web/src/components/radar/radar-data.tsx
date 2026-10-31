import { connection } from "next/server";
import { annotateNow } from "@/data/radar";
import { RadarBoard } from "./radar-board";
import { RadarPreview } from "./radar-preview";
import { ApplicationsBoard } from "./applications-board";

/** Resolves "today" per request so statuses and countdowns are never stale. */
export async function RadarFull() {
  await connection();
  return <RadarBoard items={annotateNow()} />;
}

export async function RadarLanding() {
  await connection();
  return <RadarPreview items={annotateNow()} />;
}

export async function ApplicationsData() {
  await connection();
  return <ApplicationsBoard items={annotateNow()} />;
}
