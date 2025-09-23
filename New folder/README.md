# MetroChetna Railway System - React Version

A modern React-based railway train management system that mimics IBM Maximo functionality, migrated from the original HTML/CSS/JS implementation.

## 🚀 Features

- **Modern React Architecture**: Built with React 18, hooks, and functional components
- **Fast Development**: Powered by Vite for lightning-fast dev server and builds  
- **Responsive Design**: Government UX4G-inspired theme with mobile-first approach
- **Real-time Data**: Integration with Google Sheets API for live data management
- **Modular Structure**: Clean component architecture with reusable hooks and services

## 📋 Modules

### Core Management
- **🚂 Train Master**: Manage train information and specifications
- **🔧 Job Cards**: Track maintenance tasks and work orders (fully implemented)
- **📋 Fitness Certificates**: Monitor safety certifications with status filtering
- **🎨 Branding Campaigns**: Manage advertising campaigns on trains
- **⛽ Mileage Records**: Track usage and service intervals
- **🏗️ Stabling Geometry**: Depot layout and movement optimization
- **📊 Train Scheduling**: Advanced scheduling and eligibility analysis (coming soon)

### Dashboard
- **Interactive Overview**: Quick access to all modules with visual cards
- **Real-time Status**: Server connection and Google Sheets sync monitoring
- **Responsive Navigation**: Clean navigation with icons and active state indicators

## 🛠 Migration from Original Project

This React version maintains all the core functionality of the original HTML/CSS/JS implementation while adding:

### ✅ Improvements
- **Component-based Architecture**: Reusable React components
- **State Management**: React hooks for clean state handling
- **Better Developer Experience**: Hot reload, TypeScript support ready
- **Enhanced UI**: Improved responsive design and interactions
- **Modular API Service**: Centralized API handling with error management

### 🔄 API Integration
The React app connects to your existing Node.js/Express server:
- **Endpoint**: `http://localhost:3000/api`
- **Compatibility**: Works with existing Google Sheets integration
- **Features**: Full CRUD operations, real-time updates, error handling

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Your original MetroChetna server running on port 3000

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Make sure your original server is running** (in the original project folder)
   ```bash
   cd ../original-project
   npm start
   ```

4. **Open your browser**
   ```
   http://localhost:5173
   ```

## 📁 Project Structure

```
src/
├── components/          # Reusable React components
│   ├── Layout.jsx      # Main layout with navigation
│   └── Layout.css      # Layout styling
├── pages/              # Page components (routes)
│   ├── Dashboard.jsx   # Main dashboard
│   ├── JobCards.jsx    # Job card management (fully implemented)
│   ├── FitnessCertificates.jsx
│   ├── TrainMaster.jsx
│   ├── BrandingCampaigns.jsx
│   ├── MileageRecords.jsx
│   ├── StablingGeometry.jsx
│   └── TrainScheduling.jsx
├── hooks/              # Custom React hooks
│   └── useRailwayData.js   # Data fetching hook
├── services/           # API services
│   └── railwayAPI.js   # Google Sheets API integration
└── utils/              # Utility functions
```

## 🔌 API Integration

The React app uses a centralized API service (`railwayAPI.js`) that connects to your existing Express server:

```javascript
// Example usage in components
import { useRailwayData } from '../hooks/useRailwayData'

const { data, loading, error, refresh } = useRailwayData('job_cards')
```

### Supported Endpoints
- `GET /api/data/:sheetName` - Fetch sheet data
- `POST /api/data/:sheetName` - Create new records  
- `PUT /api/data/:sheetName` - Update existing records
- `GET /api/stats` - Dashboard statistics

## 🎨 Theming

The app uses a Government UX4G-inspired design system:
- **Primary Color**: `#5c6bc0` (Indigo)
- **Typography**: Segoe UI, IBM Plex Sans
- **Components**: Consistent spacing, shadows, and interactions
- **Responsive**: Mobile-first approach with breakpoints

## 🚧 Development Status

### ✅ Completed
- Project scaffolding and setup
- Layout and navigation system
- Dashboard with interactive cards
- Job Cards module (full CRUD functionality)
- Data display pages for all modules
- Google Sheets API integration
- Responsive design implementation

### 🔄 In Progress
- Train Scheduling dashboard migration
- Advanced filtering and search
- Form validation and error handling
- Loading states and animations

### 📅 Planned
- Train Scheduler algorithm integration
- Real-time notifications
- Export functionality
- User authentication
- Performance optimizations

## 🔧 Available Scripts

- **`npm run dev`** - Start development server
- **`npm run build`** - Build for production
- **`npm run preview`** - Preview production build
- **`npm run lint`** - Run ESLint

## 📱 Mobile Support

The app is fully responsive with:
- Collapsible navigation on mobile
- Touch-friendly interactions
- Optimized layouts for all screen sizes
- Progressive enhancement

## 🤝 Contributing

1. Ensure the original server is running for API connectivity
2. Make changes in the React components
3. Test across different screen sizes
4. Follow the existing component patterns and styling

## 🔗 Integration Notes

### With Original Project
- This React version is designed to work alongside your original project
- The Express server from the original project serves as the backend
- All Google Sheets integration remains unchanged
- Data flows: React App ↔ Express API ↔ Google Sheets

### Deployment Considerations
- Build the React app: `npm run build`
- Serve the `dist` folder as static files
- Ensure the Express API server is accessible
- Configure CORS if deploying to different domains

## 📞 Support

For issues related to:
- **React Frontend**: Check browser console and component state
- **API Integration**: Verify original server is running on port 3000
- **Google Sheets**: Refer to original project documentation
- **Styling**: CSS custom properties in `App.css` and component styles+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
