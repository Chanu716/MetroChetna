// Google Apps Script Code for Railway Maximo Clone
// Deploy this as a web app to handle CRUD operations for your Google Sheets

// Main function to handle POST requests (Create/Update operations)
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const operation = data.operation || 'create';
    
    switch(operation) {
      case 'create':
        return createRecord(data);
      case 'update':
        return updateRecord(data);
      case 'delete':
        return deleteRecord(data);
      default:
        return createResponse({success: false, error: 'Invalid operation'});
    }
  } catch (error) {
    return createResponse({success: false, error: error.toString()});
  }
}

// Main function to handle GET requests (Read operations)
function doGet(e) {
  try {
    const sheetName = e.parameter.sheet;
    const operation = e.parameter.operation || 'read';
    
    switch(operation) {
      case 'read':
        return readRecords(sheetName);
      case 'stats':
        return getDashboardStats();
      default:
        return createResponse({success: false, error: 'Invalid operation'});
    }
  } catch (error) {
    return createResponse({success: false, error: error.toString()});
  }
}

// Create new record
function createRecord(data) {
  const sheet = getSheet(data.sheetName);
  if (!sheet) {
    return createResponse({success: false, error: 'Sheet not found'});
  }
  
  // Get headers to ensure proper column order
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowData = headers.map(header => data.rowData[header] || '');
  
  sheet.appendRow(rowData);
  
  return createResponse({success: true, message: 'Record created successfully'});
}

// Read records from sheet
function readRecords(sheetName) {
  const sheet = getSheet(sheetName);
  if (!sheet) {
    return createResponse({success: false, error: 'Sheet not found'});
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const records = data.slice(1).map(row => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index];
    });
    return record;
  });
  
  return createResponse({success: true, data: records, headers: headers});
}

// Update existing record
function updateRecord(data) {
  const sheet = getSheet(data.sheetName);
  if (!sheet) {
    return createResponse({success: false, error: 'Sheet not found'});
  }
  
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const keyColumn = getKeyColumn(data.sheetName);
  const keyIndex = headers.indexOf(keyColumn);
  
  if (keyIndex === -1) {
    return createResponse({success: false, error: 'Key column not found'});
  }
  
  // Find the row to update
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][keyIndex] === data.keyValue) {
      // Update the row
      const rowData = headers.map(header => data.rowData[header] || allData[i][headers.indexOf(header)]);
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([rowData]);
      return createResponse({success: true, message: 'Record updated successfully'});
    }
  }
  
  return createResponse({success: false, error: 'Record not found'});
}

// Delete record
function deleteRecord(data) {
  const sheet = getSheet(data.sheetName);
  if (!sheet) {
    return createResponse({success: false, error: 'Sheet not found'});
  }
  
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const keyColumn = getKeyColumn(data.sheetName);
  const keyIndex = headers.indexOf(keyColumn);
  
  if (keyIndex === -1) {
    return createResponse({success: false, error: 'Key column not found'});
  }
  
  // Find and delete the row
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][keyIndex] === data.keyValue) {
      sheet.deleteRow(i + 1);
      return createResponse({success: true, message: 'Record deleted successfully'});
    }
  }
  
  return createResponse({success: false, error: 'Record not found'});
}

// Get dashboard statistics
function getDashboardStats() {
  try {
    const stats = {
      totalTrains: getRecordCount('train_master'),
      activeJobs: getActiveJobCards(),
      expiredCerts: getExpiredCertificates(),
      activeCampaigns: getActiveCampaigns()
    };
    
    return createResponse({success: true, data: stats});
  } catch (error) {
    return createResponse({success: false, error: error.toString()});
  }
}

// Helper function to get sheet by name
function getSheet(sheetName) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(sheetName);
}

