# Pesquisa de fontes

Data da consulta: **30 de setembro de 2026**. Cada fonte foi classificada em quatro eixos:

- **A** — linguisticamente útil
- **B** — pedagogicamente útil
- **C** — pode ser legalmente redistribuída
- **D** — só pode ser usada como referência ou inspiração

A lista completa, com a atribuição exata de cada fonte, está em [ATTRIBUTIONS.md](ATTRIBUTIONS.md) e na aba **Créditos** do app.

## Fontes incorporadas

| Fonte | Referência | Finalidade | Licença | Classe | O que foi incorporado |
|---|---|---|---|---|---|
| Open Scriptures Hebrew Bible (OSHB) | github.com/openscriptures/morphhb | Texto hebraico + lema e morfologia por palavra | Texto WLC: domínio público. Lemas e morfologia: CC BY 4.0 | A, C | Os versículos das quatro passagens hebraicas, com segmentação em prefixo/base/sufixo e código morfológico |
| SBL Greek New Testament | sblgnt.com/license | Texto grego | CC BY 4.0 | A, C | Os versículos das três passagens gregas e dos versículos de contexto |
| MorphGNT | github.com/morphgnt/sblgnt | Lema e morfologia por palavra do NT | CC BY-SA 3.0 | A, C | Classe, análise e lema de cada palavra das passagens |
| STEPBible Data (TBESH, TBESG) | github.com/STEPBible/STEPBible-Data | Forma do lema e Strong estendido | CC BY 4.0 | A, C (parcial) | **Só** a forma do lema e o número. As definições breves do TBESH vêm do BDB abreviado da Online Bible e o próprio arquivo pede permissão antes de reutilizá-las — por isso não foram copiadas |
| ts-fsrs | github.com/open-spaced-repetition/ts-fsrs | Repetição espaçada | MIT | C | A biblioteca |
| Noto Serif Hebrew, Gentium Plus, Fraunces, Figtree | pacotes @fontsource | Tipografia | SIL OFL 1.1 | C | As fontes, sem modificação |
| eSpeak NG | github.com/espeak-ng/espeak-ng | Geração local de áudio em grego | GPL-3.0 (ferramenta) | C | Só os arquivos MP3 gerados; a ferramenta fica como dependência de desenvolvimento |
| Imagens (6) | Wikimedia Commons / Rijksmuseum / NGA / LACMA | Direção visual | Domínio público ou CC0 | C | Ver ATTRIBUTIONS.md |

## Fontes de referência (nada copiado)

| Fonte | Finalidade | Licença | Classe | Observações acadêmicas |
|---|---|---|---|---|
| Aleph with Beth (freehebrew.online) | Pedagogia por exposição e repetição | CC BY-SA 4.0 | B, C | O site não declara a licença; a cópia no Internet Archive declara CC BY-SA 4.0. Seria redistribuível, mas o app não incorpora vídeo. Inspirou o princípio "ver e ouvir antes da regra" |
| Alpha with Angela (freegreek.online) | O mesmo método para o grego | CC BY-SA | B, C | Usa pronúncia erasmiana modificada, por escolha didática declarada, não por reivindicação histórica |
| unfoldingWord Hebrew Grammar / Greek Grammar | Descrição das categorias gramaticais | CC BY-SA 4.0 | A, C | Consultadas para a terminologia; os textos das notas do app são próprios |
| unfoldingWord Hebrew Bible / Greek NT | Textos alternativos | CC BY-SA 4.0 | A, C | O UHB deriva do OSHB; o UGNT, do protótipo de Alan Bunning. Não usados para evitar misturar bases textuais |
| ETCBC / BHSA | Sintaxe da Bíblia Hebraica | **CC BY-NC 4.0** | A, D | Licença não comercial e exigência de contato com a Sociedade Bíblica Alemã para uso comercial: **não incorporado** |
| Machen, *New Testament Greek for Beginners* (1923) | Sequência didática do grego | Domínio público | A, B, C | Referência para a ordem alfabeto → artigo → declinações → verbo |
| Gesenius–Kautzsch–Cowley (1910) | Gramática hebraica de referência | Domínio público | A, C | — |
| Sefaria | Textos e tradição interpretativa judaica | Varia por versão | A, D (caso a caso) | A API expõe `license` e `versionSource` por versão; cada uma precisa ser conferida. **O Sefaria não oferece áudio.** Nada incorporado |
| Blue Letter Bible | Interface de léxico | Conteúdo protegido | D | Só referência de apresentação |
| W. D. Mounce (billmounce.com) | Ensino progressivo do grego | Protegido | B, D | Os termos de uso do site não foram localizados na página de recursos; tratado como protegido |
| M. S. Heiser, Hebrew 101 (AWKNG) | Sequência didática do hebraico | Curso gratuito, material protegido | B, D | Sequência: alfabeto → vogais e sílabas → substantivos → artigo → Qal perfeito |
| Daily Dose of Greek / Hebrew | Formato de microlição | Protegido | B, D | — |
| BibleProject | Estudos de palavras pelo uso | Protegido | B, D | — |
| C. S. Keener (craigkeener.com) | Contexto do NT | Recursos gratuitos com atribuição; "não para publicação tradicional ou remuneração" | A, D | Usado para orientar as notas "Abra a janela"; nenhum texto copiado |
| J. H. Walton | Contexto do antigo Oriente Próximo | Protegido | A, D | — |
| Moisés Silva, D. A. Carson, James Barr | Semântica lexical e falácias exegéticas | Protegido | A, D | Fundamento dos princípios acadêmicos do app (ver abaixo) |
| S. E. Porter; S. H. Levinsohn; S. E. Runge | Aspecto verbal e gramática do discurso | Protegido | A, D | Para os níveis futuros de sintaxe |
| R. H. Stein; T. Longman III; R. B. Hays | Método exegético, poesia hebraica, intertextualidade | Protegido | A, D | — |
| G. Khan, *The Tiberian Pronunciation Tradition* | Pronúncia histórica do hebraico | CC BY 4.0 | A, C | Referência das descrições do modelo "reconstrução histórica" |
| R. Buth (Biblical Language Center) | Pronúncia koiné reconstruída | Protegido | A, D | Referência das descrições do modelo "koiné reconstruída" |

