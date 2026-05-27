'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const { user, profile, loading } = useAuth()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-[#0A0F1E]/80 backdrop-blur-md border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 overflow-hidden rounded-xl">
            <Image
              src="/shipzi-logo.png"
              alt="Shipzi Logo"
              width={40}
              height={40}
              className="object-contain group-hover:scale-110 transition-transform"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold font-space-grotesk text-white tracking-tight leading-none">Shipzi</span>
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-500 italic mt-0.5">by Terybi</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-10">
          {['Features', 'How It Works', 'Suppliers', 'Pricing'].map((item) => (
            <Link
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-sm font-bold text-zinc-400 hover:text-white transition-colors"
            >
              {item}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-6">
          {loading ? (
            <div className="w-24 h-10 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
          ) : user ? (
            <Link
              href={profile?.onboarding_complete ? "/dashboard" : "/onboarding"}
              className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:scale-105 active:scale-95 transition-all"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/auth/login" className="border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/10 transition text-sm font-bold">
                Login
              </Link>
              <Link
                href="/auth/signup"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-bold"
              >
                Start Free Trial
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
