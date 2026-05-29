import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isShareRoute = createRouteMatcher(["/share(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (process.env.COMING_SOON === "true") {
    const { pathname } = request.nextUrl;
    if (
      !pathname.startsWith("/coming-soon") &&
      !pathname.startsWith("/_next") &&
      !pathname.startsWith("/favicon")
    ) {
      return NextResponse.redirect(new URL("/coming-soon", request.url));
    }
  }

  if (isShareRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    "/(api|trpc)(.*)",
  ],
};
