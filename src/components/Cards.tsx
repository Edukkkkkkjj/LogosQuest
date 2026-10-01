import { usePronunciation, useSettings } from '../app/providers'
import type { ContentIndex } from '../data'
import { audioOf } from '../features/game/generators/core'
import { POS_PT } from '../lib/morph/describe'
import type { CultureWindow, Glyph, LearningItem, Lexeme, Verse, WordOccurrence } from '../types/content'
import { AudioButton, AudioPlayer } from './AudioPlayer'
import { EpistemicBadge, MorphBlueprint } from './Morph'
import { Script } from './Script'

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="h-2 w-full overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full bg-section transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  )
}

function GlyphCard({ g }: { g: Glyph }) {
  const model = usePronunciation(g.languageId)
  const sound = g.sound[model.id] ?? Object.values(g.sound)[0]
  return (
    <>
      <p className="label">{g.kind === 'letter' ? 'letra' : g.kind === 'vowel' ? 'vogal' : 'sinal'}</p>
      <div className="mt-2 flex items-center justify-center gap-6">
        <Script language={g.languageId} className="ink-dry text-8xl leading-none">{g.display}</Script>
        {g.upper && <Script language={g.languageId} className="text-6xl text-muted">{g.upper}</Script>}
        {g.finalForm && (
          <span className="text-center">
            <Script language={g.languageId} className="block text-6xl text-muted">{g.finalForm}</Script>
            <span className="label">forma final</span>
          </span>
        )}
      </div>
      <h2 className="mt-4 text-center text-3xl">{g.name}</h2>
      {g.translit && <p className="text-center text-muted">transliteração: {g.translit}</p>}
      <div className="mt-4 flex justify-center"><AudioPlayer audio={audioOf(g)} /></div>
      <p className="mt-4">{sound}</p>
      <p className="mt-1 text-xs text-muted">Descrição segundo o modelo: {model.name}.</p>
      {g.note && <p className="mt-3 text-sm">{g.note}</p>}
      {g.origin && (
        <div className="mt-4 border-t border-line pt-3 text-sm">
          <p className="mb-1 flex items-center gap-2"><span className="label">origem do nome</span><EpistemicBadge value={g.origin.epistemic} /></p>
          <p className="text-muted">{g.origin.text}</p>
        </div>
      )}
    </>
  )
}

function LexemeCard({ l }: { l: Lexeme }) {
  const { showTranslit } = useSettings()
  return (
    <>
      <p className="label">{POS_PT[l.pos] ?? l.pos}</p>
      <Script language={l.languageId} as="p" className="ink-dry mt-2 text-center text-7xl">{l.lemma}</Script>
      {showTranslit && <p className="mt-1 text-center text-lg text-muted">{l.translit}</p>}
      <div className="mt-3 flex justify-center"><AudioPlayer audio={audioOf(l)} /></div>
      <h2 className="mt-4 text-center text-3xl">{l.glosses[0]}</h2>
      {l.glosses.length > 1 && <p className="text-center text-muted">também: {l.glosses.slice(1).join(', ')}</p>}
      {l.usageNote && <p className="mt-4 border-t border-line pt-3 text-sm">{l.usageNote}</p>}
      {l.root && (
        <p className="mt-3 text-sm text-muted">
          Família: <Script language={l.languageId} className="text-lg text-fg">{l.root.letters}</Script>
        </p>
      )}
    </>
  )
}

/** Cartão de apresentação de um item: ver, ouvir, repetir mentalmente. */
export function ItemCard({ item }: { item: LearningItem }) {
  return (
    <article className="rise mx-auto max-w-lg rounded-xl border border-line bg-surface p-6">
      {item.kind === 'lexeme' ? <LexemeCard l={item} /> : <GlyphCard g={item} />}
    </article>
  )
}

/** "Abra a janela": texto bíblico, contexto histórico e inferência, rotulados em separado. */
export function WindowCard({ w }: { w: CultureWindow }) {
  return (
    <article className="overflow-hidden rounded-lg border-2 border-section bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-section-soft px-4 py-2">
        <p className="label">abra a janela · {w.topic}</p>
        <EpistemicBadge value={w.epistemic} />
      </header>
      <div className="space-y-3 p-4 text-sm">
        <h3 className="text-xl">{w.title}</h3>
        <p><span className="label mr-2">texto bíblico</span>{w.text}</p>
        <p><span className="label mr-2">contexto histórico</span>{w.context}</p>
        {w.inference && <p><span className="label mr-2">inferência</span>{w.inference}</p>}
        {w.references.length > 0 && <p className="text-xs text-muted">Referências: {w.references.join('; ')}.</p>}
      </div>
    </article>
  )
}

