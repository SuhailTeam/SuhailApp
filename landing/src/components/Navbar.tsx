import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Globe } from 'lucide-react'
import type { Lang } from '../i18n'
import { t } from '../i18n'
import logoImg from '../assets/logo.png'

interface NavbarProps {
  lang: Lang
  onToggleLang: () => void
}

export default function Navbar({ lang, onToggleLang }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const tr = t(lang)
  const isRtl = lang === 'ar'

  const links = [
    { href: '#features', label: tr.nav.features },
    { href: '#how-it-works', label: tr.nav.howItWorks },
    { href: '#team', label: tr.nav.team },
  ]

  return (
    <motion.nav
      className="navbar"
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="nav-inner">
        <a href="#" className="nav-logo">
          <img src={logoImg} alt="Suhail" className="nav-logo-img" />
          <span className="nav-logo-text">{isRtl ? 'سهيل' : 'SUHAIL'}</span>
        </a>

        <div className="nav-links">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="nav-link">
              {link.label}
            </a>
          ))}
          <button className="lang-btn" onClick={onToggleLang}>
            <Globe size={14} />
            <span>{lang === 'en' ? 'العربية' : 'English'}</span>
          </button>
        </div>

        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="mobile-link"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <button className="lang-btn" onClick={onToggleLang}>
              <Globe size={14} />
              <span>{lang === 'en' ? 'العربية' : 'English'}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
