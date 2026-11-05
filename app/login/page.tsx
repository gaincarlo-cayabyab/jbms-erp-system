import { Suspense } from 'react'
import type { Metadata } from 'next'
import LoginForm from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Sign In | JAPA Global',
  description: 'Sign in to access JAPA Global — Enterprise Operations.',
}

function LoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 via-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md animate-pulse rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-zinc-200" />
        <div className="mx-auto h-6 w-48 rounded bg-zinc-200" />
        <div className="mt-8 space-y-4">
          <div className="h-10 rounded-xl bg-zinc-100" />
          <div className="h-10 rounded-xl bg-zinc-100" />
          <div className="h-12 rounded-xl bg-blue-200" />
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  )
}
