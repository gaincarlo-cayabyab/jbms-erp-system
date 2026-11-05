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

  // Authenticated user trying to access /login -> redirect to home
  if (pathname.startsWith('/login') && user) {
    return NextResponse.redirect(new URL('/', request.url))
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
  if (!isPublicPath && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role-Based Access Control (RBAC)
  if (user) {
    const restricted = RESTRICTED_ROUTES.find((r) => pathname.startsWith(r.path))
    if (restricted) {
      let userRole: string = (user.user_metadata?.role as string) || ''

      if (!userRole) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
          if (profile?.role) userRole = profile.role
        } catch {
          /* ignore */
        }
      }

      // Default admin account override
      if (user.email === 'admin@japacore.com') {
        userRole = 'Admin'
      }

      if (!restricted.roles.includes(userRole)) {
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
