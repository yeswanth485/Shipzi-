'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'

export default function Footer() {
  const { user, profile } = useAuth()
  
  return (
    <footer className="px-6 py-20 bg-[#0A0F1E] border-t border-white/5">
      <div className="max-w-7xl mx-auto space-y-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-3 group">
              <Image src="/shipzi-logo.png" alt="Shipzi Logo" width={32} height={32} />
              <div className="flex flex-col">
                <span className="text-xl font-bold font-space-grotesk text-white">Shipzi</span>
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 italic">by Terybi</span>
              </div>
            </Link>
            <p className="text-sm text-zinc-500 leading-relaxed">
              AI-powered packaging intelligence that saves cost and the planet. Terybi Intelligence Network v4.2.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><Link href="#features" className="hover:text-blue-400 transition-colors">Features</Link></li>
              <li><Link href="#how-it-works" className="hover:text-blue-400 transition-colors">How It Works</Link></li>
              <li><Link href="#pricing" className="hover:text-blue-400 transition-colors">Pricing</Link></li>
              {user ? (
                <li><Link href={profile?.onboarding_complete ? "/dashboard" : "/onboarding"} className="hover:text-blue-400 transition-colors">Dashboard</Link></li>
              ) : (
                <>
                  <li><Link href="/auth/login" className="hover:text-blue-400 transition-colors">Login</Link></li>
                  <li><Link href="/auth/signup" className="hover:text-blue-400 transition-colors">Sign Up</Link></li>
                </>
              )}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><Link href="#" className="hover:text-blue-400 transition-colors">About Us</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Careers</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Blog</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Sustainability</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Legal</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
            © 2026 Shipzi Inc. All rights reserved.
          </p>
          <div className="flex gap-8">
            {['Twitter', 'LinkedIn', 'Instagram'].map(social => (
              <Link key={social} href="#" className="text-xs font-bold text-zinc-600 hover:text-white transition-colors uppercase tracking-widest">
                {social}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
