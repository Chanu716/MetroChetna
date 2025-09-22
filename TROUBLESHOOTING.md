# 🚨 TROUBLESHOOTING: "Error saving data. Please try again."

## The issue is likely one of these problems:

### ❌ **Problem 1: Google Sheet not shared with Service Account**
**MOST COMMON ISSUE**

**Solution:**
1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1kDzB4jwvJYpwmY-O4mtrCo1CM7_Ok-cLtPAghWrGBwQ/edit
2. Click "Share" button (top right)
3. Add this email: `chanikya@valiant-store-441008-q0.iam.gserviceaccount.com`
4. Set permission to "Editor"
5. Click "Send"

### ❌ **Problem 2: Missing Sheet Tabs**
Your Google Sheet needs these exact tab names:

- `train_master`
- `branding`
- `fitness_certificates`
- `job_cards`
- `mileage`
- `stabling_geometry_actual`

**Solution:**
1. In your Google Sheet, right-click on the sheet tab at bottom
2. Select "Insert sheet"
3. Name it exactly as listed above
4. Repeat for all 6 tabs

### ❌ **Problem 3: Missing Headers**
Each sheet needs headers in the first row.

**For train_master sheet, add these headers in row 1:**
```
Train_ID | Year_Commissioned | Base_Mileage | Last_Service_Type | Last_Service_Date | Current_Status
```

**For branding sheet:**
```
Campaign_ID | Train_ID | Advertiser_ID | Campaign_Name | Start_Date | End_Date | Required_Exposure_Hours | Accumulated_Exposure_Hours | Penalty_Per_Day | Remaining_Hours
```

### ❌ **Problem 4: CORS Issues**
The frontend can't connect to the server.

**Solution:**
Open the test file and check if server is accessible:
1. Open `test.html` in your browser
2. Click "Test Server Connection"
3. If it fails, there's a CORS issue

## 🔧 **Quick Fix Steps:**

### Step 1: Verify Server is Running
Check that you see this message:
```
Server running on port 3000
Test the API at: http://localhost:3000/api/stats
Make sure your Google Sheet is shared with: chanikya@valiant-store-441008-q0.iam.gserviceaccount.com
```

### Step 2: Test Server Connection
1. Open `test.html` 
2. Click "Test Server Connection"
3. Should see: `✅ Server Test: {...}`

### Step 3: Test Google Sheets Connection
1. Click "Test Google Sheets Connection" 
2. If you see errors, follow the solutions above

### Step 4: Check Browser Console
1. Press F12 in your browser
2. Go to Console tab
3. Look for error messages
4. Common errors:
   - `CORS policy` → Server not accessible
   - `404 Not Found` → Wrong URL
   - `403 Forbidden` → Sheet not shared
   - `400 Bad Request` → Missing headers/tabs

## 🎯 **Most Likely Solution:**

**90% of the time, the issue is that you haven't shared the Google Sheet with the service account.**

**Do this right now:**
1. Go to: https://docs.google.com/spreadsheets/d/1kDzB4jwvJYpwmY-O4mtrCo1CM7_Ok-cLtPAghWrGBwQ/edit
2. Click "Share"
3. Add: `chanikya@valiant-store-441008-q0.iam.gserviceaccount.com`
4. Permission: "Editor"
5. Click "Send"

## 🔍 **Debug Information:**

The server now has better error logging. When you try to save data, check the terminal where the server is running for detailed error messages.

Common error messages and solutions:

- `"Sheet not found"` → Create the sheet tab
- `"no headers"` → Add headers to row 1
- `"permission denied"` → Share sheet with service account
- `"spreadsheet not found"` → Check spreadsheet ID

## ✅ **After Fixing:**

1. Try adding a new train record
2. Check that it appears in your Google Sheet
3. Data should flow: Web Form → Server → Google Sheets
4. MetroChetna can then read from Google Sheets