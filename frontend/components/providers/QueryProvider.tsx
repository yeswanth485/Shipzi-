'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, useEffect } from 'react'

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  useEffect(() => {
    // Ping backend every 4 minutes to prevent Render cold starts
    const pingBackend = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://shipzi-backend-2k1i.onrender.com'
        await fetch(`${backendUrl}/health`)
        console.log('[Health] Backend ping successful')
      } catch (err) {
        console.error('[Health] Backend ping failed:', err)
      }
    }

    // Initial ping
    pingBackend()

    // 4 min interval
    const interval = setInterval(pingBackend, 4 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
