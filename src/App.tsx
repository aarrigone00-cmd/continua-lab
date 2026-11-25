import { Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './components/AuthProvider'
import { GridLines } from './components/GridLines'
import { Nav } from './components/Nav'
import { RequireAuth } from './components/RequireAuth'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { BrandDNA } from './pages/BrandDNA'
import { WorkspaceProvider } from './components/WorkspaceProvider'
import { Room } from './pages/Room'

function StudioLayout() {
  return (
    <>
      <Nav />
      <main>
        <WorkspaceProvider>
          <Outlet />
        </WorkspaceProvider>
      </main>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <div className="relative min-h-screen">
        <GridLines />
        <div className="relative px-[4%] pt-7 pb-16">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<RequireAuth />}>
              <Route element={<StudioLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/brand-dna" element={<BrandDNA />} />
                <Route path="/creative-director" element={<Room phase="Phase 3" title="The Creative Director" summary="A direct line to Claude, briefed on approved brand knowledge and everything you have published before." />} />
                <Route path="/trend-radar" element={<Room phase="Phase 6" title="Trend Radar" summary="Grok's research into design, culture and materials, with every trend linked to its sources and dates." />} />
                <Route path="/calendar" element={<Room phase="Phase 5" title="The Calendar" summary="A month of content at a glance. Drag to reschedule without regenerating anything." />} />
                <Route path="/review" element={<Room phase="Phase 5" title="Review Studio" summary="Nothing is published without your approval. Edits after approval require a fresh one." />} />
                <Route path="*" element={<Room phase="—" title="Room not found" summary="This room doesn't exist. Use the navigation above to return to the studio." />} />
              </Route>
            </Route>
          </Routes>
        </div>
      </div>
    </AuthProvider>
  )
}
