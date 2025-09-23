import { useRailwayData } from '../hooks/useRailwayData'

const MileageRecords = () => {
  const { data: mileage, loading, error } = useRailwayData('mileage')

  if (loading) return <div className="page-loading">Loading mileage data...</div>
  if (error) return <div className="page-error">Error: {error}</div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>Mileage Records</h1>
        <p>Track usage and service intervals</p>
      </div>

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>Train ID</th>
              <th>Current Mileage</th>
              <th>Daily Average</th>
              <th>Last Updated</th>
              <th>Next Service Due</th>
            </tr>
          </thead>
          <tbody>
            {mileage.map((record, index) => (
              <tr key={record.Train_ID || index}>
                <td>{record.Train_ID}</td>
                <td>{record.Current_Mileage}</td>
                <td>{record.Daily_Average_Mileage}</td>
                <td>{record.Last_Updated}</td>
                <td>{record.Next_Service_Due}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="stats-summary">
        <div className="stat-item">
          <h3>{mileage.length}</h3>
          <p>Tracked Trains</p>
        </div>
      </div>
    </div>
  )
}

export default MileageRecords