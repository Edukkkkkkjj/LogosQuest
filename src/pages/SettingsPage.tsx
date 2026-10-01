import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAudio, useProgress } from '../app/providers'
import { Script } from '../components/Script'
import { LANGUAGES } from '../data'
import { repo } from '../features/progress/repo'
import type { Settings } from '../types/progress'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line py-4">
      <p className="font-semibold">{label}</p>
      {hint && <p className="text-sm text-muted">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  )
}

function Choice<T extends string | number | boolean>({ value, options, onChange, name }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; name: string }) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)} className="opt w-auto" data-state={value === o.value ? 'selected' : undefined}>
          {value === o.value && <span aria-hidden="true">●</span>}{o.label}
        </button>
      ))}
    </div>
  )
}

export default function SettingsPage() {
  const { profile } = useProgress()
  const { engine } = useAudio()
  const s = profile.settings
  const set = (patch: Partial<Settings>) => void repo.updateSettings(patch)
  const file = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [backups, setBackups] = useState<{ id: number; at: number }[]>([])
  const refresh = () => void repo.listBackups().then(setBackups)
  useEffect(refresh, [])

  const exportJson = async () => {
    const data = await repo.exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `logosquest-progresso-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setMessage('Progresso exportado.')
  }

  const importJson = async (f: File) => {
    try {
      await repo.backup()
      await repo.importAll(JSON.parse(await f.text()))
      setMessage('Progresso importado. O estado anterior ficou guardado nas cópias de segurança.')
      refresh()
    } catch (e) {
      setMessage(`Não foi possível importar: ${e instanceof Error ? e.message : 'arquivo inválido'}`)
    }
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link to="/" className="label py-3">← início</Link>
        <h1 className="mt-4 text-4xl">Ajustes</h1>

        <h2 className="mt-8 text-2xl">Leitura</h2>
        <Field label="Tamanho do texto original" hint="Aumenta o hebraico e o grego em todas as telas.">
          <input
            type="range" min="0.85" max="1.6" step="0.05" value={s.textScale} aria-label="Tamanho do texto original"
            onChange={(e) => set({ textScale: Number(e.target.value) })} className="w-full accent-[var(--accent)]"
          />
          <p className="mt-2 text-center">
            <Script language="hebrew" className="text-4xl">בְּרֵאשִׁית</Script>
            <span className="mx-4 text-muted">·</span>
            <Script language="greek" className="text-4xl">Ἐν ἀρχῇ ἦν</Script>
          </p>
        </Field>
        <Field label="Transliteração" hint="Mostra a leitura em letras latinas sob as palavras. Desligar é um bom desafio depois das primeiras unidades.">
          <Choice name="Transliteração" value={s.showTranslit} onChange={(v) => set({ showTranslit: v })} options={[{ value: true, label: 'Mostrar' }, { value: false, label: 'Ocultar' }]} />
        </Field>
        <Field label="Aparência">
          <Choice name="Aparência" value={s.theme} onChange={(v) => set({ theme: v })} options={[{ value: 'auto', label: 'Como o aparelho' }, { value: 'light', label: 'Clara' }, { value: 'dark', label: 'Escura' }]} />
        </Field>
        <Field label="Movimento" hint="Reduz animações. O app também respeita a preferência do sistema.">
          <Choice name="Movimento" value={s.reducedMotion} onChange={(v) => set({ reducedMotion: v })} options={[{ value: false, label: 'Normal' }, { value: true, label: 'Reduzido' }]} />
        </Field>

        <h2 className="mt-8 text-2xl">Pronúncia</h2>
        {LANGUAGES.map((l) => (
          <Field key={l.id} label={l.name} hint="O modelo escolhido define as descrições de som e, quando há, o áudio.">
            <div className="space-y-2">
              {l.pronunciationModels.map((m) => {
                const on = s.pronunciation[l.id] === m.id
                return (
                  <button key={m.id} type="button" role="radio" aria-checked={on} className="opt items-start" data-state={on ? 'selected' : undefined}
                    onClick={() => set({ pronunciation: { ...s.pronunciation, [l.id]: m.id } })}>
                    <span aria-hidden="true" className="mt-1">{on ? '●' : '○'}</span>
                    <span>
                      <span className="block font-semibold">{m.name}</span>
                      <span className="block text-sm text-muted">{m.caveat}</span>
                      <span className="label mt-1 block">neste aparelho: {engine.describe(m)}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </Field>
        ))}

        <h2 className="mt-8 text-2xl">Seu progresso</h2>
        <p className="mt-1 text-sm text-muted">Tudo fica guardado neste navegador, sem conta e sem servidor. Exporte de vez em quando para ter uma cópia sua.</p>
        <Field label="Exportar e importar" hint="Um arquivo JSON com todo o seu progresso. Importar substitui o progresso atual.">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={() => void exportJson()}>Exportar progresso</button>
            <button type="button" className="btn" onClick={() => file.current?.click()}>Importar progresso</button>
            <input ref={file} type="file" accept="application/json,.json" className="sr-only" aria-label="Arquivo de progresso"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void importJson(f)
                e.target.value = ''
              }} />
          </div>
        </Field>
        <Field label="Cópias de segurança neste aparelho" hint="Criadas automaticamente ao concluir lições (uma por dia, as cinco mais recentes).">
          {backups.length === 0 ? <p className="text-sm text-muted">Nenhuma ainda.</p> : (
            <ul className="space-y-2">
              {backups.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{new Date(b.at).toLocaleString('pt-BR')}</span>
                  <button type="button" className="btn min-h-11" onClick={() => void repo.restoreBackup(b.id).then(() => setMessage('Cópia restaurada.'))}>Restaurar</button>
                </li>
              ))}
            </ul>
          )}
        </Field>
        <Field label="Apagar o progresso" hint="Remove lições, domínio, conquistas e ajustes deste navegador. As cópias de segurança internas são mantidas.">
          {!confirming ? (
            <button type="button" className="btn border-bad text-bad" onClick={() => setConfirming(true)}>Apagar tudo…</button>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-bad p-3" role="alertdialog" aria-label="Confirmar exclusão">
              <p className="font-semibold">Tem certeza? Isto apaga todo o seu progresso nos dois idiomas.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn" autoFocus onClick={() => setConfirming(false)}>Cancelar</button>
                <button type="button" className="btn border-bad text-bad"
                  onClick={() => void (async () => {
                    await repo.backup()
                    await repo.resetAll()
                    setConfirming(false)
                    setMessage('Progresso apagado. Uma cópia de segurança foi guardada antes.')
                    refresh()
                  })()}>
                  Sim, apagar
                </button>
              </div>
            </div>
          )}
        </Field>
        <p role="status" className="min-h-6 text-sm font-semibold text-section">{message}</p>
      </div>
    </div>
  )
}
