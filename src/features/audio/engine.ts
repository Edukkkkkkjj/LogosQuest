/**
 * Arquitetura de áudio:
 *
 *   AudioRef (item ou frase) + modelo de pronúncia, nesta ordem de preferência:
 *     1. gravação humana registrada no manifesto para este modelo
 *     2. voz natural do aparelho, se o modelo declara uma compatível (ttsLang) —
 *        sempre rotulada como voz moderna
 *     3. áudio gerado localmente (eSpeak NG), registrado no manifesto
 *     4. sem áudio: a interface avisa e os exercícios de escuta viram visuais
 *
 * Modelos nunca são misturados em silêncio: a síntese só é usada para o modelo
 * que a declara, e `describe()` informa de onde vem cada som.
 */
import type { AudioManifest, LanguageId, PronunciationModel } from '../../types/content'
import type { AudioRef } from '../../types/exercise'

export type AudioResolution =
  | { kind: 'file'; url: string; sourceId: string }
  | { kind: 'tts'; lang: string; text: string }
  | { kind: 'none'; reason: string }

export const assetKey = (ref: AudioRef) => ref.itemId ?? `text:${ref.text}`

/** O Tetragrama não é vocalizado: lê-se Adonai, conforme a tradição de leitura. */
const TETRAGRAMMATON = /י[ְ-ּ]*ה[ְ-ּ]*ו[ְ-ּ]*ה/g
const CANTILLATION = /[֑-ֽ֯׀׃]/g

/** Prepara o texto para uma voz moderna: grego monotônico; hebraico sem cantilação. */
export function speakableText(languageId: LanguageId, text: string): string {
  if (languageId === 'hebrew') return text.normalize('NFC').replace(CANTILLATION, '').replace(TETRAGRAMMATON, 'אֲדֹנָי').replace(/־/g, ' ')
  return text
    .normalize('NFD')
    .replace(/[̓̔ͅ]/g, '')
    .replace(/[̀͂]/g, '́')
    .normalize('NFC')
    .replace(/[’’᾽]/g, '')
}

export interface SpeechLike {
  getVoices(): { lang: string; name: string }[]
  speak(u: unknown): void
  cancel(): void
  pause(): void
  resume(): void
  addEventListener?(type: string, fn: () => void): void
}

export interface EngineDeps {
  speech?: SpeechLike
  createUtterance?: (text: string) => SpeechSynthesisUtterance
  createAudio?: (url: string) => HTMLAudioElement
  baseUrl?: string
}

export type PlayState = 'idle' | 'playing' | 'paused'

export class AudioEngine {
  private readonly assets = new Map<string, { path: string; sourceId: string; recorded: boolean }>()
  private current: { audio?: HTMLAudioElement; tts?: boolean } = {}
  private listeners = new Set<() => void>()
  state: PlayState = 'idle'
  /** id do som em reprodução, para a interface destacar o botão certo */
  playingKey: string | null = null

