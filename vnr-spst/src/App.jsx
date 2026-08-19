import { Routes, Route } from 'react-router-dom'
import Register from './pages/Register.jsx'
import Host from './pages/Host.jsx'
import PickTeam from './pages/PickTeam.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Register />} />
      <Route path="/host" element={<Host />} />
      <Route path="/pick-team" element={<PickTeam />} />
    </Routes>
  )
}

export default App
