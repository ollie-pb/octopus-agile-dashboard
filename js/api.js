/**
 * Octopus Energy API Client
 * Handles fetching Agile tariff pricing data
 */

class OctopusAPI {
    constructor() {
        this.baseURL = 'https://api.octopus.energy/v1';
        this.agileProduct = 'AGILE-24-10-01';  // Updated to current Agile product
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
    }

    /**
     * Fetch Agile rates for a specific region and date
     * @param {string} region - Regional code (A-P, e.g., 'C' for London)
     * @param {Date} date - Date to fetch rates for (defaults to today)
     * @returns {Promise<Array>} Array of rate objects
     */
    async fetchAgileRates(region = 'C', date = new Date()) {
        const tariffCode = `E-1R-${this.agileProduct}-${region.toUpperCase()}`;
        
        // Calculate date range for the specified day (00:00 to 23:59 UTC)
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const params = new URLSearchParams({
            period_from: startOfDay.toISOString(),
            period_to: endOfDay.toISOString(),
            page_size: '48' // 48 half-hourly periods in a day
        });

        const url = `${this.baseURL}/products/${this.agileProduct}/electricity-tariffs/${tariffCode}/standard-unit-rates/?${params}`;

        console.log('API: Making request to:', url);
        console.log('API: Date range:', startOfDay.toISOString(), 'to', endOfDay.toISOString());

        return this.makeRequestWithRetry(url);
    }

    /**
     * Make HTTP request with retry logic
     * @param {string} url - URL to fetch
     * @param {number} attempt - Current attempt number
     * @returns {Promise<Array>} API response data
     */
    async makeRequestWithRetry(url, attempt = 1) {
        try {
            const response = await fetch(url);
            
            console.log('API: Response status:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API: Error response body:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            console.log('API: Response data structure:', {
                hasResults: !!data.results,
                isArray: Array.isArray(data.results),
                count: data.count || 'unknown',
                resultsLength: data.results ? data.results.length : 'no results'
            });
            
            if (!data.results || !Array.isArray(data.results)) {
                console.error('API: Invalid response format:', data);
                throw new Error('Invalid API response format');
            }

            console.log('API: Successfully fetched', data.results.length, 'rate periods');
            return data.results;
        } catch (error) {
            console.error(`API request attempt ${attempt} failed:`, error.message);
            
            if (attempt < this.maxRetries) {
                await this.delay(this.retryDelay * attempt);
                return this.makeRequestWithRetry(url, attempt + 1);
            }
            
            throw new Error(`Failed to fetch rates after ${this.maxRetries} attempts: ${error.message}`);
        }
    }

    /**
     * Utility function to delay execution
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get available regions
     * @returns {Object} Region codes and their descriptions
     */
    getRegions() {
        return {
            'A': 'Eastern England',
            'B': 'East Midlands', 
            'C': 'London',
            'D': 'Merseyside and Northern Wales',
            'E': 'West Midlands',
            'F': 'North Eastern England',
            'G': 'North Western England',
            'H': 'Southern England',
            'J': 'South Eastern England',
            'K': 'South Western England',
            'L': 'South Wales',
            'M': 'Yorkshire',
            'N': 'South Scotland',
            'P': 'North Scotland'
        };
    }

    /**
     * Validate region code
     * @param {string} region - Region code to validate
     * @returns {boolean} True if valid region code
     */
    isValidRegion(region) {
        const regions = this.getRegions();
        return region && regions.hasOwnProperty(region.toUpperCase());
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OctopusAPI;
} else if (typeof window !== 'undefined') {
    window.OctopusAPI = OctopusAPI;
}