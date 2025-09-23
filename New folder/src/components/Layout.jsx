import { Link, useLocation } from 'react-router-dom'
import './Layout.css'

const Layout = ({ children }) => {
  const location = useLocation()
  
  // For individual pages, don't show navigation - mimic original single-page design
  const isMainDashboard = location.pathname === '/'
  
  if (!isMainDashboard) {
    return (
      <div className="app-layout single-page">
        <header className="app-header">
          <div className="header-content">
            <button className="back-btn" onClick={() => window.history.back()}>←</button>
            <h1 className="page-title">IBM Maximo</h1>
          </div>
        </header>
        
        <main className="app-main">
          <div className="container">
            {children}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-layout">
      <div className="dashboard-container">
        <h1 className="maximo-title">IBM Maximo</h1>
        <div className="grid-container">
          <Link to="/job-cards" className="card">
            <h2>Job-Card</h2>
          </Link>
          <Link to="/fitness" className="card">
            <h2>Fitness Certificates</h2>
          </Link>
          <Link to="/branding" className="card">
            <h2>Branding Priorities</h2>
          </Link>
          <Link to="/mileage" className="card">
            <h2>Mileage Balancing</h2>
          </Link>
          <Link to="/stabling" className="card">
            <h2>Cleaning & Detailing</h2>
          </Link>
          <Link to="/scheduling" className="card">
            <h2>Train Scheduling</h2>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Layout