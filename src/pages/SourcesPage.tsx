import { Link } from 'react-router-dom'
import { useAudio } from '../app/providers'
import { Cine } from '../components/Cine'
import { Credits } from '../components/Credits'
import { LANGUAGES } from '../data'

const METHOD: { title: string; body: string }[] = [
  { title: 'Reconhecer antes de decorar', body: 'Cada conceito aparece primeiro em uso — você vê, ouve e é levado a notar o padrão; a regra vem depois, com nome. A inspiração é o ensino por exposição de Aleph with Beth e Alpha with Angela, combinado com explicação explícita quando ela ajuda.' },
  { title: 'Microlições e retorno constante', body: 'Lições curtas, com poucos itens novos, que sempre trazem de volta material antigo misturado ao novo (interleaving). Recuperar da memória fixa mais do que reler.' },
  { title: 'Repetição espaçada (FSRS)', body: 'Cada item tem um cartão no algoritmo FSRS, que estima quando você está prestes a esquecê-lo e agenda a revisão para esse momento. O erro não é punido: ele só antecipa a próxima revisão.' },
  { title: 'Domínio em seis dimensões', body: 'Uma palavra pode ser conhecida pelo sentido e ainda desconhecida de ouvido ou flexionada. Por isso o app acompanha em separado: lema, forma, significado, escuta, leitura e morfologia.' },
  { title: 'Desbloqueio por domínio', body: 'A unidade seguinte abre quando você demonstra o domínio mínimo das habilidades da atual (em geral 80%), não por simplesmente terminar as lições. Tudo o que já abriu fica livre para revisão.' },
  { title: 'Exercícios gerados dos dados', body: 'As perguntas nascem do texto anotado (lema e morfologia de cada palavra) e do conteúdo declarativo. Um validador confere a cada mudança que não há palavra sem lema, ocorrência sem análise ou exercício inválido.' },
]

const PRINCIPLES: { title: string; body: string }[] = [
  { title: 'Etimologia não é significado', body: 'A raiz ou a origem de uma palavra não determina o que ela quer dizer em cada ocorrência. O sentido vem do uso no contexto. O app nunca ensina “a raiz X significa Y, logo toda ocorrência carrega Y”.' },
  { title: 'Lema, forma e ocorrência são coisas diferentes', body: 'O dicionário registra o lema; o texto traz formas flexionadas; cada ocorrência tem sua análise e sua tradução contextual. As glosas indicam um campo de sentido, não “o” significado.' },
  { title: 'Fato, hipótese e tradição ficam rotulados', body: 'Toda nota traz um selo: fato do texto, consenso acadêmico, hipótese, debatido, tradição interpretativa ou inferência. Quando os especialistas divergem, a divergência é mostrada.' },
  { title: 'Números de Strong são um índice', body: 'Servem para localizar uma palavra em obras de referência. Não são uma análise linguística, e o app não os usa como tal.' },
  { title: 'Estudo linguístico, sem vínculo denominacional', body: 'O objetivo é ler o texto com precisão — não confirmar uma interpretação. Onde uma questão é teológica, o app descreve o que a língua permite e para aí.' },
]

/** "Fontes e metodologia": a confiabilidade acadêmica faz parte do produto. */
export default function SourcesPage() {
  const { engine } = useAudio()
  return (
    <div data-section="sources" className="min-h-dvh bg-bg text-fg">
      <Cine mediaId="sources" minHeight="min-h-[30rem]" imageHeight="74%">
        <div className="gridpanel mx-auto max-w-xl text-center">
          <p className="label">de onde vem o que você aprende aqui</p>
          <h1 className="mt-1 text-4xl sm:text-5xl">Fontes e metodologia</h1>
          <p className="mt-3 text-[#e7dcc8]">Ler com a mente e com o afeto — e saber de quem se aprendeu.</p>
        </div>
      </Cine>

      <div className="mx-auto max-w-4xl px-5 py-10">
        <Link to="/" className="label py-3">← início</Link>

        <section className="mt-6">
          <h2 className="text-3xl">Como o curso ensina</h2>
          <dl className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {METHOD.map((m) => (
              <div key={m.title} className="border-t border-line pt-3"><dt className="font-semibold">{m.title}</dt><dd className="mt-1 text-sm text-muted">{m.body}</dd></div>
            ))}
          </dl>
        </section>

        <section className="mt-12">
          <h2 className="text-3xl">Cuidados acadêmicos</h2>
          <dl className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {PRINCIPLES.map((m) => (
              <div key={m.title} className="border-t border-line pt-3"><dt className="font-semibold">{m.title}</dt><dd className="mt-1 text-sm text-muted">{m.body}</dd></div>
            ))}
          </dl>
        </section>

        <section className="mt-12">
          <h2 className="text-3xl">Pronúncia e áudio</h2>
          <p className="mt-2 max-w-2xl text-muted">
            Ninguém gravou os autores bíblicos: toda pronúncia de hebraico bíblico ou de grego koiné é uma convenção ou uma
            reconstrução. O app diz sempre qual modelo está em uso e não mistura modelos sem avisar. Ainda não há gravações
            humanas com licença adequada incorporadas. Enquanto isso, o som vem, nesta ordem: da voz natural do seu
            aparelho (uma voz moderna) ou, para o grego, de uma voz sintética por regras incluída no app. O hebraico
            depende da voz do aparelho: o sintetizador por regras não lê corretamente o texto com vogais.
          </p>
          {LANGUAGES.map((l) => (
            <div key={l.id} className="mt-5">
              <h3 className="text-xl">{l.name}</h3>
              <ul className="mt-2 space-y-3">
                {l.pronunciationModels.map((m) => (
                  <li key={m.id} className="rounded-lg border border-line bg-surface p-4 text-sm">
                    <p className="font-semibold">{m.name}{m.id === l.defaultPronunciationId && <span className="label ml-2">padrão</span>}</p>
                    <p className="mt-1">{m.description}</p>
                    <p className="mt-1 text-muted">{m.caveat}</p>
                    <p className="label mt-2">neste aparelho: {engine.describe(m)}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="mt-12">
          <h2 className="mb-4 text-3xl">Créditos e licenças</h2>
          <Credits />
        </section>
      </div>
    </div>
  )
}
