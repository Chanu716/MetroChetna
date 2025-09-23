# Railway Maximo Clone - Setup Guide

## Project Overview
This is a railway train management system that mimics IBM Maximo functionality. It provides a web interface to manage railway datasets and integrates with Google Sheets for live data storage.

## Features
- **Train Master Management**: Add/edit train information
- **Branding Campaigns**: Manage advertising campaigns on trains
- **Fitness Certificates**: Track safety certifications
- **Job Cards**: Maintenance task management
- **Mileage Records**: Track train usage and service intervals
- **Stabling Geometry**: Depot layout and movement data

## Architecture
```
IBM Maximo Clone (HTML/CSS/JS) → Google Sheets → MetroChetna Algorithm
```

## Setup Instructions

### Phase 1: Basic Setup (Local Testing)
1. **File Structure Created**:
   - `index.html` - Main application interface
   - `styles.css` - Styling and responsive design
   - `script.js` - JavaScript functionality

2. **Run Locally**:
   - Open `index.html` in a web browser
   - Test navigation and form interfaces
   - Currently uses sample data

### Phase 2: Google Sheets Integration

#### Step 1: Create Google Sheets
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet named "Railway-Maximo-Data"
3. Create these sheets (tabs):
   - `train_master`
   - `branding`
   - `fitness_certificates`
   - `job_cards`
   - `mileage`
   - `stabling_geometry`

#### Step 2: Set up column headers
Copy headers from your existing CSV files to each sheet:

**train_master sheet:**
```
Train_ID | Year_Commissioned | Base_Mileage | Last_Service_Type | Last_Service_Date | Current_Status
```

**branding sheet:**
```
Campaign_ID | Train_ID | Advertiser_ID | Campaign_Name | Start_Date | End_Date | Required_Exposure_Hours | Accumulated_Exposure_Hours | Penalty_Per_Day | Remaining_Hours
```

(Similar for other sheets)

#### Step 3: Import existing data
1. Copy data from your CSV files into the respective Google Sheets
2. Format dates properly
3. Test data accessibility

#### Step 4: Enable Google Sheets API & Create Credentials

**Method 1: API Key (Simplest - Recommended for testing)**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project:
   - Click "Select a project" → "New Project"
   - Name: "Railway-Maximo-API"
   - Click "Create"
3. Enable Google Sheets API:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Sheets API"
   - Click on it and press "Enable"
4. Create API Key:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the API key (keep it secure!)
   - Click "Restrict Key" to add security:
     - Under "API restrictions", select "Restrict key"
     - Choose "Google Sheets API"
     - Save

**Method 2: Service Account (Production - More Secure)**
1. Follow steps 1-3 above
2. Create Service Account:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "Service Account"
   - Name: "railway-maximo-service"
   - Click "Create and Continue"
   - Skip role assignment for now, click "Done"
3. Generate Key File:
   - Click on the created service account
   - Go to "Keys" tab
   - Click "Add Key" → "Create New Key"
   - Choose "JSON" format
   - Download and save the JSON file securely
4. Share Google Sheet with Service Account:
   - Open your Google Sheet
   - Click "Share" button
   - Add the service account email (from JSON file)
   - Give "Editor" permissions

#### Step 5: Update JavaScript Configuration

**For API Key Method:**
In `script.js`, update the Google Sheets configuration:
```javascript
const GOOGLE_SHEETS_CONFIG = {
    spreadsheetId: 'YOUR_ACTUAL_SPREADSHEET_ID', // Get from Google Sheets URL
    apiKey: 'YOUR_ACTUAL_API_KEY', // From Google Cloud Console
    sheets: {
        trains: 'train_master',
        branding: 'branding',
        fitness: 'fitness_certificates',
        jobcards: 'job_cards',
        mileage: 'mileage',
        stabling: 'stabling_geometry'
    }
};
```

**How to find your Spreadsheet ID:**
1. Open your Google Sheet
2. Look at the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
3. Copy the long string between `/d/` and `/edit`

**For Service Account Method:**
You'll need to implement server-side authentication or use the Apps Script approach (recommended).

### Phase 3: Advanced Features

#### Option A: Google Apps Script (Recommended for simplicity)
1. In your Google Sheet, go to Extensions → Apps Script
2. Create functions for CRUD operations
3. Deploy as web app
4. Update JavaScript to call your Apps Script endpoints

#### Option B: Server-side solution
1. Create a Node.js/Express server
2. Use Google Sheets API server-side
3. Deploy to Heroku/Vercel/similar platform
4. Update frontend to call your API

### Phase 4: MetroChetna Integration

#### For MetroChetna to read data:
1. **Option 1**: Direct Google Sheets access using Sheets API
2. **Option 2**: Export data to CSV files periodically
3. **Option 3**: Database integration with export functionality

## Recommended Simple Implementation (Google Sheets + Apps Script)

### 1. Google Apps Script Setup
```javascript
// In Google Apps Script (script.google.com)
function doPost(e) {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(data.sheetName);
    
    // Add row to sheet
    sheet.appendRow(Object.values(data.rowData));
    
    return ContentService.createTextOutput(JSON.stringify({success: true}));
}

function doGet(e) {
    const sheetName = e.parameter.sheet;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    const data = sheet.getDataRange().getValues();
    
    return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}
```

### 2. Deploy Apps Script as Web App
1. Save the script
2. Click "Deploy" → "New Deployment"
3. Choose "Web app" type
4. Set execution as "Me" and access as "Anyone"
5. Copy the web app URL

### 3. Update JavaScript to use Apps Script
```javascript
// In script.js
const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL';

async function saveToGoogleSheets(sheetName, data) {
    const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetName, rowData: data })
    });
    return response.json();
}
```

