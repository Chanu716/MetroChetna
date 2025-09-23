import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import TrainMaster from './pages/TrainMaster'
import BrandingCampaigns from './pages/BrandingCampaigns'
import FitnessCertificates from './pages/FitnessCertificates'
import JobCards from './pages/JobCards'
import MileageRecords from './pages/MileageRecords'
import StablingGeometry from './pages/StablingGeometry'
import TrainScheduling from './pages/TrainScheduling'
import './App.css'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/train-master" element={<TrainMaster />} />
          <Route path="/branding" element={<BrandingCampaigns />} />
          <Route path="/fitness" element={<FitnessCertificates />} />
          <Route path="/job-cards" element={<JobCards />} />
          <Route path="/mileage" element={<MileageRecords />} />
          <Route path="/stabling" element={<StablingGeometry />} />
          <Route path="/scheduling" element={<TrainScheduling />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
