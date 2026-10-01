import type { CSSProperties, ReactNode } from 'react'
import mediaJson from '../../content/media/manifest.json'

export interface MediaEntry {
  id: string
  file: string
  title: string
  author: string
  date: string
  institution: string
  sourceUrl: string
  license: string
  alt: string
  /** ponto que nunca pode ser coberto por texto (0–1) */
  focal: { x: number; y: number }
  textSide: string
}

export const MEDIA = mediaJson as MediaEntry[]

export function media(id: string): MediaEntry {
  const m = MEDIA.find((x) => x.id === id)
  if (!m) throw new Error(`imagem não cadastrada: ${id}`)
  return m
}

const url = (file: string) => import.meta.env.BASE_URL + file

/** Crédito da obra: autor, título, data, instituição e licença. */
export function Credit({ id, className = '' }: { id: string; className?: string }) {
  const m = media(id)
  return (
    <p className={`credit ${className}`}>
      {m.author}, <i>{m.title}</i>, {m.date}. {m.institution}. {m.license}.
    </p>
  )
}

/**
 * Sistema I — cinematográfico. O texto nunca fica sobre o ponto focal:
 *   - por padrão a imagem ocupa a parte de cima e o texto se apoia na faixa
 *     inferior, onde a imagem já se dissolveu em carvão;
 *   - em telas largas, imagens verticais (textSide "right") ficam à esquerda
 *     e o texto vai para a direita.
 */
export function Cine({
  mediaId, children, className = '', minHeight = 'min-h-[30rem]', imageHeight = '68%', layout = 'auto',
}: { mediaId: string; children: ReactNode; className?: string; minHeight?: string; imageHeight?: string; layout?: 'auto' | 'bottom' }) {
  const m = media(mediaId)
  const side = layout === 'auto' && m.textSide === 'right'
  return (
    <section className={`cine flex flex-col justify-end ${side ? 'cine-side' : ''} ${minHeight} ${className}`} style={{ '--cine-h': imageHeight } as CSSProperties}>
      <div className="cine-media">
        <img
          style={{ objectPosition: `${m.focal.x * 100}% ${m.focal.y * 100}%` }}
          src={url(m.file)} srcSet={`${url(m.file.replace('.webp', '-sm.webp'))} 800w, ${url(m.file)} 1600w`}
          sizes="(max-width: 800px) 100vw, 60vw" alt={m.alt} decoding="async"
        />
        <div className="cine-shade" aria-hidden="true" />
      </div>
      <div className="cine-fog" aria-hidden="true" />
      <div className="cine-grain" aria-hidden="true" />
      <div className="cine-body relative px-5 pb-4 sm:px-8">{children}</div>
      <Credit id={mediaId} className="relative px-5 pb-3 sm:px-8" />
    </section>
  )
}

/** Miniatura subordinada ao conteúdo (Sistema III): cabeçalho estreito com crédito. */
export function Thumb({ mediaId, className = '' }: { mediaId: string; className?: string }) {
  const m = media(mediaId)
  return (
    <figure className={className}>
      <img
        className="h-full w-full rounded-md object-cover" style={{ objectPosition: `${m.focal.x * 100}% ${m.focal.y * 100}%` }}
        src={url(m.file.replace('.webp', '-sm.webp'))} alt={m.alt} loading="lazy" decoding="async"
      />
    </figure>
  )
}
