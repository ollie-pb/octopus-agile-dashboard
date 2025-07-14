# Octopus Agile Eco-Smart Pricing Dashboard

## Core User Questions
1. **"Should I use electricity RIGHT NOW?"** 
2. **"When are the BEST times today?"**
3. **"When should I absolutely AVOID using electricity?"**
4. **"How long should I delay my device to hit the next cheap slot?"**

## Design Theme: Eco-Friendly Energy
**Color Palette:**
- **Green spectrum**: Forest green, mint, sage for cheap prices
- **Amber/Orange**: Warm yellows for medium prices  
- **Soft reds**: Coral, salmon for expensive times
- **Electric blues**: Accent colors for energy/electricity theme
- **Natural whites/creams**: Clean background, earth-friendly feel

**Visual Language:**
- Leaf/energy wave motifs
- Lightning bolt icons for electricity
- Smooth gradients suggesting natural flow
- Rounded corners for friendly, approachable feel

## User Experience Design

### Hero Section
**Current Status Card:**
- Large eco-friendly status: "🌱 GREAT TIME" / "⚡ OK TIME" / "🔥 AVOID NOW"
- Current price with electricity icon
- Time remaining in current slot

**Smart Delay Helper:**
- **"Next Cheap Slot"**: "Start your device in 3.5 hours (saves 15p)"
- Simple countdown or time display
- One-tap copy to device timer

### Quick Decision Panels
**Best Times Today:**
- Top 3-5 cheapest slots with leaf icons
- Format: "🌱 2:00-2:30 AM (8.2p)"

**Avoid These Times:**
- Top 3-5 most expensive with warning icons  
- Format: "⚠️ 6:00-6:30 PM (45.6p)"

### Secondary Features
**Visual Timeline:**
- 24-hour eco-friendly color bar
- Current time indicator with electric bolt
- Smooth color transitions

**Device Delay Calculator:**
- Input: "I want to run my device for X hours"
- Output: "Start in 2.5 hours to save £0.40"
- Common presets: Dishwasher (2h), Washing machine (1.5h), EV charging (8h)

## Technical Implementation

### API Integration
- **Base URL**: `https://api.octopus.energy/v1/`
- **Endpoint**: `/products/AGILE-FLEX-22-11-25/electricity-tariffs/E-1R-AGILE-FLEX-22-11-25-{REGION}/standard-unit-rates/`
- **Authentication**: None required for pricing endpoints
- **Regional Codes**: A-P (e.g., C=London, M=Yorkshire, L=South Western England)

### Data Processing
- Fetch current day's 48 half-hourly prices
- Sort prices to identify cheapest/most expensive slots
- Calculate current time slot status
- Generate delay recommendations
- Handle timezone conversion (UTC to local)

### Progressive Web App Features
- Eco-themed home screen icon (green leaf + lightning)
- Offline functionality with cached recommendations
- Fast loading (<2 seconds) with smooth animations
- Mobile-optimized touch interface
- Region persistence in localStorage
- 30-minute auto-refresh

### Technology Stack
- Lightweight vanilla JS or minimal framework
- CSS custom properties for theme consistency
- CSS Grid/Flexbox for responsive layout
- Service Worker for PWA capabilities
- Local storage for user preferences

## Key Technical Details
- **Update Schedule**: Prices published daily 4-8pm for next 24 hours
- **Price Range**: Typically -8.40p to 99.99p per kWh
- **Interval**: 30-minute periods (48 per day)
- **Format**: ISO 8601 timestamps, prices in pence per kWh