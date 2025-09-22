// Updated JavaScript for Service Account Integration
// This version calls your Node.js server instead of directly accessing Google Sheets

// Server Configuration
const SERVER_URL = 'http://localhost:3000/api'; // Change to your deployed server URL

// Rest of the configuration remains the same
const FORM_CONFIGS = {
    train: {
        title: 'Train Master',
        fields: [
            { name: 'Train_ID', label: 'Train ID', type: 'text', required: true },
            { name: 'Year_Commissioned', label: 'Year Commissioned', type: 'number', required: true },
            { name: 'Base_Mileage', label: 'Base Mileage', type: 'number', required: true },
            { name: 'Last_Service_Type', label: 'Last Service Type', type: 'select', options: ['A', 'B', 'C', 'D'], required: true },
            { name: 'Last_Service_Date', label: 'Last Service Date', type: 'date', required: true },
            { name: 'Current_Status', label: 'Current Status', type: 'select', options: ['Standby', 'Service', 'IBL', 'Maintenance'], required: true }
        ]
    },
    branding: {
        title: 'Branding Campaign',
        fields: [
            { name: 'Campaign_ID', label: 'Campaign ID', type: 'text', required: true },
            { name: 'Train_ID', label: 'Train ID', type: 'text', required: true },
            { name: 'Advertiser_ID', label: 'Advertiser ID', type: 'text', required: true },
            { name: 'Campaign_Name', label: 'Campaign Name', type: 'text', required: true },
            { name: 'Start_Date', label: 'Start Date', type: 'date', required: true },
            { name: 'End_Date', label: 'End Date', type: 'date', required: true },
            { name: 'Required_Exposure_Hours', label: 'Required Exposure Hours', type: 'number', required: true },
            { name: 'Accumulated_Exposure_Hours', label: 'Accumulated Exposure Hours', type: 'number', required: true },
            { name: 'Penalty_Per_Day', label: 'Penalty Per Day', type: 'number', required: true },
            { name: 'Remaining_Hours', label: 'Remaining Hours', type: 'number', required: true }
        ]
    },
    fitness: {
        title: 'Fitness Certificate',
        fields: [
            { name: 'Record_ID', label: 'Record ID', type: 'number', required: true },
            { name: 'Train_ID', label: 'Train ID', type: 'text', required: true },
            { name: 'Certificate_Type', label: 'Certificate Type', type: 'select', options: ['RollingStock', 'Signalling', 'Telecom'], required: true },
            { name: 'Issued_Date', label: 'Issued Date', type: 'date', required: true },
            { name: 'Expiry_Date', label: 'Expiry Date', type: 'date', required: true },
            { name: 'Status', label: 'Status', type: 'select', options: ['Valid', 'Pending', 'Expired'], required: true },
            { name: 'Remarks', label: 'Remarks', type: 'textarea', required: false }
        ]
    },
    jobcard: {
        title: 'Job Card',
        fields: [
            { name: 'JobCard_ID', label: 'Job Card ID', type: 'text', required: true },
            { name: 'Train_ID', label: 'Train ID', type: 'text', required: true },
            { name: 'Task_Description', label: 'Task Description', type: 'textarea', required: true },
            { name: 'Opened_Date', label: 'Opened Date', type: 'date', required: true },
            { name: 'Due_Date', label: 'Due Date', type: 'date', required: true },
            { name: 'Closed_Date', label: 'Closed Date', type: 'date', required: false },
            { name: 'Status', label: 'Status', type: 'select', options: ['Open', 'In Progress', 'Closed'], required: true }
        ]
    },
    mileage: {
        title: 'Mileage Record',
        fields: [
            { name: 'Train_ID', label: 'Train ID', type: 'text', required: true },
            { name: 'Total_KM', label: 'Total KM', type: 'text', required: true },
            { name: 'KM_Since_Last_A', label: 'KM Since Last A Service', type: 'text', required: true },
            { name: 'KM_Since_Last_B', label: 'KM Since Last B Service', type: 'text', required: true },
            { name: 'KM_Since_Last_C', label: 'KM Since Last C Service', type: 'text', required: true },
            { name: 'KM_Since_Last_D', label: 'KM Since Last D Service', type: 'text', required: true },
            { name: 'Last_Service_Date', label: 'Last Service Date', type: 'date', required: true },
            { name: 'Daily_Avg_KM', label: 'Daily Average KM', type: 'number', step: '0.1', required: true }
        ]
    },
    stabling: {
        title: 'Stabling Geometry',
        fields: [
            { name: 'Depot', label: 'Depot', type: 'text', required: true },
            { name: 'From_Bay', label: 'From Bay', type: 'text', required: true },
            { name: 'To_Bay', label: 'To Bay', type: 'text', required: true },
            { name: 'From_Index', label: 'From Index', type: 'number', required: true },
            { name: 'To_Index', label: 'To Index', type: 'number', required: true },
            { name: 'Shunting_Time_Minutes', label: 'Shunting Time (Minutes)', type: 'number', required: true },
            { name: 'Energy_Cost_kWh', label: 'Energy Cost (kWh)', type: 'number', step: '0.01', required: true },
            { name: 'Safety_Risk_Score', label: 'Safety Risk Score', type: 'number', required: true }
        ]
    }
};

