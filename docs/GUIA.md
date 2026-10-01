# Guia para continuar o projeto

Depois de qualquer mudança de conteúdo, rode:

```
npm run validate-content
npm test
```

O validador falha com uma mensagem que aponta o item e o problema.

## Adicionar uma palavra

1. Se a palavra já aparece em algum texto do app, ela já está em `content/<idioma>/lexemes.generated.json`.
   Se não, acrescente o identificador em `extraLexemes` de `content/sources/passages.json`
   (hebraico: Strong estendido, ex. `"H1697"`; grego: o lema, ex. `"λέγω"`) e rode `npm run build-texts`.
2. Escreva a glosa em `content/<idioma>/lexemes.pt.json`:

```json
"he:lex:H1697": {
  "glosses": ["palavra", "assunto", "coisa"],
  "root": { "letters": "דבר" },
  "usageNote": "Opcional: como a palavra se comporta no uso."
}
```

A primeira glosa é a principal. Glosas indicam um campo de sentido; a tradução de cada ocorrência fica no texto.
Campos opcionais: `lemma` (corrige a forma de dicionário), `speak` (o que o áudio deve dizer), `windowIds`.

## Adicionar uma lição

Em `content/<idioma>/course.json`, dentro da unidade, acrescente a lição e inclua os itens novos em uma habilidade
(`skills`) da unidade — é a habilidade que conta para o desbloqueio.

```json
{ "id": "he-l5-1", "title": "Homem e mulher", "kind": "lesson", "template": "vocab",
  "textId": "he-gen-1-1-5",
  "goal": "Hoje você vai aprender 4 palavras.",
  "newItems": ["he:lex:H0376", "he:lex:H0802", "he:lex:H1121a", "he:lex:H0517"],
  "reviewItems": ["he:lex:H0430"],
  "observe": { "title": "Observe…", "body": "O que o aluno deve notar antes da regra.", "example": "אִישׁ  אִשָּׁה" },
  "rule": { "title": "A regra", "body": "A explicação, depois da descoberta." } }
```

Modelos disponíveis: `glyphs` (letras e sinais), `vocab`, `reading`, `boss`. Para uma sequência própria, troque
`template` por `steps` (veja `he-l4-5` ou `gr-l5-1`); os tipos de passo são `note`, `teach`, `exercise` e `read`.

Para abrir um nível planejado: mude `status` para `"available"` e acrescente unidades.

## Adicionar um texto

1. Em `content/sources/passages.json`, acrescente a passagem:
   `{ "id": "gr-php-1-3-11", "languageId": "greek", "book": "Php", "chapter": 1, "from": 3, "to": 11 }`.
   Livros gregos novos entram na tabela `GNT_FILES` de `scripts/build-texts.ts`.
2. Rode `npm run build-texts`. O script baixa a fonte, gera `content/texts/generated/<id>.json` e avisa que falta o overlay.
3. Crie `content/texts/overlays/<id>.json` (copie um existente): título, gênero, `tier` (ordem na trilha),
   `unlockAfterUnitId`, introdução, **uma tradução por versículo** e **uma glosa por palavra**, notas com selo de
   certeza (`fact`, `consensus`, `hypothesis`, `debated`, `tradition`, `inference`).
4. Rode `npm run build-texts` de novo (para registrar o texto) e escreva em `lexemes.pt.json` as glosas dos lexemas
   novos — o validador lista cada um que faltar.

## Adicionar um "segredo do texto" ou uma "janela"

Em `content/<idioma>/extras.json`. Um segredo precisa de pergunta, veredito (`yes`, `possibly`, `no`), explicação,
selo de certeza e, de preferência, referência. Só afirme um jogo de palavras com justificativa linguística; quando
houver debate, o veredito é `possibly` e a explicação mostra os dois lados. Ligue ao texto por `secretIds` /
`windowIds` no overlay, ou à palavra por `windowIds` no lexema.

## Áudio

- **Gerar ou atualizar o áudio de grego:** `npm run generate-audio`. Não exige instalar nada; refaz só o que mudou
  e remove arquivos órfãos.
