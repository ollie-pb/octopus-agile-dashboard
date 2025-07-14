# Octopus Agile Smart Pricing Dashboard

A minimalist, eco-friendly Progressive Web App that provides real-time Octopus Energy Agile pricing with smart recommendations for when to use electricity.

## Features

### 🌱 Smart Decision Making
- **Current Status**: Instant visual feedback on whether now is a good time to use electricity
- **Best Times Today**: Shows the 5 cheapest half-hourly slots
- **Avoid These Times**: Highlights the 5 most expensive periods
- **Smart Delay Calculator**: Recommends optimal start times for electrical devices

### ⚡ Device Presets
- Washing Machine (1.5 hours)
- Dishwasher (2 hours) 
- EV Charging (8 hours)
- Custom duration support

### 📱 Progressive Web App
- Install on home screen
- Offline functionality with cached data
- Fast loading (<2 seconds)
- Mobile-optimized interface
- Auto-refresh every 30 minutes

### 🎨 Eco-Friendly Design
- Nature-inspired color palette
- Smooth animations and transitions
- Responsive design for all screen sizes
- Accessibility features

## How It Works

The app fetches half-hourly electricity pricing data from the Octopus Energy API for your region and analyzes it to provide actionable recommendations:

1. **Real-time Status**: See if now is a good, medium, or expensive time to use electricity
2. **Visual Timeline**: 24-hour color-coded pricing bar chart
3. **Smart Recommendations**: Calculate how long to delay device usage for optimal savings
4. **Regional Support**: All 14 UK electricity regions (A-P)

## API Integration

- **Source**: Octopus Energy REST API
- **Product**: AGILE-FLEX-22-11-25
- **Update Frequency**: Daily at 4-8pm for next 24 hours
- **Data Points**: 48 half-hourly periods per day
- **No Authentication Required**: Public pricing endpoints

## Technical Stack

- **Frontend**: Vanilla JavaScript (no frameworks)
- **Styling**: CSS Custom Properties with eco-friendly theme
- **PWA**: Service Worker for offline functionality
- **Storage**: LocalStorage for caching and preferences
- **API**: Fetch API with retry logic and error handling

## File Structure

```
├── index.html              # Main HTML structure
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker
├── css/
│   └── styles.css          # Eco-friendly styling
├── js/
│   ├── app.js              # Main application logic
│   ├── api.js              # Octopus Energy API client
│   ├── dataProcessor.js    # Price analysis and recommendations
│   └── storage.js          # Caching and local storage
├── assets/
│   └── icons/              # PWA icons (placeholder)
└── docs/
    ├── octopus-agile-dashboard-plan.md
    └── octopus-agile-implementation-plan.md
```

## Installation

1. **Local Development**:
   ```bash
   # Serve files with a local web server
   python -m http.server 8000
   # or
   npx serve .
   ```

2. **Deploy to Static Hosting**:
   - Upload files to Netlify, Vercel, or GitHub Pages
   - Ensure HTTPS for PWA features
   - No server-side requirements

3. **Mobile Installation**:
   - Open in mobile browser
   - Tap "Add to Home Screen" prompt
   - Access like a native app

## Regional Codes

The app supports all UK electricity regions:

- **A**: Eastern England
- **B**: East Midlands  
- **C**: London
- **D**: Merseyside and Northern Wales
- **E**: West Midlands
- **F**: North Eastern England
- **G**: North Western England
- **H**: Southern England
- **J**: South Eastern England
- **K**: South Western England
- **L**: South Wales
- **M**: Yorkshire
- **N**: South Scotland
- **P**: North Scotland

## Usage

1. **First Visit**: Select your electricity region
2. **Daily Use**: Check current status before using high-power devices
3. **Planning**: Use delay calculator for dishwashers, washing machines, EV charging
4. **Quick Glance**: Color-coded status shows instant recommendations

## Browser Support

- **Modern Browsers**: Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- **PWA Features**: Service Worker, Web App Manifest, Add to Home Screen
- **Offline Mode**: Cached data available without internet connection

## Performance

- **Load Time**: <2 seconds on 3G
- **Bundle Size**: ~50KB total (no external dependencies)
- **Caching**: Smart cache invalidation every hour
- **Memory**: Minimal footprint with efficient data structures

## Privacy

- **No Tracking**: No analytics or user tracking
- **Local Storage**: Preferences stored locally only
- **API Calls**: Direct to Octopus Energy (no proxy servers)
- **No Account Required**: Works without sign-up or authentication

## License

MIT License - feel free to fork and customize for your needs.