# Atribuições e licenças

> Arquivo gerado por `npm run build-attributions`. Para alterar, edite
> `content/shared/sources.json` ou `content/media/manifest.json` e gere de novo.

Nada do que este aplicativo ensina nasceu aqui. Esta é a lista de quem tornou o conteúdo possível,
com o que foi usado de cada fonte e sob qual licença.

## Incorporado ao aplicativo

### [Westminster Leningrad Codex (WLC)](https://github.com/openscriptures/morphhb)

- **Licença:** Domínio público
- **Uso:** Texto hebraico de todas as passagens do Antigo Testamento. Baseado no Códice de Leningrado (c. 1008 d.C.).
- **Atribuição:** Texto: Westminster Leningrad Codex, domínio público, via Open Scriptures Hebrew Bible.

### [Open Scriptures Hebrew Bible (OSHB)](https://github.com/openscriptures/morphhb)

- **Licença:** CC BY 4.0 (lemas e morfologia)
- **Uso:** Lema e análise morfológica de cada palavra hebraica, incluindo a divisão em prefixos, base e sufixos.
- **Atribuição:** Lemas e morfologia: Open Scriptures Hebrew Bible Project, CC BY 4.0.

### [SBL Greek New Testament (SBLGNT)](https://sblgnt.com)

- **Licença:** CC BY 4.0
- **Uso:** Texto grego de todas as passagens do Novo Testamento. Edição crítica de Michael W. Holmes.
- **Atribuição:** The Greek New Testament: SBL Edition. Copyright © 2010 Society of Biblical Literature and Logos Bible Software. CC BY 4.0. Os sinais do aparato crítico foram removidos para exibição.

### [MorphGNT](https://github.com/morphgnt/sblgnt)

- **Licença:** CC BY-SA 3.0
- **Uso:** Lema e análise morfológica de cada palavra grega.
- **Atribuição:** Análise morfológica e lematização: MorphGNT (James Tauber e colaboradores), CC BY-SA 3.0. Os dados derivados deste projeto são redistribuídos sob a mesma licença.

### [STEPBible Data — TBESH e TBESG](https://github.com/STEPBible/STEPBible-Data)

- **Licença:** CC BY 4.0
- **Uso:** Forma de dicionário (lema) e número de Strong estendido de cada palavra. As definições em inglês não foram copiadas.
- **Atribuição:** Dados lexicais: STEP Bible (www.STEPBible.org), com base no trabalho da Tyndale House, Cambridge. CC BY 4.0.

### Glosas, traduções de trabalho e notas em português

- **Licença:** Conteúdo original deste projeto
- **Uso:** Escritas para este aplicativo, conferidas com os léxicos e gramáticas listados abaixo como referência. São traduções de estudo, deliberadamente literais; não substituem uma tradução publicada.

### [Síntese de voz do navegador (Web Speech API)](https://developer.mozilla.org/docs/Web/API/SpeechSynthesis)

- **Licença:** Recurso do sistema do usuário
- **Uso:** Áudio de apoio enquanto não há gravações com licença adequada. Usa vozes de hebraico e grego MODERNOS instaladas no aparelho; o app avisa disso sempre que está em uso.

### [eSpeak NG (via @echogarden/espeak-ng-emscripten)](https://github.com/espeak-ng/espeak-ng)

- **Licença:** GPL-3.0 (a ferramenta); os arquivos de áudio gerados são deste projeto
- **Uso:** Sintetizador por regras usado para gerar o áudio de grego incluído no app. Não é usado para hebraico, porque não lê texto com niqqud corretamente.

### [FSRS — Free Spaced Repetition Scheduler (ts-fsrs)](https://github.com/open-spaced-repetition/ts-fsrs)

- **Licença:** MIT
- **Uso:** Algoritmo de repetição espaçada que agenda as revisões.

### [Noto Serif Hebrew](https://fonts.google.com/noto/specimen/Noto+Serif+Hebrew)

- **Licença:** SIL Open Font License 1.1
- **Uso:** Fonte do texto hebraico, com suporte a niqqud.

### [Gentium Plus (SIL International)](https://software.sil.org/gentium/)

- **Licença:** SIL Open Font License 1.1
- **Uso:** Fonte do texto grego politônico.

### [Fraunces (Undercase Type) e Figtree (Erik Kennedy)](https://fonts.google.com/specimen/Fraunces)

- **Licença:** SIL Open Font License 1.1
- **Uso:** Fontes da interface: Fraunces nos títulos, Figtree no corpo do texto.

