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
// Use environment variables if provided (Netlify/Vercel), otherwise fall back to keyFile
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1kDzB4jwvJYpwmY-O4mtrCo1CM7_Ok-cLtPAghWrGBwQ';
let auth;
if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    undefined,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
} else {
  auth = new GoogleAuth({
    keyFile: './valiant-store-441008-q0-5711f1e44b63.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

const sheets = google.sheets({ version: 'v4', auth });
// Spreadsheet ID is taken from env or defaults above

// Simple in-memory cache for sheet reads
const _cache = new Map(); // key: range -> { at: epochMs, ttl: ms, values }
function cacheGet(range, ttlMs = 20000) {
  const k = range;
  const now = Date.now();
  const c = _cache.get(k);
  if (c && now - c.at < c.ttl) return c.values;
  return null;
}
function cacheSet(range, values, ttlMs = 20000) {
  _cache.set(range, { at: Date.now(), ttl: ttlMs, values });
}
function cacheInvalidateBySheet(sheetName) {
  const prefix = sheetName + '!';
  for (const k of Array.from(_cache.keys())) {
    if (k === sheetName || k.startsWith(prefix)) _cache.delete(k);
  }
}

async function getValuesCached(range, ttlMs = 20000) {
  const hit = cacheGet(range, ttlMs);
  if (hit) return hit;
  const resp = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
  const vals = resp.data.values || [];
  cacheSet(range, vals, ttlMs);
  return vals;
}

// API endpoint to read data
app.get('/api/data/:sheetName', async (req, res) => {
  try {
    const sheetName = req.params.sheetName;
    console.log(`Attempting to read from sheet: ${sheetName}`);
    // Longer cache for mostly static sheets
    const ttl = (sheetName === 'stabling_geometry') ? 600000 : (sheetName === 'cleaning_slots' ? 30000 : 20000);
    const rows = await getValuesCached(sheetName, ttl);
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
    const headerResponse = { data: { values: await getValuesCached(`${sheetName}!1:1`, 20000) } };
    
    if (!headerResponse.data.values || !headerResponse.data.values[0]) {
      throw new Error(`Sheet "${sheetName}" not found or has no headers. Make sure the sheet exists and has header row.`);
    }
    
    const headers = headerResponse.data.values[0];
    // Special handling: For mileage, if Train_ID exists, update instead of append
    if (sheetName === 'mileage' && data.Train_ID) {
      // Read the whole sheet to find the row
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: sheetName,
      });
      const rows = response.data.values || [];
      const hdrs = rows[0] || headers;
      const normalize = s => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
      let trainIdx = -1;
      for (let i = 0; i < hdrs.length; i++) {
        const h = normalize(hdrs[i]);
        if (h === 'trainid' || h === 'train_id' || h === 'trainno' || h === 'trainnumber') {
          trainIdx = i; break;
        }
      }
      if (trainIdx === -1) trainIdx = hdrs.indexOf('Train_ID');

      if (trainIdx !== -1) {
        // Prefer last occurrence if duplicates exist
        const target = normalize(data.Train_ID);
        let foundRow = -1;
        for (let i = rows.length - 1; i >= 1; i--) {
          if (normalize(rows[i][trainIdx]) === target) { foundRow = i; break; }
        }

        if (foundRow !== -1) {
          // Sanitize numeric fields
          const sanitized = { ...data };
          const numericCols = new Set(['Total_KM','KM_Since_Last_A','KM_Since_Last_B','KM_Since_Last_C','KM_Since_Last_D','Daily_Avg_KM']);
          for (const key of Object.keys(sanitized)) {
            if (numericCols.has(key)) {
              sanitized[key] = (sanitized[key] ?? '').toString().replace(/[\s,]/g, '');
            }
          }

          const updatedRowData = hdrs.map(h => (sanitized[h] !== undefined ? sanitized[h] : (rows[foundRow][hdrs.indexOf(h)] || '')));

          const lastColLetter = (n => { let s=''; while(n>=0){ s=String.fromCharCode(n%26+65)+s; n=Math.floor(n/26)-1; } return s; })(hdrs.length-1);
          const updateRange = `${sheetName}!A${foundRow + 1}:${lastColLetter}${foundRow + 1}`;
          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: updateRange,
            valueInputOption: 'RAW',
            requestBody: { values: [updatedRowData] },
          });
          console.log(`Updated mileage via POST fallback at row ${foundRow + 1}`);
          return res.json({ success: true, message: 'Mileage record updated successfully' });
        }
      }
      // If not found, continue to append
    }

    const rowData = headers.map(header => data[header] || '');
    console.log('Headers:', headers);
    console.log('Row data to insert:', rowData);
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: sheetName,
      valueInputOption: 'RAW',
      requestBody: { values: [rowData] },
    });
    cacheInvalidateBySheet(sheetName);
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
    const values = await getValuesCached(sheetName, 20000);
    if (!values || values.length === 0) {
      throw new Error(`Sheet "${sheetName}" not found or is empty`);
    }
    const rows = values;
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
  } else if (sheetName === 'branding' && data.Campaign_ID && data.Train_ID) {
      // Fallback for branding updates when Record_ID missing: match by Campaign_ID + Train_ID
      const campIdx = headers.indexOf('Campaign_ID');
      const trainIdx = headers.indexOf('Train_ID');
      if (campIdx !== -1 && trainIdx !== -1) {
        rowIndex = rows.findIndex((row, index) => {
          if (index === 0) return false;
          return row[campIdx] === data.Campaign_ID && row[trainIdx] === data.Train_ID;
        });
      }
    } else if (sheetName === 'mileage' && data.Train_ID) {
      // Update mileage by Train_ID (do not create new rows)
      // Find Train_ID header robustly (handle variations like 'Train ID')
      const normalize = s => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
      let trainIdx = -1;
      for (let i = 0; i < headers.length; i++) {
        const h = normalize(headers[i]);
        if (h === 'trainid' || h === 'train_id' || h === 'trainno' || h === 'trainnumber') {
          trainIdx = i;
          break;
        }
      }
      if (trainIdx === -1) {
        // Fallback to exact match if normalization failed
        trainIdx = headers.indexOf('Train_ID');
      }

      if (trainIdx !== -1) {
        const target = normalize(data.Train_ID);
        // Prefer updating the last matching row if duplicates exist
        for (let i = rows.length - 1; i >= 1; i--) {
          if (normalize(rows[i][trainIdx]) === target) {
            rowIndex = i;
            break;
          }
        }
      }
    }
    
    if (rowIndex === -1) {
      if (sheetName === 'mileage' && data.Train_ID) {
        // For mileage updates, do NOT create new row if Train_ID not found
        console.warn(`Mileage update requested for Train_ID ${data.Train_ID} but no matching row found. Not appending.`);
        return res.status(404).json({ success: false, error: `Train_ID ${data.Train_ID} not found in mileage sheet` });
      }

      // Record not found, add as new record (default behavior for other sheets)
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
      
      // Sanitize numeric fields for mileage to remove commas/spaces
      const sanitizedData = { ...data };
      if (sheetName === 'mileage') {
        const numericCols = new Set([
          'Total_KM',
          'KM_Since_Last_A',
          'KM_Since_Last_B',
          'KM_Since_Last_C',
          'KM_Since_Last_D',
          'Daily_Avg_KM'
        ]);
        for (const key of Object.keys(sanitizedData)) {
          if (numericCols.has(key)) {
            sanitizedData[key] = (sanitizedData[key] ?? '').toString().replace(/[,\s]/g, '');
          }
        }
      }

      const updatedRowData = headers.map(header => {
        // Use new data if provided, otherwise keep existing data
        const newValue = sanitizedData[header] !== undefined ? sanitizedData[header] : rows[rowIndex][headers.indexOf(header)] || '';
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
      cacheInvalidateBySheet(sheetName);
      
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
      totalTrains: await getTotalTrainsCount(), // Updated to use mileage data instead of train_master
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
  const rows = await getValuesCached(sheetName, 20000);
  return rows ? rows.length - 1 : 0;
}

// Get total trains count from mileage data (since train_master is removed)
async function getTotalTrainsCount() {
  try {
    const values = await getValuesCached('mileage', 20000);
    if (!values) return 0;
    const rows = values;
    const headers = rows[0];
    const trainIdIndex = headers.indexOf('Train_ID');
    
    if (trainIdIndex === -1) return 0;
    
    // Count unique Train_IDs
    const uniqueTrains = new Set();
    rows.slice(1).forEach(row => {
      if (row[trainIdIndex]) {
        uniqueTrains.add(row[trainIdIndex]);
      }
    });
    
    return uniqueTrains.size;
  } catch (error) {
    console.error('Error getting total trains count:', error);
    return 0;
  }
}

async function getActiveJobCards() {
  const values = await getValuesCached('job_cards', 20000);
  if (!values) return 0;
  const rows = values;
  const headers = rows[0];
  const statusIndex = headers.indexOf('Status');
  
  if (statusIndex === -1) return 0;
  
  return rows.slice(1).filter(row => 
    row[statusIndex] === 'Open' || row[statusIndex] === 'In Progress'
  ).length;
}

async function getExpiredCertificates() {
  const values = await getValuesCached('fitness_certificates', 20000);
  if (!values) return 0;
  const rows = values;
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
  const values = await getValuesCached('branding', 20000);
  if (!values) return 0;
  const rows = values;
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

// API endpoint to list all sheets in the spreadsheet
app.get('/api/sheets', async (req, res) => {
  try {
    console.log('Fetching list of all sheets...');
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    
    const sheetsList = response.data.sheets.map(sheet => ({
      title: sheet.properties.title,
      sheetId: sheet.properties.sheetId,
      index: sheet.properties.index
    }));
    
    console.log(`Found ${sheetsList.length} sheets:`, sheetsList.map(s => s.title));
    
    res.json({ 
      success: true, 
      sheets: sheetsList,
      total: sheetsList.length
    });
  } catch (error) {
    console.error('Error fetching sheets list:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Check that the spreadsheet exists and is shared with service account'
    });
  }
});

// ---------------- Approval Effects Endpoint ----------------
// Applies admin-approved proposals: append logs and update dependent sheets
app.post('/api/approve', async (req, res) => {
  const body = req.body || {};
  const logs = Array.isArray(body.logs) ? body.logs : [];
  const cleaningSlots = Array.isArray(body.cleaningSlots) ? body.cleaningSlots : [];
  const jobCardsToClose = Array.isArray(body.jobCardsToClose) ? body.jobCardsToClose : [];
  const serviceChecksToUpdate = Array.isArray(body.serviceChecksToUpdate) ? body.serviceChecksToUpdate : [];
  const brandingAccumulations = Array.isArray(body.brandingAccumulations) ? body.brandingAccumulations : [];

  const result = { logsAppended: 0, slotsOccupied: 0, jobCardsClosed: 0, serviceChecksUpdated: 0, brandingUpdated: 0 };

  try {
    // Helpers
    const norm = s => (s || '').toString().trim();
    const normKey = s => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    const parseNumber = v => { const n = Number(String(v ?? '').replace(/[\s,]/g, '')); return isNaN(n) ? NaN : n; };
    const toSheetDate = (d = new Date()) => {
      const dt = (d instanceof Date) ? d : new Date(d);
      const m = dt.getMonth() + 1; const day = String(dt.getDate()).padStart(2,'0'); const y = dt.getFullYear();
      return `${m}/${day}/${y}`;
    };
    const lastColLetter = n => { let s=''; while(n>=0){ s=String.fromCharCode(n%26+65)+s; n=Math.floor(n/26)-1;} return s; };
    const getSheet = async (name) => {
      const resp = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: name });
      const rows = resp.data.values || [];
      const headers = rows[0] || [];
      return { headers, rows };
    };
    const headerIndex = (headers, candidates) => {
      const candSet = candidates.map(c => normKey(c));
      for (let i=0;i<headers.length;i++) {
        const hk = normKey(headers[i]);
        if (candSet.includes(hk)) return i;
      }
      return -1;
    };

    // 1) Append approved logs (single batch append)
    if (logs.length > 0) {
      const hResp = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'logs!1:1' });
      if (!hResp.data.values || !hResp.data.values[0]) throw new Error('logs sheet missing headers');
      const headers = hResp.data.values[0];
      const rowsToAppend = logs.map(obj => headers.map(h => (obj[h] !== undefined ? obj[h] : '')));
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'logs',
        valueInputOption: 'RAW',
        requestBody: { values: rowsToAppend }
      });
      result.logsAppended = rowsToAppend.length;
      cacheInvalidateBySheet('logs');
    }

    // 2) Mark cleaning slots as occupied (match by Date + Start_Time + End_Time)
    if (cleaningSlots.length > 0) {
      const { headers, rows } = await getSheet('cleaning_slots');
      const idxDate = headerIndex(headers, ['Date']);
      const idxStart = headerIndex(headers, ['Start_Time','Start','start_time']);
      const idxEnd = headerIndex(headers, ['End_Time','End','end_time']);
      const idxStatus = headerIndex(headers, ['Status','status']);
      if (idxDate === -1 || idxStart === -1 || idxEnd === -1 || idxStatus === -1) throw new Error('cleaning_slots headers missing');

      // Build lookup map
      const map = new Map();
      for (let i=1;i<rows.length;i++) {
        const r = rows[i];
        const k = `${normKey(r[idxDate])}|${normKey(r[idxStart])}|${normKey(r[idxEnd])}`;
        if (!map.has(k)) map.set(k, i);
      }
      for (const s of cleaningSlots) {
        const k = `${normKey(s.Date)}|${normKey(s.Start_Time)}|${normKey(s.End_Time)}`;
        const rowIndex = map.get(k);
        if (rowIndex === undefined) continue;
        const row = rows[rowIndex];
        row[idxStatus] = 'occupied';
        const updateRange = `cleaning_slots!A${rowIndex + 1}:${lastColLetter(headers.length - 1)}${rowIndex + 1}`;
        await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: updateRange, valueInputOption: 'RAW', requestBody: { values: [row] } });
        result.slotsOccupied++;
      }
      cacheInvalidateBySheet('cleaning_slots');
    }

    // 3) Close job cards (Status=Closed, Closed_Date=today)
    if (jobCardsToClose.length > 0) {
      const { headers, rows } = await getSheet('job_cards');
      const idxTrain = headerIndex(headers, ['Train_ID','trainid']);
      const idxJobId = headerIndex(headers, ['JobCard_ID','jobcard_id','jobcardid']);
      const idxStatus = headerIndex(headers, ['Status','status']);
      const idxOpened = headerIndex(headers, ['Opened_Date','opened_date']);
      const idxClosed = headerIndex(headers, ['Closed_Date','closed_date']);
      if (idxTrain === -1 || idxStatus === -1) throw new Error('job_cards headers missing');

      const today = toSheetDate(new Date());
      // Helper: find by JobCard_ID or by Train_ID oldest open
      const parseDate = s => new Date(norm(s));
      for (const jc of jobCardsToClose) {
        let targetIndex = -1;
        if (jc.JobCard_ID && idxJobId !== -1) {
          for (let i=1;i<rows.length;i++) if (norm(rows[i][idxJobId]) === norm(jc.JobCard_ID)) { targetIndex = i; break; }
        } else {
          // find open rows for Train_ID
          const candidates = [];
          for (let i=1;i<rows.length;i++) {
            const r = rows[i];
            if (norm(r[idxTrain]) === norm(jc.Train_ID) && normKey(r[idxStatus]) === 'open') {
              candidates.push({ i, opened: idxOpened !== -1 ? parseDate(r[idxOpened]) : new Date(0) });
            }
          }
          if (candidates.length > 0) {
            candidates.sort((a,b)=> a.opened - b.opened);
            targetIndex = candidates[0].i;
          }
        }
        if (targetIndex !== -1) {
          const r = rows[targetIndex];
          r[idxStatus] = 'Closed';
          if (idxClosed !== -1) r[idxClosed] = today;
          const updateRange = `job_cards!A${targetIndex + 1}:${lastColLetter(headers.length - 1)}${targetIndex + 1}`;
          await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: updateRange, valueInputOption: 'RAW', requestBody: { values: [r] } });
          result.jobCardsClosed++;
        }
      }
      cacheInvalidateBySheet('job_cards');
    }

    // 4) Service checks date updates
    if (serviceChecksToUpdate.length > 0) {
      const today = toSheetDate(new Date());
      // A service
      const aList = serviceChecksToUpdate.filter(x => (x.type || '').toUpperCase() === 'A');
      if (aList.length) {
        const { headers, rows } = await getSheet('a_service_check');
        const idxTrain = headerIndex(headers, ['Train_ID','trainid']);
        const idxDate = headerIndex(headers, ['a_check_date','A_Check_Date','A_Check']);
        if (idxTrain !== -1 && idxDate !== -1) {
          for (const it of aList) {
            const t = norm(it.Train_ID);
            for (let i=1;i<rows.length;i++) if (norm(rows[i][idxTrain]) === t) {
              rows[i][idxDate] = today;
              const updateRange = `a_service_check!A${i + 1}:${lastColLetter(headers.length - 1)}${i + 1}`;
              await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: updateRange, valueInputOption: 'RAW', requestBody: { values: [rows[i]] } });
              result.serviceChecksUpdated++;
              break;
            }
          }
        }
        cacheInvalidateBySheet('a_service_check');
      }
      // B service
      const bList = serviceChecksToUpdate.filter(x => (x.type || '').toUpperCase() === 'B');
      if (bList.length) {
        const { headers, rows } = await getSheet('b_service_check');
        const idxTrain = headerIndex(headers, ['Train_ID','trainid']);
        const idxDate = headerIndex(headers, ['b_check_date','B_Check_Date','B_Check']);
        if (idxTrain !== -1 && idxDate !== -1) {
          for (const it of bList) {
            const t = norm(it.Train_ID);
            for (let i=1;i<rows.length;i++) if (norm(rows[i][idxTrain]) === t) {
              rows[i][idxDate] = today;
              const updateRange = `b_service_check!A${i + 1}:${lastColLetter(headers.length - 1)}${i + 1}`;
              await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: updateRange, valueInputOption: 'RAW', requestBody: { values: [rows[i]] } });
              result.serviceChecksUpdated++;
              break;
            }
          }
        }
        cacheInvalidateBySheet('b_service_check');
      }
    }

    // 5) Branding accumulated hours update-in-place
    if (brandingAccumulations.length > 0) {
      const { headers, rows } = await getSheet('branding');
      const idxTrain = headerIndex(headers, ['Train_ID','trainid']);
      const idxAcc = headerIndex(headers, ['Accumulated_Hours','accumulated_hours','AccumulatedHours','accumulated']);
      const idxReq = headerIndex(headers, ['Required_Hours','required_hours','RequiredHours']);
      const idxRem = headerIndex(headers, ['Remaining_Hours','remaining_hours','RemainingHours']);
      if (idxTrain !== -1 && idxAcc !== -1) {
        // Build last-occurrence index per Train_ID
        const lastIndex = new Map();
        for (let i=1;i<rows.length;i++) {
          const t = norm(rows[i][idxTrain]);
          if (t) lastIndex.set(t, i);
        }
        for (const acc of brandingAccumulations) {
          const t = norm(acc.Train_ID);
          const add = parseNumber(acc.addHours);
          if (!t || isNaN(add)) continue;
          const i = lastIndex.get(t);
          if (i === undefined) continue;
          const cur = parseNumber(rows[i][idxAcc]);
          const next = (isNaN(cur) ? 0 : cur) + add;
          rows[i][idxAcc] = String(next);
          // Recompute Remaining_Hours = max(0, Required_Hours - Accumulated_Hours)
          if (idxReq !== -1 && idxRem !== -1) {
            const req = parseNumber(rows[i][idxReq]);
            if (!isNaN(req)) {
              const rem = Math.max(0, req - next);
              rows[i][idxRem] = String(rem);
            }
          }
          const updateRange = `branding!A${i + 1}:${lastColLetter(headers.length - 1)}${i + 1}`;
          await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: updateRange, valueInputOption: 'RAW', requestBody: { values: [rows[i]] } });
          result.brandingUpdated++;
        }
        cacheInvalidateBySheet('branding');
      }
    }

    res.json({ success: true, result });
  } catch (error) {
    console.error('Approval effects error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Only listen in non-serverless environments
if (!process.env.NETLIFY && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`🌐 Open your app at: http://localhost:${PORT}`);
    console.log(`🧪 Test page at: http://localhost:${PORT}/test.html`);
    console.log(`📊 API test at: http://localhost:${PORT}/api/stats`);
    console.log('📧 Make sure your Google Sheet is shared with: chanikya@valiant-store-441008-q0.iam.gserviceaccount.com');
  });
}

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