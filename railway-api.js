// Unified Google Sheets API Integration
// This file handles all Google Sheets operations for the Railway Maximo Clone

class RailwayMaximoAPI {
    constructor() {
        this.serverURL = 'http://localhost:3000/api';
        this.isServerAvailable = false;
        // Internal watchers state
    this._logsWatcher = null; // { timer, lastCount, intervalMs, onNew }
    this._logsNotifyQueue = []; // queued new log entries to toast one-by-one
    this._logsNotifyTimer = null; // interval timer for queued toasts
        // Simple in-memory cache for sheet data
        this._cache = new Map(); // key: sheetName -> { at: epochMs, ttl: ms, data }
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
        // Ensure date fields are formatted for Sheets (M/D/YYYY)
        const payload = { ...data };
        if (payload.Start_Date) payload.Start_Date = this.formatDateForSheets(payload.Start_Date);
        if (payload.End_Date) payload.End_Date = this.formatDateForSheets(payload.End_Date);
        return await this.saveData('branding', payload);
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

    // New cleaning service methods
    async saveLightCleanData(data) {
        return await this.saveData('light_clean', data);
    }

    async saveCleaningSlotsData(data) {
        return await this.saveData('cleaning_slots', data);
    }

    async saveDeepCleanData(data) {
        return await this.saveData('deep_clean', data);
    }

    // Service check methods
    async saveAServiceCheckData(data) {
        return await this.saveData('a_service_check', data);
    }

    async saveBServiceCheckData(data) {
        return await this.saveData('b_service_check', data);
    }

    // Employee and logs methods
    async saveEmployeeCredentialsData(data) {
        return await this.saveData('employee_credentials', data);
    }

    async saveLogsData(data) {
        return await this.saveData('logs', data);
    }

    // Stabling geometry method
    async saveStablingGeometryData(data) {
        return await this.saveData('stabling_geometry', data);
    }

    // Get specific data methods - ALL SHEETS
    async getBrandingData() {
        return await this.getData('branding');
    }

    async getMileageData() {
        return await this.getData('mileage');
    }

    // Logs
    async getLogsData() {
        return await this.getData('logs');
    }

    // Return unique Source and Destination values from logs sheet
    async getLogLocations() {
        if (!this.isServerAvailable) {
            throw new Error('Server not available. Please start the server with: npm start');
        }

        const logs = await this.getLogsData();
        const srcMap = new Map(); // key: normalized -> canonical
        const dstMap = new Map();

        const normalize = (v) => (v || '').toString().trim().toLowerCase();
        const canonical = (v) => (v || '').toString().trim();

        for (const row of logs || []) {
            const s = canonical(row.Source ?? row.source);
            const d = canonical(row.Destination ?? row.destination);
            const sn = normalize(s);
            const dn = normalize(d);
            if (sn && !srcMap.has(sn)) srcMap.set(sn, s);
            if (dn && !dstMap.has(dn)) dstMap.set(dn, d);
        }

        const sources = Array.from(srcMap.values()).sort((a,b)=>a.localeCompare(b));
        const destinations = Array.from(dstMap.values()).sort((a,b)=>a.localeCompare(b));
        return { sources, destinations };
    }

    // Get union of all known locations from logs (sources ∪ destinations)
    async getAllKnownLogLocations() {
        const { sources, destinations } = await this.getLogLocations();
        const set = new Set([...(sources || []), ...(destinations || [])]);
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }

    // Normalize a location name to a canonical form used across the app
    normalizeLocationName(name) {
        if (!name) return '';
        let s = String(name).trim();
        // Collapse whitespace and hyphens to underscores, remove duplicate underscores
        s = s.replace(/[\s-]+/g, '_').replace(/_+/g, '_');
        // Standardize casing: keep prefix like 'Muttom' TitleCase, rest as given tokens
        const parts = s.split('_').filter(Boolean);
        if (parts.length === 0) return '';
        // Title case the first token only
        parts[0] = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
        return parts.join('_');
    }

    // Parse structured info from a location string like: Muttom_Stb05_S1, Muttom_Clean01, Muttom_Entrance
    parseLocation(name) {
        const value = this.normalizeLocationName(name);
        const info = { raw: name || '', value, depot: '', type: '', index: null, bay: null, slot: null };
        const reStb = /^(?<depot>[A-Za-z]+)_Stb(?<bay>\d{2})_S(?<slot>\d)$/;
        const reClean = /^(?<depot>[A-Za-z]+)_(?<type>Clean|Inspect|Maint)(?<index>\d{2})$/;
        const reEntrance = /^(?<depot>[A-Za-z]+)_(?<type>Entrance)$/;
        let m = value.match(reStb);
        if (m && m.groups) {
            info.depot = m.groups.depot;
            info.type = 'Stabling';
            info.bay = parseInt(m.groups.bay, 10);
            info.slot = parseInt(m.groups.slot, 10);
            return info;
        }
        m = value.match(reClean);
        if (m && m.groups) {
            info.depot = m.groups.depot;
            info.type = m.groups.type; // Clean/Inspect/Maint
            info.index = parseInt(m.groups.index, 10);
            return info;
        }
        m = value.match(reEntrance);
        if (m && m.groups) {
            info.depot = m.groups.depot;
            info.type = m.groups.type; // Entrance
            return info;
        }
        return info; // Unknown pattern but still returns normalized value
    }

    // Validate a single log record shape and values
    // entry: { Train_ID, Source, Destination, Start_Time, End_Time, Action }
    // returns: { valid: boolean, errors: string[], normalized: object, suggestions?: {Source?: string[], Destination?: string[]} }
    async validateLogRecord(entry, options = {}) {
        const errors = [];
        const suggestions = {};
        const normalized = { ...entry };

        // Normalize Source/Destination strings
        normalized.Source = this.normalizeLocationName(entry?.Source);
        normalized.Destination = this.normalizeLocationName(entry?.Destination);

        // Allowed locations: prefer provided list; otherwise compute from logs union
        const allowed = new Set((options.allowedLocations && options.allowedLocations.map(v => this.normalizeLocationName(v))) || (await this.getAllKnownLogLocations()).map(v => this.normalizeLocationName(v)));

        // Basic required fields
        if (!normalized.Train_ID) errors.push('Train_ID is required');
        if (!normalized.Source) errors.push('Source is required');
        if (!normalized.Destination) errors.push('Destination is required');

        // Location membership check with basic suggestion heuristic
        const getBasicSuggestions = (value) => {
            if (!value) return [];
            const valLower = value.toLowerCase();
            const pool = Array.from(allowed.values());
            // Prefer same prefix or containing tokens
            const prefix = pool.filter(x => x.toLowerCase().startsWith(valLower)).slice(0, 5);
            if (prefix.length) return prefix;
            const contains = pool.filter(x => x.toLowerCase().includes(valLower)).slice(0, 5);
            return contains;
        };

        if (normalized.Source && !allowed.has(normalized.Source)) {
            errors.push(`Unknown Source: ${entry?.Source}`);
            suggestions.Source = getBasicSuggestions(normalized.Source);
        }
        if (normalized.Destination && !allowed.has(normalized.Destination)) {
            errors.push(`Unknown Destination: ${entry?.Destination}`);
            suggestions.Destination = getBasicSuggestions(normalized.Destination);
        }

        // Time validation (expects either 'm/dd/yyyy HH:mm' or separate fields); tolerate just HH:mm and assume same day ordering
        const parseTime = (t) => {
            if (!t) return NaN;
            const s = String(t).trim();
            // If it looks like HH:mm, anchor to epoch day 0
            if (/^\d{1,2}:\d{2}$/.test(s)) {
                const [hh, mm] = s.split(':').map(n => parseInt(n, 10));
                if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) return hh * 60 + mm;
                return NaN;
            }
            // Try Date parse; compare minutes since epoch
            const d = new Date(s);
            if (!isNaN(d.getTime())) return Math.floor(d.getTime() / 60000);
            return NaN;
        };

        const tStart = parseTime(entry?.Start_Time);
        const tEnd = parseTime(entry?.End_Time);
        if (isNaN(tStart)) errors.push('Start_Time is invalid');
        if (isNaN(tEnd)) errors.push('End_Time is invalid');
        if (!isNaN(tStart) && !isNaN(tEnd)) {
            if (tEnd <= tStart) errors.push('End_Time must be after Start_Time');
        }

        return {
            valid: errors.length === 0,
            errors,
            normalized,
            ...(Object.keys(suggestions).length ? { suggestions } : {})
        };
    }

