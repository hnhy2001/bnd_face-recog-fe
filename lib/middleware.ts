// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value // Lấy token từ cookie
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')

  // Nếu chưa đăng nhập mà cố vào Dashboard
  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Nếu đã đăng nhập mà lại vào trang Login
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

// Chỉ áp dụng middleware cho các đường dẫn này
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}