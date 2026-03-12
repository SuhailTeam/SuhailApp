import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Eye, BookOpen, UserCheck, Search, Banknote, Palette } from 'lucide-react'
import type { Lang } from '../i18n'
import { t } from '../i18n'

interface FeaturesProps {
  lang: Lang
}

const icons = [
  <Eye size={24} strokeWidth={1.5} />,
  <BookOpen size={24} strokeWidth={1.5} />,
  <UserCheck size={24} strokeWidth={1.5} />,
  <Search size={24} strokeWidth={1.5} />,
  <Banknote size={24} strokeWidth={1.5} />,
  <Palette size={24} strokeWidth={1.5} />,
]

export default function Features({ lang }: FeaturesProps) {
  const tr = t(lang)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="features" className="section features-section" ref={ref}>
      <motion.div
        className="section-header"
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="section-label">{tr.features.label}</span>
        <h2 className="section-title">{tr.features.title}</h2>
        <p className="section-desc">{tr.features.desc}</p>
      </motion.div>

      <div className="features-grid">
        {tr.features.items.map((item, i) => (
          <motion.div
            key={i}
            className="feature-card"
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: 0.6,
              delay: 0.1 + i * 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <div className="feature-icon">{icons[i]}</div>
            <h3 className="feature-title">{item.title}</h3>
            <p className="feature-desc">{item.desc}</p>
            <div className="feature-card-glow" />
          </motion.div>
        ))}
      </div>
    </section>
  )
}
