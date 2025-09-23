// Unified Google Sheets API Integration
// This file handles all Google Sheets operations for the Railway Maximo Clone

class RailwayMaximoAPI {
    constructor() {
        this.serverURL = 'http://localhost:3000/api';
        this.isServerAvailable = false;
        this.checkServerConnection();
    }

    // Check if server is running
    async checkServerConnection() {
        try {
            const response = await fetch(`${this.serverURL.replace('/api', '')}/test`);
            if (response.ok) {
                this.isServerAvailable = true;
                console.log('✅ Server connection established');
            }
        } catch (error) {
            this.isServerAvailable = false;
            console.warn('⚠️ Server not available. Make sure to run: npm start');
        }
    }

    // Get data from Google Sheets
    async getData(sheetName) {
        if (!this.isServerAvailable) {
            throw new Error('Server not available. Please start the server with: npm start');
        }

        try {
            const response = await fetch(`${this.serverURL}/data/${sheetName}`);
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch data');
            }
            
            return result.data;
        } catch (error) {
            console.error(`Error fetching data from ${sheetName}:`, error);
            throw error;
        }
    }

    // Save data to Google Sheets
    async saveData(sheetName, data) {
        if (!this.isServerAvailable) {
            throw new Error('Server not available. Please start the server with: npm start');
        }

        try {
            const response = await fetch(`${this.serverURL}/data/${sheetName}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to save data');
            }
            
            return result;
        } catch (error) {
            console.error(`Error saving data to ${sheetName}:`, error);
            throw error;
        }
    }

    // Get dashboard statistics
    async getStats() {
        if (!this.isServerAvailable) {
            return {
                totalTrains: 25,
                activeJobs: 12,
                expiredCerts: 3,
                activeCampaigns: 8
            };
        }

        try {
            const response = await fetch(`${this.serverURL}/stats`);
            const result = await response.json();
            
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
            // Return fallback data
            return {
                totalTrains: 25,
                activeJobs: 12,
                expiredCerts: 3,
                activeCampaigns: 8
            };
        }
    }

    // Specific methods for each data type
    async saveBrandingData(data) {
        return await this.saveData('branding', data);
    }

    async saveMileageData(data) {
        return await this.saveData('mileage', data);
    }

    async saveFitnessData(data) {
        return await this.saveData('fitness_certificates', data);
    }

    async saveJobCardData(data) {
        return await this.saveData('job_cards', data);
    }

    async saveTrainData(data) {
        return await this.saveData('train_master', data);
    }

    // Get specific data
    async getBrandingData() {
        return await this.getData('branding');
    }

    async getMileageData() {
        return await this.getData('mileage');
    }

    async getFitnessData() {
        return await this.getData('fitness_certificates');
    }

    async getJobCardData() {
        return await this.getData('job_cards');
    }

    // Update existing job card data (for closing job cards)
    async updateJobCardData(jobCardId, updatedData) {
        if (!this.isServerAvailable) {
            throw new Error('Server not available. Please start the server with: npm start');
        }

        try {
            const response = await fetch(`${this.serverURL}/data/job_cards`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    JobCard_ID: jobCardId,
                    ...updatedData
                })
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to update job card');
            }
            
            return result;
        } catch (error) {
            console.error('Error updating job card:', error);
            throw error;
        }
    }

    async getTrainData() {
        return await this.getData('train_master');
    }

    // Utility method to show success/error messages
    showMessage(message, type = 'success') {
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            ${type === 'success' ? 'background-color: #4CAF50;' : 'background-color: #f44336;'}
        `;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 3000);
    }

    // Fitness Certificate specific methods
    async getFitnessRecord(trainID, certificateType) {
        try {
            const fitnessData = await this.getData('fitness_certificates');
            
            // Find record matching Train ID and Certificate Type
            const record = fitnessData.find(row => 
                row.Train_ID === trainID && row.Certificate_Type === certificateType
            );
            
            return record || null;
        } catch (error) {
            console.error('Error fetching fitness record:', error);
            throw error;
        }
    }

    async saveFitnessData(data) {
        try {
            // Use PUT endpoint to handle both updates and new records
            const response = await fetch(`${this.serverURL}/data/fitness_certificates`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to save fitness data');
            }
            
            return result;
        } catch (error) {
            console.error('Error saving fitness data:', error);
            throw error;
        }
    }
}

// Create global instance
const railwayAPI = new RailwayMaximoAPI();

// Also make it available on window object for compatibility
if (typeof window !== 'undefined') {
    window.railwayAPI = railwayAPI;
}