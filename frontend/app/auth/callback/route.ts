import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')
  const next = searchParams.get('next')

  console.log('[Auth Callback] Request received:', {
    url: request.url,
    code: code ? 'YES' : 'NO',
    next,
    error,
    origin
  })

  if (error) {
    console.error('[Auth Callback] Error param received:', error, error_description)
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error)}&message=${encodeURIComponent(error_description || '')}`)
  }

  if (code) {
    try {
      const supabase = await createClient()

      // Exchange the code for a session. Guard against unexpected thrown errors.
      const exchange = await supabase.auth.exchangeCodeForSession(code)
      // exchange may be { data, error } depending on client version
      const sessionError = (exchange as any)?.error ?? null
      const exchangeData = (exchange as any)?.data ?? (exchange as any)

      if (sessionError) {
        console.error('[Auth Callback] Session exchange returned error:', sessionError)
        return NextResponse.redirect(`${origin}/auth/login?error=session_error&message=${encodeURIComponent(sessionError.message || String(sessionError))}`)
      }

      console.log('[Auth Callback] Session exchange successful')

      // Get the logged in user to filter the profile query correctly
      const userResult = await supabase.auth.getUser()
      const user = (userResult as any)?.data?.user ?? (userResult as any)?.user ?? null

      if (user) {
        console.log('[Auth Callback] User found:', user.id)
        let { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_complete')
          .eq('id', user.id)
          .maybeSingle()

        if (!profile) {
          console.log('[Auth Callback] Profile missing, creating one')
          // Insert a minimal profile row for new users
          await (supabase.from('profiles') as any).insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email || '',
            onboarding_complete: false
          }).select().single()
          profile = { onboarding_complete: false } as any
        }

        if ((profile as any)?.onboarding_complete) {
          console.log('[Auth Callback] Onboarding complete, redirecting to dashboard')
          return NextResponse.redirect(`${origin}${next || '/dashboard'}`)
        }
      }

      console.log('[Auth Callback] Onboarding incomplete, redirecting to onboarding')
      return NextResponse.redirect(`${origin}/onboarding`)
    } catch (e: any) {
      // Catch unexpected runtime errors so the route never throws a 500 without context
      console.error('[Auth Callback] Unexpected exception during auth callback:', e)
      const message = e?.message ?? String(e)
      return NextResponse.redirect(`${origin}/auth/login?error=server_exception&message=${encodeURIComponent(message)}`)
    }
  }

  // If no code was provided, redirect to login instead of a non-existent error page
  return NextResponse.redirect(`${origin}/auth/login?error=no_code`)
}
