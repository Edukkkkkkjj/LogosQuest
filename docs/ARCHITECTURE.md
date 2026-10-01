# Arquitetura

LogosQuest é uma aplicação web estática (React + TypeScript + Vite), instalável como PWA, que guarda todo o progresso
no navegador (IndexedDB). Não há servidor nem conta.

## Camadas

```
content/            dados declarativos (JSON) — o que se ensina
  sources/            configuração do extrator de textos
  texts/generated/    versículos com lema e morfologia (GERADO das fontes abertas)
  texts/overlays/     tradução, glosas contextuais e notas (curadoria)
  hebrew/ greek/      curso, letras e sinais, glosas, segredos, janelas, famílias
  shared/             idiomas e modelos de pronúncia, fontes/créditos, conquistas
  audio/ media/       manifestos de áudio e de imagens

src/
  types/              modelo de dados (conteúdo, exercícios, progresso)
  lib/                Unicode, transliteração, morfologia, banco, sorteio com semente
  data/               monta e valida o pacote de conteúdo de cada idioma
  features/
    game/             geradores de exercício, fila da sessão, player
    progress/         domínio, desbloqueio, estatísticas, repositório (IndexedDB)
    review/           repetição espaçada (FSRS)
    audio/            motor de áudio
    reading/          leitor de textos
  components/         peças de interface reutilizáveis
  pages/              telas
  app/                roteamento e provedores

scripts/            extração de textos, validação, áudio, imagens, atribuições, e2e
tests/              testes unitários e de integração (Vitest)
```

A regra de dependência é de cima para baixo: `content` não conhece código; `lib` e `features/*` (lógica) não
importam React; só `components`, `pages` e `app` conhecem a interface. Nenhum componente contém palavras, perguntas
ou regras linguísticas.

## Modelo de dados

`language → level → unit → lesson → step → exercise`, com `skill` ligando unidades a itens.

| Conceito | Tipo | Observação |
|---|---|---|
| Lexema | `Lexeme` | Entrada de dicionário: lema, classe, **glosas** (campo de sentido), família, nota de uso |
| Forma em contexto | `WordOccurrence` | A palavra como está no versículo, com **glosa contextual** própria |
| Peça da palavra | `Segment` | Prefixo, base ou sufixo, cada um com seu lexema e sua `Morphology` |
| Morfologia | `Morphology` | Campos normalizados + o código original da fonte, para auditoria |
| Letra ou sinal | `Glyph` | Descrição do som **por modelo de pronúncia**, confundíveis, origem do nome com selo de certeza |
| Habilidade | `Skill` | Lista de alvos `item + dimensão`; é o que decide o desbloqueio |
| Exercício | `Exercise` | Cinco formatos de tela (`choice`, `assemble`, `memory`, `tapWord`, `selfRate`) para 22 jogos |

A cadeia pedida — ocorrência → forma → lema → raiz → significado → morfologia → áudio → exercícios — é percorrida
pelo `ContentIndex` (`src/data/index.ts`), que indexa itens e ocorrências por lexema.

## De onde vêm os textos

`npm run build-texts` lê `content/sources/passages.json`, baixa (uma vez) os arquivos do OSHB, do MorphGNT e do
STEPBible para `data-sources/`, e gera:

- `content/texts/generated/<id>.json` — versículos, palavras, peças e morfologia;
- `content/<idioma>/lexemes.generated.json` — todo lexema que aparece, com lema e Strong;
- `content/<idioma>/contexts.generated.json` — versículos de "detetive de contexto";
- `content/texts/registry.<idioma>.ts` — o índice que o app importa.

O que é curadoria humana fica em arquivos separados (`overlays/*.json`, `lexemes.pt.json`, `extras.json`) e nunca é
sobrescrito. O texto hebraico é exibido sem os acentos de cantilação; o grego, sem os sinais do aparato crítico.

## Exercícios gerados dos dados

Cada lição declara itens novos, itens de revisão e, se houver, um texto. Um **modelo de lição**
(`src/data/templates.ts`: `glyphs`, `vocab`, `reading`, `boss`) transforma isso numa sequência pedagógica — mostrar,
ouvir, reconhecer, associar, ver em contexto, produzir, rever. Lições com descoberta guiada declaram os passos à mão.

Os 22 jogos são funções `(contexto, parâmetros) → Exercise[]` em `src/features/game/generators/`:

| Arquivo | Jogos |
|---|---|
| `recognition.ts` | escute e escolha, escute e monte, ordene as letras, encontre a letra, encontre o som, ditado, leitura em voz alta, escute e identifique, memória, significado |
| `text.ts` | texto com lacunas, frase quebra-cabeça, quem sou eu?, morph boss, forma correta, tradução guiada |
| `special.ts` | raiz detetive, root hunt, detetive de contexto, caça ao erro |
| `index.ts` | text quest e boss fight (composições) |

A fila de uma lição é determinística: a mesma semente refaz a mesma fila. É isso que permite retomar na tela exata.

## Domínio e desbloqueio

