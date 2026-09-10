import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/admin') && !req.nextUrl.pathname.startsWith('/admin/login')) {
    if (!req.cookies.get('vx_admin')) return NextResponse.redirect(new URL('/admin/login', req.url));
  }
  // Team dashboard needs a team session; the API re-verifies the JWT, so this
  // is only a friendly redirect (never the real authorization check).
  if (req.nextUrl.pathname.startsWith('/team/dashboard')) {
    if (!req.cookies.get('vx_team')) return NextResponse.redirect(new URL('/team/login', req.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ['/admin/:path*', '/team/dashboard'] };
