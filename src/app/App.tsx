import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'
import { LanguageLayout } from './LanguageLayout'
import { AudioProvider, ProgressProvider } from './providers'

// telas além da inicial entram sob demanda (code splitting)
const MapPage = lazy(() => import('../pages/MapPage'))
const LessonPage = lazy(() => import('../pages/LessonPage'))
const PracticePage = lazy(() => import('../pages/PracticePage'))
const ReadListPage = lazy(() => import('../pages/ReadListPage'))
const ReaderPage = lazy(() => import('../pages/ReaderPage'))
const SecretsPage = lazy(() => import('../pages/SecretsPage'))
const ProfilePage = lazy(() => import('../pages/ProfilePage'))
const SourcesPage = lazy(() => import('../pages/SourcesPage'))
const SettingsPage = lazy(() => import('../pages/SettingsPage'))

export function App() {
  return (
    <ProgressProvider>
      <AudioProvider>
        {/* HashRouter: funciona em qualquer hospedagem estática e offline, sem configurar o servidor */}
        <HashRouter>
          <Suspense fallback={<p className="p-8 text-center text-muted" role="status">Carregando…</p>}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/fontes" element={<SourcesPage />} />
              <Route path="/ajustes" element={<SettingsPage />} />
              <Route path="/:lang" element={<LanguageLayout />}>
                <Route index element={<MapPage />} />
                <Route path="licao/:lessonId" element={<LessonPage />} />
                <Route path="revisar" element={<PracticePage mode="review" />} />
                <Route path="praticar/:unitId" element={<PracticePage mode="unit" />} />
                <Route path="ler" element={<ReadListPage />} />
                <Route path="ler/:textId" element={<ReaderPage />} />
                <Route path="segredos" element={<SecretsPage />} />
                <Route path="progresso" element={<ProfilePage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </HashRouter>
      </AudioProvider>
    </ProgressProvider>
  )
}
