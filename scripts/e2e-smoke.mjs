/**
 * Teste de fumaça de ponta a ponta, num navegador de verdade.
 *
 *   npm run build && npm run preview   (em outro terminal)
 *   npm run e2e [pasta-para-capturas]
 *
 * Percorre o critério de sucesso da primeira versão: abrir, escolher o idioma,
 * fazer uma lição, fechar, voltar e continuar de onde parou, consultar uma
 * palavra, ler uma passagem — em desktop e em celular.
 * Requer o Chrome instalado (CHROME_PATH para outro caminho).
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.env.E2E_URL ?? 'http://localhost:4173'
const OUT = process.argv[2]
if (OUT) mkdirSync(OUT, { recursive: true })
const CHROME = process.env.CHROME_PATH ?? ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome'].find(existsSync)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const problems = []
const check = (ok, what) => {
  console.log(`${ok ? '✓' : '✗'} ${what}`)
  if (!ok) problems.push(what)
}

async function open(width, height) {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.setViewport({ width, height })
  page.on('pageerror', (e) => problems.push(`erro de página: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`))
  const s = {
    page,
    go: async (route) => {
      await page.goto(`${BASE}/#${route}`, { waitUntil: 'networkidle0' })
      await sleep(700)
    },
    reload: async () => {
      await page.reload({ waitUntil: 'networkidle0' })
      await sleep(700)
    },
    shot: async (name, fullPage = false) => {
      if (!OUT) return
      await sleep(500)
      await page.screenshot({ path: join(OUT, `${name}.png`), fullPage })
    },
    text: () => page.evaluate(() => document.body.innerText),
    click: async (startsWith) => {
      const ok = await page.evaluate((t) => {
        const el = [...document.querySelectorAll('button, a')].find((e) => e.textContent.trim().startsWith(t) && !e.disabled)
        el?.click()
        return !!el
      }, startsWith)
      await sleep(300)
      return ok
    },
    step: () => page.evaluate(() => Number(document.querySelector('.label.tabular-nums')?.textContent.split('/')[0] ?? 0)),
    /** sem rolagem horizontal: nada pode estourar a largura da tela */
    fits: () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  }
  return s
}

/** Joga a sessão em andamento até o fim (ou até a tela `stopAt`), respondendo como um aluno apressado. */
async function play(s, { stopAt = Infinity, shots = {} } = {}) {
  const seen = new Set()
  for (let guard = 0; guard < 600; guard++) {
    const n = await s.step()
    if (!n || n >= stopAt) return n
    const kind = await s.page.evaluate(() => {
      if (document.querySelector('[aria-label="Carta virada"]')) return 'memory'
      if (document.querySelector('.bp-piece')) return 'reader'
      if (document.querySelector('[aria-label="Sua resposta"]')) return 'assemble'
      if (document.querySelector('fieldset, .text-7xl')) return 'selfRate'
      if (document.querySelector('ul .opt')) return 'choice'
      if (document.querySelector('.opt.w-auto')) return 'tapWord'
      return 'card'
    })
    if (shots[kind] && !seen.has(kind)) {
      seen.add(kind)
      await s.shot(shots[kind])
    }
    if (await s.click('Continuar')) continue
    if (await s.click('Já li')) {
      await s.click('Li bem')
      continue
    }
    if (await s.click('Concluí a leitura')) continue
    if (kind === 'memory') {
      // vira a primeira carta fechada e tenta cada uma das outras até achar o par
      const closed = await s.page.$$('[aria-label="Carta virada"]')
      for (let j = 1; j < closed.length; j++) {
        const before = closed.length
        await closed[0].click()
        await closed[j].click()
        await sleep(1000)
        if ((await s.page.$$('[aria-label="Carta virada"]')).length < before) break
      }
      continue
    }
    await s.page.evaluate(() => {
      const pick = (list) => list[Math.floor(Math.random() * list.length)]?.click()
      const options = [...document.querySelectorAll('ul .opt:not([disabled])')]
      if (options.length) return pick(options)
      const tiles = [...document.querySelectorAll('.btn.min-w-12:not([disabled])')].filter((b) => b.style.visibility !== 'hidden')
      if (tiles.length) return tiles[0].click()
      pick([...document.querySelectorAll('.opt.w-auto:not([disabled])')])
    })
    await sleep(120)
    await s.click('Conferir')
  }
  problems.push('a sessão não terminou em 600 passos')
}

// ---------- 1. primeira visita, primeira lição (celular) ----------
const m = await open(390, 844)
await m.go('/')
check((await m.text()).includes('LogosQuest'), 'a tela inicial abre')
check(await m.fits(), 'a tela inicial cabe em 390 px de largura')
await m.shot('01-home-mobile')
await m.click('Créditos')
check((await m.text()).includes('Open Scriptures Hebrew Bible'), 'a aba Créditos lista as fontes')
await m.shot('02-creditos-mobile')

await m.go('/hebrew')
check(await m.click('Começar agora'), 'o curso de hebraico oferece "Começar agora"')
await m.shot('03-licao-intro-mobile')
await m.click('Começar')
await play(m, { shots: { card: '04-nota', choice: '05-escolha', memory: '06-memoria' } })
check((await m.text()).toLowerCase().includes('lição concluída'), 'a primeira lição termina com o carimbo de conclusão')
check(await m.fits(), 'a tela de conclusão cabe na largura do celular')
await m.shot('07-conclusao-mobile')

