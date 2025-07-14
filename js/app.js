/**
 * Main Application Controller
 * Orchestrates the Octopus Agile Dashboard functionality
 */

class AgileApp {
    constructor() {
        // Initialize core services
        this.api = new OctopusAPI();
        this.processor = new DataProcessor();
        this.storage = new StorageManager();
        
        // Application state
        this.currentData = null;
        this.isOnline = navigator.onLine;
        this.refreshInterval = null;
        this.selectedDuration = 1.5; // Default to washing machine duration
        
        // DOM elements
        this.elements = {};
        
        // Initialize the application
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('Agile App: Initializing...');
            
            // Cache DOM elements
            this.cacheElements();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadData();
            
            // Hide loading screen and show app
            this.hideLoadingScreen();
            
            // Set up auto-refresh
            this.setupAutoRefresh();
            
            console.log('Agile App: Initialization complete');
        } catch (error) {
            console.error('Agile App: Initialization failed', error);
            this.showError('Failed to initialize app', error.message);
            this.hideLoadingScreen();
        }
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            // Loading and error states
            loadingScreen: document.getElementById('loading-screen'),
            app: document.getElementById('app'),
            errorMessage: document.getElementById('error-message'),
            errorText: document.getElementById('error-text'),
            retryBtn: document.getElementById('retry-btn'),
            
            // Header elements
            currentRegion: document.getElementById('current-region'),
            regionBtn: document.getElementById('region-btn'),
            regionModal: document.getElementById('region-modal'),
            regionGrid: document.getElementById('region-grid'),
            closeModal: document.getElementById('close-modal'),
            
            // Status card elements
            currentStatus: document.getElementById('current-status'),
            statusIcon: document.getElementById('status-icon'),
            statusText: document.getElementById('status-text'),
            currentPrice: document.getElementById('current-price'),
            timeRemaining: document.getElementById('time-remaining'),
            
            // Delay helper elements
            delayRecommendation: document.getElementById('delay-recommendation'),
            presetBtns: document.querySelectorAll('.preset-btn'),
            
            // Decision panels
            bestTimes: document.getElementById('best-times'),
            avoidTimes: document.getElementById('avoid-times'),
            
            // Timeline elements
            priceTimeline: document.getElementById('price-timeline'),
            
            // Stats elements
            priceRange: document.getElementById('price-range'),
            averagePrice: document.getElementById('average-price'),
            currentRank: document.getElementById('current-rank'),
            
            // Footer elements
            lastUpdated: document.getElementById('last-updated'),
            refreshBtn: document.getElementById('refresh-btn'),
            
