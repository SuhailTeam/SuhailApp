import { useState } from 'react'
import type { Lang } from './i18n'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import Team from './components/Team'
import Footer from './components/Footer'
import './App.css'

export default function App() {
  const [lang, setLang] = useState<Lang>('en')
  const isRtl = lang === 'ar'

  const toggleLang = () => setLang((prev) => (prev === 'en' ? 'ar' : 'en'))

  return (
    <div className="app" dir={isRtl ? 'rtl' : 'ltr'}>
      <Navbar lang={lang} onToggleLang={toggleLang} />
      <Hero lang={lang} />
      <Features lang={lang} />
      <HowItWorks lang={lang} />
      <Team lang={lang} />
      <Footer lang={lang} />
    </div>
  )
}
