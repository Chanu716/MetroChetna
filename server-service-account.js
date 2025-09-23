// Service Account Integration for Railway Maximo Clone
// This file shows how to use your Google Service Account credentials

// IMPORTANT: Never expose service account credentials in client-side code!
// This should be implemented server-side or through Google Apps Script

// Option 1: Server-side Node.js implementation (Recommended)
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files with no-cache headers for development
app.use(express.static('./', {
    setHeaders: (res, path) => {
        if (path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

// Initialize Google Sheets API with Service Account
const auth = new GoogleAuth({
  keyFile: './valiant-store-441008-q0-5711f1e44b63.json', // Path to your JSON file
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = '1kDzB4jwvJYpwmY-O4mtrCo1CM7_Ok-cLtPAghWrGBwQ'; // Your actual spreadsheet ID

// API endpoint to read data
app.get('/api/data/:sheetName', async (req, res) => {
  try {
    const sheetName = req.params.sheetName;
    console.log(`Attempting to read from sheet: ${sheetName}`);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: sheetName,
    });
    
    const rows = response.data.values;
    if (rows && rows.length > 0) {
      const headers = rows[0];
      const data = rows.slice(1).map(row => {
        const record = {};
        headers.forEach((header, index) => {
          record[header] = row[index] || '';
        });
        return record;
      });
      console.log(`Successfully read ${data.length} records from ${sheetName}`);
      res.json({ success: true, data, headers });
    } else {
      console.log(`No data found in sheet: ${sheetName}`);
      res.json({ success: true, data: [], headers: [] });
    }
  } catch (error) {
    console.error(`Error reading from sheet ${req.params.sheetName}:`, error.message);
    res.status(500).json({ success: false, error: error.message, details: 'Make sure the sheet exists and is shared with the service account' });
  }
});

// API endpoint to add data
app.post('/api/data/:sheetName', async (req, res) => {
  try {
    const sheetName = req.params.sheetName;
    const data = req.body;
    console.log(`Attempting to add data to sheet: ${sheetName}`, data);
    
    // Get headers first
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!1:1`,
    });
    
    if (!headerResponse.data.values || !headerResponse.data.values[0]) {
      throw new Error(`Sheet "${sheetName}" not found or has no headers. Make sure the sheet exists and has header row.`);
    }
    
    const headers = headerResponse.data.values[0];
    const rowData = headers.map(header => data[header] || '');
    
    console.log('Headers:', headers);
    console.log('Row data to insert:', rowData);
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: sheetName,
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowData],
      },
    });
    
    console.log(`Successfully added data to ${sheetName}`);
    res.json({ success: true, message: 'Data added successfully' });
  } catch (error) {
    console.error(`Error adding data to sheet ${req.params.sheetName}:`, error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Check that: 1) Sheet exists, 2) Sheet is shared with service account, 3) Sheet has headers in first row'
    });
  }
});

// API endpoint to update existing data
app.put('/api/data/:sheetName', async (req, res) => {
  try {
    const sheetName = req.params.sheetName;
    const data = req.body;
    console.log(`Attempting to update data in sheet: ${sheetName}`, data);
    
    // Get all data from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: sheetName,
    });
    
    if (!response.data.values || response.data.values.length === 0) {
      throw new Error(`Sheet "${sheetName}" not found or is empty`);
    }
    
    const rows = response.data.values;
    const headers = rows[0];
    
    // Find the row to update based on Record_ID or unique combination
    let rowIndex = -1;
    
    if (data.Record_ID) {
      // Find by Record_ID
      rowIndex = rows.findIndex((row, index) => {
        if (index === 0) return false; // Skip header row
        const recordId = row[headers.indexOf('Record_ID')];
        return recordId === data.Record_ID.toString();
      });
    } else if (data.Train_ID && data.Certificate_Type) {
      // Find by Train_ID and Certificate_Type combination (for fitness certificates)
      rowIndex = rows.findIndex((row, index) => {
        if (index === 0) return false; // Skip header row
        const trainId = row[headers.indexOf('Train_ID')];
        const certType = row[headers.indexOf('Certificate_Type')];
        return trainId === data.Train_ID && certType === data.Certificate_Type;
      });
    } else if (data.JobCard_ID) {
      // Find by JobCard_ID (for job cards)
      console.log(`Looking for JobCard_ID: ${data.JobCard_ID}`);
      const jobCardIdIndex = headers.indexOf('JobCard_ID');
      console.log(`JobCard_ID column index: ${jobCardIdIndex}`);
      
      rowIndex = rows.findIndex((row, index) => {
        if (index === 0) return false; // Skip header row
        const jobCardId = row[jobCardIdIndex];
        console.log(`Comparing row ${index}: ${jobCardId} vs ${data.JobCard_ID}`);
        return jobCardId === data.JobCard_ID.toString();
      });
      
      console.log(`Found row index: ${rowIndex}`);
    }
    
    if (rowIndex === -1) {
      // Record not found, add as new record
      const rowData = headers.map(header => data[header] || '');
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: sheetName,
        valueInputOption: 'RAW',
        requestBody: {
          values: [rowData],
        },
      });
      console.log(`Added new record to ${sheetName}`);
      res.json({ success: true, message: 'New record added successfully' });
    } else {
      // Update existing record
      console.log(`Updating existing record at row ${rowIndex + 1}`);
      console.log('Original row data:', rows[rowIndex]);
      
      const updatedRowData = headers.map(header => {
        // Use new data if provided, otherwise keep existing data
        const newValue = data[header] !== undefined ? data[header] : rows[rowIndex][headers.indexOf(header)] || '';
        console.log(`Column ${header}: ${rows[rowIndex][headers.indexOf(header)]} -> ${newValue}`);
        return newValue;
      });
      
      console.log('Updated row data:', updatedRowData);
      
      const updateRange = `${sheetName}!A${rowIndex + 1}:${String.fromCharCode(65 + headers.length - 1)}${rowIndex + 1}`;
      console.log(`Update range: ${updateRange}`);
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: updateRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: [updatedRowData],
        },
      });
      
      console.log(`Successfully updated record in ${sheetName} at row ${rowIndex + 1}`);
      res.json({ success: true, message: 'Record updated successfully' });
    }
  } catch (error) {
    console.error(`Error updating data in sheet ${req.params.sheetName}:`, error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Check that the sheet exists and record can be found'
    });
  }
});

// Debug endpoint to check specific job card
app.get('/api/debug/jobcard/:id', async (req, res) => {
  try {
    const jobCardId = req.params.id;
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'job_cards',
    });
    
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return res.json({ error: 'No data found' });
    }
    
    const headers = rows[0];
    const jobCardIdIndex = headers.indexOf('JobCard_ID');
    
    // Find the specific job card
    const foundRow = rows.find((row, index) => {
      if (index === 0) return false; // Skip header
      return row[jobCardIdIndex] === jobCardId;
    });
    
    if (foundRow) {
      const jobCard = {};
      headers.forEach((header, index) => {
        jobCard[header] = foundRow[index] || '';
      });
      res.json({ found: true, data: jobCard, headers });
    } else {
      res.json({ found: false, headers, totalRows: rows.length });
    }
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get dashboard stats
app.get('/api/stats', async (req, res) => {
  try {
    const stats = {
      totalTrains: await getRowCount('train_master'),
      activeJobs: await getActiveJobCards(),
      expiredCerts: await getExpiredCertificates(),
      activeCampaigns: await getActiveCampaigns()
    };
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper functions
async function getRowCount(sheetName) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
  return response.data.values ? response.data.values.length - 1 : 0;
}

async function getActiveJobCards() {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'job_cards',
  });
  
  if (!response.data.values) return 0;
  
  const rows = response.data.values;
  const headers = rows[0];
  const statusIndex = headers.indexOf('Status');
  
  if (statusIndex === -1) return 0;
  
  return rows.slice(1).filter(row => 
    row[statusIndex] === 'Open' || row[statusIndex] === 'In Progress'
  ).length;
}

async function getExpiredCertificates() {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'fitness_certificates',
  });
  
  if (!response.data.values) return 0;
  
  const rows = response.data.values;
  const headers = rows[0];
  const statusIndex = headers.indexOf('Status');
  const expiryIndex = headers.indexOf('Expiry_Date');
  
  if (statusIndex === -1) return 0;
  
  const today = new Date();
  return rows.slice(1).filter(row => {
    const status = row[statusIndex];
    const expiryDate = new Date(row[expiryIndex]);
    return status === 'Expired' || (expiryDate < today && status !== 'Expired');
  }).length;
}

async function getActiveCampaigns() {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'branding',
  });
  
  if (!response.data.values) return 0;
  
  const rows = response.data.values;
  const headers = rows[0];
  const startIndex = headers.indexOf('Start_Date');
  const endIndex = headers.indexOf('End_Date');
  
  if (startIndex === -1 || endIndex === -1) return 0;
  
  const today = new Date();
  return rows.slice(1).filter(row => {
    const startDate = new Date(row[startIndex]);
    const endDate = new Date(row[endIndex]);
    return startDate <= today && endDate >= today;
  }).length;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`🌐 Open your app at: http://localhost:${PORT}`);
  console.log(`🧪 Test page at: http://localhost:${PORT}/test.html`);
  console.log(`📊 API test at: http://localhost:${PORT}/api/stats`);
  console.log('📧 Make sure your Google Sheet is shared with: chanikya@valiant-store-441008-q0.iam.gserviceaccount.com');
});

// Serve dashboard as default page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/dashboard.html');
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Server is working!', 
    timestamp: new Date().toISOString(),
    spreadsheetId: SPREADSHEET_ID
  });
});

module.exports = app;