### [Wikimedia Commons, Rijksmuseum, National Gallery of Art, LACMA](https://commons.wikimedia.org)

- **Licença:** Cada imagem com sua licença (domínio público ou CC0)
- **Uso:** Acervos que digitalizaram e disponibilizaram as imagens históricas usadas no app. A lista das obras está logo abaixo.

## Imagens

Obras e fotografias históricas em domínio público. A licença de cada arquivo é conferida no Wikimedia Commons
pelo script `npm run fetch-media`, que se recusa a baixar o que não for domínio público ou CC0.

| Obra | Autor | Data | Instituição | Licença |
|---|---|---|---|---|
| [Vista de Jerusalém a partir do Monte das Oliveiras](http://hdl.handle.net/10934/RM0001.COLLECT.276795) | Maison Bonfils | c. 1867–1895 | Rijksmuseum, Amsterdã | CC0 1.0 (domínio público) |
| [Partenon: lado oeste da colunata, visto do norte](https://commons.wikimedia.org/wiki/File:Parth%C3%A9non._C%C3%B4t%C3%A9_ouest_de_la_p%C3%A9ristasis,_vu_du_nord._-_(Gl.I.A.b.65).jpg) | William James Stillman | 1882 | Bibliothèque nationale et universitaire de Strasbourg (Numistral) | Domínio público |
| [Moisés com as tábuas da Lei](https://commons.wikimedia.org/wiki/File:Rembrandt_-_Moses_with_the_Ten_Commandments_-_Google_Art_Project.jpg) | Rembrandt van Rijn | 1659 | Gemäldegalerie, Berlim | Domínio público |
| [São Paulo pregando em Atenas](https://commons.wikimedia.org/wiki/File:Raphael_-_St_Paul_Preaching_at_Athens_c.1515-6.jpg) | Rafael | c. 1515–1516 | Royal Collection Trust (em depósito no Victoria and Albert Museum, Londres) | Domínio público |
| [Santo Agostinho](https://commons.wikimedia.org/wiki/File:Saint_Augustine_by_Philippe_de_Champaigne.jpg) | Philippe de Champaigne | c. 1645–1650 | Los Angeles County Museum of Art (LACMA) | Domínio público |
| [São Jerônimo em seu estúdio](https://commons.wikimedia.org/wiki/File:Albrecht_D%C3%BCrer,_Saint_Jerome_in_His_Study,_1514,_NGA_6642.jpg) | Albrecht Dürer | 1514 | National Gallery of Art, Washington | CC0 1.0 (domínio público) |

## Consultado como referência (nada foi copiado)

| Fonte | Licença | Para quê |
|---|---|---|
| [unfoldingWord Hebrew Grammar (UHG)](https://uhg.readthedocs.io) | CC BY-SA 4.0 | Referência para a descrição das categorias morfológicas do hebraico usadas pelo OSHB. |
| [unfoldingWord Greek Grammar (UGG)](https://ugg.readthedocs.io) | CC BY-SA 4.0 | Referência para a descrição das categorias gramaticais do grego. |
| [unfoldingWord Hebrew Bible (UHB) e Greek New Testament (UGNT)](https://www.unfoldingword.org/uhb) | CC BY-SA 4.0 | Textos abertos alternativos, consultados para comparação. O UHB deriva do OSHB. |
| [ETCBC / BHSA](https://github.com/ETCBC/bhsa) | CC BY-NC 4.0 | Base sintática da Bíblia Hebraica. Licença não comercial: usada somente para consulta, nada foi incorporado. |
| [J. Gresham Machen, New Testament Greek for Beginners (1923)](https://archive.org/details/newtestamentgree0000jgre_a3d7) | Domínio público | Referência para a sequência didática do grego (alfabeto → artigo → declinações → verbo). |
| [Gesenius' Hebrew Grammar (Kautzsch–Cowley, 1910)](https://en.wikisource.org/wiki/Gesenius%27_Hebrew_Grammar) | Domínio público | Gramática de referência do hebraico bíblico. |
| [Sefaria](https://www.sefaria.org) | Varia por versão (campo "license" de cada texto) | Consulta de textos hebraicos e da tradição interpretativa judaica. Cada versão tem licença própria; nenhuma foi incorporada. O Sefaria não oferece áudio. |
| [Blue Letter Bible](https://www.blueletterbible.org) | Conteúdo protegido; uso apenas como referência | Referência de interface para apresentação de léxico e análise palavra por palavra. |
| [Aleph with Beth (Beth e Andrew Case)](https://freehebrew.online) | CC BY-SA 4.0 | Inspiração pedagógica: aprender hebraico bíblico por exposição, vendo e ouvindo, com repetição, antes das regras. |
| [Alpha with Angela](https://freegreek.online) | CC BY-SA | Inspiração pedagógica: o mesmo método aplicado ao grego koiné. |
| [William D. Mounce — Basics of Biblical Greek e billmounce.com](https://www.billmounce.com/greek) | Protegido por direitos autorais | Referência para o ensino progressivo do grego a iniciantes: começar pelo artigo e pelos substantivos, reconhecer padrões em vez de decorar tabelas. |
| [Michael S. Heiser — Hebrew 101 (AWKNG School of Theology)](https://catalog.awkngschooloftheology.com/courses/hebrew-101) | Curso gratuito; material protegido | Referência para a sequência didática do hebraico: alfabeto, vogais, sílabas, substantivos, artigo, verbo. |
| [Daily Dose of Greek (Robert Plummer) e Daily Dose of Hebrew](https://dailydoseofgreek.com) | Protegido por direitos autorais | Referência para o formato de microlição: um versículo, poucos minutos, análise palavra por palavra. |
| [BibleProject — Word Studies (Tim Mackie e equipe)](https://bibleproject.com) | Protegido por direitos autorais | Referência para apresentar estudos de palavras a partir do uso no texto, não da etimologia. |
| Moisés Silva, Biblical Words and Their Meaning | Protegido por direitos autorais | Fundamento conceitual para distinguir etimologia, forma, lema, campo semântico e significado contextual. |
| D. A. Carson, Exegetical Fallacies | Protegido por direitos autorais | Referência para os erros de método que o app procura evitar: falácia da raiz, transferência ilegítima de totalidade, distinções forçadas entre sinônimos. |
| James Barr, The Semantics of Biblical Language | Protegido por direitos autorais | Obra fundadora da crítica ao uso da etimologia como fonte de significado em estudos bíblicos. |
| [Craig S. Keener — craigkeener.com e The IVP Bible Background Commentary](https://craigkeener.com/free-resources/) | Recursos gratuitos com atribuição; livros protegidos | Referência para o contexto judaico e greco-romano do Novo Testamento nas notas "Abra a janela". |
| John H. Walton, Ancient Near Eastern Thought and the Old Testament | Protegido por direitos autorais | Referência para o contexto do antigo Oriente Próximo nas notas "Abra a janela". |
| Stanley E. Porter — estudos sobre aspecto verbal no grego | Protegido por direitos autorais | Referência para descrever os tempos gregos pelo aspecto (como a ação é apresentada), e não só pelo tempo. |
| [Stephen H. Levinsohn e Steven E. Runge — gramática do discurso](https://www.sil.org/resources/publications/entry/386) | Protegido por direitos autorais | Referência para o tratamento de ordem das palavras, ênfase e conectivos (níveis futuros de sintaxe). |
| Robert H. Stein, Tremper Longman III, Richard B. Hays | Protegido por direitos autorais | Referências de método: gênero literário e interpretação (Stein), poesia e literatura hebraica (Longman), ecos do Antigo Testamento no Novo (Hays). |
| [Geoffrey Khan, The Tiberian Pronunciation Tradition of Biblical Hebrew](https://www.openbookpublishers.com/books/10.11647/obp.0163) | CC BY 4.0 | Referência para as descrições da pronúncia histórica do hebraico. |
| [Randall Buth — pronúncia koiné reconstruída](https://www.biblicallanguagecenter.com/koine-greek-pronunciation/) | Protegido por direitos autorais | Referência para as descrições da pronúncia do grego no período romano. |

## Obrigações de licença que este projeto assume

- **CC BY 4.0** (OSHB, SBLGNT, STEPBible): crédito ao autor, indicação de alterações e link para a licença. As alterações feitas:
  remoção dos acentos de cantilação do texto hebraico e dos sinais de aparato crítico do SBLGNT, para exibição a iniciantes.
- **CC BY-SA 3.0** (MorphGNT): os dados morfológicos gregos derivados (`content/texts/generated/gr-*.json`) são
  redistribuídos sob a mesma licença CC BY-SA.
- **SIL OFL 1.1** (fontes): as fontes são distribuídas sem modificação, com a licença original nos pacotes `@fontsource`.
- **GPL-3.0** (eSpeak NG): usado só como ferramenta de desenvolvimento para gerar áudio; não é distribuído com o app.

Texto das licenças: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) ·
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) · [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) ·
[SIL OFL 1.1](https://openfontlicense.org/).
