'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import TopBar from '@/components/dashboard/TopBar'

interface DashboardLayoutClientProps {
  children: React.ReactNode
  profile: any
}

export default function DashboardLayoutClient({ children, profile }: DashboardLayoutClientProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex overflow-hidden selection:bg-[#00FFD1]/30">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} profile={profile} />
      
      <main 
        className={`flex-1 relative transition-all duration-300 w-full overflow-hidden ${isCollapsed ? 'md:pl-[60px]' : 'md:pl-[240px]'} pl-0`}
      >
        {/* Background Ambient Glows */}
        <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-[#00FFD1]/5 blur-[150px] rounded-full pointer-events-none" />
        <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-[#185FA5]/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col h-screen">
          <TopBar profile={profile} />
          
          <div className="dashboard-layout-wrapper dashboard-tab flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-10 relative w-full box-border fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
