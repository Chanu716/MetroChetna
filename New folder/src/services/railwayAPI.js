import axios from 'axios'

// Configuration for your Google Sheets API
const API_BASE_URL = 'http://localhost:3000/api'

class RailwayAPIService {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    this.isServerAvailable = false
    this.checkServerConnection()
  }

  // Check if server is running
  async checkServerConnection() {
    try {
      const response = await this.axiosInstance.get('/stats')
      if (response.status === 200) {
        this.isServerAvailable = true
        console.log('✅ Server connection established')
        return true
      }
    } catch (error) {
      this.isServerAvailable = false
      console.warn('⚠️ Server not available. Make sure to run: npm start in the original project')
      return false
    }
  }

  // Get data from Google Sheets
  async getData(sheetName) {
    if (!this.isServerAvailable) {
      throw new Error('Server not available. Please start the server with: npm start')
    }

    try {
      const response = await this.axiosInstance.get(`/data/${sheetName}`)
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch data')
      }
      
      return response.data.data
    } catch (error) {
      console.error(`Error fetching data from ${sheetName}:`, error)
      throw error
    }
  }

  // Save data to Google Sheets
  async saveData(sheetName, data) {
    if (!this.isServerAvailable) {
      throw new Error('Server not available. Please start the server with: npm start')
    }

    try {
      const response = await this.axiosInstance.post(`/data/${sheetName}`, data)
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to save data')
      }
      
      return response.data
    } catch (error) {
      console.error('Error saving data:', error)
      throw error
    }
  }

  // Update existing record
  async updateData(sheetName, data) {
    if (!this.isServerAvailable) {
      throw new Error('Server not available. Please start the server with: npm start')
    }

    try {
      const response = await this.axiosInstance.put(`/data/${sheetName}`, data)
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update data')
      }
      
      return response.data
    } catch (error) {
      console.error('Error updating data:', error)
      throw error
    }
  }

  // Specific methods for different sheets
  async getTrainMasterData() {
    return await this.getData('train_master')
  }

  async getJobCardData() {
    return await this.getData('job_cards')
  }

  async getBrandingData() {
    return await this.getData('branding')
  }

  async getFitnessData() {
    return await this.getData('fitness_certificates')
  }

  async getMileageData() {
    return await this.getData('mileage')
  }

  async getStablingData() {
    return await this.getData('stabling_geometry')
  }

  // Save methods for specific sheets
  async saveJobCardData(data) {
    return await this.saveData('job_cards', data)
  }

  async saveFitnessData(data) {
    // Check if record exists to determine update vs create
    try {
      const existingData = await this.getFitnessData()
      const existingRecord = existingData.find(record => 
        record.Train_ID === data.Train_ID && record.Certificate_Type === data.Certificate_Type
      )
      
      if (existingRecord) {
        return await this.updateData('fitness_certificates', data)
      } else {
        return await this.saveData('fitness_certificates', data)
      }
    } catch (error) {
      console.error('Error saving fitness data:', error)
      throw error
    }
  }

  async updateJobCardData(jobCardId, updatedData) {
    return await this.updateData('job_cards', {
      JobCard_ID: jobCardId,
      ...updatedData
    })
  }

  // Get dashboard statistics
  async getStats() {
    try {
      const response = await this.axiosInstance.get('/stats')
      return response.data
    } catch (error) {
      console.error('Error fetching stats:', error)
      throw error
    }
  }
}

// Create singleton instance
const railwayAPI = new RailwayAPIService()

export default railwayAPI