- **Acrescentar gravações humanas:** ponha os arquivos em `public/audio/…`, cadastre a fonte em `sources` de
  `content/audio/manifest.json` com `"kind": "recording"` e a licença, e acrescente um registro por arquivo:

```json
{ "key": "he:lex:H7965", "languageId": "hebrew", "modelId": "he-academic", "level": "word",
  "path": "audio/hebrew/he-academic/shalom.mp3", "sourceId": "minha-gravacao" }
```

  `key` é o id do item, ou `text:<texto exato>` para palavras de versículo e versículos. Gravações têm prioridade
  sobre a voz do aparelho e sobre o áudio gerado.
- **Novo modelo de pronúncia:** acrescente em `content/shared/languages.json` (com `caveat` honesto) e, nas letras,
  a descrição do som em `sound["<id-do-modelo>"]`. `ttsLang` vazio = o app não usa a voz do aparelho para ele.
- **Hebraico:** hoje depende da voz `he-IL` do aparelho. Caminhos: gravações com licença aberta, ou um conversor
  próprio de texto pontuado para fonemas (a posição do acento está nos dados do OSHB e do TBESH).

## Imagens

Acrescente a obra em `content/media/manifest.json` (com `commonsTitle`, crédito completo, `focal` e `textSide`) e
rode `npm run fetch-media`. O script recusa arquivos que o Commons não declare como domínio público ou CC0. Depois,
`npm run build-attributions`.

## Créditos

Toda fonte nova entra em `content/shared/sources.json`. Ela aparece sozinha na aba Créditos, em "Fontes e
metodologia" e, depois de `npm run build-attributions`, em `docs/ATTRIBUTIONS.md`.

## Como funciona o progresso

Resumo (detalhes em `ARCHITECTURE.md`): cada resposta atualiza a confiança e o cartão FSRS do par item + dimensão;
o domínio da unidade é a média da confiança dos alvos das suas habilidades; a unidade seguinte abre em 80%. Tudo é
gravado na hora no IndexedDB. Em Ajustes: exportar, importar, restaurar cópia, apagar (com confirmação).

Para testar telas avançadas sem jogar tudo: `npm run make-fixture` gera `tests/fixtures/progress-advanced.json`;
importe-o em Ajustes.

## Expandir para os níveis avançados

A ordem sugerida, e o que cada passo exige:

1. **Mais vocabulário e textos** (só conteúdo): acrescentar passagens e lições `vocab`. Os geradores de morfologia
   (`whoAmI`, `morphBoss`, `correctForm`, `guidedTranslation`) já funcionam sobre qualquer texto anotado.
2. **Níveis de morfologia** (hebraico 5–11, grego 6–22): lições com `steps` próprios, usando `correctForm` e
   `morphBoss` restritos a uma categoria. Vale acrescentar ao gerador um filtro por traço morfológico
   (ex.: "só verbos no aoristo"), que hoje filtra só por lexema.
3. **Paradigmas**: um tipo de conteúdo novo (`paradigms.json`) e um gerador que monte quadros a partir das formas
   realmente atestadas nos textos — reconhecimento em contexto antes da tabela.
4. **Sintaxe e discurso**: exige anotação sintática. O MorphGNT não a tem; uma fonte a avaliar são as árvores
   sintáticas do projeto Clear-Bible/macula (conferir a licença antes de incorporar).
5. **Leitura contínua**: carregar livros inteiros sob demanda (um arquivo por capítulo, fora do pacote do idioma) e
   virtualizar a lista de versículos. Glosas automáticas a partir de `lexemes.pt.json` quando não houver curadoria,
   marcadas como automáticas.
6. **Frequência**: calcular a frequência de cada lexema no corpus inteiro durante `build-texts`, para ordenar o
   vocabulário e mostrar "esta palavra ocorre N vezes".
7. **Aramaico bíblico**: um terceiro `Language` em `languages.json`, uma pasta `content/aramaic/` e um
   `src/data/aramaic.ts`. O OSHB já marca as palavras aramaicas (prefixo `A` no código morfológico).
8. **Contas e sincronização**: um serviço que troque registros por `updatedAt`. O app continua local-first.
