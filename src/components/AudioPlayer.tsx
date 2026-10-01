import { useRef, useState } from 'react'
import { useAudio, usePronunciation, useSettings } from '../app/providers'
import { assetKey } from '../features/audio/engine'
import { repo } from '../features/progress/repo'
import type { AudioRef } from '../types/exercise'

const SPEEDS = [0.5, 0.75, 1, 1.25]

function PlayIcon({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
      {playing ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
    </svg>
  )
}

function usePlayer(audio: AudioRef) {
  const { engine } = useAudio()
  const model = usePronunciation(audio.languageId)
  const settings = useSettings()
  const started = useRef(0)
  const key = assetKey(audio)
  const mine = engine.playingKey === key
  const resolution = engine.resolve(audio, model)

  const play = (rate = settings.audioRate) => {
    started.current = Date.now()
    void engine.play(audio, model, rate).then((ok) => {
      if (ok) void repo.addListening(Math.min(Date.now() - started.current, 60_000))
    })
  }
  const toggle = () => {
    if (mine && engine.state === 'playing') engine.pause()
    else if (mine && engine.state === 'paused') engine.resume()
    else play()
  }
  return { engine, model, mine, resolution, play, toggle, playing: mine && engine.state === 'playing' }
}

/** Botão compacto de ouvir, para opções de exercício e palavras de um texto. */
export function AudioButton({ audio, label = 'Ouvir', size = 'md' }: { audio: AudioRef; label?: string; size?: 'md' | 'lg' }) {
  const p = usePlayer(audio)
  const unavailable = p.resolution.kind === 'none'
  const dim = size === 'lg' ? 'h-16 w-16' : 'h-11 w-11'
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        p.toggle()
      }}
      disabled={unavailable}
      aria-label={unavailable ? `${label} (áudio indisponível)` : p.playing ? 'Pausar' : label}
      title={p.resolution.kind === 'none' ? p.resolution.reason : label}
      className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-full border-[1.5px] border-section text-section transition-colors hover:bg-section-soft disabled:border-line disabled:text-muted disabled:opacity-50`}
    >
      <PlayIcon playing={p.playing} />
    </button>
  )
}

/**
 * Player completo: tocar, pausar, repetir e velocidade.
 * `hidden` = "ouvir sem ver": nada do texto é exibido, só os controles.
 */
export function AudioPlayer({ audio, hidden = false }: { audio: AudioRef; hidden?: boolean }) {
  const p = usePlayer(audio)
  const settings = useSettings()
  const [rate, setRate] = useState(settings.audioRate)

  if (p.resolution.kind === 'none')
    return (
      <p className="rounded-lg border border-dashed border-line px-4 py-3 text-sm text-muted" role="status">
        Áudio indisponível: {p.resolution.reason}
      </p>
    )

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2" role="group" aria-label={hidden ? 'Áudio (ouvir sem ver)' : 'Áudio'}>
      <button
        type="button" onClick={() => (p.mine && p.engine.state !== 'idle' ? p.toggle() : p.play(rate))}
        aria-label={p.playing ? 'Pausar' : 'Tocar'}
        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-section text-bg"
      >
        <PlayIcon playing={p.playing} />
      </button>
      <button type="button" onClick={() => p.play(rate)} className="btn btn-ghost min-h-11 px-3 text-sm" aria-label="Ouvir de novo">
        ↻ de novo
      </button>
      <div className="flex items-center gap-1 text-sm" role="radiogroup" aria-label="Velocidade">
        {SPEEDS.map((s, i) => (
          <span key={s} className="flex items-center">
            {i > 0 && <span className="px-1 text-muted" aria-hidden="true">·</span>}
            <button
              type="button" role="radio" aria-checked={rate === s}
              onClick={() => {
                setRate(s)
                void repo.updateSettings({ audioRate: s })
              }}
              className={`min-h-11 rounded px-2 tabular-nums ${rate === s ? 'font-bold text-section underline underline-offset-4' : 'text-muted'}`}
            >
              {String(s).replace('.', ',')}×
            </button>
          </span>
        ))}
      </div>
      {p.resolution.kind === 'tts' && <span className="label w-full">voz sintética moderna · {p.model.name}</span>}
      {p.resolution.kind === 'file' && p.resolution.sourceId === 'local-espeak' && <span className="label w-full">voz sintética por regras · {p.model.name}</span>}
    </div>
  )
}
