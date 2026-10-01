/**
 * npm run build-attributions
 * Gera docs/ATTRIBUTIONS.md a partir dos mesmos dados que alimentam a aba
 * "Créditos" do app (content/shared/sources.json e content/media/manifest.json),
 * para que a documentação nunca fique diferente do que o app mostra.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { SourceEntry } from '../src/types/content'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = <T>(p: string): T => JSON.parse(readFileSync(join(ROOT, p), 'utf8'))
const sources = read<SourceEntry[]>('content/shared/sources.json')
const media = read<{ author: string; title: string; date: string; institution: string; license: string; sourceUrl: string; file: string }[]>('content/media/manifest.json')

const link = (s: SourceEntry) => (s.url ? `[${s.name}](${s.url})` : s.name)
const incorporated = sources.filter((s) => s.usage === 'incorporated')
const reference = sources.filter((s) => s.usage === 'reference-only')

const lines = [
  '# Atribuições e licenças',
  '',
  '> Arquivo gerado por `npm run build-attributions`. Para alterar, edite',
  '> `content/shared/sources.json` ou `content/media/manifest.json` e gere de novo.',
  '',
  'Nada do que este aplicativo ensina nasceu aqui. Esta é a lista de quem tornou o conteúdo possível,',
  'com o que foi usado de cada fonte e sob qual licença.',
  '',
  '## Incorporado ao aplicativo',
  '',
  ...incorporated.flatMap((s) => [`### ${link(s)}`, '', `- **Licença:** ${s.license}`, `- **Uso:** ${s.purpose}`, ...(s.attribution ? [`- **Atribuição:** ${s.attribution}`] : []), '']),
  '## Imagens',
  '',
  'Obras e fotografias históricas em domínio público. A licença de cada arquivo é conferida no Wikimedia Commons',
  'pelo script `npm run fetch-media`, que se recusa a baixar o que não for domínio público ou CC0.',
  '',
  '| Obra | Autor | Data | Instituição | Licença |',
  '|---|---|---|---|---|',
  ...media.map((m) => `| [${m.title}](${m.sourceUrl}) | ${m.author} | ${m.date} | ${m.institution} | ${m.license} |`),
  '',
  '## Consultado como referência (nada foi copiado)',
  '',
  '| Fonte | Licença | Para quê |',
  '|---|---|---|',
  ...reference.map((s) => `| ${link(s)} | ${s.license} | ${s.purpose} |`),
  '',
  '## Obrigações de licença que este projeto assume',
  '',
  '- **CC BY 4.0** (OSHB, SBLGNT, STEPBible): crédito ao autor, indicação de alterações e link para a licença. As alterações feitas:',
  '  remoção dos acentos de cantilação do texto hebraico e dos sinais de aparato crítico do SBLGNT, para exibição a iniciantes.',
  '- **CC BY-SA 3.0** (MorphGNT): os dados morfológicos gregos derivados (`content/texts/generated/gr-*.json`) são',
  '  redistribuídos sob a mesma licença CC BY-SA.',
  '- **SIL OFL 1.1** (fontes): as fontes são distribuídas sem modificação, com a licença original nos pacotes `@fontsource`.',
  '- **GPL-3.0** (eSpeak NG): usado só como ferramenta de desenvolvimento para gerar áudio; não é distribuído com o app.',
  '',
  'Texto das licenças: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) ·',
  '[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) · [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) ·',
  '[SIL OFL 1.1](https://openfontlicense.org/).',
  '',
]

writeFileSync(join(ROOT, 'docs/ATTRIBUTIONS.md'), lines.join('\n'))
console.log(`✓ docs/ATTRIBUTIONS.md: ${incorporated.length} fontes incorporadas, ${reference.length} de referência, ${media.length} imagens`)
