import { useState, useEffect } from 'react'
import railwayAPI from '../services/railwayAPI'

export const useRailwayData = (sheetName) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await railwayAPI.getData(sheetName)
      setData(result)
    } catch (err) {
      setError(err.message)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [sheetName])

  const refresh = () => {
    fetchData()
  }

  return { data, loading, error, refresh }
}

export const useServerStatus = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [checking, setChecking] = useState(true)

  const checkConnection = async () => {
    try {
      setChecking(true)
      const connected = await railwayAPI.checkServerConnection()
      setIsConnected(connected)
    } catch (error) {
      setIsConnected(false)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    checkConnection()
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000)
    return () => clearInterval(interval)
  }, [])

  return { isConnected, checking, checkConnection }
}