/**
 * Painel de palavra: ficha de catálogo de museu. A palavra no topo; o resto em
 * camadas que o leitor abre quando quiser (progressive disclosure).
 */
export function WordPanel({
  word, verse, index, onClose,
}: { word: WordOccurrence; verse: Verse; index: ContentIndex; onClose: () => void }) {
  const { showTranslit } = useSettings()
  const language = index.bundle.language.id
  const stem = word.segments.find((s) => s.role === 'stem')
  const item = stem?.lexemeId ? index.items.get(stem.lexemeId) : undefined
  const lex = item?.kind === 'lexeme' ? item : undefined
  const related = lex ? (index.byLexeme.get(lex.id) ?? []).filter((o) => o.word.id !== word.id).slice(0, 6) : []
  const windows = index.bundle.windows.filter((w) => lex?.windowIds?.includes(w.id))
  const family = lex?.root ? index.bundle.lexemes.filter((l) => l.id !== lex.id && l.root?.letters === lex.root!.letters) : []

  return (
    <aside className="rise rounded-xl border border-line bg-surface shadow-[0_8px_30px_rgb(0_0_0/0.12),0_2px_6px_rgb(0_0_0/0.08)]" aria-label={`Ficha da palavra ${word.plain}`}>
      <header className="flex items-start justify-between gap-3 border-b border-line p-4">
        <div>
          <p className="label">{verse.ref}</p>
          <div className="flex items-center gap-3">
            <Script language={language} className="text-5xl">{word.plain}</Script>
            <AudioButton audio={{ languageId: language, text: word.plain, level: 'word' }} label={`Ouvir ${word.plain}`} />
          </div>
          {showTranslit && <p className="text-muted">{word.translit} <span className="text-xs">(transliteração aproximada)</span></p>}
          <p className="mt-1 text-lg">neste versículo: <b>{word.gloss}</b></p>
        </div>
        <button type="button" onClick={onClose} className="btn btn-ghost min-h-11 px-3" aria-label="Fechar ficha">✕</button>
      </header>

      <div className="divide-y divide-line">
        <details open className="p-4">
          <summary className="label cursor-pointer">morfologia</summary>
          <div className="mt-3"><MorphBlueprint word={word} language={language} index={index} /></div>
        </details>

        {lex && (
          <details className="p-4">
            <summary className="label cursor-pointer">lema e sentidos</summary>
            <div className="mt-2 text-sm">
              <p><Script language={language} className="text-2xl">{lex.lemma}</Script> <span className="text-muted">({lex.translit})</span> — {POS_PT[lex.pos] ?? lex.pos}</p>
              <p className="mt-1">{lex.glosses.join(' · ')}</p>
              <p className="mt-1 text-xs text-muted">As glosas indicam o campo de sentido da palavra. A tradução em cada versículo depende do contexto.</p>
              {lex.usageNote && <p className="mt-2">{lex.usageNote}</p>}
              {lex.strong && <p className="mt-2 text-xs text-muted">Strong estendido: {lex.strong} (um índice de consulta, não uma análise).</p>}
            </div>
          </details>
        )}

        {lex?.root && (
          <details className="p-4">
            <summary className="label cursor-pointer">família de palavras</summary>
            <div className="mt-2 text-sm">
              <p><Script language={language} className="text-2xl">{lex.root.letters}</Script></p>
              {family.length > 0 && (
                <ul className="mt-1">
                  {family.map((f) => (
                    <li key={f.id}><Script language={language} className="text-xl">{f.lemma}</Script> — {f.glosses[0]}</li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-muted">A família ajuda a memória, mas não determina o sentido: cada palavra significa o que significa no uso.</p>
            </div>
          </details>
        )}

        {related.length > 0 && (
          <details className="p-4">
            <summary className="label cursor-pointer">outras ocorrências ({related.length})</summary>
            <ul className="mt-2 space-y-1 text-sm">
              {related.map((o) => (
                <li key={o.word.id} className="flex items-baseline gap-2">
                  <Script language={language} className="text-xl">{o.word.plain}</Script>
                  <span>{o.word.gloss}</span>
                  <span className="text-xs text-muted">{o.text.verses[o.verseIndex].ref}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        {windows.map((w) => (
          <details key={w.id} className="p-4">
            <summary className="label cursor-pointer">abra a janela: {w.title}</summary>
            <div className="mt-3"><WindowCard w={w} /></div>
          </details>
        ))}
      </div>
    </aside>
  )
}
