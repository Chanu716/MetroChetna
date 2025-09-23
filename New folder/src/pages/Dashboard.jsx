import { Link } from 'react-router-dom'
import './Dashboard.css'

const Dashboard = () => {
  const dashboardCards = [
    {
      title: 'Train Master',
      path: '/train-master',
      icon: '🚂',
      description: 'Manage train information and specifications',
      color: '#5c6bc0'
    },
    {
      title: 'Job Cards',
      path: '/job-cards',
      icon: '🔧',
      description: 'Track maintenance tasks and work orders',
      color: '#ff9800'
    },
    {
      title: 'Fitness Certificates',
      path: '/fitness',
      icon: '📋',
      description: 'Monitor safety certifications and compliance',
      color: '#4caf50'
    },
    {
      title: 'Branding Campaigns',
      path: '/branding',
      icon: '🎨',
      description: 'Manage advertising campaigns on trains',
      color: '#e91e63'
    },
    {
      title: 'Mileage Records',
      path: '/mileage',
      icon: '⛽',
      description: 'Track usage and service intervals',
      color: '#2196f3'
    },
    {
      title: 'Stabling Geometry',
      path: '/stabling',
      icon: '🏗️',
      description: 'Depot layout and movement optimization',
      color: '#9c27b0'
    },
    {
      title: 'Train Scheduling',
      path: '/scheduling',
      icon: '📊',
      description: 'Advanced scheduling and eligibility analysis',
      color: '#607d8b'
    }
  ]

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>MetroChetna Dashboard</h1>
        <p>Railway Train Management System - IBM Maximo Compatible</p>
      </div>
      
      <div className="dashboard-grid">
        {dashboardCards.map((card) => (
          <Link
            key={card.path}
            to={card.path}
            className="dashboard-card"
            style={{ '--card-color': card.color }}
          >
            <div className="card-icon">{card.icon}</div>
            <h3 className="card-title">{card.title}</h3>
            <p className="card-description">{card.description}</p>
            <div className="card-arrow">→</div>
          </Link>
        ))}
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h4>Migration Status</h4>
          <div className="status-indicator active">🟢 React Ready</div>
        </div>
        
        <div className="stat-card">
          <h4>Job Cards</h4>
          <div className="status-indicator active">🟢 Fully Migrated</div>
        </div>
        
        <div className="stat-card">
          <h4>API Integration</h4>
          <div className="status-indicator active">🟢 Connected</div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard