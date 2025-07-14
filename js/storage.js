/**
 * Local Storage and Caching Manager
 * Handles user preferences and data caching
 */

class StorageManager {
    constructor() {
        this.keys = {
            region: 'octopus_agile_region',
            rates_cache: 'octopus_agile_rates_cache',
            last_updated: 'octopus_agile_last_updated'
        };
        
        this.cacheExpiryHours = 1; // Cache expires after 1 hour
    }

    /**
     * Get stored region preference
     * @returns {string|null} Region code or null if not set
     */
    getRegion() {
        try {
            return localStorage.getItem(this.keys.region) || 'C'; // Default to London
        } catch (error) {
            console.warn('Failed to get region from localStorage:', error);
            return 'C';
        }
    }

    /**
     * Set region preference
     * @param {string} region - Region code (A-P)
     */
    setRegion(region) {
        try {
            if (this.isValidRegion(region)) {
                localStorage.setItem(this.keys.region, region.toUpperCase());
                // Clear cache when region changes
                this.clearRatesCache();
            } else {
                throw new Error('Invalid region code');
            }
        } catch (error) {
            console.error('Failed to set region:', error);
        }
    }

    /**
     * Get cached rates data
     * @param {string} region - Region code
     * @param {Date} date - Date for rates
     * @returns {Array|null} Cached rates or null if expired/not found
     */
    getCachedRates(region, date = new Date()) {
        try {
            const cacheKey = this.generateCacheKey(region, date);
            const cachedData = localStorage.getItem(cacheKey);
            
            if (!cachedData) {
                return null;
            }

            const parsed = JSON.parse(cachedData);
            
            // Check if cache is expired
            if (this.isCacheExpired(parsed.timestamp)) {
                this.removeCachedRates(region, date);
                return null;
            }

            return parsed.rates;
        } catch (error) {
            console.warn('Failed to get cached rates:', error);
            return null;
        }
    }

    /**
     * Cache rates data
     * @param {string} region - Region code
     * @param {Date} date - Date for rates
     * @param {Array} rates - Rates data to cache
     */
    setCachedRates(region, date = new Date(), rates) {
        try {
            const cacheKey = this.generateCacheKey(region, date);
            const cacheData = {
                rates: rates,
                timestamp: Date.now(),
                region: region,
                date: date.toDateString()
            };

            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            
            // Update last updated timestamp
            localStorage.setItem(this.keys.last_updated, Date.now().toString());
            
            // Clean old cache entries
            this.cleanOldCache();
        } catch (error) {
            console.error('Failed to cache rates:', error);
            // If storage is full, try clearing old cache and retry
            if (error.name === 'QuotaExceededError') {
                this.cleanOldCache();
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                } catch (retryError) {
                    console.error('Failed to cache rates after cleanup:', retryError);
                }
            }
        }
    }

    /**
     * Remove cached rates for specific region and date
     * @param {string} region - Region code
     * @param {Date} date - Date for rates
     */
    removeCachedRates(region, date = new Date()) {
        try {
            const cacheKey = this.generateCacheKey(region, date);
            localStorage.removeItem(cacheKey);
        } catch (error) {
            console.warn('Failed to remove cached rates:', error);
        }
    }

    /**
     * Clear all cached rates data
     */
    clearRatesCache() {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('octopus_rates_')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.warn('Failed to clear rates cache:', error);
        }
    }

    /**
     * Get offline fallback data (last successful fetch)
     * @returns {Object|null} Last cached data or null
     */
    getOfflineFallback() {
        try {
            const region = this.getRegion();
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            // Try today's cache first, then yesterday's
            return this.getCachedRates(region, today) || 
                   this.getCachedRates(region, yesterday);
        } catch (error) {
            console.warn('Failed to get offline fallback:', error);
            return null;
        }
    }

    /**
     * Generate cache key for rates data
     * @param {string} region - Region code
     * @param {Date} date - Date for rates
     * @returns {string} Cache key
     */
    generateCacheKey(region, date) {
        const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
        return `octopus_rates_${region}_${dateString}`;
    }

    /**
     * Check if cache is expired
     * @param {number} timestamp - Cache timestamp
     * @returns {boolean} True if expired
     */
    isCacheExpired(timestamp) {
        const now = Date.now();
        const expiryTime = this.cacheExpiryHours * 60 * 60 * 1000; // Convert to milliseconds
        return (now - timestamp) > expiryTime;
    }

    /**
     * Clean old cache entries
     */
    cleanOldCache() {
        try {
            const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
            
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('octopus_rates_')) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        if (data.timestamp < cutoffTime) {
                            localStorage.removeItem(key);
                        }
                    } catch (error) {
                        // Remove corrupted cache entries
                        localStorage.removeItem(key);
                    }
                }
            });
        } catch (error) {
            console.warn('Failed to clean old cache:', error);
        }
    }

    /**
     * Validate region code
     * @param {string} region - Region code to validate
     * @returns {boolean} True if valid
     */
    isValidRegion(region) {
        const validRegions = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P'];
        return validRegions.includes(region?.toUpperCase());
    }

    /**
     * Get storage usage info
     * @returns {Object} Storage usage statistics
     */
    getStorageInfo() {
        try {
            let totalSize = 0;
            let octopusSize = 0;
            let cacheEntries = 0;

            Object.keys(localStorage).forEach(key => {
                const value = localStorage.getItem(key);
                const size = new Blob([value]).size;
                totalSize += size;
                
                if (key.startsWith('octopus_')) {
                    octopusSize += size;
                    if (key.startsWith('octopus_rates_')) {
                        cacheEntries++;
                    }
                }
            });

            return {
                totalSize: Math.round(totalSize / 1024), // KB
                octopusSize: Math.round(octopusSize / 1024), // KB
                cacheEntries: cacheEntries,
                region: this.getRegion()
            };
        } catch (error) {
            console.warn('Failed to get storage info:', error);
            return { error: error.message };
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
} else if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}