    // Update mileage row by Train_ID (upsert via server PUT)
    async updateMileageData(trainId, updatedData) {
        if (!this.isServerAvailable) {
            throw new Error('Server not available. Please start the server with: npm start');
        }

        try {
            const response = await fetch(`${this.serverURL}/data/mileage`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Train_ID: trainId, ...updatedData })
            });

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to update mileage');
            }
            return result;
        } catch (error) {
            console.error('Error updating mileage:', error);
            throw error;
        }
    }

    async getFitnessData() {
        return await this.getData('fitness_certificates');
    }

    async getJobCardData() {
        return await this.getData('job_cards');
    }

    async getLightCleanData() {
        return await this.getData('light_clean');
    }

    async getCleaningSlotsData() {
        return await this.getData('cleaning_slots');
    }

    async getDeepCleanData() {
        return await this.getData('deep_clean');
    }

    async getAServiceCheckData() {
        return await this.getData('a_service_check');
    }

    async getBServiceCheckData() {
        return await this.getData('b_service_check');
    }

    async getEmployeeCredentialsData() {
        return await this.getData('employee_credentials');
    }

    async getLogsData() {
        return await this.getData('logs');
    }

    async getStablingGeometryData() {
        return await this.getData('stabling_geometry');
    }

    // Cached sheet fetch with TTL
    async getDataCached(sheetName, ttlMs = 30000) {
        if (!this.isServerAvailable) {
            throw new Error('Server not available. Please start the server with: npm start');
        }
        const now = Date.now();
        const c = this._cache.get(sheetName);
        if (c && now - c.at < (c.ttl || ttlMs)) {
            return c.data;
        }
        const data = await this.getData(sheetName);
        this._cache.set(sheetName, { at: now, ttl: ttlMs, data });
        return data;
    }

    // Convenience cached getters (tuned TTLs)
    async getLogsDataCached() { return this.getDataCached('logs', 15000); }
    async getCleaningSlotsDataCached() { return this.getDataCached('cleaning_slots', 45000); }
    async getStablingGeometryDataCached() { return this.getDataCached('stabling_geometry', 600000); }
    async getJobCardDataCached() { return this.getDataCached('job_cards', 30000); }
    async getFitnessDataCached() { return this.getDataCached('fitness_certificates', 60000); }
    async getMileageDataCached() { return this.getDataCached('mileage', 60000); }
    async getBrandingDataCached() { return this.getDataCached('branding', 60000); }
    async getAServiceCheckDataCached() { return this.getDataCached('a_service_check', 60000); }
    async getBServiceCheckDataCached() { return this.getDataCached('b_service_check', 60000); }

    // ---------------- Scheduling Aggregator & Approval ----------------
    // Run all proposal generators and return a combined object
    async runSchedulingAlgorithm(options = {}) {
        if (!this.isServerAvailable) {
            throw new Error('Server not available. Please start the server with: npm start');
        }
        // Prefetch all sheets once to reduce read rate
        const ctx = await this.prefetchSchedulingData();
        // Execute proposal builders in parallel using context
        const [maintenance, light, deep, services, entrance] = await Promise.all([
            this.proposeMaintenanceMovements(ctx).catch(() => []),
            this.proposeCleaningMovements('light', ctx).catch(() => []),
            this.proposeCleaningMovements('deep', ctx).catch(() => []),
            this.proposeServiceCheckMovements(ctx).catch(() => []),
            this.proposeEntrancePlan(ctx).catch(() => []),
        ]);

        const proposals = { maintenance, light, deep, services, entrance };
        let payload = this.buildApprovalPayloadFromProposals(proposals);
        // Add daily branding roll-up by default; compute from prefetched logs
        const today = new Date();
        const brandingAccum = this.computeDailyBrandingAccumulations(ctx.logs, today);
        if (brandingAccum.length) {
            payload.brandingAccumulations = (payload.brandingAccumulations || []).concat(brandingAccum);
        }
        // Stagger log Start_Time by 30s to avoid identical timestamps
        this.applyStaggeredStartTimes(payload.logs, 30);
        return { proposals, payload };
    }

    // Prefetch data for one scheduling run (cached under the hood)
    async prefetchSchedulingData() {
        const [
            logs,
            mileage,
            jobCards,
            fitness,
            aSvc,
            bSvc,
            lightClean,
            deepClean,
            cleaningSlots,
            geometry,
            branding
        ] = await Promise.all([
            this.getLogsDataCached(),
            this.getMileageDataCached(),
            this.getJobCardDataCached(),
            this.getFitnessDataCached(),
            this.getAServiceCheckDataCached(),
            this.getBServiceCheckDataCached(),
            this.getDataCached('light_clean', 60000),
            this.getDataCached('deep_clean', 60000),
            this.getCleaningSlotsDataCached(),
            this.getStablingGeometryDataCached(),
            this.getBrandingDataCached(),
        ]);
        return { logs, mileage, jobCards, fitness, aSvc, bSvc, lightClean, deepClean, cleaningSlots, geometry, branding };
    }

    // Convert proposals into approval payload expected by /api/approve
    buildApprovalPayloadFromProposals(proposals) {
        const payload = {
            logs: [],
            cleaningSlots: [],
            jobCardsToClose: [],
            serviceChecksToUpdate: [],
            brandingAccumulations: [] // calculated by daily roll-up elsewhere
        };

        const pushLog = (p) => { if (p && p.entry) payload.logs.push(p.entry); };

        // Maintenance -> logs + jobCardsToClose
        for (const p of proposals.maintenance || []) {
            pushLog(p);
            if (p.jobCard && (p.jobCard.JobCard_ID || p.jobCard.Train_ID)) {
                payload.jobCardsToClose.push({ JobCard_ID: p.jobCard.JobCard_ID, Train_ID: p.jobCard.Train_ID });
            }
        }

        // Cleaning -> logs + cleaningSlots
        const addSlots = (slots) => {
            for (const s of slots || []) {
                payload.cleaningSlots.push({ Date: s.Date, Start_Time: s.Start_Time, End_Time: s.End_Time });
            }
        };
        for (const p of proposals.light || []) { pushLog(p); addSlots(p.slots); }
        for (const p of proposals.deep || []) { pushLog(p); addSlots(p.slots); }

        // Service checks -> logs + serviceChecksToUpdate
        for (const p of proposals.services || []) {
            pushLog(p);
            if (p.type === 'a_service_check') payload.serviceChecksToUpdate.push({ Train_ID: p.trainId, type: 'A' });
            if (p.type === 'b_service_check') payload.serviceChecksToUpdate.push({ Train_ID: p.trainId, type: 'B' });
        }

        // Entrance swaps -> logs only
        for (const p of proposals.entrance || []) pushLog(p);

        return payload;
    }

    // Approve proposals by posting the payload to the server
    async approveProposals(payload) {
        if (!this.isServerAvailable) {
            throw new Error('Server not available. Please start the server with: npm start');
        }
        const resp = await fetch(`${this.serverURL}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload || {})
        });
        const result = await resp.json();
        if (!result.success) throw new Error(result.error || 'Approval failed');
        return result.result;
    }

    // ---------------- Logs Watcher (Polling) ----------------
    // Start a polling watcher to detect new logs appended to the Google Sheet.
    // Options: { intervalMs?: number (default 30000), onNew?: (newItems)=>void }
    startLogsWatcher(options = {}) {
        const intervalMs = Math.max(5000, Number(options.intervalMs) || 30000);
        const onNew = typeof options.onNew === 'function' ? options.onNew : null;

        // Stop existing watcher if running
        this.stopLogsWatcher();

        // Initialize state
        this._logsWatcher = {
            timer: null,
            lastCount: null,
            intervalMs,
            onNew,
            startedAt: Date.now(),
        };

        const poll = async () => {
            try {
                // Try to lazily re-check server availability if previously offline
                if (!this.isServerAvailable) {
                    await this.checkServerConnection();
                    if (!this.isServerAvailable) return; // stay quiet while offline
                }

                const logs = await this.getLogsDataCached().catch(() => null);
                if (!Array.isArray(logs)) return;

                const currentCount = logs.length;
                if (this._logsWatcher.lastCount === null) {
                    // Prime without notifying on first run
                    this._logsWatcher.lastCount = currentCount;
                    return;
                }

                if (currentCount > this._logsWatcher.lastCount) {
                    const newItems = logs.slice(this._logsWatcher.lastCount);
                    this._logsWatcher.lastCount = currentCount;

                    // Notify via callback or default queued toasts (every 30s)
                    if (this._logsWatcher.onNew) {
                        try { this._logsWatcher.onNew(newItems); } catch (e) { /* noop */ }
                    } else if (typeof window !== 'undefined') {
                        // enqueue
                        this._logsNotifyQueue.push(...newItems);
                        // start timer if not running
                        if (!this._logsNotifyTimer) {
                            this._logsNotifyTimer = setInterval(() => {
                                const item = this._logsNotifyQueue.shift();
                                if (!item) {
                                    clearInterval(this._logsNotifyTimer);
                                    this._logsNotifyTimer = null;
                                    return;
                                }
                                const msg = `New log: ${item.Train_ID || ''} ${item.Source || ''} → ${item.Destination || ''} @ ${this.formatTimeHHMM(item.Start_Time)}`.trim();
                                this.showMessage(msg || 'New log detected', 'success');
                                try { document.dispatchEvent(new CustomEvent('logs:new', { detail: { newItems: [item] } })); } catch (_) { /* ignore */ }
                            }, 30000);
                        }
                    }
                } else if (currentCount < this._logsWatcher.lastCount) {
                    // Sheet was truncated or replaced; reset baseline
                    this._logsWatcher.lastCount = currentCount;
                }
            } catch (_) {
                // Silently ignore poll errors; next tick will retry
            }
        };

        // Immediate poll once to prime
        poll();
        this._logsWatcher.timer = setInterval(poll, intervalMs);
        return true;
    }

    // Stop the logs polling watcher if running
    stopLogsWatcher() {
        if (this._logsWatcher && this._logsWatcher.timer) {
            try { clearInterval(this._logsWatcher.timer); } catch (_) { /* noop */ }
        }
        if (this._logsNotifyTimer) {
            try { clearInterval(this._logsNotifyTimer); } catch (_) { /* noop */ }
            this._logsNotifyTimer = null;
        }
        this._logsNotifyQueue = [];
        this._logsWatcher = null;
    }

    // --- Time & Geometry Utilities ---
    // Format Date to m/dd/yyyy HH:mm
    formatDateTimeForSheets(input) {
        const toDate = (v) => {
            if (v instanceof Date) return v;
            const s = String(v || '').trim();
            if (!s) return new Date();
            // Support m/d[/yy]y HH:mm or ISO; fallback to Date()
            const d = new Date(s);
            if (!isNaN(d.getTime())) return d;
            // If only HH:mm provided, combine with today
            if (/^\d{1,2}:\d{2}$/.test(s)) {
                const now = new Date();
                const [hh, mm] = s.split(':').map(n => parseInt(n, 10));
                now.setHours(hh, mm, 0, 0);
                return now;
            }
            return new Date();
        };
        const dt = toDate(input);
        const date = this.formatDateForSheets(dt.toISOString().slice(0, 10)); // m/dd/yyyy
        const hh = String(dt.getHours()).padStart(2, '0');
        const mm = String(dt.getMinutes()).padStart(2, '0');
        return `${date} ${hh}:${mm}`;
    }

    // Compute End time: startTime + minutes → m/dd/yyyy HH:mm
    computeEndTime(startTime, minutes) {
        const base = (() => {
            if (startTime instanceof Date) return new Date(startTime.getTime());
            const s = String(startTime || '').trim();
            if (!s) return new Date();
            const d = new Date(s);
            if (!isNaN(d.getTime())) return d;
            // If only HH:mm, take today HH:mm
            if (/^\d{1,2}:\d{2}$/.test(s)) {
                const now = new Date();
                const [hh, mm] = s.split(':').map(n => parseInt(n, 10));
                now.setHours(hh, mm, 0, 0);
                return now;
            }
            return new Date();
        })();
        const mins = Number(minutes) || 0;
        base.setMinutes(base.getMinutes() + mins);
        return this.formatDateTimeForSheets(base);
    }

    // Parse m/dd/yyyy HH:mm or HH:mm to Date
    parseDateTime(input) {
        if (input instanceof Date) return new Date(input.getTime());
        const s = String(input || '').trim();
        if (!s) return new Date(NaN);
        if (/^\d{1,2}:\d{2}$/.test(s)) {
            const now = new Date();
            const [hh, mm] = s.split(':').map(n => parseInt(n, 10));
            now.setHours(hh, mm, 0, 0);
            return now;
        }
        const d = new Date(s);
        return isNaN(d.getTime()) ? new Date(NaN) : d;
    }

    // Format only time HH:mm from a date-time string
    formatTimeHHMM(input) {
        const d = this.parseDateTime(input);
        if (isNaN(d.getTime())) return '';
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    }

    // Stagger Start_Time by gapSeconds; preserve durations
    applyStaggeredStartTimes(logs = [], gapSeconds = 30) {
        if (!Array.isArray(logs) || logs.length === 0) return;
        const base = new Date();
        for (let i = 0; i < logs.length; i++) {
            const row = logs[i];
            const s0 = this.parseDateTime(row.Start_Time);
            const e0 = this.parseDateTime(row.End_Time);
            const durMin = (!isNaN(s0) && !isNaN(e0)) ? Math.max(0, Math.round((e0 - s0) / 60000)) : 0;
            const si = new Date(base.getTime() + i * gapSeconds * 1000);
            const ei = new Date(si.getTime() + durMin * 60000);
            row.Start_Time = this.formatDateTimeForSheets(si);
            row.End_Time = this.formatDateTimeForSheets(ei);
        }
    }

    // Geometry lookup: returns { durationMinutes, energyKWh }
    async getMovementFromGeometry(source, destination) {
        const src = this.normalizeLocationName(source);
        const dst = this.normalizeLocationName(destination);
        const rows = await this.getStablingGeometryDataCached();
        const norm = (s) => (s || '').toString().trim().replace(/[\s-]+/g, '_');
        const pickNumber = (obj, keys, def = NaN) => {
            for (const k of keys) {
                if (obj[k] !== undefined) {
                    const n = Number(String(obj[k]).replace(/[\s,]/g, ''));
                    if (!isNaN(n)) return n;
                }
            }
            return def;
        };
        let best = null;
        for (const r of rows || []) {
            const s = this.normalizeLocationName(r.Source || r.source || r.From || r.from);
            const d = this.normalizeLocationName(r.Destination || r.destination || r.To || r.to);
            if (norm(s) === norm(src) && norm(d) === norm(dst)) {
                const duration = pickNumber(r, ['Travel_Duration_Minutes','Duration_Minutes','Minutes','TravelTime']);
                const energy = pickNumber(r, ['Energy_Cost_kWh','Energy_kWh','Energy','kWh'], 0);
                best = { durationMinutes: isNaN(duration) ? 0 : duration, energyKWh: energy };
                break;
            }
        }
        // Graceful fallback: assume 0 duration if not found
        return best || { durationMinutes: 0, energyKWh: 0 };
    }

    // --- Cleaning slot helpers (planning only; no mutation) ---
    async getCleaningSlotsData() {
        return await this.getData('cleaning_slots');
    }

    // Find consecutive available slots by date; returns array of {Date, Start_Time, End_Time, index}
    async findConsecutiveSlots(dateStr, count) {
        const slots = await this.getCleaningSlotsDataCached();
        const targetDate = this.formatDateForSheets(dateStr || new Date().toISOString().slice(0,10));
        const daySlots = (slots || []).filter(s => (s.Date || s.date) === targetDate);
        // Normalize and sort by start time HH:mm
        const parseHHMM = (t) => {
            const m = String(t || '').trim().match(/^(\d{1,2}):(\d{2})$/);
            if (!m) return NaN;
            const hh = parseInt(m[1],10), mm = parseInt(m[2],10);
            return hh*60+mm;
        };
        const list = daySlots.map((r, i) => ({
            Date: r.Date || r.date,
            Start_Time: r.Start_Time || r.start_time || r.Start || r.start,
            End_Time: r.End_Time || r.end_time || r.End || r.end,
            Status: (r.Status || r.status || '').toString().toLowerCase(),
            _mins: parseHHMM(r.Start_Time || r.start_time || r.Start || r.start),
            _row: r,
            index: i
        })).filter(x => !isNaN(x._mins))
          .sort((a,b)=>a._mins-b._mins);

        const need = Math.max(1, count|0);
        let startIdx = -1;
        for (let i=0;i<=list.length-need;i++) {
            let ok = true;
            for (let j=0;j<need;j++) {
                const item = list[i+j];
                if (!item || item.Status !== 'available') { ok=false; break; }
                if (j>0) {
                    // ensure strictly consecutive 10-min blocks
                    if (list[i+j]._mins !== list[i+j-1]._mins + 10) { ok=false; break; }
                }
            }
            if (ok) { startIdx = i; break; }
        }
        if (startIdx === -1) return [];
        return list.slice(startIdx, startIdx + need);
    }

    // --- Proposal builders (planning; no sheet mutations) ---
    // Build a movement proposal object
    async buildMovementProposal(trainId, source, destination, action='Move') {
        const start = this.formatDateTimeForSheets(new Date());
        const { durationMinutes } = await this.getMovementFromGeometry(source, destination);
        const end = this.computeEndTime(start, durationMinutes);
        const { entry, validation } = await this.buildTripLogEntry(trainId, source, start, end, action);
        // Note: buildTripLogEntry sets Destination=Entrance; override for generic move
        entry.Destination = this.normalizeLocationName(destination);
        entry.Start_Time = start;
        entry.End_Time = end;
        return { entry, validation };
    }

    // Plan maintenance movements for open job cards (skip fitness rule)
    async proposeMaintenanceMovements() {
        const jobs = await this.getJobCardDataCached();
        const open = (jobs || []).filter(r => (r.Status||'').toString().toLowerCase() === 'open');
        // Sort by oldest Opened_Date first
        const parseDate = (s) => new Date(this.formatDateForSheets(s||''));
        open.sort((a,b)=> parseDate(a.Opened_Date) - parseDate(b.Opened_Date));

        const proposals = [];
        for (const r of open) {
            const trainId = r.Train_ID;
            const src = await this.getCurrentLocation(trainId);
            const dest = 'Muttom_Maint01';
            const prop = await this.buildMovementProposal(trainId, src || 'Muttom_Stb01_S1', dest, 'Maintenance');
            proposals.push({ type: 'maintenance', trainId, jobCard: r, ...prop });
        }
        return proposals;
    }

    // Refresh cleanliness statuses and propose cleaning movements with slots
    async proposeCleaningMovements(kind) { // kind: 'light' | 'deep'
        const isLight = kind === 'light';
        const sheet = isLight ? 'light_clean' : 'deep_clean';
        const data = sheet === 'light_clean' ? await this.getDataCached('light_clean', 60000) : await this.getDataCached('deep_clean', 60000);
        const thresholdDays = isLight ? 3 : 30;
        const today = new Date();
        const daysAgo = (d) => Math.floor((today - new Date(this.formatDateForSheets(d||''))) / 86400000);

        // Refresh logic: if Clean but overdue, mark as Required (planning only)
        const items = (data || []).map(r => {
            const status = (r.Cleanliness_Status || r.Status || '').toString();
            const overdueDays = daysAgo(r.Last_Cleaning_Date);
            const required = status.toLowerCase() === 'required' || (status.toLowerCase() === 'clean' && overdueDays >= thresholdDays);
            return { ...r, _overdueDays: overdueDays, _required: required };
        });

        const candidates = items.filter(x => x._required);
        // Prioritize most overdue first
        candidates.sort((a,b)=> b._overdueDays - a._overdueDays);

        const dest = isLight ? 'Muttom_Clean01' : 'Muttom_Clean02';
        const slotNeed = isLight ? 1 : 12;
        const proposals = [];
        // Allocate using today by default; in future consider horizon search
        const targetDate = this.formatDateForSheets(new Date().toISOString().slice(0,10));
        for (const c of candidates) {
        // NOTE: findConsecutiveSlots internally calls getCleaningSlotsData; we keep proposal runs sparse
            const slots = await this.findConsecutiveSlots(targetDate, slotNeed);
            if (slots.length !== slotNeed) continue;
            const src = await this.getCurrentLocation(c.Train_ID);
            const prop = await this.buildMovementProposal(c.Train_ID, src || 'Muttom_Stb01_S1', dest, isLight ? 'Light_Clean' : 'Deep_Clean');
            proposals.push({ type: isLight ? 'light_clean' : 'deep_clean', trainId: c.Train_ID, slots, ...prop });
        }
        return proposals;
    }

    // Propose service check movements and overdue refresh
    async proposeServiceCheckMovements() {
    const aData = await this.getAServiceCheckDataCached();
    const bData = await this.getBServiceCheckDataCached();
        const today = this.formatDateForSheets(new Date().toISOString().slice(0,10));
        const olderThan = (dateStr, days) => {
            const d = new Date(this.formatDateForSheets(dateStr||''));
            const now = new Date(this.formatDateForSheets(new Date().toISOString().slice(0,10)));
            return (now - d) / 86400000 >= days;
        };
        const overdueA = (aData||[]).filter(r => olderThan(r.a_check_date || r.A_Check_Date || r.A_Check, 15));
        const overdueB = (bData||[]).filter(r => olderThan(r.b_check_date || r.B_Check_Date || r.B_Check, 45));

        const proposals = [];
        for (const r of overdueA) {
            const src = await this.getCurrentLocation(r.Train_ID);
            const p = await this.buildMovementProposal(r.Train_ID, src || 'Muttom_Stb01_S1', 'Muttom_Inspect01', 'A_Service_Check');
            proposals.push({ type: 'a_service_check', trainId: r.Train_ID, dateUpdate: today, ...p });
        }
        for (const r of overdueB) {
            const src = await this.getCurrentLocation(r.Train_ID);
            const p = await this.buildMovementProposal(r.Train_ID, src || 'Muttom_Stb01_S1', 'Muttom_Inspect01', 'B_Service_Check');
            proposals.push({ type: 'b_service_check', trainId: r.Train_ID, dateUpdate: today, ...p });
        }
        return proposals;
    }

    // Entrance simultaneous cap planner: propose swap-in/out to keep top 8
    async proposeEntrancePlan() {
        // Determine current at Entrance
        const logs = await this.getLogsDataCached();
        const atEntrance = new Set();
        const lastSeen = new Map();
        for (const r of logs || []) {
            const id = this._normTrainId(r.Train_ID);
            const dest = this.normalizeLocationName(r.Destination || r.destination);
            lastSeen.set(id, dest);
        }
        for (const [id, dest] of lastSeen.entries()) {
            if (dest === 'Muttom_Entrance') atEntrance.add(id);
        }
        const now = new Date();
        const hour = now.getHours();
        // Compute eligible and prioritized list
        // Collect unique train IDs from mileage (as universe)
        const mileage = await this.getMileageDataCached();
        const allIds = Array.from(new Set((mileage||[]).map(r => r.Train_ID).filter(Boolean)));
        const eligible = [];
        for (const id of allIds) {
            const [fit, pending, fresh] = await Promise.all([
                this.getEligibleByFitness(id),
                this.hasPendingJobCards(id),
                this.isCleaningFresh(id)
            ]);
            if (fit && !pending && fresh) eligible.push(id);
        }
        const ranked = await this.rankTrainsForEntranceTrip(eligible);
        const proposals = [];
        if (hour >= 22 || hour < 6) {
            // Night mode: remove up to 8 trains from Entrance back to Stabling
            const toRemove = Array.from(atEntrance).slice(0, 8);
            for (const id of toRemove) {
                const trainId = (mileage||[]).find(r => this._normTrainId(r.Train_ID)===id)?.Train_ID || id;
                const src = 'Muttom_Entrance';
                const candidates = Array.from({length:13*2}, (_,i)=> `Muttom_Stb${String(Math.floor(i/2)+1).padStart(2,'0')}_S${(i%2)+1}`);
                let best = candidates[0]; let bestMin = Infinity;
                for (const c of candidates) {
                    const g = await this.getMovementFromGeometry(src, c);
                    if (g.durationMinutes < bestMin) { bestMin = g.durationMinutes; best = c; }
                }
                const p = await this.buildMovementProposal(trainId, src, best, 'Night_Return');
                proposals.push({ type: 'entrance_night_return', trainId, ...p });
            }
            return proposals;
        }
        // Day mode: keep top 8 at Entrance, swap as needed
        const keep = new Set(ranked.slice(0, 8).map(x => this._normTrainId(x)));
        const swapOut = Array.from(atEntrance).filter(id => !keep.has(id));
        const swapIn = ranked.filter(id => !atEntrance.has(this._normTrainId(id))).slice(0, Math.max(0, 8 - atEntrance.size + swapOut.length));

        // Propose exit movements for swapOut (destination to be decided by checks; placeholder Stabling)
        for (const id of swapOut) {
            const trainId = (mileage||[]).find(r => this._normTrainId(r.Train_ID)===id)?.Train_ID || id;
            const src = 'Muttom_Entrance';
            // Choose nearest stabling slot as placeholder
            const candidates = Array.from({length:13*2}, (_,i)=> `Muttom_Stb${String(Math.floor(i/2)+1).padStart(2,'0')}_S${(i%2)+1}`);
            let best = candidates[0]; let bestMin = Infinity;
            for (const c of candidates) {
                const g = await this.getMovementFromGeometry(src, c);
                if (g.durationMinutes < bestMin) { bestMin = g.durationMinutes; best = c; }
            }
            const p = await this.buildMovementProposal(trainId, src, best, 'Swap_Out');
            proposals.push({ type: 'entrance_swap_out', trainId, ...p });
        }
        // Propose entry movements for swapIn
        for (const id of swapIn) {
            const trainId = id;
            const src = await this.getCurrentLocation(trainId);
            const p = await this.buildMovementProposal(trainId, src || 'Muttom_Stb01_S1', 'Muttom_Entrance', 'Swap_In');
            proposals.push({ type: 'entrance_swap_in', trainId, ...p });
        }
        return proposals;
    }

    // --- Trip Scheduling Helpers (non-breaking scaffolding) ---
    // Normalize Train_ID for comparisons
    _normTrainId(id) {
        return (id || '').toString().trim().toLowerCase();
    }

    // Parse numeric strings like "12,345" safely
    _parseNumber(v, fallback = NaN) {
        if (v === undefined || v === null) return fallback;
        const s = String(v).replace(/[\s,]/g, '');
        const n = Number(s);
        return isNaN(n) ? fallback : n;
    }

    // Fitness: all certificates for Train_ID must have Status == 'Valid'
    async getEligibleByFitness(trainId) {
        const fitness = await this.getFitnessDataCached();
        const t = this._normTrainId(trainId);
        const rows = (fitness || []).filter(r => this._normTrainId(r.Train_ID) === t);
        if (rows.length === 0) {
            // Policy TBD: if no certificates, treat as not eligible
            return false;
        }
        return rows.every(r => (r.Status || '').toString().trim().toLowerCase() === 'valid');
    }

    // Job cards: true if any pending ('Open' or 'In Progress')
    async hasPendingJobCards(trainId) {
        const jobs = await this.getJobCardDataCached();
        const t = this._normTrainId(trainId);
        const PENDING = new Set(['open', 'in progress']);
        return (jobs || []).some(r => this._normTrainId(r.Train_ID) === t && PENDING.has((r.Status || '').toString().trim().toLowerCase()));
    }

    // Cleaning freshness: placeholder (policy to be defined: 3-day/30-day). Currently returns true.
    async isCleaningFresh(trainId, policy = { mode: 'placeholder' }) {
        // TODO: implement based on cleaning logs/sheets once rules are provided
        return true;
    }

    // Branding Remaining_Hours for a train: choose max across rows (assumption; adjustable)
    async getRemainingHoursForTrain(trainId) {
        const branding = await this.getBrandingDataCached();
        const t = this._normTrainId(trainId);
        let maxHours = 0;
        for (const r of (branding || [])) {
            if (this._normTrainId(r.Train_ID) === t) {
                const n = this._parseNumber(r.Remaining_Hours, NaN);
                if (!isNaN(n)) maxHours = Math.max(maxHours, n);
            }
        }
        return maxHours; // default 0 when none
    }

    // Mileage Total_KM for a train: use last occurrence value if duplicates exist
    async getTotalKmForTrain(trainId) {
        const mileage = await this.getMileageDataCached();
        const t = this._normTrainId(trainId);
        let km = Number.POSITIVE_INFINITY;
        for (let i = (mileage || []).length - 1; i >= 0; i--) {
            const r = mileage[i];
            if (this._normTrainId(r.Train_ID) === t) {
                const n = this._parseNumber(r.Total_KM, NaN);
                if (!isNaN(n)) km = n;
                break;
            }
        }
        return km;
    }

    // Rank trains for Entrance trips: default priority Remaining_Hours desc, then Total_KM asc
    async rankTrainsForEntranceTrip(trainIds, options = { priorityMode: 'brandingThenMileage' }) {
        const rows = [];
        for (const id of trainIds || []) {
            const [hours, km] = await Promise.all([
                this.getRemainingHoursForTrain(id),
                this.getTotalKmForTrain(id)
            ]);
            rows.push({ Train_ID: id, remainingHours: hours ?? 0, totalKm: isFinite(km) ? km : Number.POSITIVE_INFINITY });
        }
        const mode = options.priorityMode || 'brandingThenMileage';
        if (mode === 'mileageOnly') {
            rows.sort((a, b) => a.totalKm - b.totalKm || b.remainingHours - a.remainingHours);
        } else {
            rows.sort((a, b) => (b.remainingHours - a.remainingHours) || (a.totalKm - b.totalKm));
        }
        return rows.map(r => r.Train_ID);
    }

    // Limit daily trips to N (selection only)
    selectDailyTrips(sortedTrainIds, limit = 8) {
        return (sortedTrainIds || []).slice(0, Math.max(0, limit));
    }

    // Determine current location from last log entry for this train
    async getCurrentLocation(trainId) {
        const logs = await this.getLogsDataCached();
        const t = this._normTrainId(trainId);
        for (let i = (logs || []).length - 1; i >= 0; i--) {
            const r = logs[i];
            if (this._normTrainId(r.Train_ID) === t) {
                const dest = r.Destination || r.destination;
                return this.normalizeLocationName(dest || '');
            }
        }
        return '';
    }

    // Build a single log entry object for a trip to Entrance (does not save)
    async buildTripLogEntry(trainId, source, startTime, endTime, action = 'Trip') {
        const entry = {
            Train_ID: trainId,
            Source: this.normalizeLocationName(source),
            Destination: 'Muttom_Entrance',
            Start_Time: startTime,
            End_Time: endTime,
            Action: action
        };
        const validation = await this.validateLogRecord(entry);
        return { entry, validation };
    }

    // Plan Entrance trips for a set of trains (filter + rank + cap). Does not save.
    async planEntranceTrips(trainIds, options = { limit: 8, priorityMode: 'brandingThenMileage', cleaningPolicy: { mode: 'placeholder' } }) {
        // Step 1: eligibility filters
        const eligible = [];
        for (const id of trainIds || []) {
            const [fit, pending, fresh] = await Promise.all([
                this.getEligibleByFitness(id),
                this.hasPendingJobCards(id),
                this.isCleaningFresh(id, options.cleaningPolicy)
            ]);
            if (fit && !pending && fresh) eligible.push(id);
        }
        // Step 2: priority ranking
        const ranked = await this.rankTrainsForEntranceTrip(eligible, { priorityMode: options.priorityMode });
        // Step 3: daily cap
        const selected = this.selectDailyTrips(ranked, options.limit ?? 8);
        return { eligible, ranked, selected };
    }

    // Compute today's dwell at Entrance per train, return brandingAccumulations entries
    computeDailyBrandingAccumulations(logs, dayDate = new Date()) {
        const arr = Array.isArray(logs) ? logs.slice() : [];
        if (arr.length === 0) return [];
        // Sort by End_Time then Start_Time to process arrivals/departures
        const parse = (s) => this.parseDateTime(s);
        arr.sort((a,b)=> {
            const ae = parse(a.End_Time).getTime();
            const be = parse(b.End_Time).getTime();
            if (ae !== be) return ae - be;
            return parse(a.Start_Time).getTime() - parse(b.Start_Time).getTime();
        });
        const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0,0,0,0);
        const dayEnd = new Date(dayStart.getTime() + 24*60*60*1000);
        const normTrain = (id) => (id||'').toString().trim();
        const lastArrival = new Map(); // Train_ID -> Date (arrival at Entrance)
        const totalMs = new Map(); // Train_ID -> ms accumulated in day

        // Seed by scanning logs to find arrivals and departures
        for (let i=0;i<arr.length;i++) {
            const r = arr[i];
            const train = normTrain(r.Train_ID);
            const src = this.normalizeLocationName(r.Source);
            const dst = this.normalizeLocationName(r.Destination);
            const start = parse(r.Start_Time);
            const end = parse(r.End_Time);
            if (!train || isNaN(start) || isNaN(end)) continue;

            // Arrival to Entrance when Destination is Entrance
            if (dst === 'Muttom_Entrance') {
                // Consider arrival at end time
                const arrival = new Date(Math.max(dayStart.getTime(), end.getTime()));
                lastArrival.set(train, arrival);
            }
            // Departure when Source is Entrance
            if (src === 'Muttom_Entrance') {
                const depart = new Date(Math.min(dayEnd.getTime(), start.getTime()));
                const arrAt = lastArrival.get(train);
                if (arrAt) {
                    const a = Math.max(arrAt.getTime(), dayStart.getTime());
                    const d = Math.min(depart.getTime(), dayEnd.getTime());
                    if (d > a) {
                        const cur = totalMs.get(train) || 0;
                        totalMs.set(train, cur + (d - a));
                    }
                    lastArrival.delete(train);
                }
            }
        }
        // If still at Entrance at end of day, count until dayEnd
        for (const [train, arrAt] of lastArrival.entries()) {
            const a = Math.max(arrAt.getTime(), dayStart.getTime());
            const d = dayEnd.getTime();
            if (d > a) {
                const cur = totalMs.get(train) || 0;
                totalMs.set(train, cur + (d - a));
            }
        }
        // Convert ms to hours (2 decimals)
        const res = [];
        for (const [train, ms] of totalMs.entries()) {
            const hours = Math.round((ms / 3600000) * 100) / 100;
            if (hours > 0) res.push({ Train_ID: train, addHours: hours });
        }
        return res;
    }

    // Update branding row by Record_ID
    async updateBrandingData(recordId, updatedData) {
        if (!this.isServerAvailable) {
            throw new Error('Server not available. Please start the server with: npm start');
        }

        try {
            const payload = { Record_ID: recordId, ...updatedData };
            if (payload.Start_Date) payload.Start_Date = this.formatDateForSheets(payload.Start_Date);
            if (payload.End_Date) payload.End_Date = this.formatDateForSheets(payload.End_Date);

            const response = await fetch(`${this.serverURL}/data/branding`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to update branding data');
            }
            return result;
        } catch (error) {
            console.error('Error updating branding:', error);
            throw error;
        }
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

    // Helper function to convert any common date to m/dd/yyyy (no leading zero on month, day zero-padded)
    formatDateForSheets(dateStr) {
        if (!dateStr || dateStr === '') return '';

        const trim = String(dateStr).trim();

        // If already contains slashes, normalize to m/dd/yyyy
        if (trim.includes('/')) {
            const parts = trim.split('/');
            if (parts.length === 3) {
                const [m, d, y] = parts;
                const monthNum = Math.max(1, Math.min(12, parseInt(m, 10) || 0));
                const dayNum = Math.max(1, Math.min(31, parseInt(d, 10) || 0));
                const yearNum = parseInt(y, 10) || y; // keep as-is if non-numeric
                return `${monthNum}/${String(dayNum).padStart(2, '0')}/${yearNum}`;
            }
            // Fallback: return original if unexpected shape
            return trim;
        }

        // Convert YYYY-MM-DD to m/dd/yyyy
        if (/^\d{4}-\d{2}-\d{2}$/.test(trim)) {
            const [year, month, day] = trim.split('-');
            const monthNum = parseInt(month, 10); // drops leading zero
            const dayNum = parseInt(day, 10);
            return `${monthNum}/${String(dayNum).padStart(2, '0')}/${year}`;
        }

        // Try Date parsing as a last resort
        const dt = new Date(trim);
        if (!isNaN(dt.getTime())) {
            const m = dt.getMonth() + 1; // 1-12
            const d = dt.getDate();
            const y = dt.getFullYear();
            return `${m}/${String(d).padStart(2, '0')}/${y}`;
        }

        return trim;
    }

    async saveFitnessData(data) {
        try {
            // Format dates to match Google Sheets format (M/D/YYYY)
            const formattedData = { ...data };
            if (formattedData.Issued_Date) {
                formattedData.Issued_Date = this.formatDateForSheets(formattedData.Issued_Date);
            }
            if (formattedData.Expiry_Date) {
                formattedData.Expiry_Date = this.formatDateForSheets(formattedData.Expiry_Date);
            }
            if (formattedData['Expected_Date_Of_Delivery(EDD)']) {
                formattedData['Expected_Date_Of_Delivery(EDD)'] = this.formatDateForSheets(formattedData['Expected_Date_Of_Delivery(EDD)']);
            }
            
            // Use PUT endpoint to handle both updates and new records
            const response = await fetch(`${this.serverURL}/data/fitness_certificates`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formattedData)
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