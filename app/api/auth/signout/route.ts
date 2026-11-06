import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (err) {
    console.warn('Server signout error:', err)
  }

  const response = NextResponse.json({ success: true })

  // Explicitly invalidate all Supabase auth cookies
  const allCookies = request.cookies.getAll()
  for (const cookie of allCookies) {
    if (
      cookie.name.startsWith('sb-') ||
      cookie.name.includes('supabase') ||
      cookie.name.includes('auth') ||
      cookie.name.includes('token')
    ) {
      response.cookies.delete(cookie.name)
      response.cookies.set(cookie.name, '', {
        maxAge: 0,
        path: '/',
        expires: new Date(0),
      })
    }
  }

  return response
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (err) {
    console.warn('Server signout error:', err)
  }

  const response = NextResponse.redirect(new URL('/login?logout=1', request.url), {
    status: 303,
  })

  const allCookies = request.cookies.getAll()
  for (const cookie of allCookies) {
    if (
      cookie.name.startsWith('sb-') ||
      cookie.name.includes('supabase') ||
      cookie.name.includes('auth') ||
      cookie.name.includes('token')
    ) {
      response.cookies.delete(cookie.name)
      response.cookies.set(cookie.name, '', {
        maxAge: 0,
        path: '/',
        expires: new Date(0),
      })
    }
  }

  return response
}