// Application State
let currentSection = 'dashboard';
let currentData = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    showSection('dashboard');
    loadDashboardStats();
    
    // Initialize form submission
    document.getElementById('dataForm').addEventListener('submit', handleFormSubmit);
});

// Navigation handling (unchanged)
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
            
            // Update active nav link
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));
    
    // Show target section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
        currentSection = sectionName;
        
        // Load data for the section
        if (sectionName !== 'dashboard') {
            loadSectionData(sectionName);
        }
    }
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await fetch(`${SERVER_URL}/stats`);
        const result = await response.json();
        
        if (result.success) {
            updateDashboardStats(result.data);
        } else {
            console.error('Failed to load dashboard stats:', result.error);
            // Fallback to sample data
            updateDashboardStats({
                totalTrains: 25,
                activeJobs: 12,
                expiredCerts: 3,
                activeCampaigns: 8
            });
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        // Fallback to sample data
        updateDashboardStats({
            totalTrains: 25,
            activeJobs: 12,
            expiredCerts: 3,
            activeCampaigns: 8
        });
    }
}

function updateDashboardStats(stats) {
    document.getElementById('totalTrains').textContent = stats.totalTrains;
    document.getElementById('activeJobs').textContent = stats.activeJobs;
    document.getElementById('expiredCerts').textContent = stats.expiredCerts;
    document.getElementById('activeCampaigns').textContent = stats.activeCampaigns;
}

// Load data for specific sections
async function loadSectionData(sectionName) {
    const tableBody = document.getElementById(sectionName + 'TableBody');
    if (!tableBody) return;
    
    // Show loading state
    tableBody.innerHTML = '<tr><td colspan="100%">Loading data...</td></tr>';
    
    try {
        const sheetName = getSheetName(sectionName);
        const response = await fetch(`${SERVER_URL}/data/${sheetName}`);
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
            displayTableData(sectionName, result.data, tableBody);
        } else {
            tableBody.innerHTML = '<tr><td colspan="100%">No data available</td></tr>';
        }
    } catch (error) {
        console.error('Error loading section data:', error);
        tableBody.innerHTML = '<tr><td colspan="100%">Error loading data</td></tr>';
    }
}

function getSheetName(sectionName) {
    const sheetNames = {
        // Navigation sections (plural)
        'trains': 'train_master',
        'branding': 'branding',
        'fitness': 'fitness_certificates',
        'jobcards': 'job_cards',
        'mileage': 'mileage',
        'stabling': 'stabling_geometry_actual',
        
        // Form types (singular)
        'train': 'train_master',
        'branding': 'branding',
        'fitness': 'fitness_certificates',
        'jobcard': 'job_cards',
        'mileage': 'mileage',
        'stabling': 'stabling_geometry_actual'
    };
    return sheetNames[sectionName] || sectionName;
}

