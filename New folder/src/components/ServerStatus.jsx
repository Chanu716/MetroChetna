import { useServerStatus } from '../hooks/useRailwayData'

const ServerStatus = () => {
  const { isConnected, checking } = useServerStatus()

  return (
    <div className={`server-status ${isConnected ? 'connected' : 'disconnected'}`}>
      <div className="status-indicator">
        {checking ? (
          <>🔄 Checking...</>
        ) : isConnected ? (
          <>🟢 Backend Connected</>
        ) : (
          <>🔴 Backend Offline</>
        )}
      </div>
      {!isConnected && !checking && (
        <p className="status-message">
          Start the original server: <code>npm start</code> in the original project folder
        </p>
      )}
    </div>
  )
}

export default ServerStatus