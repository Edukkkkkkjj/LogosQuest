import { useState } from 'react'
import { useCourse } from '../app/LanguageLayout'
import { EpistemicBadge } from '../components/Morph'
import { Script } from '../components/Script'
import type { LanguageId, Secret } from '../types/content'

const CATEGORY: Record<Secret['category'], string> = {
  repetition: 'repetição', 'root-repetition': 'família repetida', paronomasia: 'paronomásia', alliteration: 'aliteração',
  assonance: 'assonância e rima', parallelism: 'estrutura', contrast: 'contraste', ambiguity: 'ambiguidade',
  polysemy: 'polissemia', idiom: 'expressão idiomática', 'not-wordplay': 'será mesmo?',
}

const VERDICTS: { value: Secret['verdict']; label: string }[] = [
  { value: 'yes', label: 'Sim' },
  { value: 'possibly', label: 'Possivelmente' },
  { value: 'no', label: 'Não é um jogo de palavras' },
]

/**
 * Um "segredo do texto": mostra o fenômeno, pede o julgamento do leitor e só
 * então dá o veredito — com o grau de certeza e as referências à vista.
 */
export function SecretCard({ secret, language }: { secret: Secret; language: LanguageId }) {
  const [picked, setPicked] = useState<Secret['verdict'] | null>(null)
  const word = (w: NonNullable<Secret['wordB']>) => (
    <div className="min-w-0 flex-1 px-3 py-2 text-center">
      <Script language={language} as="p" className="text-3xl break-words sm:text-4xl">{w.text}</Script>
      <p className="text-sm text-muted">{w.translit}</p>
      <p className="font-display italic">{w.gloss}</p>
    </div>
  )
  return (
    <article className="relative overflow-hidden rounded-xl border border-line bg-surface p-5 sm:p-6">
      <span className="quote-mark" aria-hidden="true">“</span>
      <div className="relative">
        <p className="label">{secret.ref} · {CATEGORY[secret.category]}</p>
        <h3 className="mt-1 text-2xl">{secret.title}</h3>
        <p className="mt-2">{secret.observe}</p>

        {/* colunas comparativas separadas por uma linha vertical sólida na cor da seção */}
        <div className="my-5 flex flex-col divide-y-2 divide-section sm:flex-row sm:divide-x-2 sm:divide-y-0">
          {word(secret.wordA)}
          {secret.wordB && word(secret.wordB)}
        </div>

        <p className="font-display text-xl italic">{secret.question}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3" role="group" aria-label="Sua resposta">
          {VERDICTS.map((v) => {
            const state = !picked ? undefined : v.value === secret.verdict ? 'correct' : v.value === picked ? 'wrong' : 'dim'
            return (
              <button key={v.value} type="button" className="opt justify-center text-center" data-state={state} disabled={!!picked} onClick={() => setPicked(v.value)}>
                {state === 'correct' && <span aria-hidden="true">✓</span>}
                {state === 'wrong' && <span aria-hidden="true">✗</span>}
                {v.label}
              </button>
            )
          })}
        </div>

        {picked && (
          <div className="rise mt-4 border-t border-line pt-4" role="status">
            <p className="mb-2 flex flex-wrap items-center gap-2">
              <b>{VERDICTS.find((v) => v.value === secret.verdict)!.label}.</b>
              <EpistemicBadge value={secret.epistemic} />
            </p>
            <p>{secret.explanation}</p>
            {secret.references.length > 0 && <p className="mt-2 text-xs text-muted">Para conferir: {secret.references.join('; ')}</p>}
          </div>
        )}
      </div>
    </article>
  )
}

export default function SecretsPage() {
  const { bundle } = useCourse()
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="label text-section">o que se perde na tradução</p>
      <h1 className="mt-1 text-4xl">Segredos do texto</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">
        Repetições, rimas, contrastes e ambiguidades que só aparecem no original. Em cada caso você julga primeiro; depois
        vê o que os estudiosos dizem — inclusive quando discordam, e quando a resposta é “não”.
      </p>
      <div className="mt-8 space-y-6">
        {bundle.secrets.map((s) => <SecretCard key={s.id} secret={s} language={bundle.language.id} />)}
      </div>
    </div>
  )
}
