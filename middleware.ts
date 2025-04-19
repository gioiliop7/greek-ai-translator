import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define your allowed origins for API requests.
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000",
];

// This is the middleware function that executes for requests matching the matcher
export function middleware(request: NextRequest) {
  // Get the Origin header from the request
  // The header is lowercased by default in NextRequest
  const origin = request.headers.get("origin");

  console.log(
    `Middleware: Checking Origin for ${request.nextUrl.pathname}:`,
    origin
  ); // Logging for debugging

  // Origin Check:
  // 1. Allow requests with no Origin header. These are usually same-origin requests,
  //    requests from curl, or server-side requests that are not subject to CORS restrictions.
  // 2. If Origin header exists, check if it's in the list of allowed origins.
  //    If the Origin exists AND it is NOT in the allowed list, then we block the request.
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    // If the Origin is not allowed, block the request with status 403 Forbidden
    console.warn(
      `Middleware: Request blocked from unauthorized origin: ${origin} to ${request.nextUrl.pathname}`
    );

    // You could also add Access-Control-Allow-Origin: [the request's origin]
    // to tell the browser why it was blocked, but Status 403 is usually sufficient.
    const response = new NextResponse("Forbidden", { status: 403 });
    // response.headers.set('Access-Control-Allow-Origin', origin); // Optional header for feedback
    return response;
  }

  // If the Origin is allowed (or doesn't exist), continue to the next middleware or the route handler
  return NextResponse.next();
}

// Configure the config object to tell the middleware which paths to match
export const config = {
  // matcher: Define one or more patterns that match request paths.
  // '/api/:path*' matches ALL paths that start with '/api/' (e.g., /api/translate, /api/users/123)
  matcher: "/api/:path*",
};
