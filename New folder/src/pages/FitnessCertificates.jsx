import { useState } from 'react'
import { useRailwayData } from '../hooks/useRailwayData'

const FitnessCertificates = () => {
  const { data: certificates, loading, error, refresh } = useRailwayData('fitness_certificates')
  const [selectedStatus, setSelectedStatus] = useState('all')

  const filterByStatus = (status) => {
    const today = new Date().toISOString().split('T')[0]
    return certificates.filter(cert => {
      if (status === 'valid') return cert.Expiry_Date > today && cert.Status === 'Valid'
      if (status === 'expired') return cert.Expiry_Date <= today || cert.Status === 'Expired'
      if (status === 'awaiting') return cert.Status === 'Awaiting Approval'
      return true
    })
  }

  const filteredCertificates = filterByStatus(selectedStatus)

  if (loading) return <div className="page-loading">Loading fitness certificates...</div>
  if (error) return <div className="page-error">Error: {error}</div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>Fitness Certificates</h1>
        <p>Monitor safety certifications and compliance</p>
      </div>

      <div className="filter-tabs">
        <button 
          className={selectedStatus === 'all' ? 'active' : ''}
          onClick={() => setSelectedStatus('all')}
        >
          All ({certificates.length})
        </button>
        <button 
          className={selectedStatus === 'valid' ? 'active' : ''}
          onClick={() => setSelectedStatus('valid')}
        >
          Valid ({filterByStatus('valid').length})
        </button>
        <button 
          className={selectedStatus === 'expired' ? 'active' : ''}
          onClick={() => setSelectedStatus('expired')}
        >
          Expired ({filterByStatus('expired').length})
        </button>
        <button 
          className={selectedStatus === 'awaiting' ? 'active' : ''}
          onClick={() => setSelectedStatus('awaiting')}
        >
          Awaiting ({filterByStatus('awaiting').length})
        </button>
      </div>

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>Train ID</th>
              <th>Certificate Type</th>
              <th>Issue Date</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th>Inspector</th>
            </tr>
          </thead>
          <tbody>
            {filteredCertificates.map((cert, index) => (
              <tr key={`${cert.Train_ID}-${cert.Certificate_Type}` || index}>
                <td>{cert.Train_ID}</td>
                <td>{cert.Certificate_Type}</td>
                <td>{cert.Issue_Date}</td>
                <td>{cert.Expiry_Date}</td>
                <td>
                  <span className={`status ${cert.Status?.toLowerCase()}`}>
                    {cert.Status}
                  </span>
                </td>
                <td>{cert.Inspector}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default FitnessCertificates