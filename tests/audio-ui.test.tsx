import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Script } from '../src/components/Script'
import { LANGUAGES } from '../src/data'
import { AudioEngine, speakableText, type EngineDeps } from '../src/features/audio/engine'
import type { AudioManifest } from '../src/types/content'
import type { AudioRef } from '../src/types/exercise'

afterEach(cleanup)

const hebrew = LANGUAGES.find((l) => l.id === 'hebrew')!
const greek = LANGUAGES.find((l) => l.id === 'greek')!
const academic = hebrew.pronunciationModels.find((m) => m.id === 'he-academic')!
const historical = hebrew.pronunciationModels.find((m) => m.id === 'he-historical')!
const koine = greek.pronunciationModels.find((m) => m.id === 'gr-koine')!
const shalom: AudioRef = { languageId: 'hebrew', itemId: 'he:lex:H7965', text: 'שָׁלוֹם', level: 'word' }
const logos: AudioRef = { languageId: 'greek', itemId: 'gr:lex:λόγος', text: 'λόγος', level: 'word' }

const empty: AudioManifest = { version: 1, sources: [], assets: [] }
const recorded: AudioManifest = {
  version: 1,
  sources: [{ id: 'rec', name: 'Gravação', kind: 'recording', license: 'CC0' }],
  assets: [{ key: 'he:lex:H7965', languageId: 'hebrew', modelId: 'he-historical', level: 'word', path: 'audio/he/shalom.mp3', sourceId: 'rec' }],
}

function deps(voices: string[]) {
  const spoken: { text: string; lang: string; rate: number }[] = []
  const played: { url: string; rate: number }[] = []
  const d: EngineDeps = {
    speech: {
      getVoices: () => voices.map((lang) => ({ lang, name: lang })),
      speak: (u) => {
        const utt = u as { text: string; lang: string; rate: number; onend: () => void }
        spoken.push({ text: utt.text, lang: utt.lang, rate: utt.rate })
        utt.onend()
      },
      cancel: vi.fn(), pause: vi.fn(), resume: vi.fn(),
    },
    createUtterance: (text) => ({ text, lang: '', rate: 1, voice: null, onend: null, onerror: null }) as unknown as SpeechSynthesisUtterance,
    createAudio: (url) => {
      const el = { playbackRate: 1, onended: null as null | (() => void), onerror: null, pause: vi.fn(), play: () => Promise.resolve().then(() => { played.push({ url, rate: el.playbackRate }); el.onended?.() }) }
      return el as unknown as HTMLAudioElement
    },
    baseUrl: '/',
  }
  return { d, spoken, played }
}

describe('áudio: resolução manifesto → gravação → síntese → nada', () => {
  it('prefere a gravação do manifesto quando existe para o modelo escolhido', () => {
    const e = new AudioEngine(recorded, deps([]).d)
    expect(e.resolve(shalom, historical)).toEqual({ kind: 'file', url: '/audio/he/shalom.mp3', sourceId: 'rec' })
    expect(e.available(historical)).toBe(true)
  })

  it('cai para a voz do aparelho só no modelo que a declara compatível', () => {
    const e = new AudioEngine(empty, deps(['he-IL', 'pt-BR']).d)
    expect(e.resolve(shalom, academic)).toMatchObject({ kind: 'tts', lang: 'he-IL' })
    // modelo histórico não tem voz compatível: não mistura modelos em silêncio
    expect(e.resolve(shalom, historical)).toMatchObject({ kind: 'none' })
    expect(e.available(historical)).toBe(false)
    expect(e.describe(academic)).toMatch(/MODERNA/)
  })

  it('sem voz instalada informa que não há áudio, em vez de falhar', async () => {
    const e = new AudioEngine(empty, deps(['pt-BR']).d)
    expect(e.resolve(logos, koine)).toMatchObject({ kind: 'none' })
    expect(e.available(koine)).toBe(false)
    expect(await e.play(logos, koine)).toBe(false)
  })

  it('áudio gerado por regras fica abaixo da voz natural do aparelho e acima de nada', () => {
    const generated: AudioManifest = {
      version: 1, sources: [{ id: 'local-espeak', name: 'eSpeak', kind: 'generated', license: '-' }],
      assets: [{ key: 'gr:lex:λόγος', languageId: 'greek', modelId: 'gr-koine', level: 'word', path: 'audio/x.mp3', sourceId: 'local-espeak' }],
    }
    expect(new AudioEngine(generated, deps(['el-GR']).d).resolve(logos, koine)).toMatchObject({ kind: 'tts' })
    const offline = new AudioEngine(generated, deps([]).d)
    expect(offline.resolve(logos, koine)).toMatchObject({ kind: 'file', sourceId: 'local-espeak' })
    expect(offline.available(koine)).toBe(true)
    expect(offline.describe(koine)).toMatch(/eSpeak/)
  })

  it('reconhece o código antigo do hebraico (iw)', () => {
    expect(new AudioEngine(empty, deps(['iw-IL']).d).available(academic)).toBe(true)
  })
})