// ---------- áudio: os arquivos gerados tocam no navegador ----------
const audio = JSON.parse(readFileSync(join(ROOT, 'content/audio/manifest.json'), 'utf8')).assets
for (const model of ['gr-koine', 'gr-erasmian']) {
  const asset = audio.find((a) => a.modelId === model && a.key === 'gr:lex:λόγος')
  const duration = asset && (await m.page.evaluate((src) => new Promise((res) => {
    const el = new Audio(src)
    el.onloadedmetadata = () => res(el.duration)
    el.onerror = () => res(0)
  }), `${BASE}/${asset.path}`))
  check(duration > 0.3 && duration < 5, `áudio de λόγος (${model}) é um MP3 válido de ${Number(duration).toFixed(2)} s`)
}
await m.go('/greek/licao/gr-l0-1')
await m.click('Começar')
await play(m, { stopAt: 6 })
check((await m.text()).includes('ouvir sem ver') || (await m.text()).includes('OUVIR SEM VER'), 'com áudio disponível, o grego traz exercícios de "ouvir sem ver"')
await m.shot('06b-ouvir-sem-ver')

// ---------- 2. fechar e voltar: o progresso continua lá ----------
await m.reload()
await m.go('/hebrew')
check((await m.text()).includes('Concluída'), 'depois de recarregar, a lição aparece como concluída')
await m.shot('08-mapa-com-progresso', true)

// ---------- 3. sair no meio de uma lição e retomar na mesma tela ----------
// (a mesma lição, em modo de revisão livre: a seguinte só abre com o domínio mínimo)
await m.go('/hebrew/licao/he-l0-1')
await m.click('Começar')
const stopped = await play(m, { stopAt: 6, shots: { card: '09-cartao-letra' } })
await m.shot('10-meio-da-licao')
await m.reload()
const resumed = await m.step()
check(resumed === 1 && (await m.text()).includes('/'), 'a lição interrompida reabre direto no player')
const total = await m.page.evaluate(() => Number(document.querySelector('.label.tabular-nums')?.textContent.split('/')[1]))
check(total > 0 && stopped >= 6, `a retomada pula as telas já feitas (parou na ${stopped}, restam ${total})`)
await play(m, { shots: { assemble: '11-montar', selfRate: '12-leitura-em-voz-alta' } })
check((await m.text()).toLowerCase().includes('lição concluída'), 'a lição retomada vai até o fim')

// ---------- 4. progresso avançado: leitor, ficha de palavra, perfil (desktop) ----------
const d = await open(1280, 900)
await d.go('/ajustes')
const input = await d.page.$('input[type=file]')
await input.uploadFile(join(ROOT, 'tests/fixtures/progress-advanced.json'))
await sleep(1200)
check((await d.text()).includes('Progresso importado'), 'um backup de progresso é importado pela tela de ajustes')
await d.shot('13-ajustes', true)

for (const lang of ['hebrew', 'greek']) {
  await d.go(`/${lang}`)
  await d.shot(`14-mapa-${lang}`, true)
  await d.go(`/${lang}/ler`)
  check(!(await d.text()).includes('Abre quando você atingir'), `${lang}: com domínio, todos os textos estão abertos`)
  await d.shot(`15-leituras-${lang}`, true)
  const first = lang === 'hebrew' ? 'he-gen-1-1-5' : 'gr-john-1-1-5'
  await d.go(`/${lang}/ler/${first}`)
  const dir = await d.page.evaluate(() => document.querySelector('ol p[dir]')?.getAttribute('dir'))
  check(dir === (lang === 'hebrew' ? 'rtl' : 'ltr'), `${lang}: o versículo é exibido em ${lang === 'hebrew' ? 'RTL' : 'LTR'}`)
  await d.page.evaluate(() => document.querySelectorAll('ol p[dir] button')[1].click())
  await sleep(400)
  check((await d.text()).toLowerCase().includes('peças da palavra'), `${lang}: tocar em uma palavra abre a ficha com a morfologia`)
  await d.page.evaluate(() => document.querySelector('.bp-piece').click())
  await sleep(400)
  await d.click('Revelar próxima camada')
  await d.shot(`16-leitor-${lang}`, true)
  check(await d.click('Concluí a leitura'), `${lang}: a leitura pode ser registrada`)
  await sleep(600)
  check((await d.text()).toLowerCase().includes('leitura registrada'), `${lang}: a leitura registrada aparece na tela`)
  await d.go(`/${lang}/segredos`)
  await d.click('Possivelmente')
  await d.shot(`17-segredos-${lang}`, true)
  await d.go(`/${lang}/progresso`)
  await d.shot(`18-perfil-${lang}`, true)
  await d.go(`/${lang}/licao/${lang === 'hebrew' ? 'he-l4-boss-1' : 'gr-l5-boss'}`)
  await d.shot(`19-chefe-${lang}`)
  await d.go(`/${lang}/licao/${lang === 'hebrew' ? 'he-l4-5' : 'gr-l5-1'}`)
  await d.click('Começar')
  await play(d, { stopAt: 9, shots: { choice: `20-morfologia-${lang}` } })
}
await d.go('/fontes')
await d.shot('21-fontes', true)

// ---------- 5. mesmas telas no celular, com tema escuro ----------
const n = await open(390, 844)
await n.page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }])
await n.go('/ajustes')
await (await n.page.$('input[type=file]')).uploadFile(join(ROOT, 'tests/fixtures/progress-advanced.json'))
await sleep(1200)
for (const [name, route] of [['22-leitor-escuro', '/hebrew/ler/he-ps-23'], ['23-mapa-escuro', '/greek'], ['24-perfil-escuro', '/greek/progresso'], ['25-leitor-grego-escuro', '/greek/ler/gr-matt-6-9-13']]) {
  await n.go(route)
  check(await n.fits(), `${route} cabe na largura do celular`)
  await n.shot(name, true)
}

await browser.close()
console.log(problems.length ? `\n${problems.length} problema(s):\n- ${problems.join('\n- ')}` : '\nTudo certo.')
process.exit(problems.length ? 1 : 0)
