import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/share(.*)"]);

const PRELAUNCH_COOKIE = "prelaunch_access";
const PRELAUNCH_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function isAllowedPrelaunchPath(pathname: string) {
  return (
    pathname.startsWith("/coming-soon") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin")
  );
}

export default clerkMiddleware(async (auth, req) => {
  const prelaunchKey = process.env.PRELAUNCH_KEY;

  if (prelaunchKey) {
    const url = req.nextUrl;
    const keyParam = url.searchParams.get("key");

    if (keyParam === prelaunchKey) {
      const redirectUrl = url.clone();
      redirectUrl.searchParams.delete("key");
      const response = NextResponse.redirect(redirectUrl);
      response.cookies.set(PRELAUNCH_COOKIE, prelaunchKey, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: PRELAUNCH_COOKIE_MAX_AGE,
        path: "/",
      });
      return response;
    }

    const hasAccess = req.cookies.get(PRELAUNCH_COOKIE)?.value === prelaunchKey;

    if (!hasAccess && !isAllowedPrelaunchPath(url.pathname)) {
      return NextResponse.redirect(new URL("/coming-soon", req.url));
    }
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
