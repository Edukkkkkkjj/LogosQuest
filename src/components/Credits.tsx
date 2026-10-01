import { MEDIA } from './Cine'
import { SOURCES } from '../data'
import type { SourceEntry } from '../types/content'

const GROUPS: { title: string; blurb: string; filter: (s: SourceEntry) => boolean }[] = [
  {
    title: 'Textos, análise e léxico incorporados',
    blurb: 'Dados que estão dentro do aplicativo, usados conforme a licença de cada projeto.',
    filter: (s) => s.usage === 'incorporated' && ['text', 'morphology', 'lexicon'].includes(s.category),
  },
  {
    title: 'Professores e métodos que nos ensinaram a ensinar',
    blurb: 'Consultados como referência e inspiração pedagógica. Nenhum material deles foi copiado.',
    filter: (s) => s.category === 'pedagogy',
  },
  {
    title: 'Gramáticas e bases de dados consultadas',
    blurb: 'Usadas para conferir análises e descrições.',
    filter: (s) => s.usage === 'reference-only' && ['grammar', 'morphology', 'text', 'lexicon'].includes(s.category),
  },
  {
    title: 'Estudiosos de semântica, contexto e exegese',
    blurb: 'De quem vêm os cuidados de método e o pano de fundo histórico das notas.',
    filter: (s) => s.category === 'context',
  },
  {
    title: 'Pronúncia e áudio',
    blurb: 'Fontes das descrições de pronúncia e do áudio de apoio.',
    filter: (s) => s.category === 'audio',
  },
  {
    title: 'Fontes tipográficas e software',
    blurb: 'Componentes abertos sobre os quais o aplicativo foi construído.',
    filter: (s) => ['font', 'software'].includes(s.category),
  },
]

function Entry({ s }: { s: SourceEntry }) {
  return (
    <li className="grid gap-x-6 gap-y-1 border-t border-line py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div>
        <p className="font-semibold">
          {s.url ? <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-4 hover:decoration-section">{s.name}</a> : s.name}
        </p>
        <p className="label mt-1">{s.usage === 'incorporated' ? 'incorporado' : 'somente referência'} · {s.license}</p>
      </div>
      <div className="text-sm">
        <p>{s.purpose}</p>
        {s.attribution && <p className="mt-1 text-muted">{s.attribution}</p>}
      </div>
    </li>
  )
}

/** Créditos completos: de quem veio cada parte do que o aplicativo ensina. */
export function Credits() {
  return (
    <div className="space-y-10">
      <p className="max-w-2xl text-lg">
        Nada do que este aplicativo ensina nasceu aqui. O texto, a análise de cada palavra, o método e os cuidados
        acadêmicos vêm do trabalho de pessoas e instituições que os tornaram públicos. Esta é a lista delas, com o que
        foi usado de cada uma e sob qual licença.
      </p>
      {GROUPS.map((g) => {
        const list = SOURCES.filter(g.filter)
        if (!list.length) return null
        return (
          <section key={g.title}>
            <h2 className="text-2xl">{g.title}</h2>
            <p className="mt-1 text-sm text-muted">{g.blurb}</p>
            <ul className="mt-3">{list.map((s) => <Entry key={s.id} s={s} />)}</ul>
          </section>
        )
      })}
      <section>
        <h2 className="text-2xl">Imagens</h2>
        <p className="mt-1 text-sm text-muted">Obras e fotografias históricas em domínio público, com a instituição que as preserva.</p>
        <ul className="mt-3">
          {MEDIA.map((m) => (
            <li key={m.id} className="border-t border-line py-3 text-sm">
              <a href={m.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold underline decoration-line underline-offset-4">
                {m.author}, <i>{m.title}</i>
              </a>
              <span> — {m.date}. {m.institution}. </span>
              <span className="label">{m.license}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
