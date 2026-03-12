import { motion } from 'framer-motion'
import type { Lang } from '../i18n'
import { t } from '../i18n'
import StarField from './StarField'
import logoImg from '../assets/logo.png'

interface HeroProps {
  lang: Lang
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.3 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
}

export default function Hero({ lang }: HeroProps) {
  const tr = t(lang)

  return (
    <section className="hero">
      <StarField />

      <div className="hero-glow" />

      <motion.div
        className="hero-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="hero-badge" variants={itemVariants}>
          <span className="badge-dot" />
          {tr.hero.badge}
        </motion.div>

        <motion.div className="hero-logo-wrap" variants={itemVariants}>
          <img src={logoImg} alt="Suhail" className="hero-logo" />
        </motion.div>

        <motion.h1 className="hero-title" variants={itemVariants}>
          <span className="hero-title-line1">{tr.hero.titleLine1}</span>
          <br />
          <span className="hero-title-line2">{tr.hero.titleLine2}</span>
        </motion.h1>

        <motion.p className="hero-desc" variants={itemVariants}>
          {tr.hero.desc}
        </motion.p>

        <motion.div className="hero-ctas" variants={itemVariants}>
          <a href="#features" className="btn-primary">{tr.hero.cta1}</a>
          <a href="#how-it-works" className="btn-outline">{tr.hero.cta2}</a>
        </motion.div>
      </motion.div>
    </section>
  )
}
