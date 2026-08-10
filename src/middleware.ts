import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role as Role | undefined;

    if (pathname.startsWith("/dashboard") && role === Role.PARENT) {
      return NextResponse.redirect(new URL("/portal", req.url));
    }
    if (pathname.startsWith("/portal") && role !== Role.PARENT) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/portal/:path*", "/api/students/:path*"],
};
