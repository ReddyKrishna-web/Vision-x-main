import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/admin') && !req.nextUrl.pathname.startsWith('/admin/login')) {
    if (!req.cookies.get('vx_admin')) return NextResponse.redirect(new URL('/admin/login', req.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ['/admin/:path*'] };
