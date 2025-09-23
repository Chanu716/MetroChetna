// Train Eligibility and Cleaning Scheduler - Integrated with MetroChetna System
// This module extends our existing railway-api.js with advanced scheduling logic

class TrainScheduler {
    constructor(railwayAPI) {
        if (!railwayAPI) {
            throw new Error('Railway API instance is required');
        }
        this.railwayAPI = railwayAPI;
        this.today = new Date();
        console.log('🚂 TrainScheduler initialized with API:', railwayAPI.constructor.name);
        console.log('📅 Current date:', this.today.toISOString().split('T')[0]);
    }

    /**
     * Calculates the number of days until a specific date.
     * @param {string} dateStr - The end date string (e.g., 'YYYY-MM-DD').
     * @returns {number} The number of days remaining until the end date.
     */
    getDaysUntilDate(dateStr) {
        const endDate = new Date(dateStr);
        const diffTime = endDate.getTime() - this.today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 1;
    }

    /**
     * Calculates the number of days that have passed since the last service date.
     * @param {string} dateStr - The last service date string.
     * @returns {number} The number of days since the last service.
     */
    getDaysSinceLastService(dateStr) {
        const lastServiceDate = new Date(dateStr);
        const diffTime = this.today.getTime() - lastServiceDate.getTime();
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Determines a train's eligibility for next-day service based on non-cleaning factors.
     * @param {string} trainId - The ID of the train to check.
     * @param {object} data - The object containing all the structured data.
     * @returns {object} An object with a boolean for eligibility and a string reason if ineligible.
     */
    async getTrainEligibility(trainId, data) {
        const trainMaster = data.train_master?.find(t => t.Train_ID === trainId);
        const reasons = [];

        if (!trainMaster) {
            return { isEligible: false, reason: 'Train not in master list' };
        }

        // 1. Check Status
        const validStatuses = ['Service', 'Standby', 'IBL'];
        if (!validStatuses.includes(trainMaster.Current_Status)) {
            reasons.push(`Not in a service-eligible status (${trainMaster.Current_Status})`);
        }

        // 2. Check Job Cards
        const trainJobCards = data.job_cards?.filter(jc => jc.Train_ID === trainId) || [];
        const hasOpenJobCards = trainJobCards.some(jc => jc.Status === 'Open');
        if (hasOpenJobCards) {
            reasons.push('Has open job cards');
        }

        // 3. Check Fitness Certificates
        const trainCerts = data.fitness_certificates?.filter(fc => fc.Train_ID === trainId) || [];
        for (const cert of trainCerts) {
            if (cert.Status === 'Awaiting Approval') {
                reasons.push(`Has pending ${cert.Certificate_Type} certificate`);
            }
            if (cert.Status === 'Expired') {
                reasons.push(`Requires 1-hour inspection bay visit for new ${cert.Certificate_Type} certificate`);
            }
        }

        // 4. Check Maintenance Service
        const lastServiceType = trainMaster.Last_Service_Type;
        const daysSinceLastService = this.getDaysSinceLastService(trainMaster.Last_Service_Date);
        const requiresAService = (lastServiceType === 'A' || lastServiceType === 'C') && (daysSinceLastService + 1) >= 15;
        const requiresBService = (lastServiceType === 'B' || lastServiceType === 'D') && (daysSinceLastService + 1) >= 45;

        if (requiresAService) {
            reasons.push('Requires a 15-day A-Service check');
        }
        if (requiresBService) {
            reasons.push('Requires a 45-day B-Service check');
        }

        if (reasons.length > 0) {
            return { isEligible: false, reason: reasons.join(' and ') };
        }

        return { isEligible: true, reason: 'Meets all criteria' };
    }

    /**
     * Loads all necessary data from Google Sheets
     */
    async loadAllData() {
        try {
            const sheetNames = [
                'train_master',
                'job_cards',
                'branding',
                'fitness_certificates',
                'stabling_geometry',
                'mileage'
            ];

            const allData = {};
            
            // Load data from all sheets
            for (const sheetName of sheetNames) {
                try {
                    allData[sheetName] = await this.railwayAPI.getData(sheetName);
                } catch (error) {
                    console.warn(`Could not load ${sheetName}:`, error.message);
                    allData[sheetName] = [];
                }
            }

            return allData;
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    /**
     * Generates a comprehensive train eligibility report
     */
    async generateEligibilityReport() {
        try {
            const data = await this.loadAllData();
            const trainIds = new Set(data.train_master?.map(t => t.Train_ID) || []);
            
            const report = {
                date: this.today.toISOString().split('T')[0],
                eligible_trains: [],
                ineligible_trains: [],
                cleaning_required: [],
                maintenance_due: [],
                certificate_issues: []
            };

            for (const trainId of trainIds) {
                const trainMaster = data.train_master?.find(t => t.Train_ID === trainId);
                if (!trainMaster) continue;

                const eligibility = await this.getTrainEligibility(trainId, data);
                
                // Check if cleaning is required
                const daysSinceLastService = this.getDaysSinceLastService(trainMaster.Last_Service_Date);
                const requiresCleaning = ((daysSinceLastService + 1) % 3 === 0) ||
                                       ((daysSinceLastService + 1) % 30 === 0);

                const trainInfo = {
                    train_id: trainId,
                    current_status: trainMaster.Current_Status,
                    source: trainMaster.Source || '',
                    destination: trainMaster.Destination || '',
                    last_service_date: trainMaster.Last_Service_Date,
                    days_since_service: daysSinceLastService,
                    eligibility_status: eligibility.isEligible ? 'Eligible' : 'Ineligible',
                    reason: eligibility.reason,
                    requires_cleaning: requiresCleaning
                };

                if (eligibility.isEligible) {
                    report.eligible_trains.push(trainInfo);
                    
                    if (requiresCleaning) {
                        report.cleaning_required.push(trainInfo);
                    }
                } else {
                    report.ineligible_trains.push(trainInfo);
                    
                    // Categorize ineligible reasons
                    if (eligibility.reason.includes('Service')) {
                        report.maintenance_due.push(trainInfo);
                    }
                    if (eligibility.reason.includes('certificate')) {
                        report.certificate_issues.push(trainInfo);
                    }
                }
            }

            return report;
        } catch (error) {
            console.error('Error generating eligibility report:', error);
            throw error;
        }
    }

    /**
     * Gets trains with highest branding priority
     */
    async getHighPriorityBrandingTrains(limit = 10) {
        try {
            const data = await this.loadAllData();
            const brandingData = data.branding || [];
            
            const priorityTrains = brandingData
                .map(train => {
                    const daysUntilEnd = this.getDaysUntilDate(train.End_Date);
                    const remainingHours = parseFloat(train.Remaining_Hours) || 0;
                    const priority = remainingHours / daysUntilEnd;
                    
                    return {
                        ...train,
                        days_until_end: daysUntilEnd,
                        priority_score: priority
                    };
                })
                .sort((a, b) => b.priority_score - a.priority_score)
                .slice(0, limit);

            return priorityTrains;
        } catch (error) {
            console.error('Error getting priority branding trains:', error);
            throw error;
        }
    }
}

// Add to railway API
if (typeof window !== 'undefined' && window.railwayAPI) {
    window.railwayAPI.scheduler = new TrainScheduler(window.railwayAPI);
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrainScheduler;
}