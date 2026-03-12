import type { Lang } from '../i18n'
import { t } from '../i18n'

interface FooterProps {
  lang: Lang
}

export default function Footer({ lang }: FooterProps) {
  const tr = t(lang)

  return (
    <footer className="footer">
      <div className="footer-inner">
        <p className="footer-copy">{tr.footer.copy}</p>
      </div>
    </footer>
  )
}
