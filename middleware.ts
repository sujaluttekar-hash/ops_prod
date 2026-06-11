import { NextResponse, type NextRequest } from 'next/server';

// Auth guard — handled client-side via auth-context
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
};
