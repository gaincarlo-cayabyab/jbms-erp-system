import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Normalizes various role strings to standard canonical role names
function normalizeRole(rawRole: string | undefined | null): string {
  if (!rawRole) return 'Staff'
  if (rawRole === 'Production_Staff' || rawRole === 'Staff') return 'Staff'
  if (rawRole === 'Store_Manager' || rawRole === 'Manager') return 'Manager'
  if (rawRole === 'Admin') return 'Admin'
  if (rawRole === 'Cashier') return 'Cashier'
  if (rawRole === 'Inventory') return 'Inventory'
  if (rawRole === 'Accountant') return 'Admin'
  return rawRole
}

// Default home workspace for each role
const ROLE_DEFAULT_ROUTE: Record<string, string> = {
  Admin: '/',
  Manager: '/',
  Cashier: '/pos',
  Inventory: '/inventory',
  Staff: '/production',
}

// Strict list of allowed routes per role
const ROLE_ALLOWED_ROUTES: Record<string, string[]> = {
  Admin: [
    '/',
    '/dashboard',
    '/pos',
    '/customers',
    '/crm',
    '/sales',
    '/production',
    '/inventory',
    '/transfers',
    '/cash-management',
    '/financials',
    '/payroll',
    '/audit',
    '/help',
  ],
  Manager: [
    '/',
    '/dashboard',
    '/pos',
    '/customers',
    '/crm',
    '/sales',
    '/production',
    '/inventory',
    '/transfers',
    '/cash-management',
    '/help',
  ],
  Cashier: [
    '/pos',
    '/help',
  ],
  Inventory: [
    '/inventory',
    '/transfers',
    '/production',
    '/help',
  ],
  Staff: [
    '/production',
    '/inventory',
    '/help',
  ],
}

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
  }

  // Allow public assets, static files, and login API
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

  // Determine active role
  let rawRole: string = pinUser?.role || (user?.user_metadata?.role as string) || ''
  if (!rawRole && user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile?.role) rawRole = profile.role
    } catch {
      /* ignore */
    }
  }
  if (user?.email === 'admin@japacore.com' || user?.email === 'admin@japa.com') {
    rawRole = 'Admin'
  }

  const activeRole = normalizeRole(rawRole)

  // Authenticated user trying to access /login -> redirect to their designated home workspace
  if (pathname.startsWith('/login') && isAuthenticated && !isExplicitLogout) {
    const homeWorkspace = ROLE_DEFAULT_ROUTE[activeRole] || '/'
    return NextResponse.redirect(new URL(homeWorkspace, request.url))
  }

  // ── Role-Based Access Control (RBAC) Enforcement ────────────────────────────
  if (isAuthenticated && !isPublicPath) {
    const allowedList = ROLE_ALLOWED_ROUTES[activeRole] || ['/pos']

    // Check if current route is allowed for this role
    const isAllowed = allowedList.some((allowed) => {
      if (allowed === '/') return pathname === '/'
      return pathname === allowed || pathname.startsWith(allowed + '/')
    })

    if (!isAllowed) {
      const fallbackWorkspace = ROLE_DEFAULT_ROUTE[activeRole] || '/pos'
      const redirectUrl = new URL(fallbackWorkspace, request.url)
      redirectUrl.searchParams.set('error', 'access_denied')
      return NextResponse.redirect(redirectUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
