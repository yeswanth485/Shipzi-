import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 1. Get the authenticated user
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // 2. Protect Dashboard & Onboarding routes
  if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // 3. Handle Authenticated User Routing
  if (user) {
    // Skip for API/Static
    if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
      return supabaseResponse
    }

    // If user exists, ensure onboarding is complete before allowing dashboard access
    let onboardingDone = false
    try {
      const { data: profile } = await supabase
         .from('profiles')
         .select('onboarding_complete')
        .eq('id', user.id)
        .maybeSingle()

      onboardingDone = (profile as any)?.onboarding_complete === true

      // If user is on onboarding and already done, move to dashboard
      if (onboardingDone && pathname.startsWith('/onboarding')) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }

      // If user is NOT done and trying to access dashboard, send to onboarding
      if (!onboardingDone && pathname.startsWith('/dashboard')) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }
    } catch (e) {
      console.error('[Middleware] Profile fetch error:', e)
    }

    // Redirect authenticated users away from auth pages and the landing page, EXCEPT for callback
    if (pathname.startsWith('/auth') && !pathname.startsWith('/auth/callback')) {
      const url = request.nextUrl.clone()
      url.pathname = onboardingDone ? '/dashboard' : '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js)$).*)',
  ],
}
