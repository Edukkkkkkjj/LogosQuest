import { useState } from 'react'
import { useProgress, useSettings } from '../../app/providers'
import { AudioButton, AudioPlayer } from '../../components/AudioPlayer'
import { WordPanel } from '../../components/Cards'
import { EpistemicBadge } from '../../components/Morph'
import { Script } from '../../components/Script'
import type { ContentIndex } from '../../data'
import { isKnown } from '../progress/stats'
import { repo } from '../progress/repo'
import type { Text } from '../../types/content'

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)} className="flex min-h-11 items-center gap-2 text-sm">
      <span className={`inline-flex h-6 w-10 items-center rounded-full border border-line p-0.5 ${value ? 'justify-end bg-section' : 'justify-start bg-surface'}`}>
        <span className="h-4.5 w-4.5 rounded-full bg-bg ring-1 ring-line" />
      </span>
      {label}
    </button>
  )
}

/**
 * Leitor: cada palavra é tocável e abre sua ficha. Transliteração, glosas e
 * tradução são apoios que o leitor liga e desliga — o texto original é sempre
 * o maior elemento da tela.
 */
export function TextReader({ text, index, onFinish }: { text: Text; index: ContentIndex; onFinish?: (withoutTranslit: boolean) => void }) {
  const settings = useSettings()
  const { mastery } = useProgress()
  const language = text.languageId
  const [glosses, setGlosses] = useState(true)
  const [blind, setBlind] = useState(false)
  const [open, setOpen] = useState<{ v: number; w: number } | null>(null)
  const [translated, setTranslated] = useState<Set<number>>(new Set())
  const translit = settings.showTranslit

  return (
    <div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 border-y border-line py-2">
        <Toggle label="Transliteração" value={translit} onChange={(v) => void repo.updateSettings({ showTranslit: v })} />
        <Toggle label="Glosas sob as palavras" value={glosses} onChange={setGlosses} />
        <Toggle label="Ouvir sem ver" value={blind} onChange={setBlind} />
      </div>
      {translit && <p className="mt-2 text-xs text-muted">A transliteração é automática e aproximada: serve de apoio, não de análise fonológica.</p>}

      <ol className="mt-6 space-y-8">
        {text.verses.map((verse, vi) => {
          const phrase = { languageId: language, text: verse.words.map((w) => w.surface).join(' '), level: 'phrase' as const }
          const selected = open?.v === vi ? verse.words[open.w] : null
          return (
            <li key={verse.osis}>
              <div className="mb-2 flex items-center gap-3">
                <span className="label">{verse.ref}</span>
                {!blind && <AudioButton audio={phrase} label={`Ouvir ${verse.ref}`} />}
              </div>

              {blind ? (
                <AudioPlayer audio={phrase} hidden />
              ) : (
                <p dir={index.bundle.language.direction} className="flex flex-wrap gap-x-2 gap-y-3">
                  {verse.words.map((w, wi) => {
                    const stem = w.segments.find((s) => s.role === 'stem')?.lexemeId
                    const fresh = !!stem && !isKnown(mastery, stem)
                    const active = open?.v === vi && open.w === wi
                    return (
                      <button
                        key={w.id} type="button" onClick={() => setOpen(active ? null : { v: vi, w: wi })} aria-expanded={active}
                        className={`rounded-md px-1.5 pb-1 text-center transition-colors hover:bg-section-soft ${active ? 'bg-section-soft ring-2 ring-section' : ''}`}
                      >
                        <Script language={language} className={`block text-4xl ${fresh ? 'underline decoration-dotted decoration-1 underline-offset-[10px]' : ''}`}>
                          {w.surface}
                        </Script>
                        {translit && <span className="block text-xs text-muted" dir="ltr">{w.translit}</span>}
                        {glosses && <span className="block max-w-32 text-sm leading-tight" dir="ltr">{w.gloss}</span>}
                        {fresh && <span className="sr-only"> (palavra nova)</span>}
                      </button>
                    )
                  })}
                </p>
              )}

              {selected && <div className="mt-4"><WordPanel word={selected} verse={verse} index={index} onClose={() => setOpen(null)} /></div>}

              <div className="mt-3">
                {translated.has(vi) ? (
                  <p className="rise border-s-2 border-section ps-3 font-display text-lg italic">{verse.translation}</p>
                ) : (
                  <button type="button" className="label underline underline-offset-4" onClick={() => setTranslated(new Set(translated).add(vi))}>
                    mostrar tradução de trabalho
                  </button>
                )}
              </div>

              {text.notes.filter((n) => n.verse === verse.osis).map((n) => (
                <aside key={n.title} className="mt-3 border-s border-line ps-3 text-sm">
                  <p className="mb-1 flex flex-wrap items-center gap-2"><b>{n.title}</b><EpistemicBadge value={n.epistemic} /></p>
                  <p className="text-muted">{n.body}</p>
                </aside>
              ))}
            </li>
          )
        })}
      </ol>

      <p className="mt-6 text-xs text-muted">Palavras com sublinhado pontilhado ainda são novas para você.</p>
      {onFinish && (
        <button type="button" className="btn btn-primary mt-6 w-full" onClick={() => onFinish(!translit)}>Concluí a leitura</button>
      )}
    </div>
  )
}
