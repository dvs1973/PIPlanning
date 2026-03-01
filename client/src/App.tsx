import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/shared/Toast'
import Sidebar from './components/Layout/Sidebar'
import LoginPage from './pages/LoginPage'
import RoadmapPage from './pages/RoadmapPage'
import SprintPlanningPage from './pages/SprintPlanningPage'
import CapacityPage from './pages/CapacityPage'
import ProjectsPage from './pages/ProjectsPage'
import TeamsPage from './pages/TeamsPage'
import ScenariosPage from './pages/ScenariosPage'

function ProtectedLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-gray-400 text-sm">Laden...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 lg:ml-56 p-6 max-w-full overflow-x-hidden">
        <Routes>
          <Route path="/" element={<RoadmapPage />} />
          <Route path="/sprint-planning" element={<SprintPlanningPage />} />
          <Route path="/capacity" element={<CapacityPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/scenarios" element={<ScenariosPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function PublicRoute() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <LoginPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<PublicRoute />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
