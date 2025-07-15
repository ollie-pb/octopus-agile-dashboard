/**
 * Data Processing Functions
 * Analyzes Octopus Agile pricing data to provide smart recommendations
 */

class DataProcessor {
    constructor() {
        this.priceThresholds = {
            cheap: 0.15,    // Below 15p is considered cheap
            expensive: 0.30  // Above 30p is considered expensive
        };
    }

    /**
     * Analyze rates to identify cheapest and most expensive periods
     * @param {Array} rates - Array of rate objects from API
     * @returns {Object} Analysis results
     */
    analyzeRates(rates) {
        if (!rates || rates.length === 0) {
            throw new Error('No rates data provided');
        }

        // Sort rates by price
        const sortedByPrice = [...rates].sort((a, b) => a.value_inc_vat - b.value_inc_vat);
        
        // Get cheapest and most expensive periods
        const cheapestSlots = sortedByPrice.slice(0, 5);
        const mostExpensiveSlots = sortedByPrice.slice(-5).reverse();

        // Calculate statistics
        const prices = rates.map(rate => rate.value_inc_vat);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

        // Categorize all slots
        const categorizedSlots = rates.map(rate => ({
            ...rate,
            category: this.categorizePrice(rate.value_inc_vat, minPrice, maxPrice),
            localTime: this.convertToLocalTime(rate.valid_from),
            timeSlot: this.formatTimeSlot(rate.valid_from, rate.valid_to)
        }));

        return {
            cheapestSlots: cheapestSlots.map(slot => ({
                ...slot,
                localTime: this.convertToLocalTime(slot.valid_from),
                timeSlot: this.formatTimeSlot(slot.valid_from, slot.valid_to)
            })),
            mostExpensiveSlots: mostExpensiveSlots.map(slot => ({
                ...slot,
                localTime: this.convertToLocalTime(slot.valid_from),
                timeSlot: this.formatTimeSlot(slot.valid_from, slot.valid_to)
            })),
            statistics: {
                minPrice: minPrice,
                maxPrice: maxPrice,
                avgPrice: Math.round(avgPrice * 100) / 100,
                priceRange: Math.round((maxPrice - minPrice) * 100) / 100
            },
            allSlots: categorizedSlots
        };
    }

    /**
     * Get current time slot status
     * @param {Array} rates - Array of rate objects
     * @param {Date} currentTime - Current time (defaults to now)
     * @returns {Object} Current slot information
     */
    getCurrentSlotStatus(rates, currentTime = new Date()) {
        if (!rates || rates.length === 0) {
            return { status: 'unknown', message: 'No data available' };
        }

        const currentSlot = rates.find(rate => {
            const validFrom = new Date(rate.valid_from);
            const validTo = new Date(rate.valid_to);
            return currentTime >= validFrom && currentTime < validTo;
        });

        if (!currentSlot) {
            return { status: 'unknown', message: 'Current time slot not found' };
        }

        // Calculate time remaining in current slot
        const validTo = new Date(currentSlot.valid_to);
        const timeRemaining = Math.max(0, validTo - currentTime);
        const minutesRemaining = Math.floor(timeRemaining / (1000 * 60));

        // Determine status based on price
        const analysis = this.analyzeRates(rates);
        const category = this.categorizePrice(
            currentSlot.value_inc_vat, 
            analysis.statistics.minPrice, 
            analysis.statistics.maxPrice
        );

        const statusMap = {
            cheap: { icon: '🌱', text: 'GREAT TIME', color: 'green' },
            medium: { icon: '⚡', text: 'OK TIME', color: 'amber' },
            expensive: { icon: '🔥', text: 'AVOID NOW', color: 'red' }
        };

        return {
            ...currentSlot,
            status: category,
            statusDisplay: statusMap[category],
            timeRemaining: minutesRemaining,
            localTime: this.convertToLocalTime(currentSlot.valid_from),
            timeSlot: this.formatTimeSlot(currentSlot.valid_from, currentSlot.valid_to)
        };
    }

