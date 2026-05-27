import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardProvider } from '@/lib/context/DashboardContext'
import DashboardLayoutClient from '@/components/dashboard/DashboardLayoutClient'
import QueryProvider from '@/components/providers/QueryProvider'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*, companies(logo_url, company_name)')
    .eq('id', user.id)
    .maybeSingle()

  let profile: any = profileData

  if (!profile) {
    // Create default profile if missing to prevent errors
    const { data: newProfile } = await (supabase.from('profiles') as any).insert({
      id: user.id,
      full_name: user.email || '',
      onboarding_complete: false
    }).select().single()
    
    profile = newProfile
  }

  // Fallback: if the join didn't populate companies, fetch directly
  if (profile && !profile.companies) {
    const { data: company } = await (supabase as any)
      .from('companies')
      .select('logo_url, company_name')
      .eq('owner_user_id', user.id)
      .maybeSingle()

    if (company) {
      profile = { ...profile, companies: company }
    }
  }

  return (
    <QueryProvider>
      <DashboardProvider>
        <DashboardLayoutClient profile={profile}>
          {children}
        </DashboardLayoutClient>
      </DashboardProvider>
    </QueryProvider>
  )
}
