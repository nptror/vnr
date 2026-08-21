import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Host from './pages/Host.jsx'
import PickTeam from './pages/PickTeam.jsx'
import Play from './pages/Play.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/host" element={<Host />} />
      <Route path="/pick-team" element={<PickTeam />} />
      <Route path="/play" element={<Play />} />
    </Routes>
  )
}

export default App
