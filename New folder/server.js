import express from 'express'
import cors from 'cors'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3000

// Middleware
app.use(cors())
app.use(express.json())

// CSV file paths (relative to the workspace root)
const CSV_FILES = {
  'job_cards': '../../Input CSVs/job_cards.csv',
  'train_master': '../../Input CSVs/train_master.csv',
  'branding': '../../Input CSVs/branding.csv',
  'fitness_certificates': '../../Input CSVs/fitness_certificates.csv',
  'mileage': '../../Input CSVs/mileage.csv',
  'stabling_geometry_actual': '../../Input CSVs/stabling_geometry_actual.csv'
}

// Helper function to read and parse CSV
async function readCSV(filePath) {
  try {
    const fullPath = path.resolve(__dirname, filePath)
    const data = await fs.readFile(fullPath, 'utf8')
    
    // Parse CSV data
    const lines = data.split('\n').filter(line => line.trim())
    if (lines.length === 0) return []
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
      const row = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      return row
    })
    
    return rows
  } catch (error) {
    console.error(`Error reading CSV ${filePath}:`, error)
    return []
  }
}

// Helper function to write CSV
async function writeCSV(filePath, data) {
  try {
    if (data.length === 0) return
    
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n')
    
    const fullPath = path.resolve(__dirname, filePath)
    await fs.writeFile(fullPath, csvContent, 'utf8')
  } catch (error) {
    console.error(`Error writing CSV ${filePath}:`, error)
    throw error
  }
}

// Routes

// Health check
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    message: 'MetroChetna API Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// Get data from a specific sheet
app.get('/api/data/:sheetName', async (req, res) => {
  const { sheetName } = req.params
  
  if (!CSV_FILES[sheetName]) {
    return res.status(404).json({
      success: false,
      error: `Sheet '${sheetName}' not found. Available sheets: ${Object.keys(CSV_FILES).join(', ')}`
    })
  }
  
  try {
    const data = await readCSV(CSV_FILES[sheetName])
    res.json({
      success: true,
      data: data,
      count: data.length,
      sheetName: sheetName
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to read data from ${sheetName}: ${error.message}`
    })
  }
})

// Add new record to a sheet
app.post('/api/data/:sheetName', async (req, res) => {
  const { sheetName } = req.params
  const newRecord = req.body
  
  if (!CSV_FILES[sheetName]) {
    return res.status(404).json({
      success: false,
      error: `Sheet '${sheetName}' not found`
    })
  }
  
  try {
    const existingData = await readCSV(CSV_FILES[sheetName])
    
    // Generate ID if not provided
    if (!newRecord.id) {
      const maxId = existingData.length > 0 
        ? Math.max(...existingData.map(item => parseInt(item.id) || 0))
        : 0
      newRecord.id = (maxId + 1).toString()
    }
    
    // Add timestamp
    newRecord.created_at = new Date().toISOString()
    
    existingData.push(newRecord)
    await writeCSV(CSV_FILES[sheetName], existingData)
    
    res.json({
      success: true,
      message: 'Record added successfully',
      data: newRecord
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to add record: ${error.message}`
    })
  }
})

// Update record in a sheet
app.put('/api/data/:sheetName/:id', async (req, res) => {
  const { sheetName, id } = req.params
  const updateData = req.body
  
  if (!CSV_FILES[sheetName]) {
    return res.status(404).json({
      success: false,
      error: `Sheet '${sheetName}' not found`
    })
  }
  
  try {
    const existingData = await readCSV(CSV_FILES[sheetName])
    const recordIndex = existingData.findIndex(item => item.id === id)
    
    if (recordIndex === -1) {
      return res.status(404).json({
        success: false,
        error: `Record with ID ${id} not found`
      })
    }
    
    // Update record
    existingData[recordIndex] = { ...existingData[recordIndex], ...updateData }
    existingData[recordIndex].updated_at = new Date().toISOString()
    
    await writeCSV(CSV_FILES[sheetName], existingData)
    
    res.json({
      success: true,
      message: 'Record updated successfully',
      data: existingData[recordIndex]
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to update record: ${error.message}`
    })
  }
})

// Delete record from a sheet
app.delete('/api/data/:sheetName/:id', async (req, res) => {
  const { sheetName, id } = req.params
  
  if (!CSV_FILES[sheetName]) {
    return res.status(404).json({
      success: false,
      error: `Sheet '${sheetName}' not found`
    })
  }
  
  try {
    const existingData = await readCSV(CSV_FILES[sheetName])
    const recordIndex = existingData.findIndex(item => item.id === id)
    
    if (recordIndex === -1) {
      return res.status(404).json({
        success: false,
        error: `Record with ID ${id} not found`
      })
    }
    
    existingData.splice(recordIndex, 1)
    await writeCSV(CSV_FILES[sheetName], existingData)
    
    res.json({
      success: true,
      message: 'Record deleted successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to delete record: ${error.message}`
    })
  }
})

// List available sheets
app.get('/api/sheets', (req, res) => {
  res.json({
    success: true,
    sheets: Object.keys(CSV_FILES),
    message: 'Available data sheets'
  })
})

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error)
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MetroChetna API Server running on http://localhost:${PORT}`)
  console.log(`📊 Available endpoints:`)
  console.log(`   GET  /api/stats - Server health check`)
  console.log(`   GET  /api/sheets - List available data sheets`)
  console.log(`   GET  /api/data/:sheetName - Get all records from sheet`)
  console.log(`   POST /api/data/:sheetName - Add new record to sheet`)
  console.log(`   PUT  /api/data/:sheetName/:id - Update record by ID`)
  console.log(`   DELETE /api/data/:sheetName/:id - Delete record by ID`)
  console.log(`📁 Reading CSV files from: Input CSVs/`)
})

export default app