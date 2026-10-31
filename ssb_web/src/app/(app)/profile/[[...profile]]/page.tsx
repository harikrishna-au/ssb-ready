import { UserProfile } from "@clerk/nextjs";
import { Suspense } from "react";

export default function ProfilePage() {
  return (
    <Suspense>
      <UserProfile path="/profile" routing="path" />
    </Suspense>
  );
}