function displayTableData(sectionName, data, tableBody) {
    let rows = '';
    
    data.forEach((record, index) => {
        rows += '<tr>';
        
        // Display relevant fields based on section
        switch(sectionName) {
            case 'trains':
                rows += `
                    <td>${record.Train_ID || ''}</td>
                    <td>${record.Year_Commissioned || ''}</td>
                    <td>${record.Base_Mileage || ''}</td>
                    <td>${record.Last_Service_Type || ''}</td>
                    <td>${record.Last_Service_Date || ''}</td>
                    <td><span class="status ${getStatusClass(record.Current_Status)}">${record.Current_Status || ''}</span></td>
                `;
                break;
            case 'branding':
                rows += `
                    <td>${record.Campaign_ID || ''}</td>
                    <td>${record.Train_ID || ''}</td>
                    <td>${record.Campaign_Name || ''}</td>
                    <td>${record.Start_Date || ''}</td>
                    <td>${record.End_Date || ''}</td>
                    <td>${record.Required_Exposure_Hours || ''}</td>
                    <td>${record.Accumulated_Exposure_Hours || ''}</td>
                `;
                break;
            case 'fitness':
                rows += `
                    <td>${record.Record_ID || ''}</td>
                    <td>${record.Train_ID || ''}</td>
                    <td>${record.Certificate_Type || ''}</td>
                    <td>${record.Issued_Date || ''}</td>
                    <td>${record.Expiry_Date || ''}</td>
                    <td><span class="status ${getStatusClass(record.Status)}">${record.Status || ''}</span></td>
                    <td>${record.Remarks || ''}</td>
                `;
                break;
            case 'jobcards':
                rows += `
                    <td>${record.JobCard_ID || ''}</td>
                    <td>${record.Train_ID || ''}</td>
                    <td>${record.Task_Description || ''}</td>
                    <td>${record.Opened_Date || ''}</td>
                    <td>${record.Due_Date || ''}</td>
                    <td>${record.Closed_Date || ''}</td>
                    <td><span class="status ${getStatusClass(record.Status)}">${record.Status || ''}</span></td>
                `;
                break;
            case 'mileage':
                rows += `
                    <td>${record.Train_ID || ''}</td>
                    <td>${record.Total_KM || ''}</td>
                    <td>${record.KM_Since_Last_A || ''}</td>
                    <td>${record.KM_Since_Last_B || ''}</td>
                    <td>${record.Last_Service_Date || ''}</td>
                    <td>${record.Daily_Avg_KM || ''}</td>
                `;
                break;
            case 'stabling':
                rows += `
                    <td>${record.Depot || ''}</td>
                    <td>${record.From_Bay || ''}</td>
                    <td>${record.To_Bay || ''}</td>
                    <td>${record.Shunting_Time_Minutes || ''}</td>
                    <td>${record.Energy_Cost_kWh || ''}</td>
                    <td>${record.Safety_Risk_Score || ''}</td>
                `;
                break;
        }
        
        rows += `
            <td>
                <button class="btn btn-small btn-primary" onclick="editRecord('${sectionName}', '${index}')">Edit</button>
                <button class="btn btn-small btn-danger" onclick="deleteRecord('${sectionName}', '${index}')">Delete</button>
            </td>
        </tr>`;
    });
    
    tableBody.innerHTML = rows;
}

function getStatusClass(status) {
    if (!status) return '';
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('valid') || statusLower.includes('active') || statusLower.includes('closed')) {
        return 'valid';
    } else if (statusLower.includes('pending') || statusLower.includes('progress')) {
        return 'pending';
    } else if (statusLower.includes('expired') || statusLower.includes('open')) {
        return 'expired';
    }
    return '';
}

// Modal handling (unchanged)
function showAddForm(formType) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const formFields = document.getElementById('formFields');
    
    const config = FORM_CONFIGS[formType];
    if (!config) return;
    
    modalTitle.textContent = `Add New ${config.title}`;
    formFields.innerHTML = generateFormFields(config.fields);
    modal.style.display = 'block';
    
    // Store current form type
    document.getElementById('dataForm').setAttribute('data-type', formType);
}

function generateFormFields(fields) {
    return fields.map(field => {
        let inputHtml = '';
        
        switch(field.type) {
            case 'select':
                const options = field.options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
                inputHtml = `<select name="${field.name}" ${field.required ? 'required' : ''}><option value="">Select...</option>${options}</select>`;
                break;
            case 'textarea':
                inputHtml = `<textarea name="${field.name}" rows="3" ${field.required ? 'required' : ''}></textarea>`;
                break;
            default:
                inputHtml = `<input type="${field.type}" name="${field.name}" ${field.step ? `step="${field.step}"` : ''} ${field.required ? 'required' : ''}>`;
        }
        
        return `
            <div class="form-group">
                <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
                ${inputHtml}
            </div>
        `;
    }).join('');
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
    document.getElementById('dataForm').reset();
}

// Form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    const formType = e.target.getAttribute('data-type');
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const sheetName = getSheetName(formType);
        const response = await fetch(`${SERVER_URL}/data/${sheetName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Data saved successfully!');
            closeModal();
            
            // Reload the current section data
            if (currentSection !== 'dashboard') {
                loadSectionData(currentSection);
            }
            
            // Update dashboard stats
            loadDashboardStats();
        } else {
            alert('Error saving data: ' + result.error);
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        alert('Error saving data. Please try again.');
    }
}

// Record operations
function editRecord(type, id) {
    console.log('Edit record:', type, id);
    alert('Edit functionality will be implemented soon');
}

function deleteRecord(type, id) {
    if (confirm('Are you sure you want to delete this record?')) {
        console.log('Delete record:', type, id);
        alert('Delete functionality will be implemented soon');
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        closeModal();
    }
}