import { useRailwayData } from '../hooks/useRailwayData'

const BrandingCampaigns = () => {
  const { data: campaigns, loading, error } = useRailwayData('branding')

  if (loading) return <div className="page-loading">Loading branding data...</div>
  if (error) return <div className="page-error">Error: {error}</div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>Branding Campaigns</h1>
        <p>Manage advertising campaigns on trains</p>
      </div>

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>Campaign ID</th>
              <th>Train ID</th>
              <th>Advertiser</th>
              <th>Campaign Name</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Remaining Hours</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign, index) => (
              <tr key={campaign.Campaign_ID || index}>
                <td>{campaign.Campaign_ID}</td>
                <td>{campaign.Train_ID}</td>
                <td>{campaign.Advertiser_ID}</td>
                <td>{campaign.Campaign_Name}</td>
                <td>{campaign.Start_Date}</td>
                <td>{campaign.End_Date}</td>
                <td>{campaign.Remaining_Hours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="stats-summary">
        <div className="stat-item">
          <h3>{campaigns.length}</h3>
          <p>Active Campaigns</p>
        </div>
      </div>
    </div>
  )
}

export default BrandingCampaigns