    /**
     * Calculate delay recommendation for optimal pricing
     * @param {Array} rates - Array of rate objects
     * @param {Date} currentTime - Current time
     * @param {number} durationHours - Duration device will run (in hours)
     * @returns {Object} Delay recommendation
     */
    calculateDelayRecommendation(rates, currentTime = new Date(), durationHours = 1) {
        if (!rates || rates.length === 0) {
            return { recommendation: 'No data available' };
        }

        const analysis = this.analyzeRates(rates);
        const currentPrice = this.getCurrentSlotStatus(rates, currentTime).value_inc_vat || 0;

        // Find the next cheap slot after current time
        const futureSlots = rates.filter(rate => new Date(rate.valid_from) > currentTime);
        const cheapFutureSlots = futureSlots
            .filter(rate => rate.value_inc_vat <= analysis.statistics.minPrice + 0.05) // Within 5p of minimum
            .sort((a, b) => new Date(a.valid_from) - new Date(b.valid_from));

        if (cheapFutureSlots.length === 0) {
            return { 
                recommendation: 'No cheaper slots found today',
                currentPrice: currentPrice
            };
        }

        const nextCheapSlot = cheapFutureSlots[0];
        const delayUntil = new Date(nextCheapSlot.valid_from);
        const delayHours = (delayUntil - currentTime) / (1000 * 60 * 60);
        const savings = (currentPrice - nextCheapSlot.value_inc_vat) * durationHours;

        return {
            recommendation: `Start in ${Math.round(delayHours * 10) / 10} hours`,
            delayUntil: this.convertToLocalTime(nextCheapSlot.valid_from),
            currentPrice: currentPrice,
            recommendedPrice: nextCheapSlot.value_inc_vat,
            savings: Math.round(savings * 100) / 100,
            delayHours: Math.round(delayHours * 10) / 10,
            timeSlot: this.formatTimeSlot(nextCheapSlot.valid_from, nextCheapSlot.valid_to)
        };
    }

    /**
     * Categorize price based on thresholds and context
     * @param {number} price - Price in pence
     * @param {number} minPrice - Minimum price for the day
     * @param {number} maxPrice - Maximum price for the day
     * @returns {string} Category: 'cheap', 'medium', or 'expensive'
     */
    categorizePrice(price, minPrice, maxPrice) {
        const priceRange = maxPrice - minPrice;
        const lowThreshold = minPrice + (priceRange * 0.3);
        const highThreshold = minPrice + (priceRange * 0.7);

        if (price <= lowThreshold) return 'cheap';
        if (price >= highThreshold) return 'expensive';
        return 'medium';
    }

    /**
     * Convert UTC time to local time
     * @param {string} utcTimeString - UTC time string
     * @returns {Date} Local time
     */
    convertToLocalTime(utcTimeString) {
        return new Date(utcTimeString);
    }

    /**
     * Format time slot for display
     * @param {string} validFrom - Start time
     * @param {string} validTo - End time
     * @returns {string} Formatted time slot
     */
    formatTimeSlot(validFrom, validTo) {
        const start = new Date(validFrom);
        const end = new Date(validTo);
        
        const formatTime = (date) => {
            return date.toLocaleTimeString('en-GB', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            });
        };

        return `${formatTime(start)}-${formatTime(end)}`;
    }

    /**
     * Get device presets for delay calculations
     * @returns {Object} Device presets with typical durations
     */
    getDevicePresets() {
        return {
            'dishwasher': { name: 'Dishwasher', duration: 2 },
            'washing_machine': { name: 'Washing Machine', duration: 1.5 },
            'tumble_dryer': { name: 'Tumble Dryer', duration: 2.5 },
            'ev_charging': { name: 'EV Charging', duration: 8 },
            'immersion_heater': { name: 'Immersion Heater', duration: 2 },
            'heat_pump': { name: 'Heat Pump', duration: 4 }
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataProcessor;
} else if (typeof window !== 'undefined') {
    window.DataProcessor = DataProcessor;
}