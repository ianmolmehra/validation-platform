import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Results from './pages/Results'
import Analytics from './pages/Analytics'
import History from './pages/History'
import Logs from './pages/Logs'
import Reports from './pages/Reports'
import Countries from './pages/Countries'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="upload" element={<Upload />} />
        <Route path="results/:jobId" element={<Results />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="history" element={<History />} />
        <Route path="logs" element={<Logs />} />
        <Route path="reports/:jobId" element={<Reports />} />
        <Route path="countries" element={<Countries />} />
      </Route>
    </Routes>
  )
}
