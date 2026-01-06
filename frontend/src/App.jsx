import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Dashboard } from './components/Dashboard'
import { KanbanBoard } from './components/KanbanBoard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/board" element={<KanbanBoard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
