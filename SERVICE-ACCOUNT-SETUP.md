# Service Account Setup Guide for Railway Maximo Clone

## 🎉 Great! You Already Have Service Account Credentials

Your service account details:
- **Project ID**: `valiant-store-441008-q0`
- **Service Account Email**: `chanikya@valiant-store-441008-q0.iam.gserviceaccount.com`
- **Type**: Service Account (More secure than API keys)

## 🚀 Quick Setup Steps

### Step 1: Move Your Credentials File
```powershell
# Move your downloaded JSON file to the project directory
copy "c:\Users\karri\Downloads\valiant-store-441008-q0-5711f1e44b63.json" "d:\SIH-2025\maximo-clone\"
```

### Step 2: Install Dependencies
```powershell
cd d:\SIH-2025\maximo-clone
npm install
```

### Step 3: Create Your Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet named "Railway-Maximo-Data"
3. **IMPORTANT**: Share the sheet with your service account email:
   - Click "Share" button
   - Add email: `chanikya@valiant-store-441008-q0.iam.gserviceaccount.com`
   - Give "Editor" permissions
   - Click "Send"

### Step 4: Set Up Sheet Tabs
Create these 6 tabs in your Google Sheet:
- `train_master`
- `branding`
- `fitness_certificates`
- `job_cards`
- `mileage`
- `stabling_geometry_actual`

### Step 5: Copy Data
Import your CSV data into each corresponding sheet tab.

### Step 6: Get Spreadsheet ID
1. From your Google Sheet URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
2. Copy the long ID between `/d/` and `/edit`
3. Update `server-service-account.js` line 19:
```javascript
const SPREADSHEET_ID = 'YOUR_ACTUAL_SPREADSHEET_ID_HERE';
```

### Step 7: Test the Server
```powershell
cd d:\SIH-2025\maximo-clone
npm start
```

### Step 8: Update Frontend
Replace `script.js` with `script-service-account.js`:
```html
<!-- In index.html, change the script tag to: -->
<script src="script-service-account.js"></script>
```

## 🔧 Architecture with Service Account

```
Frontend (HTML/CSS/JS) → Node.js Server → Google Sheets API → Your Spreadsheet
                          (Service Account)
```

## 🔒 Security Benefits of Service Account

✅ **More Secure**: No exposed API keys in frontend
✅ **Better Control**: Fine-grained permissions
✅ **Server-side**: Credentials safely stored on server
✅ **Scalable**: Can handle more requests

## 🌐 Deployment Options

### Option 1: Local Development
- Run `npm start` 
- Access at `http://localhost:3000`

### Option 2: Deploy to Cloud
**Heroku:**
```bash
# Install Heroku CLI, then:
heroku create railway-maximo-clone
git init
git add .
git commit -m "Initial commit"
git push heroku main
```

**Railway:**
```bash
# Connect your GitHub repo to Railway
# It will auto-deploy
```

## 📊 API Endpoints Your Server Provides

- `GET /api/data/:sheetName` - Read data from sheet
- `POST /api/data/:sheetName` - Add data to sheet  
- `GET /api/stats` - Get dashboard statistics

## 🧪 Test Your Setup

1. **Test Server**: Visit `http://localhost:3000/api/stats`
2. **Test Frontend**: Open `index.html` in browser
3. **Test Data Flow**: Add a new train record and check Google Sheets

## 🔄 For MetroChetna Integration

Your MetroChetna app can either:

**Option 1**: Call your server API
```javascript
const response = await fetch('http://your-server.com/api/data/train_master');
const data = await response.json();
```

**Option 2**: Use same service account directly
```javascript
// In MetroChetna, use the same service account JSON
const auth = new GoogleAuth({
  keyFile: './valiant-store-441008-q0-5711f1e44b63.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
```

## ⚠️ Important Security Notes

1. **Never commit the JSON file to Git**
2. **Use environment variables in production**
3. **Restrict service account permissions**
4. **Keep credentials secure**

## 🛠️ Production Checklist

- [ ] Service account JSON file secured
- [ ] Google Sheet shared with service account
- [ ] All 6 sheet tabs created with proper headers
- [ ] CSV data imported
- [ ] Spreadsheet ID updated in code
- [ ] Server tested locally
- [ ] Frontend connects to server successfully
- [ ] Ready for deployment

You're all set! Your service account approach is actually more professional and secure than using API keys. 🎉