- Cada par **item + dimensão** (`lexeme`, `form`, `meaning`, `audio`, `reading`, `morphology`) tem um `MasteryRecord`
  com exposições, acertos, erros, tempo, dificuldade percebida, confiança, cartão FSRS e os últimos erros com contexto.
- **Confiança** é uma média móvel: sobe 40% do que falta a cada acerto (20% se houve pista), cai para 55% a cada erro.
- **Estado**: não visto → aprendendo (< 0,5) → familiar (< 0,8) → para revisar (vencido no FSRS) → dominado
  (estabilidade FSRS ≥ 21 dias).
- **Domínio da unidade** = média da confiança dos alvos das suas habilidades. A unidade seguinte abre quando o domínio
  atinge o limiar (0,8; 0,6 na unidade de primeiro contato). Concluir lições sem domínio não abre nada; a tela oferece
  "praticar os pontos fracos". Dimensões de escuta não entram no desbloqueio, porque nem todo aparelho tem voz.
- **Antifrustração**: um erro faz o exercício voltar três telas adiante, com menos opções e a pista à vista; no
  segundo erro do mesmo item, ele é reapresentado antes. O erro não tira pontos nem "vidas".

## Repetição espaçada

`src/features/review/srs.ts` usa o **FSRS** (biblioteca `ts-fsrs`, retenção-alvo de 90%, sem sorteio). A resposta
vira nota assim: erro → *de novo*; acerto lento (> 12 s) ou com pista → *difícil*; acerto → *bom*; acerto rápido
(< 2,5 s) → *fácil*; na leitura em voz alta vale a autoavaliação do aluno.

## Persistência

`src/lib/db.ts` (Dexie) define as tabelas `profile`, `mastery`, `attempts`, `lessons`, `texts`, `daily`,
`achievements`, `sessions` e `backups`. Toda escrita passa por `ProgressRepo` e é imediata (autosave).

- **Retomada**: `sessions` guarda semente e índice da tela a cada passo.
- **Cópias de segurança**: uma por dia ao concluir lições, cinco mais recentes; apagar o progresso não as remove.
- **Exportar/importar**: JSON com `schema`; a importação valida o arquivo e guarda uma cópia do estado anterior.
- **Sincronização futura**: todo registro tem chave estável e `updatedAt`; o perfil tem `deviceId`. Um serviço de
  sync pode enviar o que mudou desde a última vez e resolver conflitos por "última escrita vence", sem mudar o esquema.

## Áudio

`AudioRef (item ou frase) + modelo de pronúncia → AudioEngine.resolve()`, nesta ordem:

1. gravação humana registrada no manifesto para o modelo;
2. voz natural do aparelho, **só** se o modelo declara uma compatível (`ttsLang`) — rotulada "voz sintética moderna";
3. áudio gerado por regras (eSpeak NG), registrado no manifesto — rotulado "voz sintética por regras";
4. nada: a interface avisa, e os exercícios de escuta são trocados por equivalentes visuais.

Antes de falar, o texto é preparado: o Tetragrama é lido "Adonai", a cantilação sai, o grego politônico vira
monotônico. Exercícios de escuta nunca opõem duas opções que soam igual (ex.: pataḥ e qamats na leitura acadêmica).

Estado atual: grego tem MP3 gerados para os dois modelos (koiné e erasmiano). Hebraico depende da voz `he-IL` do
aparelho; o eSpeak NG foi testado e rejeitado para texto com niqqud.

## Direção visual

Três sistemas, escolhidos pela função da tela (ver `LogosQuest_prompt_direcao_visual.md`):

- **Cinematográfico** (`<Cine>`): entradas de mundo, passagens-chefe, trilha de leitura, fontes. O texto nunca fica
  sobre o ponto focal: a imagem ocupa a parte de cima e se dissolve em carvão antes do texto; em telas largas, imagens
  verticais vão para a esquerda e o texto para a direita. O manifesto de imagens traz `focal` e `textSide`.
- **Blueprint** (`<MorphBlueprint>`): a palavra como objeto técnico — peças, linhas de cota, vista explodida.
- **Editorial**: lições, leitor, perfil, créditos.

Cores, fontes e a grade localizada estão em `src/styles.css` como tokens, com tema claro e escuro.

## Desempenho e offline

- O conteúdo de cada idioma é um chunk separado; cada tela além da inicial também.
- O service worker (Workbox) pré-carrega app, fontes e imagens; os MP3 entram em cache sob demanda.
- Roteamento por hash: funciona em qualquer hospedagem estática, sem configurar o servidor.

## Qualidade

| Comando | O que garante |
|---|---|
| `npm run typecheck` | Tipos (TypeScript estrito) |
| `npm run validate-content` | Nenhuma palavra sem lema, ocorrência sem morfologia, áudio ou imagem inexistente, exercício inválido, habilidade não cadastrada, texto sem referência, Unicode problemático. Ensaia todas as lições com e sem áudio |
| `npm test` | 97 testes: domínio, FSRS, desbloqueio, persistência, importação/exportação, morfologia, Unicode, geradores, áudio, RTL |
| `npm run e2e` | Navegador real: primeira lição, recarregar, retomar no meio, importar, leitor, ficha de palavra, largura de celular |
