# LogosQuest — A Jornada dos Originais

Aplicação web para aprender **Hebraico Bíblico** e **Grego Koiné** do zero até a leitura de textos reais da Bíblia
nos idiomas originais. Roda no navegador, em computador e celular, funciona offline e guarda o progresso no próprio
aparelho.

## Rodar

Requer Node.js 20 ou mais novo.

```
npm install
npm run dev        # desenvolvimento: http://localhost:5173
```

Para a versão de produção (com PWA e funcionamento offline):

```
npm run build
npm run preview    # http://localhost:4173
```

A pasta `dist/` é um site estático: pode ser publicada em qualquer hospedagem.

## O que há nesta versão

| | Hebraico Bíblico | Grego Koiné |
|---|---|---|
| Lições | 29, em 7 unidades (níveis 0–4) | 26, em 7 unidades (níveis 0–5) |
| Letras e sinais | 28 letras e formas finais, 13 vogais, dagesh | 25 letras, 7 ditongos, 7 diacríticos |
| Vocabulário com glosa | 109 lexemas | 90 lexemas |
| Textos anotados palavra por palavra | Gênesis 1:1–5, Shemá, bênção sacerdotal, Salmo 23 | João 1:1–5, Pai Nosso, bem-aventuranças |
| Segredos do texto / Abra a janela | 8 / 8 | 7 / 4 |
| Áudio | voz `he-IL` do aparelho, quando existe | MP3 incluídos (dois modelos de pronúncia) |

Os níveis seguintes (até o 20 em hebraico e o 30 em grego) aparecem no mapa como caminho planejado, sem telas vazias.

## Comandos

| Comando | Para quê |
|---|---|
| `npm run dev` / `build` / `preview` | Desenvolver, gerar e servir |
| `npm run check` | Tipos + validação de conteúdo + testes |
| `npm run validate-content` | Confere a consistência de todo o conteúdo |
| `npm test` | Testes unitários e de integração |
| `npm run e2e` | Teste de ponta a ponta no navegador (com `npm run preview` rodando) |
| `npm run build-texts` | Regera os textos anotados a partir das fontes abertas |
| `npm run generate-audio` | Gera o áudio de grego |
| `npm run fetch-media` | Baixa e otimiza as imagens, conferindo a licença |
| `npm run build-attributions` | Regera `docs/ATTRIBUTIONS.md` |

## Documentação

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — como o projeto é organizado e por quê
- [docs/GUIA.md](docs/GUIA.md) — como acrescentar palavras, lições, textos, áudio e níveis
- [docs/RESEARCH.md](docs/RESEARCH.md) — pesquisa de fontes, licenças e decisões
- [docs/ATTRIBUTIONS.md](docs/ATTRIBUTIONS.md) — atribuições e licenças

## Licenças do conteúdo

Texto hebraico: Westminster Leningrad Codex (domínio público). Morfologia hebraica: Open Scriptures Hebrew Bible
(CC BY 4.0). Texto grego: SBL Greek New Testament (CC BY 4.0). Morfologia grega: MorphGNT (CC BY-SA 3.0). Lemas:
STEP Bible (CC BY 4.0). Imagens: domínio público ou CC0. A lista completa está na aba **Créditos** do app e em
[docs/ATTRIBUTIONS.md](docs/ATTRIBUTIONS.md).
