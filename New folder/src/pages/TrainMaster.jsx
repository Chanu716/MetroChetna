import { useRailwayData } from '../hooks/useRailwayData'

const TrainMaster = () => {
  const { data: trains, loading, error } = useRailwayData('train_master')

  if (loading) return <div className="page-loading">Loading train data...</div>
  if (error) return <div className="page-error">Error: {error}</div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>Train Master</h1>
        <p>Manage train information and specifications</p>
      </div>

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>Train ID</th>
              <th>Year Commissioned</th>
              <th>Base Mileage</th>
              <th>Last Service Type</th>
              <th>Last Service Date</th>
              <th>Current Status</th>
            </tr>
          </thead>
          <tbody>
            {trains.map((train, index) => (
              <tr key={train.Train_ID || index}>
                <td>{train.Train_ID}</td>
                <td>{train.Year_Commissioned}</td>
                <td>{train.Base_Mileage}</td>
                <td>{train.Last_Service_Type}</td>
                <td>{train.Last_Service_Date}</td>
                <td>{train.Current_Status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="stats-summary">
        <div className="stat-item">
          <h3>{trains.length}</h3>
          <p>Total Trains</p>
        </div>
      </div>
    </div>
  )
}

export default TrainMaster