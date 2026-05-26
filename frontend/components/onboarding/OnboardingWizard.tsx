'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { ChevronRight, Loader2, Upload, Building2 } from 'lucide-react'
import { toast } from 'sonner'

export default function OnboardingWizard() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    companyName: '',
    industry: 'E-commerce',
    country: '',
    city: '',
    website: '',
    monthlyShipments: '0-500',
    logoFile: null as File | null,
    logoPreview: null as string | null,
  })

  useEffect(() => {
    const checkOnboarding = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_complete')
          .eq('id', user.id)
          .maybeSingle()

        if ((profile as any)?.onboarding_complete) {
          router.push('/dashboard')
        }
      }
    }
    checkOnboarding()
  }, [supabase, router])

  const handleNext = () => {
    if (step === 1) {
      if (!formData.companyName || !formData.country || !formData.city) {
        toast.error('Please fill in required fields (Name, Country, City)')
        return
      }
      setStep(2)
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be less than 2MB')
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setFormData(prev => ({ ...prev, logoFile: file, logoPreview: previewUrl }))
  }

  const handleComplete = async () => {
    if (!formData.logoFile) return
    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      let logoUrl = null
      if (formData.logoFile) {
        try {
          const ext = formData.logoFile.name.split('.').pop()
          const fileName = `logos/${user.id}/company-logo.${ext}`

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('company-assets')
            .upload(fileName, formData.logoFile, { upsert: true })

          if (uploadError) {
            console.warn('[Onboarding] Logo upload failed:', uploadError)
            toast.warning('Logo upload failed, but continuing setup...')
          } else if (uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('company-assets')
              .getPublicUrl(uploadData.path)
            logoUrl = publicUrl
          }
        } catch (e) {
          console.warn('[Onboarding] Logo upload exception:', e)
        }
      }

      // Upsert Company
      const { data: company, error: companyError } = await (supabase as any)
        .from('companies')
        .upsert({
          owner_user_id: user.id,
          company_name: formData.companyName,
          industry: formData.industry,
          address: `${formData.city}, ${formData.country}`,
          website: formData.website,
          logo_url: logoUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'owner_user_id' })
        .select()
        .single()

      if (companyError) throw companyError

      // Update User Profile
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({
          company_id: company.id,
          onboarding_complete: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      toast.success('Setup Complete! Welcome to PackIQ.')
      router.refresh()
      window.location.href = '/dashboard'

    } catch (error: any) {
      toast.error(error.message || 'Something went wrong during setup')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white py-12 px-4 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <div className="mb-8 space-y-4">
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-500">
            <span>Step {step} of 2</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${(step / 2) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <div className="bg-[#0D1427]/50 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 md:p-12 shadow-2xl">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-3xl font-bold font-space-grotesk mb-6">Company Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-zinc-400 block mb-1">Company Name *</label>
                    <input type="text" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none" placeholder="Acme Corp" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-zinc-400 block mb-1">Industry</label>
                      <select value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none">
                        {['E-commerce', 'Retail', 'Manufacturing', 'Logistics', 'Other'].map(opt => (
                          <option key={opt} value={opt} className="bg-[#0A0F1E]">{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-zinc-400 block mb-1">Monthly Shipments</label>
                      <select value={formData.monthlyShipments} onChange={e => setFormData({...formData, monthlyShipments: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none">
                        {['0-500', '500-2,000', '2,000-10,000', '10,000+'].map(opt => (
                          <option key={opt} value={opt} className="bg-[#0A0F1E]">{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-zinc-400 block mb-1">Country *</label>
                      <input type="text" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none" placeholder="USA" />
                    </div>
                    <div>
                      <label className="text-sm text-zinc-400 block mb-1">City *</label>
                      <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none" placeholder="New York" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 block mb-1">Website (Optional)</label>
                    <input type="url" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none" placeholder="https://example.com" />
                  </div>
                </div>
                <button onClick={handleNext} className="mt-8 w-full bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all">
                  Next Step <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-3xl font-bold font-space-grotesk mb-2">Company Logo</h2>
                <p className="text-zinc-400 mb-8">Upload your brand logo for shipping labels.</p>
                
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl p-12 bg-white/[0.02]">
                  {formData.logoPreview ? (
                    <div className="relative group">
                      <img src={formData.logoPreview} alt="Logo Preview" className="w-32 h-32 object-contain rounded-xl bg-white p-2" />
                      <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer" onClick={() => document.getElementById('logo-upload')?.click()}>
                        <Upload className="w-6 h-6" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center cursor-pointer" onClick={() => document.getElementById('logo-upload')?.click()}>
                      <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 text-blue-400">
                        <Building2 className="w-8 h-8" />
                      </div>
                      <p className="font-medium">Click to upload logo</p>
                      <p className="text-sm text-zinc-500 mt-1">PNG, JPG, WebP up to 2MB</p>
                    </div>
                  )}
                  <input type="file" id="logo-upload" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleLogoUpload} />
                </div>

                <div className="mt-8 flex gap-4">
                  <button onClick={() => setStep(1)} className="px-6 py-4 rounded-2xl font-bold text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all">
                    Back
                  </button>
                  <button 
                    onClick={handleComplete} 
                    disabled={!formData.logoFile || isLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Setup'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
