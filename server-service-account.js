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