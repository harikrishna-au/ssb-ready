import type { Metadata } from "next";
import { ExamPage } from "@/components/site/exam-page";
import { getExam } from "@/components/site/exam-data";

const exam = getExam("cds")!;

export const metadata: Metadata = {
  title: exam.title,
  description: exam.description,
  alternates: { canonical: "/cds" },
  openGraph: { type: "website", url: "/cds", title: exam.title, description: exam.description },
  twitter: { card: "summary_large_image", title: exam.title, description: exam.description },
};

export default function Page() {
  return <ExamPage exam={exam} />;
}