## Testing and Validation

### 1. Test Data Flow
1. Add data through web interface
2. Verify it appears in Google Sheets
3. Test that MetroChetna can read the updated data

### 2. Data Validation
- Ensure Train IDs are consistent across sheets
- Validate date formats
- Check numerical data ranges

## Security Considerations

1. **API Key Protection**: Use environment variables or server-side proxy
2. **Data Validation**: Sanitize inputs before saving
3. **Access Control**: Implement user authentication if needed
4. **Backup**: Regular exports of Google Sheets data

## Maintenance

1. **Regular Backups**: Export sheets to CSV monthly
2. **Data Cleanup**: Remove old/irrelevant records
3. **Performance**: Monitor API usage limits
4. **Updates**: Keep MetroChetna integration tested

## Alternative Solutions

### If Google Sheets becomes limiting:
1. **Airtable**: More database-like features
2. **Firebase**: Real-time database with good web integration
3. **Traditional Database**: PostgreSQL/MySQL with web interface

## Support and Troubleshooting

### Common Issues:
1. **API Limits**: Google Sheets API has usage limits
2. **CORS Issues**: May need server-side proxy for production
3. **Data Synchronization**: Handle concurrent updates carefully

### Performance Tips:
1. Batch operations when possible
2. Cache frequently accessed data
3. Use pagination for large datasets
4. Implement loading states in UI

## Detailed Credentials Setup Guide

### Option 1: Google Apps Script (Easiest - No API Keys Needed)

**Step-by-Step Process:**
1. **Open Google Apps Script**: Go to [script.google.com](https://script.google.com)
2. **Create New Project**: Click "New Project"
3. **Paste Code**: Copy all code from `google-apps-script.js` file
4. **Save**: Give it a name like "Railway-Maximo-Backend"
5. **Deploy as Web App**:
   - Click "Deploy" → "New Deployment"
   - Type: "Web app"
   - Execute as: "Me"
   - Who has access: "Anyone"
   - Click "Deploy"
6. **Copy Web App URL**: Save this URL - you'll need it in JavaScript
7. **Update script.js**: Replace `APPS_SCRIPT_URL` with your web app URL

**No API keys needed with this method!**

### Option 2: Direct Google Sheets API (Requires API Key)

**Step 1: Google Cloud Console Setup**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Sign in with your Google account
3. **Create Project**:
   - Click project dropdown → "New Project"
   - Project name: "Railway-Maximo-SIH"
   - Click "Create"

**Step 2: Enable APIs**
1. In the left sidebar: "APIs & Services" → "Library"
2. Search "Google Sheets API"
3. Click on it → Click "Enable"
4. Search "Google Drive API" 
5. Click on it → Click "Enable" (needed for file access)

**Step 3: Create Credentials**
1. Go to "APIs & Services" → "Credentials"
2. Click "+ CREATE CREDENTIALS" → "API Key"
3. **Copy the API Key** (save it somewhere safe!)
4. Click "RESTRICT KEY" for security:
   - Under "Application restrictions": Select "HTTP referrers"
   - Add your domain (or `*` for testing)
   - Under "API restrictions": Select "Restrict key"
   - Choose: "Google Sheets API" and "Google Drive API"
   - Click "Save"

**Step 4: Get Spreadsheet ID**
1. Open your Google Sheet
2. Look at the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit`
3. Copy the long ID between `/d/` and `/edit`

**Step 5: Make Sheet Public (for API access)**
1. In your Google Sheet, click "Share"
2. Change to "Anyone with the link can view"
3. Copy the share link

**Step 6: Update JavaScript**
```javascript
// In script.js, update these values:
const GOOGLE_SHEETS_CONFIG = {
    spreadsheetId: '1a2b3c4d5e6f7g8h9i0j', // Your actual spreadsheet ID
    apiKey: 'AIzaSyABC123XYZ789', // Your actual API key
    sheets: {
        trains: 'train_master',
        branding: 'branding',
        fitness: 'fitness_certificates',
        jobcards: 'job_cards',
        mileage: 'mileage',
        stabling: 'stabling_geometry'
    }
};
```

### Testing Your Setup

**Quick Test:**
1. Open browser developer tools (F12)
2. Go to Console tab
3. Type this test (replace with your values):
```javascript
fetch('https://sheets.googleapis.com/v4/spreadsheets/YOUR_SPREADSHEET_ID/values/train_master?key=YOUR_API_KEY')
  .then(response => response.json())
  .then(data => console.log(data));
```
4. If you see data, it's working!

### Troubleshooting Common Issues

**"API key not valid" Error:**
- Check if Google Sheets API is enabled
- Verify API key restrictions
- Make sure spreadsheet is shared publicly

**"The caller does not have permission" Error:**
- Make spreadsheet public (Anyone with link can view)
- Check API key restrictions
- Ensure correct spreadsheet ID

**CORS Error:**
- Use Apps Script method instead
- Or deploy through a web server

**"Quota exceeded" Error:**
- Google Sheets API has daily limits
- Consider caching data
- Use batch operations

## Next Steps

1. ✅ Basic HTML interface created
2. 🔄 Set up Google Sheets (your next step)
3. ⏳ Configure API integration
4. ⏳ Test data flow
5. ⏳ Deploy and connect with MetroChetna

## Quick Start Checklist

- [ ] Create Google Sheet with 6 tabs
- [ ] Copy CSV data to Google Sheets
- [ ] Choose Apps Script OR API Key method
- [ ] Set up credentials following guide above
- [ ] Update JavaScript configuration
- [ ] Test the web interface
- [ ] Verify data flows to Google Sheets
- [ ] Connect with MetroChetna for reading data