            // Offline indicator
            offlineIndicator: document.getElementById('offline-indicator')
        };
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Retry button
        this.elements.retryBtn?.addEventListener('click', () => this.loadData());
        
        // Region selection
        this.elements.regionBtn?.addEventListener('click', () => this.showRegionModal());
        this.elements.closeModal?.addEventListener('click', () => this.hideRegionModal());
        
        // Device preset buttons
        this.elements.presetBtns?.forEach(btn => {
            btn.addEventListener('click', () => {
                const duration = parseFloat(btn.dataset.duration);
                this.selectDuration(duration);
            });
        });
        
        // Refresh button
        this.elements.refreshBtn?.addEventListener('click', () => this.loadData(true));
        
        // Online/offline status
        window.addEventListener('online', () => this.handleOnlineStatus(true));
        window.addEventListener('offline', () => this.handleOnlineStatus(false));
        
        // Visibility change (refresh when app becomes visible)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isOnline) {
                this.loadData();
            }
        });
        
        // Modal backdrop clicks
        this.elements.regionModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.regionModal) {
                this.hideRegionModal();
            }
        });
    }

    /**
     * Load pricing data
     */
    async loadData(forceRefresh = false) {
        try {
            console.log('Agile App: Loading data...');
            this.hideError();
            
            const region = this.storage.getRegion();
            const today = new Date();
            
            let rates = null;
            
            // Try cache first (unless force refresh)
            if (!forceRefresh) {
                rates = this.storage.getCachedRates(region, today);
                if (rates) {
                    console.log('Agile App: Using cached data');
                }
            }
            
            // Fetch from API if no cache or force refresh
            if (!rates && this.isOnline) {
                console.log('Agile App: Fetching from API...');
                try {
                    // Try today first
                    rates = await this.api.fetchAgileRates(region, today);
                    console.log('Agile App: API response for today:', rates ? `${rates.length} rates` : 'null/undefined');
                    
                    // If today returns no data, try yesterday
                    if (!rates || rates.length === 0) {
                        console.log('Agile App: No data for today, trying yesterday...');
                        const yesterday = new Date(today);
                        yesterday.setDate(yesterday.getDate() - 1);
                        
                        rates = await this.api.fetchAgileRates(region, yesterday);
                        console.log('Agile App: API response for yesterday:', rates ? `${rates.length} rates` : 'null/undefined');
                        
                        if (rates && rates.length > 0) {
                            this.storage.setCachedRates(region, yesterday, rates);
                            console.log('Agile App: Using yesterday\'s data as fallback');
                        }
                    } else if (rates && rates.length > 0) {
                        this.storage.setCachedRates(region, today, rates);
                    }
                    
                    if (!rates || rates.length === 0) {
                        console.warn('Agile App: API returned empty data for both today and yesterday');
                    }
                } catch (apiError) {
                    console.error('Agile App: API call failed:', apiError);
                    rates = null;
                }
            }
            
            // Fall back to offline data
            if (!rates || rates.length === 0) {
                console.log('Agile App: Using offline fallback');
                rates = this.storage.getOfflineFallback();
                
                if (!rates || rates.length === 0) {
                    throw new Error('No pricing data available. Please check your internet connection and try again.');
                }
                
                this.showOfflineIndicator();
            }
            
            // Validate data before processing
            if (!Array.isArray(rates) || rates.length === 0) {
                throw new Error('Invalid pricing data format received');
            }
            
            console.log('Agile App: Processing', rates.length, 'rate periods');
            
            // Process and display the data
            this.currentData = this.processor.analyzeRates(rates);
            this.updateUI();
            
            // Update last updated time
            this.updateLastUpdated();
            
        } catch (error) {
            console.error('Agile App: Failed to load data', error);
            this.showError('Unable to load pricing data', error.message);
        }
    }

    /**
     * Update the user interface with current data
     */
    updateUI() {
        if (!this.currentData) return;
        
        try {
            // Update current status
            this.updateCurrentStatus();
            
            // Update delay recommendation
            this.updateDelayRecommendation();
            
            // Update decision panels
            this.updateDecisionPanels();
            
            // Update timeline
            this.updateTimeline();
            
            // Update statistics
            this.updateStatistics();
            
            // Update region display
            this.updateRegionDisplay();
            
        } catch (error) {
            console.error('Agile App: Failed to update UI', error);
        }
    }

    /**
     * Update current status card
     */
    updateCurrentStatus() {
        const currentStatus = this.processor.getCurrentSlotStatus(
            this.currentData.allSlots.map(slot => ({
                value_inc_vat: slot.value_inc_vat,
                valid_from: slot.valid_from,
                valid_to: slot.valid_to
            }))
        );
        
        if (currentStatus && currentStatus.statusDisplay) {
            // Update status icon and text
            this.elements.statusIcon.textContent = currentStatus.statusDisplay.icon;
            this.elements.statusText.textContent = currentStatus.statusDisplay.text;
            
            // Update price
            this.elements.currentPrice.textContent = currentStatus.value_inc_vat?.toFixed(1) || '--.-';
            
            // Update time remaining
            if (currentStatus.timeRemaining !== undefined) {
                this.elements.timeRemaining.textContent = 
                    `${currentStatus.timeRemaining} minutes remaining`;
            }
            
            // Update status card styling
            this.elements.currentStatus.className = `status-card ${currentStatus.status}`;
        }
    }

    /**
     * Update delay recommendation
     */
    updateDelayRecommendation() {
        const recommendation = this.processor.calculateDelayRecommendation(
            this.currentData.allSlots.map(slot => ({
                value_inc_vat: slot.value_inc_vat,
                valid_from: slot.valid_from,
                valid_to: slot.valid_to
            })),
            new Date(),
            this.selectedDuration
        );
        
        if (recommendation.delayHours !== undefined && recommendation.delayHours > 0) {
            const savingsText = recommendation.savings > 0 ? 
                ` (save ${recommendation.savings.toFixed(1)}p)` : '';
            
            this.elements.delayRecommendation.innerHTML = `
                <strong>${recommendation.recommendation}</strong><br>
                Next cheap slot: ${recommendation.timeSlot}${savingsText}
            `;
        } else {
            this.elements.delayRecommendation.textContent = 'Use electricity now - good price!';
        }
    }

    /**
     * Update decision panels (best/worst times)
     */
    updateDecisionPanels() {
        // Update best times
        this.elements.bestTimes.innerHTML = '';
        this.currentData.cheapestSlots.slice(0, 5).forEach(slot => {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot cheap';
            timeSlot.innerHTML = `
                <span class="slot-time">${slot.timeSlot}</span>
                <span class="slot-price cheap">${slot.value_inc_vat.toFixed(1)}p</span>
            `;
            this.elements.bestTimes.appendChild(timeSlot);
        });
        
        // Update avoid times
        this.elements.avoidTimes.innerHTML = '';
        this.currentData.mostExpensiveSlots.slice(0, 5).forEach(slot => {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot expensive';
            timeSlot.innerHTML = `
                <span class="slot-time">${slot.timeSlot}</span>
                <span class="slot-price expensive">${slot.value_inc_vat.toFixed(1)}p</span>
            `;
            this.elements.avoidTimes.appendChild(timeSlot);
        });
    }

    /**
     * Update price timeline visualization
     */
    updateTimeline() {
        this.elements.priceTimeline.innerHTML = '';
        
        const currentTime = new Date();
        
        this.currentData.allSlots.forEach(slot => {
            const bar = document.createElement('div');
            bar.className = `timeline-bar ${slot.category}`;
            
            // Check if this is the current time slot
            const validFrom = new Date(slot.valid_from);
            const validTo = new Date(slot.valid_to);
            if (currentTime >= validFrom && currentTime < validTo) {
                bar.classList.add('current');
            }
            
            // Add click handler for price details
            bar.addEventListener('click', () => {
                alert(`${slot.timeSlot}\n${slot.value_inc_vat.toFixed(1)}p/kWh`);
            });
            
            bar.title = `${slot.timeSlot}: ${slot.value_inc_vat.toFixed(1)}p`;
            
            this.elements.priceTimeline.appendChild(bar);
        });
    }

    /**
     * Update statistics section
     */
    updateStatistics() {
        const stats = this.currentData.statistics;
        
        this.elements.priceRange.textContent = 
            `${stats.minPrice.toFixed(1)}p - ${stats.maxPrice.toFixed(1)}p`;
        
        this.elements.averagePrice.textContent = 
            `${stats.avgPrice.toFixed(1)}p`;
        
        // Calculate current price rank
        const currentStatus = this.processor.getCurrentSlotStatus(
            this.currentData.allSlots.map(slot => ({
                value_inc_vat: slot.value_inc_vat,
                valid_from: slot.valid_from,
                valid_to: slot.valid_to
            }))
        );
        
        if (currentStatus) {
            const sortedPrices = this.currentData.allSlots
                .map(slot => slot.value_inc_vat)
                .sort((a, b) => a - b);
            
            const rank = sortedPrices.indexOf(currentStatus.value_inc_vat) + 1;
            this.elements.currentRank.textContent = `${rank}/48`;
        }
    }

    /**
     * Update region display
     */
    updateRegionDisplay() {
        const region = this.storage.getRegion();
        this.elements.currentRegion.textContent = region;
    }

    /**
     * Select device duration preset
     */
    selectDuration(duration) {
        this.selectedDuration = duration;
        
        // Update button states
        this.elements.presetBtns.forEach(btn => {
            btn.classList.remove('active');
            if (parseFloat(btn.dataset.duration) === duration) {
                btn.classList.add('active');
            }
        });
        
        // Update delay recommendation
        this.updateDelayRecommendation();
    }

    /**
     * Show region selection modal
     */
    showRegionModal() {
        const regions = this.api.getRegions();
        const currentRegion = this.storage.getRegion();
        
        this.elements.regionGrid.innerHTML = '';
        
        Object.entries(regions).forEach(([code, name]) => {
            const option = document.createElement('div');
            option.className = `region-option ${code === currentRegion ? 'selected' : ''}`;
            option.innerHTML = `
                <span class="region-code">${code}</span>
                <span class="region-name">${name}</span>
            `;
            
            option.addEventListener('click', () => {
                this.selectRegion(code);
                this.hideRegionModal();
            });
            
            this.elements.regionGrid.appendChild(option);
        });
        
        this.elements.regionModal.style.display = 'flex';
    }

    /**
     * Hide region selection modal
     */
    hideRegionModal() {
        this.elements.regionModal.style.display = 'none';
    }

    /**
     * Select a new region
     */
    async selectRegion(region) {
        try {
            this.storage.setRegion(region);
            this.updateRegionDisplay();
            await this.loadData(true); // Force refresh for new region
        } catch (error) {
            console.error('Agile App: Failed to select region', error);
            this.showError('Failed to change region', error.message);
        }
    }

    /**
     * Handle online/offline status changes
     */
    handleOnlineStatus(isOnline) {
        this.isOnline = isOnline;
        
        if (isOnline) {
            this.hideOfflineIndicator();
            this.loadData(); // Refresh data when back online
        } else {
            this.showOfflineIndicator();
        }
    }

    /**
     * Set up auto-refresh interval
     */
    setupAutoRefresh() {
        // Refresh every 30 minutes
        this.refreshInterval = setInterval(() => {
            if (this.isOnline && !document.hidden) {
                this.loadData();
            }
        }, 30 * 60 * 1000);
    }

    /**
     * Update last updated timestamp
     */
    updateLastUpdated() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        this.elements.lastUpdated.textContent = `Last updated: ${timeString}`;
    }

    /**
     * Show error message
     */
    showError(title, message) {
        this.elements.errorText.textContent = `${title}: ${message}`;
        this.elements.errorMessage.style.display = 'block';
    }

    /**
     * Hide error message
     */
    hideError() {
        this.elements.errorMessage.style.display = 'none';
    }

    /**
     * Hide loading screen and show app
     */
    hideLoadingScreen() {
        this.elements.loadingScreen.style.display = 'none';
        this.elements.app.style.display = 'flex';
    }

    /**
     * Show offline indicator
     */
    showOfflineIndicator() {
        this.elements.offlineIndicator.style.display = 'flex';
    }

    /**
     * Hide offline indicator
     */
    hideOfflineIndicator() {
        this.elements.offlineIndicator.style.display = 'none';
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.agileApp = new AgileApp();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.agileApp) {
        window.agileApp.destroy();
    }
});