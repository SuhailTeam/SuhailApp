import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Glasses, Mic, Brain, Volume2 } from 'lucide-react'
import type { Lang } from '../i18n'
import { t } from '../i18n'

interface HowItWorksProps {
  lang: Lang
}

const stepIcons = [
  <Glasses size={24} strokeWidth={1.5} />,
  <Mic size={24} strokeWidth={1.5} />,
  <Brain size={24} strokeWidth={1.5} />,
  <Volume2 size={24} strokeWidth={1.5} />,
]

export default function HowItWorks({ lang }: HowItWorksProps) {
  const tr = t(lang)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="how-it-works" className="section how-section" ref={ref}>
      <motion.div
        className="section-header"
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="section-label">{tr.howItWorks.label}</span>
        <h2 className="section-title">{tr.howItWorks.title}</h2>
        <p className="section-desc">{tr.howItWorks.desc}</p>
      </motion.div>

      <div className="steps">
        {tr.howItWorks.steps.map((step, i) => (
          <motion.div
            key={i}
            className="step"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: 0.7,
              delay: 0.2 + i * 0.12,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <div className="step-indicator">
              <div className="step-number">{String(i + 1).padStart(2, '0')}</div>
              {i < 3 && <div className="step-line" />}
            </div>
            <div className="step-content">
              <div className="step-icon">{stepIcons[i]}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-desc">{step.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
