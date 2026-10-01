import type { ElementType, ReactNode } from 'react'
import type { LanguageId } from '../types/content'

const LANG: Record<LanguageId, { lang: string; dir: 'rtl' | 'ltr'; cls: string }> = {
  hebrew: { lang: 'he', dir: 'rtl', cls: 'script-he' },
  greek: { lang: 'grc', dir: 'ltr', cls: 'script-gr' },
}

/**
 * Texto na escrita original. Define idioma, direção e fonte no próprio elemento,
 * para que o hebraico fique da direita para a esquerda mesmo dentro de frases em português.
 */
export function Script({
  language, children, className = '', as: Tag = 'span',
}: { language: LanguageId; children: ReactNode; className?: string; as?: ElementType }) {
  const l = LANG[language]
  return (
    <Tag lang={l.lang} dir={l.dir} className={`script ${l.cls} ${className}`}>
      {children}
    </Tag>
  )
}
