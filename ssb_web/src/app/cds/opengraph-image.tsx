import { getExam } from "@/components/site/exam-data";
import { ogCard, OG_SIZE } from "@/components/site/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "ReadyKadet exam guide";

export default function Image() {
  const e = getExam("cds")!;
  return ogCard({ eyebrow: e.full, title: e.title });
}
