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
            
            // Region selection
            currentRegion: document.getElementById('current-region'),
            regionBtn: document.getElementById('region-btn'),
            regionModal: document.getElementById('region-modal'),
            regionGrid: document.getElementById('region-grid'),
            closeModal: document.getElementById('close-modal'),
            
            // Main card elements
            currentStatus: document.getElementById('current-status'),
            statusIcon: document.getElementById('status-icon'),
            statusText: document.getElementById('status-text'),
            currentPrice: document.getElementById('current-price'),
            timeRemaining: document.getElementById('time-remaining'),
            
            // Recommendation section
            recommendationText: document.getElementById('recommendation-text'),
            
            // Details section
            priceRange: document.getElementById('price-range'),
            nextCheap: document.getElementById('next-cheap'),
            
            // Footer
            lastUpdated: document.getElementById('last-updated'),
            refreshBtn: document.getElementById('refresh-btn')
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
                    rates = await this.api.fetchAgileRates(region, today);
                    console.log('Agile App: API response for today:', rates ? `${rates.length} rates` : 'null/undefined');
                    
                    if (rates && rates.length > 0) {
                        this.storage.setCachedRates(region, today, rates);
                    } else {
                        console.warn('Agile App: No current pricing data available');
                        throw new Error('Today\'s pricing data is not available yet. Rates are typically published around 4-8pm the day before.');
                    }
                } catch (apiError) {
                    console.error('Agile App: API call failed:', apiError);
                    throw apiError;
                }
            }
            
            // Check if we have valid current data
            if (!rates || rates.length === 0) {
                throw new Error('No current pricing data available. Please try again later when today\'s rates are published.');
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
            
            // Update recommendation
            this.updateRecommendation();
            
            // Update details section
            this.updateDetails();
            
            // Update region display
            this.updateRegionDisplay();
            
        } catch (error) {
            console.error('Agile App: Failed to update UI', error);
        }
    }

    /**
     * Update current status section
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
            
            // Update status section styling
            this.elements.currentStatus.className = `status-section ${currentStatus.status}`;
        }
    }

    /**
     * Update recommendation section
     */
    updateRecommendation() {
        const recommendation = this.processor.calculateDelayRecommendation(
            this.currentData.allSlots.map(slot => ({
                value_inc_vat: slot.value_inc_vat,
                valid_from: slot.valid_from,
                valid_to: slot.valid_to
            })),
            new Date(),
            2 // Default 2-hour duration
        );
        
        if (recommendation.delayHours !== undefined && recommendation.delayHours > 0) {
            const savingsText = recommendation.savings > 0 ? 
                ` (save ${recommendation.savings.toFixed(1)}p)` : '';
            
            this.elements.recommendationText.textContent = 
                `Wait ${recommendation.delayHours}h for cheaper rate${savingsText}`;
        } else {
            this.elements.recommendationText.textContent = 'Use electricity now - good price!';
        }
    }

    /**
     * Update details section (expandable)
     */
    updateDetails() {
        const stats = this.currentData.statistics;
        
        // Update price range
        this.elements.priceRange.textContent = 
            `${stats.minPrice.toFixed(1)}p - ${stats.maxPrice.toFixed(1)}p`;
        
        // Get future cheap slots only
        const currentTime = new Date();
        const futureSlots = this.currentData.cheapestSlots.filter(slot => {
            const slotTime = new Date(slot.valid_from);
            return slotTime > currentTime;
        }).slice(0, 3); // Show next 3 cheap slots
        
        if (futureSlots.length > 0) {
            this.elements.nextCheap.innerHTML = futureSlots.map(slot => 
                `${slot.timeSlot} (${slot.value_inc_vat.toFixed(1)}p)`
            ).join(', ');
        } else {
            this.elements.nextCheap.textContent = 'No more cheap slots today';
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