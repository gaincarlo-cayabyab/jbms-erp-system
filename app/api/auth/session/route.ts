import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, full_name, role } = body

    if (!id || !role) {
      return NextResponse.json({ error: 'Missing user session fields' }, { status: 400 })
    }

    const sessionData = {
      id,
      full_name: full_name || 'Team Member',
      role,
    }

    const response = NextResponse.json({ success: true, user: sessionData })

    // Store in cookie accessible to Next.js middleware / proxy
    response.cookies.set('japa_session', encodeURIComponent(JSON.stringify(sessionData)), {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
      httpOnly: false,
    })

    return response
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set('japa_session', '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  })
  return response
}