describe('áudio: reprodução', () => {
  it('fala pela síntese com a velocidade pedida e volta ao estado ocioso', async () => {
    const { d, spoken } = deps(['el-GR'])
    const e = new AudioEngine(empty, d)
    const states: string[] = []
    e.subscribe(() => states.push(e.state))
    expect(await e.play(logos, koine, 0.5)).toBe(true)
    expect(spoken).toEqual([{ text: 'λόγος', lang: 'el-GR', rate: 0.4 }])
    expect(states).toEqual(['playing', 'idle'])
    expect(e.playingKey).toBeNull()
  })

  it('toca o arquivo gravado com a velocidade pedida', async () => {
    const { d, played } = deps([])
    const e = new AudioEngine(recorded, d)
    expect(await e.play(shalom, historical, 0.75)).toBe(true)
    expect(played).toEqual([{ url: '/audio/he/shalom.mp3', rate: 0.75 }])
  })
})

describe('áudio: preparação do texto para vozes modernas', () => {
  it('o Tetragrama é lido "Adonai", inclusive dentro de uma frase', () => {
    expect(speakableText('hebrew', 'יְהוָה')).toBe('אֲדֹנָי')
    expect(speakableText('hebrew', 'שְׁמַע יִשְׂרָאֵל יְהוָה אֱלֹהֵינוּ')).toBe('שְׁמַע יִשְׂרָאֵל אֲדֹנָי אֱלֹהֵינוּ')
  })
  it('remove a cantilação e abre o maqqef', () => {
    expect(speakableText('hebrew', 'בְּרֵאשִׁ֖ית')).toBe('בְּרֵאשִׁית'.normalize('NFC'))
    expect(speakableText('hebrew', 'עַל־פְּנֵי')).toBe('עַל פְּנֵי')
  })
  it('converte grego politônico em monotônico', () => {
    expect(speakableText('greek', 'Ἐν ἀρχῇ ἦν ὁ λόγος')).toBe('Εν αρχή ήν ο λόγος')
    expect(speakableText('greek', 'πρὸς τὸν θεόν')).toBe('πρός τόν θεόν')
  })
})

describe('interface: direção e idioma da escrita', () => {
  it('hebraico é marcado como RTL e com o idioma certo, mesmo dentro de texto em português', () => {
    render(<p>A palavra <Script language="hebrew">שָׁלוֹם</Script> significa paz.</p>)
    const el = screen.getByText('שָׁלוֹם')
    expect(el.getAttribute('dir')).toBe('rtl')
    expect(el.getAttribute('lang')).toBe('he')
    expect(el.className).toContain('script-he')
  })

  it('grego é marcado como LTR, grego antigo', () => {
    render(<Script language="greek">λόγος</Script>)
    const el = screen.getByText('λόγος')
    expect(el.getAttribute('dir')).toBe('ltr')
    expect(el.getAttribute('lang')).toBe('grc')
  })
})

describe('interface: exercício de múltipla escolha', () => {
  it('responde por clique, informa acerto por símbolo e texto, e não aceita segunda resposta', async () => {
    const { ExerciseView } = await import('../src/features/game/ExerciseView')
    const onAnswer = vi.fn()
    const exercise = {
      kind: 'choice' as const, id: 'e1', generator: 'findLetter' as const, languageId: 'hebrew' as const,
      targets: [{ itemId: 'he:letter:dalet', dimension: 'form' as const }], instruction: 'Encontre: Dalet', prompt: { text: 'Dalet' },
      options: [
        { id: 'he:letter:resh', label: { text: 'ר', script: true }, correct: false },
        { id: 'he:letter:dalet', label: { text: 'ד', script: true }, correct: true },
      ],
    }
    // os provedores do app não são necessários: este exercício não tem áudio
    const view = render(<ExerciseView exercise={exercise} answered={false} onAnswer={onAnswer} />)
    fireEvent.click(screen.getByText('ר'))
    expect(onAnswer).toHaveBeenCalledTimes(1)
    expect(onAnswer.mock.calls[0][0]).toMatchObject({ correct: false, chosen: 'he:letter:resh', hintUsed: false })

    view.rerender(<ExerciseView exercise={exercise} answered onAnswer={onAnswer} />)
    const right = screen.getByText('ד').closest('button')!
    const wrong = screen.getByText('ר').closest('button')!
    expect(right.dataset.state).toBe('correct')
    expect(wrong.dataset.state).toBe('wrong')
    expect(right.textContent).toContain('✓')
    expect(right.textContent).toContain('resposta certa')
    expect(wrong.textContent).toContain('✗')
    expect(right.disabled && wrong.disabled).toBe(true)
  })
})
