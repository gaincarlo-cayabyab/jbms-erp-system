import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes restricted to Admin & Accountant roles
const RESTRICTED_ROUTES: { path: string; roles: string[] }[] = [
  { path: '/financials', roles: ['Admin', 'Accountant'] },
  { path: '/payroll', roles: ['Admin', 'Accountant'] },
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh auth session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check for PIN-based session cookie (Enterprise App Users)
  const pinSessionCookie = request.cookies.get('japa_session')?.value
  let pinUser: { id: string; full_name: string; role: string } | null = null
  if (pinSessionCookie) {
    try {
      pinUser = JSON.parse(decodeURIComponent(pinSessionCookie))
    } catch {
      /* ignore invalid cookie JSON */
    }
  }

  const isAuthenticated = !!user || !!pinUser

  // Explicit signout query parameter check — strip cookies & allow login view without redirecting to /
  const isExplicitLogout = request.nextUrl.searchParams.has('logout')
  if (isExplicitLogout) {
    response.cookies.delete('japa_session')
    response.cookies.set('japa_session', '', { maxAge: 0, path: '/' })

    const allCookies = request.cookies.getAll()
    for (const cookie of allCookies) {
      if (
        cookie.name.startsWith('sb-') ||
        cookie.name.includes('supabase') ||
        cookie.name.includes('auth') ||
        cookie.name.includes('token')
      ) {
        response.cookies.delete(cookie.name)
        response.cookies.set(cookie.name, '', { maxAge: 0, path: '/' })
      }
    }
  } else if (pathname.startsWith('/login') && isAuthenticated) {
    // Authenticated user trying to access /login -> redirect to / (or /pos for Cashier)
    const targetUrl = pinUser?.role === 'Cashier' ? '/pos' : '/'
    return NextResponse.redirect(new URL(targetUrl, request.url))
  }

  // Allow public assets and login
  const isPublicPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'

  // Redirect unauthenticated users to /login
  if (!isPublicPath && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role-Based Access Control (RBAC)
  if (isAuthenticated) {
    const restricted = RESTRICTED_ROUTES.find((r) => pathname.startsWith(r.path))
    if (restricted) {
      let activeRole: string = pinUser?.role || (user?.user_metadata?.role as string) || ''

      if (!activeRole && user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
          if (profile?.role) activeRole = profile.role
        } catch {
          /* ignore */
        }
      }

      // Default admin account override
      if (user?.email === 'admin@japacore.com' || user?.email === 'admin@japa.com') {
        activeRole = 'Admin'
      }

      if (!restricted.roles.includes(activeRole)) {
        const deniedUrl = new URL('/', request.url)
        deniedUrl.searchParams.set('error', 'access_denied')
        return NextResponse.redirect(deniedUrl)
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
