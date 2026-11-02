import { PageLoader } from "@/components/loader";

/** Shown instantly while a signed-in page streams in, so navigation never shows a blank screen. */
export default function Loading() {
  return <PageLoader />;
}
