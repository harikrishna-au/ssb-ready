import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

/**
 * Shared admin gate for every /admin/* page and route handler.
 *
 * A signed-in user is an admin when ANY of these is true:
 *  - their Clerk publicMetadata.role is "admin" (set in the Clerk dashboard; users cannot edit publicMetadata)
 *  - their user id is listed in ADMIN_USER_IDS (comma separated)
 *  - their primary verified email is listed in ADMIN_EMAILS (comma separated)
 *
 * Signed-out visitors are sent to sign in. Signed-in non-admins get a 404 so the
 * existence of the admin area is not advertised.
 */
const list = (v?: string) => (v ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

export type AdminUser = { id: string; email: string };

export async function isAdmin(): Promise<AdminUser | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const ids = list(process.env.ADMIN_USER_IDS);
  const emails = list(process.env.ADMIN_EMAILS);
  const user = await currentUser();
  if (!user) return null;
  const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
  const email = primary?.verification?.status === "verified" ? primary.emailAddress.toLowerCase() : "";
  const ok = user.publicMetadata?.role === "admin" || ids.includes(userId.toLowerCase()) || (!!email && emails.includes(email));
  return ok ? { id: userId, email: primary?.emailAddress ?? "" } : null;
}

/** Use at the top of an admin page or layout. Never returns for non-admins. */
export async function requireAdmin(): Promise<AdminUser> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const admin = await isAdmin();
  if (!admin) notFound();
  return admin;
}