  constructor(
    private readonly manifest: AudioManifest,
    private readonly deps: EngineDeps = browserDeps(),
  ) {
    const recordings = new Set(manifest.sources.filter((s) => s.kind === 'recording').map((s) => s.id))
    for (const a of manifest.assets) this.assets.set(`${a.modelId}|${a.key}`, { path: a.path, sourceId: a.sourceId, recorded: recordings.has(a.sourceId) })
    this.deps.speech?.addEventListener?.('voiceschanged', () => this.emit())
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  private emit(): void {
    for (const fn of this.listeners) fn()
  }
  private set(state: PlayState, key: string | null): void {
    this.state = state
    this.playingKey = key
    this.emit()
  }

  private voiceFor(lang: string) {
    const prefix = lang.split('-')[0]
    // hebraico aparece como "he" ou, em sistemas antigos, "iw"
    const accepted = prefix === 'he' ? ['he', 'iw'] : [prefix]
    return this.deps.speech?.getVoices().find((v) => accepted.includes(v.lang.toLowerCase().split(/[-_]/)[0]))
  }

  resolve(ref: AudioRef, model: PronunciationModel): AudioResolution {
    const asset = this.assets.get(`${model.id}|${assetKey(ref)}`)
    const file = asset && ({ kind: 'file', url: (this.deps.baseUrl ?? '') + asset.path, sourceId: asset.sourceId } as const)
    if (file && asset.recorded) return file
    if (model.ttsLang && this.voiceFor(model.ttsLang)) return { kind: 'tts', lang: model.ttsLang, text: speakableText(ref.languageId, ref.text) }
    if (file) return file
    return {
      kind: 'none',
      reason: model.ttsLang ? 'Este aparelho não tem uma voz instalada para este idioma.' : `Ainda não há áudio para o modelo "${model.name}".`,
    }
  }

  /** Há algum áudio possível para este modelo neste aparelho? */
  available(model: PronunciationModel): boolean {
    if (this.manifest.assets.some((a) => a.modelId === model.id)) return true
    return !!model.ttsLang && !!this.voiceFor(model.ttsLang)
  }

  /** Frase curta para a interface dizer de onde vem o som. */
  describe(model: PronunciationModel): string {
    const mine = [...this.assets].filter(([k]) => k.startsWith(`${model.id}|`)).map(([, a]) => a)
    if (mine.some((a) => a.recorded)) return `Gravações no modelo "${model.name}".`
    if (model.ttsLang && this.voiceFor(model.ttsLang))
      return `Voz sintética MODERNA do seu aparelho, usada como apoio para o modelo "${model.name}". Não é uma gravação de pronúncia histórica.`
    if (mine.length) return 'Voz sintética gerada por regras (eSpeak NG): robótica, mas conferida. Não é uma gravação.'
    return model.ttsLang ? 'Sem voz disponível neste aparelho para este idioma.' : `Ainda não há áudio para o modelo "${model.name}".`
  }

  play(ref: AudioRef, model: PronunciationModel, rate = 1): Promise<boolean> {
    this.stop()
    const res = this.resolve(ref, model)
    const key = assetKey(ref)
    if (res.kind === 'none') return Promise.resolve(false)

    return new Promise((done) => {
      const finish = (ok: boolean) => {
        this.current = {}
        this.set('idle', null)
        done(ok)
      }
      if (res.kind === 'file') {
        const audio = this.deps.createAudio!(res.url)
        audio.playbackRate = rate
        audio.onended = () => finish(true)
        audio.onerror = () => finish(false)
        this.current = { audio }
        this.set('playing', key)
        void audio.play().catch(() => finish(false))
        return
      }
      const u = this.deps.createUtterance!(res.text)
      u.lang = res.lang
      const voice = this.voiceFor(res.lang)
      if (voice) u.voice = voice as SpeechSynthesisVoice
      // vozes modernas falam depressa demais para quem está aprendendo
      u.rate = rate * 0.8
      u.onend = () => finish(true)
      u.onerror = () => finish(false)
      this.current = { tts: true }
      this.set('playing', key)
      this.deps.speech!.speak(u)
    })
  }

  pause(): void {
    if (this.state !== 'playing') return
    this.current.audio?.pause()
    if (this.current.tts) this.deps.speech?.pause()
    this.set('paused', this.playingKey)
  }

  resume(): void {
    if (this.state !== 'paused') return
    void this.current.audio?.play()
    if (this.current.tts) this.deps.speech?.resume()
    this.set('playing', this.playingKey)
  }

  stop(): void {
    if (this.current.audio) {
      this.current.audio.onended = null
      this.current.audio.pause()
    }
    if (this.current.tts) this.deps.speech?.cancel()
    this.current = {}
    if (this.state !== 'idle') this.set('idle', null)
  }
}

function browserDeps(): EngineDeps {
  const hasSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window
  return {
    speech: hasSpeech ? (window.speechSynthesis as unknown as SpeechLike) : undefined,
    createUtterance: (text) => new SpeechSynthesisUtterance(text),
    createAudio: (url) => new Audio(url),
    baseUrl: typeof import.meta !== 'undefined' ? import.meta.env?.BASE_URL ?? '' : '',
  }
}
