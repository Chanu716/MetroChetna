import { useState, useEffect } from 'react'
import { useRailwayData } from '../hooks/useRailwayData'
import railwayAPI from '../services/railwayAPI'
import './JobCards.css'

const JobCards = () => {
  const { data: jobCards, loading, error, refresh } = useRailwayData('job_cards')
  const [activeSection, setActiveSection] = useState(null)
  const [selectedJobCard, setSelectedJobCard] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  const [newJobCard, setNewJobCard] = useState({
    jobCardID: '',
    trainID: '',
    taskDescription: '',
    openDate: new Date().toISOString().split('T')[0]
  })

  const openJobCards = jobCards.filter(card => card.Status === 'Open')

  useEffect(() => {
    // Generate new Job Card ID when opening new card section
    if (activeSection === 'open') {
      const newId = `JC${Date.now().toString().slice(-4)}`
      setNewJobCard(prev => ({ ...prev, jobCardID: newId }))
    }
  }, [activeSection])

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 5000)
  }

  const handleOpenJobCard = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const jobCardData = {
        JobCard_ID: newJobCard.jobCardID,
        Train_ID: newJobCard.trainID,
        Task_Description: newJobCard.taskDescription,
        Opened_Date: newJobCard.openDate,
        Status: 'Open',
        Closed_Date: ''
      }

      await railwayAPI.saveJobCardData(jobCardData)
      showMessage('Job card opened successfully!')
      setActiveSection(null)
      setNewJobCard({
        jobCardID: '',
        trainID: '',
        taskDescription: '',
        openDate: new Date().toISOString().split('T')[0]
      })
      refresh()
    } catch (error) {
      showMessage(`Error opening job card: ${error.message}`, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseJobCard = async () => {
    if (!selectedJobCard) return

    const result = window.confirm('Are you sure you want to close this job card?')
    if (!result) return

    setIsSubmitting(true)

    try {
      const updatedJobCardData = {
        ...selectedJobCard,
        Status: 'Closed',
        Closed_Date: new Date().toISOString().split('T')[0]
      }

      await railwayAPI.updateJobCardData(selectedJobCard.JobCard_ID, updatedJobCardData)
      showMessage('Job card closed successfully!')
      setActiveSection(null)
      setSelectedJobCard(null)
      refresh()
    } catch (error) {
      showMessage(`Error closing job card: ${error.message}`, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="job-cards">
        <h1>Job Cards</h1>
        <div className="loading">Loading job cards...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="job-cards">
        <h1>Job Cards</h1>
        <div className="error">Error loading job cards: {error}</div>
      </div>
    )
  }

  return (
    <div className="job-cards">
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="action-buttons">
        <div 
          className="action-card"
          onClick={() => setActiveSection('open')}
        >
          <h3>Open New Card</h3>
        </div>

        <div 
          className="action-card"
          onClick={() => setActiveSection('close')}
        >
          <h3>Close Existing Card</h3>
        </div>
      </div>

      {/* Open New Card Section */}
      {activeSection === 'open' && (
        <div className="form-section">
          <div className="section-header">
            <h3>Open New Job Card</h3>
            <button className="close-btn" onClick={() => setActiveSection(null)}>
              ×
            </button>
          </div>

          <form onSubmit={handleOpenJobCard} className="job-card-form">
            <div className="form-group">
              <label htmlFor="jobCardID">Job Card ID</label>
              <input
                type="text"
                id="jobCardID"
                value={newJobCard.jobCardID}
                readOnly
              />
            </div>

            <div className="form-group">
              <label htmlFor="trainID">Train ID *</label>
              <input
                type="text"
                id="trainID"
                value={newJobCard.trainID}
                onChange={(e) => setNewJobCard(prev => ({ ...prev, trainID: e.target.value }))}
                placeholder="Enter Train ID (e.g., T001, T002...)"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="openDate">Open Date</label>
              <input
                type="date"
                id="openDate"
                value={newJobCard.openDate}
                readOnly
              />
            </div>

            <div className="form-group">
              <label htmlFor="taskDescription">Task Description *</label>
              <textarea
                id="taskDescription"
                value={newJobCard.taskDescription}
                onChange={(e) => setNewJobCard(prev => ({ ...prev, taskDescription: e.target.value }))}
                placeholder="Describe the maintenance work to be performed in detail..."
                required
              />
            </div>

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Opening...' : 'Open Job Card'}
            </button>
          </form>
        </div>
      )}

      {/* Close Existing Card Section */}
      {activeSection === 'close' && (
        <div className="form-section">
          <div className="section-header">
            <h3>Close Existing Job Card</h3>
            <button className="close-btn" onClick={() => setActiveSection(null)}>
              ×
            </button>
          </div>

          <div className="job-card-form">
            <div className="form-group">
              <label htmlFor="existingJobCardID">Job Card ID</label>
              <select
                id="existingJobCardID"
                value={selectedJobCard?.JobCard_ID || ''}
                onChange={(e) => {
                  const card = openJobCards.find(c => c.JobCard_ID === e.target.value)
                  setSelectedJobCard(card)
                }}
              >
                <option value="" disabled>Select an open job card...</option>
                {openJobCards.map(card => (
                  <option key={card.JobCard_ID} value={card.JobCard_ID}>
                    {card.JobCard_ID} - {card.Task_Description?.substring(0, 50)}...
                  </option>
                ))}
              </select>
            </div>

            {selectedJobCard && (
              <div className="job-card-details">
                <div className="form-group">
                  <label>Train ID</label>
                  <input
                    type="text"
                    value={selectedJobCard.Train_ID || 'Not specified'}
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label>Opened Date</label>
                  <input
                    type="text"
                    value={selectedJobCard.Opened_Date}
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label>Job Description</label>
                  <textarea
                    value={selectedJobCard.Task_Description}
                    readOnly
                  />
                </div>

                <button 
                  className="submit-btn close-btn-action" 
                  onClick={handleCloseJobCard}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Closing...' : 'Close Job Card'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default JobCards