import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Sign-in is required for the signed-in app only. Anything else is public, so an unknown URL reaches
 * not-found.tsx (a real 404) instead of bouncing to sign-in with a redirect.
 * When you add a page under app/(app), add its path here too.
 */
const isProtected = createRouteMatcher([
  "/dashboard(.*)", "/tests(.*)", "/ppdt(.*)", "/tat(.*)", "/wat(.*)", "/srt(.*)", "/sdt(.*)", "/oir(.*)", "/lecturette(.*)",
  "/interview(.*)", "/interview-guide(.*)", "/applications(.*)", "/history(.*)", "/olq-profile(.*)", "/piq(.*)",
  "/premium(.*)", "/billing(.*)", "/profile(.*)", "/onboarding(.*)", "/admin(.*)", "/api(.*)",
]);
const isPublicApi = createRouteMatcher(["/api/newsletter"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req) && !isPublicApi(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