## Áudio: o que a pesquisa encontrou

| Recurso | Licença | Decisão |
|---|---|---|
| OpenHebrewBible (áudio palavra por palavra) | CC BY-NC 4.0 | Não incorporado (não comercial) |
| Leitura de Abraham Shmuelof (Internet Archive) | Declaração informal de livre redistribuição | Não incorporado: a licença não é clara o bastante |
| Greek Pronunciations Dataset (Lexham) | Comercial | Não utilizável |
| Evangelho de Mateus em pronúncia "luciana" (Found in Antiquity) | CC BY 4.0 | Candidato para o futuro: é por capítulo, não por palavra; exigiria alinhamento |
| Síntese do navegador (Web Speech API) | Recurso do aparelho | **Usado**, sempre rotulado como voz moderna |
| eSpeak NG | GPL-3.0 | **Usado para o grego.** Conferido por transcrição fonética: λόγος → [lóɡos], ἀρχή → [arkhɛ́ː], υἱός → [hyiós]. **Rejeitado para o hebraico:** soletra sinais de niqqud que não conhece e lê o qamats como "o" (אָלֶף → "olef") |

Conclusão: não existe hoje um conjunto de gravações palavra por palavra, de hebraico bíblico ou grego koiné, com licença que permita redistribuição irrestrita. Por isso o app tem uma arquitetura de manifesto que aceita gravações quando existirem, e enquanto isso usa o melhor que há em cada aparelho. Ver `docs/ARCHITECTURE.md`, seção Áudio.

## Princípios acadêmicos adotados

1. **Etimologia não é significado.** Seguindo Barr, Silva e Carson, o app nunca ensina que "a raiz X significa Y, logo toda ocorrência carrega Y". As lições de famílias de palavras trazem esse aviso explicitamente, e há exercícios de caça ao erro sobre essa falácia.
2. **Lema ≠ forma ≠ ocorrência; significado ≠ tradução contextual.** O modelo de dados mantém essas distinções em campos separados.
3. **Grau de certeza sempre à vista.** Toda nota tem um selo: fato do texto, consenso acadêmico, hipótese, debatido, tradição interpretativa ou inferência.
4. **Divergência acadêmica não é escondida.** Exemplos no conteúdo: a sintaxe de Gênesis 1:1, רוּחַ em Gênesis 1:2, a tradução do Shemá, צַלְמָוֶת, וְשַׁבְתִּי no Salmo 23:6, ἐπιούσιος, τοῦ πονηροῦ, κατέλαβεν, ἀγαπάω/φιλέω em João 21.
5. **Strong é índice, não análise.**
6. **Pronúncia: toda opção é convenção ou reconstrução**, e o app diz qual está em uso.

## Decisões em que o pedido original foi ajustado

Os prompts reunidos em `detalhes code.txt` se contradizem em alguns pontos. O que foi decidido, e por quê:

| Pedido | Decisão | Motivo |
|---|---|---|
| Next.js + Supabase × React + Vite + IndexedDB | React + TypeScript + Vite + Dexie, PWA, sem servidor | É o que o primeiro prompt e o adendo ("aplicação web, local-first, offline") pedem. O esquema do banco já tem `updatedAt` e `deviceId` para sincronização futura |
| "Um único componente React" com `localStorage` | Projeto modular com IndexedDB | O primeiro prompt pede explicitamente arquitetura expansível e proíbe depender só de `localStorage` |
| "Cada letra tem uma história pictográfica" (Alef = boi → liderança) | A origem do **nome** da letra entra, com selo de certeza; a passagem de pictograma para "significado" não entra | A origem acrofônica dos nomes é consenso; derivar sentido de palavras a partir dos pictogramas não tem base linguística e contradiz os princípios acadêmicos do próprio pedido |
| "Agape × Philia" como tipos de amor | Apresentado em "Segredos do texto" como leitura popular e debatida | É o exemplo clássico de distinção forçada entre sinônimos (Carson, *Exegetical Fallacies*) |
| "Dicionário Strong como base de etimologia" | Strong só como número de referência | Pedido explícito dos princípios acadêmicos |
| Áudio "dos datasets do Sefaria" | Não aplicável | O Sefaria não tem áudio |
| ElevenLabs / TTS generativo | Não usado | A própria "dica de ouro" do pedido desaconselha; além disso exigiria chave e serviço externo |
| Confetes ao acertar | Carimbo de catálogo e "tinta que seca" | A direção visual pede recompensa sóbria |
| Framer Motion | Animações em CSS | Menos uma dependência; respeita `prefers-reduced-motion` |
| "Vidas" do jogador | Não implementado | Punir o erro contradiz a seção de antifrustração ("não castigue o erro") |