// Helper function to get key column for each sheet
function getKeyColumn(sheetName) {
  const keyColumns = {
    'train_master': 'Train_ID',
    'branding': 'Campaign_ID',
    'fitness_certificates': 'Record_ID',
    'job_cards': 'JobCard_ID',
    'mileage': 'Train_ID',
    'stabling_geometry': 'From_Bay' // Or composite key logic
  };
  
  return keyColumns[sheetName] || 'ID';
}

// Helper function to create standardized response
function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Helper function to count records in a sheet
function getRecordCount(sheetName) {
  const sheet = getSheet(sheetName);
  return sheet ? sheet.getLastRow() - 1 : 0; // Subtract header row
}

// Helper function to count active job cards
function getActiveJobCards() {
  const sheet = getSheet('job_cards');
  if (!sheet) return 0;
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const statusIndex = headers.indexOf('Status');
  
  if (statusIndex === -1) return 0;
  
  let count = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i][statusIndex] === 'Open' || data[i][statusIndex] === 'In Progress') {
      count++;
    }
  }
  
  return count;
}

// Helper function to count expired certificates
function getExpiredCertificates() {
  const sheet = getSheet('fitness_certificates');
  if (!sheet) return 0;
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const statusIndex = headers.indexOf('Status');
  const expiryIndex = headers.indexOf('Expiry_Date');
  
  if (statusIndex === -1) return 0;
  
  let count = 0;
  const today = new Date();
  
  for (let i = 1; i < data.length; i++) {
    const status = data[i][statusIndex];
    const expiryDate = new Date(data[i][expiryIndex]);
    
    if (status === 'Expired' || (expiryDate < today && status !== 'Expired')) {
      count++;
    }
  }
  
  return count;
}

// Helper function to count active campaigns
function getActiveCampaigns() {
  const sheet = getSheet('branding');
  if (!sheet) return 0;
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const startIndex = headers.indexOf('Start_Date');
  const endIndex = headers.indexOf('End_Date');
  
  if (startIndex === -1 || endIndex === -1) return 0;
  
  let count = 0;
  const today = new Date();
  
  for (let i = 1; i < data.length; i++) {
    const startDate = new Date(data[i][startIndex]);
    const endDate = new Date(data[i][endIndex]);
    
    if (startDate <= today && endDate >= today) {
      count++;
    }
  }
  
  return count;
}

// Function to initialize sheets with proper headers (run once)
function initializeSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  const sheetConfigs = {
    'train_master': ['Train_ID', 'Year_Commissioned', 'Base_Mileage', 'Last_Service_Type', 'Last_Service_Date', 'Current_Status'],
    'branding': ['Campaign_ID', 'Train_ID', 'Advertiser_ID', 'Campaign_Name', 'Start_Date', 'End_Date', 'Required_Exposure_Hours', 'Accumulated_Exposure_Hours', 'Penalty_Per_Day', 'Remaining_Hours'],
    'fitness_certificates': ['Record_ID', 'Train_ID', 'Certificate_Type', 'Issued_Date', 'Expiry_Date', 'Status', 'Remarks'],
    'job_cards': ['JobCard_ID', 'Train_ID', 'Task_Description', 'Opened_Date', 'Due_Date', 'Closed_Date', 'Status'],
    'mileage': ['Train_ID', 'Total_KM', 'KM_Since_Last_A', 'KM_Since_Last_B', 'KM_Since_Last_C', 'KM_Since_Last_D', 'Last_Service_Date', 'Daily_Avg_KM'],
    'stabling_geometry': ['Depot', 'From_Bay', 'To_Bay', 'From_Index', 'To_Index', 'Shunting_Time_Minutes', 'Energy_Cost_kWh', 'Risk_Score']
  };
  
  Object.keys(sheetConfigs).forEach(sheetName => {
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
    }
    
    // Set headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, sheetConfigs[sheetName].length).setValues([sheetConfigs[sheetName]]);
      sheet.getRange(1, 1, 1, sheetConfigs[sheetName].length).setFontWeight('bold');
    }
  });
}