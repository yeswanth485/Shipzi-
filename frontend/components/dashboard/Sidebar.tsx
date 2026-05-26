'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Zap,
  ShoppingCart,
  Archive,
  Box,
  TrendingUp,
  Settings,
  CreditCard,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  Activity,
  Database,
  Leaf,
  Tag
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSubscriptionStore } from '@/lib/store/subscriptionStore'

const navItems = [
  { href: '/dashboard',             label: 'Dashboard',         icon: LayoutDashboard },
  { href: '/dashboard/optimize',    label: 'Optimize',          icon: Zap },
  { href: '/dashboard/orders',      label: 'Results',           icon: ShoppingCart },
  { href: '/dashboard/products',    label: 'Products',          icon: Archive },
  { href: '/dashboard/box-catalog', label: 'Box Catalog',       icon: Box },
  { href: '/dashboard/labels',      label: 'Labels',            icon: Tag },
  { href: '/dashboard/analytics',   label: 'Analytics',         icon: TrendingUp },
  { href: '/dashboard/sustainability', label: 'Sustainability', icon: Leaf },
  { href: '/dashboard/settings',    label: 'Settings',          icon: Settings },
]

export default function Sidebar({ isCollapsed, setIsCollapsed, profile }: any) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { plan, used, limit, percentage, fetchBalance } = useSubscriptionStore()

  useEffect(() => {
    async function init() {
       const { data: { session } } = await supabase.auth.getSession()
       if (session) {
         await fetchBalance(session.access_token)
       }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <motion.aside 
      animate={{ width: isCollapsed ? 60 : 240 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-full bg-[#0A0A0F] border-r border-white/5 flex flex-col z-40"
    >
      {/* Logo & Toggle */}
      <div className="flex items-center justify-between p-4 border-b border-white/5 h-[72px]">
        <Link href="/" className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
            {profile?.company?.logo_url ? (
              <img src={profile.company.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-blue-400">
                {profile?.company?.company_name?.slice(0, 2).toUpperCase() || 'SZ'}
              </span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white text-base font-syne tracking-tight whitespace-nowrap leading-none truncate max-w-[130px]">
              {profile?.company?.company_name || 'My Company'}
            </span>
            <span className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] mt-1">
              PackIQ Workspace
            </span>
          </div>
        </Link>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-500 hover:text-[#00FFD1] transition-colors shrink-0"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar mt-4">
        {!isCollapsed && <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-4 ml-3">Operations</p>}
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href
          return (
            <div key={item.href} className="relative group px-1">
              <Link
                href={item.href}
                prefetch={true}
                className={`flex items-center gap-3 px-3 h-[44px] rounded-xl text-xs font-bold transition-all duration-300 relative ${
                  active
                    ? 'bg-[#00FFD1]/10 text-white'
                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-[#00FFD1]' : 'group-hover:text-white'}`} />
                
                {!isCollapsed && (
                  <span className="whitespace-nowrap uppercase tracking-widest">{item.label}</span>
                )}
                
                {active && !isCollapsed && (
                  <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[#00FFD1] shadow-[0_0_8px_#00FFD1]" />
                )}
              </Link>
              
              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-[#1a1a2e] text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 border border-white/10 shadow-2xl">
                  {item.label}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* User / Logout */}
      <div className="p-4 border-t border-white/5 flex flex-col gap-4">
        {!isCollapsed && (
          <div className="flex flex-col gap-3">
            {/* Token Usage Bar */}
            <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 space-y-3">
               <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{plan} plan</span>
                  <span className="text-[9px] font-bold text-gray-300">{used.toLocaleString()} / {limit.toLocaleString()}</span>
               </div>
               <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className={`h-full rounded-full ${
                      percentage > 85 ? 'bg-red-500' :
                      percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                  />
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">{percentage}% used</span>
                  <Link href="/dashboard/subscription" className="text-[8px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300">Upgrade</Link>
               </div>
            </div>

            {/* AI Status */}
            <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/5 flex items-center justify-between group/status cursor-default">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Engine Online</span>
              </div>
              <Activity className="w-3 h-3 text-green-500/50 group-hover/status:text-green-400 transition-colors" />
            </div>

            {/* Profile */}
            <div className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
              <div className="w-8 h-8 rounded-full bg-[#00FFD1]/20 border border-[#00FFD1]/30 flex items-center justify-center shrink-0 overflow-hidden">
                 {profile?.companies?.logo_url ? (
                   <img src={profile.companies.logo_url} alt="Company Logo" className="w-full h-full object-cover" />
                 ) : (
                   <User className="w-4 h-4 text-[#00FFD1]" />
                 )}
              </div>
              <div className="flex flex-col whitespace-nowrap overflow-hidden">
                <span className="text-[11px] font-bold text-white truncate">{profile?.full_name || 'Admin'}</span>
                <span className="text-[9px] text-gray-500 uppercase tracking-widest truncate">{profile?.companies?.company_name || profile?.company_name || 'Enterprise'}</span>
              </div>
            </div>
          </div>
        )}
        
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-red-400 hover:bg-red-400/5 transition-all group ${isCollapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Sign out</span>}
        </button>
      </div>
    </motion.aside>
  )
}
