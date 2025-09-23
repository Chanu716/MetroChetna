import { useRailwayData } from '../hooks/useRailwayData'

const StablingGeometry = () => {
  const { data: stabling, loading, error } = useRailwayData('stabling_geometry')

  if (loading) return <div className="page-loading">Loading stabling data...</div>
  if (error) return <div className="page-error">Error: {error}</div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>Stabling Geometry</h1>
        <p>Depot layout and movement optimization</p>
      </div>

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>Depot</th>
              <th>From Bay</th>
              <th>To Bay</th>
              <th>Shunting Time</th>
              <th>Energy Cost</th>
              <th>Risk Score</th>
            </tr>
          </thead>
          <tbody>
            {stabling.slice(0, 50).map((record, index) => (
              <tr key={index}>
                <td>{record.Depot}</td>
                <td>{record.From_Bay}</td>
                <td>{record.To_Bay}</td>
                <td>{record.Shunting_Time_Minutes} min</td>
                <td>{record.Energy_Cost_kWh} kWh</td>
                <td>{record.Risk_Score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="stats-summary">
        <div className="stat-item">
          <h3>{stabling.length}</h3>
          <p>Movement Records</p>
        </div>
      </div>
    </div>
  )
}

export default StablingGeometry