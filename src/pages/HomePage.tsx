import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProgress } from '../app/providers'
import { Cine } from '../components/Cine'
import { Credits } from '../components/Credits'
import { Script } from '../components/Script'
import { LANGUAGES } from '../data'
import type { Language } from '../types/content'

const WORLD: Record<string, { media: string; lead: string; first: string }> = {
  hebrew: { media: 'he-world', lead: 'Do alef ao Salmo 23: letras, vogais, palavras e os primeiros textos da Bíblia Hebraica.', first: 'בְּרֵאשִׁית' },
  greek: { media: 'gr-world', lead: 'Do alfa ao Pai Nosso: a língua comum do Mediterrâneo no século I, a do Novo Testamento.', first: 'Ἐν ἀρχῇ' },
}

function World({ language, order }: { language: Language; order: string }) {
  const { lessons } = useProgress()
  const done = [...lessons.values()].filter((l) => l.languageId === language.id && l.completions > 0).length
  const w = WORLD[language.id]
  return (
    <div data-section={language.id} className={order}>
      <Cine mediaId={w.media} minHeight="min-h-[34rem] md:min-h-[40rem]" imageHeight="62%" className="h-full" layout="bottom">
        <div className="gridpanel mx-auto max-w-md text-center">
          <Script language={language.id} as="p" className="text-5xl text-[#f3ead9]">{w.first}</Script>
          <h2 className="mt-1 text-4xl">{language.name}</h2>
          <p className="mx-auto mt-3 max-w-sm text-[#e7dcc8]">{w.lead}</p>
          <Link to={`/${language.id}`} className="btn btn-primary mt-5 px-8">
            {done > 0 ? 'Continuar' : 'Começar'}
          </Link>
          <p className="label mt-3">{done > 0 ? `${done} ${done === 1 ? 'lição concluída' : 'lições concluídas'}` : 'do zero, sem pré-requisitos'}</p>
        </div>
      </Cine>
    </div>
  )
}

type Tab = 'jornada' | 'creditos'

export function HomePage() {
  const [tab, setTab] = useState<Tab>('jornada')
  const hebrew = LANGUAGES.find((l) => l.id === 'hebrew')!
  const greek = LANGUAGES.find((l) => l.id === 'greek')!
  const tabBtn = (id: Tab, label: string) => (
    <button
      type="button" role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} onClick={() => setTab(id)}
      className={`label border-b-2 px-3 py-4 sm:px-4 ${tab === id ? 'border-accent text-[#f3ead9]' : 'border-transparent text-[#b9ae9a]'}`}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-dvh bg-charcoal text-[#f3ead9]">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center px-2">
        <div role="tablist" aria-label="Tela inicial" className="flex">
          {tabBtn('jornada', 'Jornada')}
          {tabBtn('creditos', 'Créditos')}
        </div>
        <nav className="ml-auto flex" aria-label="Outras páginas">
          <Link to="/fontes" className="label px-3 py-4 text-[#b9ae9a]">Fontes<span className="hidden sm:inline"> e metodologia</span></Link>
          <Link to="/ajustes" className="label px-3 py-4 text-[#b9ae9a]">Ajustes</Link>
        </nav>
      </header>

      {tab === 'jornada' && (
        <main role="tabpanel" id="panel-jornada" aria-labelledby="tab-jornada">
          <div className="mx-auto max-w-2xl px-5 pt-6 pb-8 text-center">
            <p className="label text-accent">a jornada dos originais</p>
            <h1 className="mt-2 text-5xl sm:text-6xl">LogosQuest</h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-[#d9cdb8]">
              Aprenda a ler a Bíblia nas línguas em que foi escrita. Um passo de cada vez, ouvindo, reconhecendo e
              lendo textos reais — até pensar: <i className="font-display">eu consigo ler isso.</i>
            </p>
          </div>
          {/* composição simétrica: grego à esquerda, hebraico à direita, um eixo fino entre os dois */}
          <div className="relative mx-auto grid max-w-6xl md:grid-cols-2">
            <World language={hebrew} order="md:order-2" />
            <World language={greek} order="md:order-1" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px bg-gradient-to-b from-transparent via-accent/70 to-transparent md:block" />
          </div>
          <p className="mx-auto max-w-2xl px-5 py-8 text-center text-sm text-[#b9ae9a]">
            Seu progresso fica salvo neste aparelho, automaticamente, e o aplicativo funciona sem internet depois do
            primeiro acesso. Estudo linguístico, sem vínculo denominacional.
          </p>
        </main>
      )}

      {tab === 'creditos' && (
        <main role="tabpanel" id="panel-creditos" aria-labelledby="tab-creditos" data-section="sources" className="bg-bg text-fg">
          <div className="mx-auto max-w-4xl px-5 py-10">
            <p className="label text-section">a quem devemos</p>
            <h1 className="mt-2 mb-6 text-4xl">Créditos</h1>
            <Credits />
          </div>
        </main>
      )}
    </div>
  )
}
