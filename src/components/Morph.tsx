import { useState } from 'react'
import type { ContentIndex } from '../data'
import { CASE_ROLE_PT, morphLayers, summarizeMorph } from '../lib/morph/describe'
import type { Epistemic, LanguageId, Lexeme, Segment, WordOccurrence } from '../types/content'
import { Script } from './Script'

const EPISTEMIC: Record<Epistemic, string> = {
  fact: 'fato do texto', consensus: 'consenso acadêmico', hypothesis: 'hipótese', debated: 'debatido',
  tradition: 'tradição interpretativa', inference: 'inferência',
}

/** Deixa explícito o grau de certeza de uma afirmação. */
export function EpistemicBadge({ value }: { value: Epistemic }) {
  return <span className="label rounded-sm border border-line px-1.5 py-0.5">{EPISTEMIC[value]}</span>
}

const ROLE: Record<Segment['role'], string> = { prefix: 'prefixo', stem: 'base', suffix: 'sufixo' }

function lexemeOf(index: ContentIndex, seg: Segment): Lexeme | undefined {
  const i = seg.lexemeId ? index.items.get(seg.lexemeId) : undefined
  return i?.kind === 'lexeme' ? i : undefined
}

function segmentGloss(index: ContentIndex, seg: Segment): string {
  if (seg.role === 'suffix') return summarizeMorph(seg.morph).replace(/^sufixo ?/, '') || 'sufixo'
  return lexemeOf(index, seg)?.glosses[0] ?? ''
}

/**
 * Sistema II — a palavra como objeto técnico. Cada peça (prefixo, base, sufixo)
 * tem sua linha de cota e sua etiqueta; "desmontar" afasta as peças (vista explodida)
 * e tocar em uma peça revela a análise em camadas, uma de cada vez.
 */
export function MorphBlueprint({ word, language, index }: { word: WordOccurrence; language: LanguageId; index: ContentIndex }) {
  const [exploded, setExploded] = useState(false)
  const [active, setActive] = useState<number | null>(null)
  const [depth, setDepth] = useState(1)
  const single = word.segments.length === 1
  const seg = active !== null ? word.segments[active] : null
  const layers = seg ? morphLayers(seg.morph) : []
  const lex = seg ? lexemeOf(index, seg) : undefined

  return (
    <div className="blueprint rounded-lg border border-line p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="label">peças da palavra</p>
        {!single && (
          <button type="button" className="label underline underline-offset-4" onClick={() => setExploded((v) => !v)} aria-pressed={exploded}>
            {exploded ? 'montar' : 'desmontar'}
          </button>
        )}
      </div>

      <div dir={language === 'hebrew' ? 'rtl' : 'ltr'} className="mt-3 flex flex-wrap items-start justify-center">
        {word.segments.map((s, i) => (
          <button
            key={i} type="button" data-role={s.role} data-active={active === i}
            onClick={() => {
              setActive(i)
              setDepth(1)
              setExploded(true)
            }}
            className="bp-piece text-center" style={{ marginInline: exploded ? '0.7rem' : '-0.75px' }}
            aria-label={`${ROLE[s.role]}: ${s.text}`}
          >
            <Script language={language} className="block text-4xl">{s.text}</Script>
            <span className="bp-cota block" aria-hidden="true" />
            <span className="label block" dir="ltr">{ROLE[s.role]}</span>
            {exploded && <span className="block max-w-28 text-sm leading-tight" dir="ltr">{segmentGloss(index, s)}</span>}
          </button>
        ))}
      </div>

      {!seg && <p className="mt-3 text-center text-sm text-muted">Toque em uma peça para ver a análise.</p>}

      {seg && (
        <div className="mt-4 border-t border-line pt-3" aria-live="polite">
          <ol className="space-y-1.5 text-sm">
            {lex && (
              <li className="flex items-baseline gap-2">
                <span className="label w-28 shrink-0">lema</span>
                <span><Script language={language} className="text-xl">{lex.lemma}</Script> — {lex.glosses.join(', ')}</span>
              </li>
            )}
            {layers.slice(0, depth).map((l) => (
              <li key={l.feature} className="rise flex items-baseline gap-2">
                <span className="label w-28 shrink-0">{l.label}</span>
                <span>
                  {l.value}
                  {l.feature === 'case' && seg.morph.case && <span className="text-muted"> — {CASE_ROLE_PT[seg.morph.case]}</span>}
                </span>
              </li>
            ))}
          </ol>
          {depth < layers.length ? (
            <button type="button" className="btn btn-ghost mt-3 min-h-11 text-sm" onClick={() => setDepth((d) => d + 1)}>
              Revelar próxima camada ({depth}/{layers.length})
            </button>
          ) : (
            <p className="mt-3 text-xs text-muted">
              Código na fonte ({seg.morph.source === 'oshb' ? 'OSHB' : 'MorphGNT'}): <code>{seg.morph.code}</code>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
