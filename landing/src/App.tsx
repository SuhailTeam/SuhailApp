import { useState, Suspense, lazy } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { Eye, BookOpen, UserCheck, Search, Banknote, Palette, Glasses, Mic, Brain, Volume2, Globe, Menu, X } from 'lucide-react'
import { AnimatedText, GlowText } from './components/AnimatedText'
import FeatureCard from './components/FeatureCard'
import Logo from './components/Logo'
const ParticleField = lazy(() => import('./components/ParticleField'))
import { type Lang, t } from './i18n'
import './App.css'

import alqobaisiImg from './assets/team/alqobaisi.jpeg'
import alqahtaniImg from './assets/team/alqahtani.jpeg'
import alaboudImg from './assets/team/alaboud.jpeg'
import alyousefImg from './assets/team/alyousef.jpeg'

const featureIcons = [
  <Eye size={22} />,
  <BookOpen size={22} />,
  <UserCheck size={22} />,
  <Search size={22} />,
  <Banknote size={22} />,
  <Palette size={22} />,
]

const stepIcons = [
  <Glasses size={28} />,
  <Mic size={28} />,
  <Brain size={28} />,
  <Volume2 size={28} />,
]

const team = [
  { name: 'Abdullah Alqobaisi', nameAr: 'عبدالله القبيسي', role: 'Developer', roleAr: 'مطوّر', img: alqobaisiImg },
  { name: 'Faisal Alqahtani', nameAr: 'فيصل القحطاني', role: 'Developer', roleAr: 'مطوّر', img: alqahtaniImg },
  { name: 'Nasser Alaboud', nameAr: 'ناصر العبود', role: 'Developer', roleAr: 'مطوّر', img: alaboudImg },
  { name: 'Abdullah Alyousef', nameAr: 'عبدالله اليوسف', role: 'Developer', roleAr: 'مطوّر', img: alyousefImg },
]

function ParallaxSection({ children, offset = 40 }: { children: React.ReactNode; offset?: number }) {
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, -offset])

  return (
    <motion.div style={{ y }}>
      {children}
    </motion.div>
  )
}

function App() {
  const [lang, setLang] = useState<Lang>('en')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const tr = t(lang)
  const isRtl = lang === 'ar'

  const toggleLang = () => setLang(lang === 'en' ? 'ar' : 'en')

  return (
    <div style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      {/* Nav */}
      <motion.nav
        className="nav"
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="nav-logo">
          <Logo size={36} />
          <span>{isRtl ? 'سهيل' : 'Suhail'}</span>
        </div>

        <div className="nav-links">
          <a href="#features">{tr.nav.features}</a>
          <a href="#how-it-works">{tr.nav.howItWorks}</a>
          <a href="#team">{tr.nav.team}</a>
          <button className="lang-toggle" onClick={toggleLang}>
            <Globe size={14} />
            {lang === 'en' ? 'العربية' : 'English'}
          </button>
        </div>

        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="mobile-menu"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>{tr.nav.features}</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>{tr.nav.howItWorks}</a>
            <a href="#team" onClick={() => setMobileMenuOpen(false)}>{tr.nav.team}</a>
            <button className="lang-toggle" onClick={() => { toggleLang(); setMobileMenuOpen(false) }}>
              <Globe size={14} />
              {lang === 'en' ? 'العربية' : 'English'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <section className="hero">
        <Suspense fallback={null}>
          <ParticleField />
        </Suspense>

        <motion.div
          className="hero-badge"
          initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <span className="hero-badge-dot" />
          {tr.hero.badge}
        </motion.div>

        <h1 className="hero-title">
          <AnimatedText text={tr.hero.titleLine1} delay={0.3} />
          <br />
          <GlowText className="gradient-text">
            <AnimatedText text={tr.hero.titleLine2} delay={0.6} />
          </GlowText>
        </h1>

        <motion.p
          className="hero-desc"
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, delay: 1 }}
        >
          {tr.hero.desc}
        </motion.p>

        <motion.div
          className="hero-buttons"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          <a href="#features" className="btn-primary">{tr.hero.cta1}</a>
          <a href="#how-it-works" className="btn-secondary">{tr.hero.cta2}</a>
        </motion.div>

        <motion.div
          className="scroll-indicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
        >
          <motion.div
            className="scroll-dot"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </section>

      {/* Features */}
      <section className="section" id="features">
        <ParallaxSection offset={30}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
          >
            <span className="section-label">{tr.features.label}</span>
            <h2 className="section-title">{tr.features.title}</h2>
            <p className="section-desc">{tr.features.desc}</p>
          </motion.div>
        </ParallaxSection>
        <div className="features-grid">
          {tr.features.items.map((f, i) => (
            <FeatureCard
              key={i}
              icon={featureIcons[i]}
              title={f.title}
              desc={f.desc}
              index={i}
              isRtl={isRtl}
            />
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="section-divider">
        <motion.div
          className="divider-line"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        />
        <div className="divider-glow" />
      </div>

      {/* How it Works */}
      <section className="section" id="how-it-works">
        <ParallaxSection offset={20}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
          >
            <span className="section-label">{tr.howItWorks.label}</span>
            <h2 className="section-title">{tr.howItWorks.title}</h2>
            <p className="section-desc">{tr.howItWorks.desc}</p>
          </motion.div>
        </ParallaxSection>
        <div className="steps">
          {tr.howItWorks.steps.map((s, i) => (
            <motion.div
              className="step"
              key={i}
              initial={{ opacity: 0, y: 40, filter: 'blur(6px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
            >
              <div className="step-icon-wrapper">
                <div className="step-number">{i + 1}</div>
                <div className="step-icon">{stepIcons[i]}</div>
              </div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="section-divider">
        <motion.div
          className="divider-line"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        />
        <div className="divider-glow" />
      </div>

      {/* Team */}
      <section className="section" id="team">
        <ParallaxSection offset={15}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
          >
            <span className="section-label">{tr.team.label}</span>
            <h2 className="section-title">{tr.team.title}</h2>
            <p className="section-desc">{tr.team.desc}</p>
          </motion.div>
        </ParallaxSection>
        <div className="team-grid">
          {team.map((member, i) => (
            <motion.div
              className="team-member"
              key={member.name}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
            >
              <img className="team-avatar" src={member.img} alt={isRtl ? member.nameAr : member.name} />
              <h3>{isRtl ? member.nameAr : member.name}</h3>
              <p>{isRtl ? member.roleAr : member.role}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-glow" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2>{tr.cta.title}</h2>
          <p>{tr.cta.desc}</p>
          <motion.a
            href="mailto:suhail@example.com"
            className="btn-primary btn-large"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            {tr.cta.button}
          </motion.a>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-logo">
          <Logo size={20} />
          <p>{tr.footer.copy}</p>
        </div>
        <div className="footer-links">
          <a href="#features">{tr.nav.features}</a>
          <a href="#how-it-works">{tr.nav.howItWorks}</a>
          <a href="#team">{tr.nav.team}</a>
        </div>
      </footer>
    </div>
  )
}

export default App
