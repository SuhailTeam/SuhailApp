import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import type { Lang } from '../i18n'
import { t } from '../i18n'

import alqobaisiImg from '../assets/team/alqobaisi.jpeg'
import alqahtaniImg from '../assets/team/alqahtani.jpeg'
import alaboudImg from '../assets/team/alaboud.jpeg'
import alyousefImg from '../assets/team/alyousef.jpeg'

interface TeamProps {
  lang: Lang
}

const members = [
  { name: 'Abdullah Alqobaisi', nameAr: 'عبدالله القبيسي', img: alqobaisiImg },
  { name: 'Faisal Alqahtani', nameAr: 'فيصل القحطاني', img: alqahtaniImg },
  { name: 'Nasser Alaboud', nameAr: 'ناصر العبود', img: alaboudImg },
  { name: 'Abdullah Alyousef', nameAr: 'عبدالله اليوسف', img: alyousefImg },
]

export default function Team({ lang }: TeamProps) {
  const tr = t(lang)
  const isRtl = lang === 'ar'
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="team" className="section team-section" ref={ref}>
      <motion.div
        className="section-header"
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="section-label">{tr.team.label}</span>
        <h2 className="section-title">{tr.team.title}</h2>
        <p className="section-desc">{tr.team.desc}</p>
      </motion.div>

      <div className="team-grid">
        {members.map((member, i) => (
          <motion.div
            key={member.name}
            className="team-card"
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: 0.6,
              delay: 0.15 + i * 0.1,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <div className="team-photo-wrap">
              <img
                src={member.img}
                alt={isRtl ? member.nameAr : member.name}
                className="team-photo"
              />
            </div>
            <div className="team-info">
              <h3 className="team-name">{isRtl ? member.nameAr : member.name}</h3>
              <p className="team-role">{isRtl ? 'مطوّر' : 'Developer'}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
