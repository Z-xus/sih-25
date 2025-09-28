# FloatChat - Product Requirements Document (PRD)
**AI-Powered Conversational Interface for ARGO Ocean Data Discovery and Visualization**

## 1. Executive Summary

FloatChat is a research-friendly web application that provides an interactive, government-style interface for exploring ARGO ocean float data. The platform combines geospatial visualization with a simulated AI chatbot interface, enabling researchers to discover and analyze oceanographic data through both map interactions and conversational queries.

## 2. Product Scope & Objectives

### Primary Goals
- Create an intuitive interface for ARGO float data exploration
- Provide research-grade visualizations and data export capabilities
- Simulate AI-powered conversational data queries
- Maintain government website aesthetic standards
- Enable seamless data discovery and analysis workflow

### Success Metrics
- Successful visualization of 6 months of Indian Ocean ARGO data
- Interactive map with float positioning and trajectory display
- Functional chatbot with realistic responses to 10+ query types
- Data export functionality (CSV, images)
- Sub-3 second page load times

## 3. Technical Architecture

### Frontend Stack
- **Framework**: React 18.x with TypeScript
- **UI Components**: shadcn/ui + Tailwind CSS
- **Mapping**: Leaflet + React-Leaflet
- **Charts**: Recharts
- **Styling**: Government-inspired design system with professional aesthetics

### Backend Stack
- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Database**: PostgreSQL 16
- **ORM**: Prisma
- **CSV Processing**: PapaParse

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database Image**: `postgres:16-alpine`
- **Node Image**: `node:20-alpine`
- **Reverse Proxy**: nginx:alpine

## 4. Database Schema Design

### Core Tables

```sql
-- ARGO Floats Master Table
CREATE TABLE argo_floats (
  id SERIAL PRIMARY KEY,
  float_id VARCHAR(20) UNIQUE NOT NULL,
  wmo_number VARCHAR(20) NOT NULL,
  deployment_date DATE,
  last_position_lat DECIMAL(10, 6),
  last_position_lon DECIMAL(10, 6),
  status VARCHAR(20) DEFAULT 'active',
  platform_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Profile Data Table
CREATE TABLE argo_profiles (
  id SERIAL PRIMARY KEY,
  float_id VARCHAR(20) REFERENCES argo_floats(float_id),
  profile_date TIMESTAMP NOT NULL,
  cycle_number INTEGER,
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(10, 6) NOT NULL,
  profile_direction VARCHAR(10), -- 'A' for ascending, 'D' for descending
  created_at TIMESTAMP DEFAULT NOW()
);

-- Measurement Data Table
CREATE TABLE argo_measurements (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER REFERENCES argo_profiles(id),
  pressure DECIMAL(8, 2), -- in dbar
  temperature DECIMAL(6, 3), -- in Celsius
  salinity DECIMAL(6, 3), -- in PSU
  depth DECIMAL(8, 2), -- in meters
  quality_flag CHAR(1) DEFAULT '1'
);

-- Trajectories Table
CREATE TABLE argo_trajectories (
  id SERIAL PRIMARY KEY,
  float_id VARCHAR(20) REFERENCES argo_floats(float_id),
  timestamp TIMESTAMP NOT NULL,
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(10, 6) NOT NULL,
  location_quality CHAR(1)
);
```

## 5. API Endpoints

### Core Data APIs
```
GET /api/floats
- Query parameters: bbox, date_range, status
- Returns: List of floats with basic info

GET /api/floats/:floatId/profiles
- Query parameters: date_range, limit
- Returns: Profile data for specific float

GET /api/floats/:floatId/trajectory
- Query parameters: date_range
- Returns: Geographic trajectory points

GET /api/profiles/:profileId/measurements
- Returns: Detailed T/S measurements for profile

POST /api/query/spatial
- Body: { bbox: [lat1, lon1, lat2, lon2], dateRange: [...] }
- Returns: Floats within spatial bounds

GET /api/export/csv/:floatId
- Returns: CSV export of float data
```

### Chatbot Simulation APIs
```
POST /api/chat/query
- Body: { message: string, context?: object }
- Returns: { response: string, data?: object, visualizations?: array }
```

## 6. User Interface Design

### Layout Structure
```
Header Navigation
├── Logo: "FloatChat - Ministry of Ocean Sciences"
├── Navigation: Home | Data Explorer | Documentation | About
└── User Account (placeholder)

Main Content Area
├── Interactive Map Panel (60% width)
│   ├── Leaflet map with float markers
│   ├── Layer controls (bathymetry, currents, etc.)
│   ├── Time range slider
│   └── Spatial query tools
│
└── Side Panel (40% width)
    ├── Chat Interface
    ├── Data Summary Cards
    ├── Quick Filters
    └── Export Options
```

### Government Aesthetic Guidelines
- **Color Palette**: Navy blue primary (#1e3a8a), light blue accents (#3b82f6), neutral grays
- **Typography**: Inter or system fonts, clear hierarchy
- **Components**: Clean, minimal design with subtle shadows
- **Spacing**: Generous whitespace, consistent margins
- **Icons**: Lucide React icons, professional appearance

## 7. Hardcoded Chatbot Responses

### Query Categories & Responses

**Float Location Queries**
```
Input: "Show me floats near the equator"
Output: "Found 23 active ARGO floats within 5° of the equator. The map has been updated to highlight these floats. Float WMO-2901234 is closest to 0°N, 75°E with recent salinity measurements."

Input: "What floats are in the Arabian Sea?"
Output: "Currently tracking 8 ARGO floats in the Arabian Sea region. Most recent data shows 3 floats have completed profiles in the last 30 days. Click on float markers to view detailed measurements."
```

**Data Analysis Queries**
```
Input: "Compare salinity profiles for November 2020"
Output: "Analyzing salinity profiles from November 2020... Found 347 profiles from 23 active floats. Average surface salinity: 35.2 PSU. Notable variations detected in Arabian Sea region. Displaying comparison chart below."

Input: "Show temperature trends in November 2020"
Output: "Temperature analysis for November 2020: Surface temperatures ranged 24.1-29.8°C across profiling region. 5 floats show cooling trend mid-month. Deep water (>1500m) temperatures stable at 2-4°C. Visualization updated on map."
```

**Technical Queries**
```
Input: "How many profiles were collected in November 2020?"
Output: "Profile collection summary for November 2020: 347 profiles from 23 active floats across 30 daily files. Quality control: 92% passed QC checks. Coverage: Indian Ocean, Arabian Sea, and Bay of Bengal regions."

Input: "Export data for float 2902746"
Output: "Preparing data export for float 2902746... Found 15 profiles in November 2020 dataset. Export includes: T/S measurements, pressure data, QC flags, and metadata. Download ready - CSV format, 2.3MB."
```

## 8. Docker Configuration

### docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: floatchat-db
    environment:
      POSTGRES_DB: floatchat
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: oceandata2024
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./data/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile
    container_name: floatchat-api
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://postgres:oceandata2024@postgres:5432/floatchat
      NODE_ENV: development
      PORT: 5000
    ports:
      - "5000:5000"
    volumes:
      - ./backend:/app
      - /app/node_modules

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: floatchat-web
    depends_on:
      - backend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      REACT_APP_API_URL: http://localhost:5000

  nginx:
    image: nginx:alpine
    container_name: floatchat-proxy
    depends_on:
      - frontend
      - backend
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf

volumes:
  postgres_data:
```

## 9. CSV Data Integration

### Data Source
- **Source**: User-provided CSV files (converted from ARGO NetCDF)
- **Location**: `./Data/2020/11/csv/`
- **Files**: 30 daily profile files (`20201101_prof.csv` to `20201130_prof.csv`)
- **Format**: CSV with standard ARGO profile columns
- **Coverage**: November 2020, actual ocean measurements

### Data Pipeline Script
```javascript
// data-ingestion/process-csv.js
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { PrismaClient } = require('@prisma/client');

class ArgoCsvProcessor {
  constructor() {
    this.prisma = new PrismaClient();
    this.dataPath = './Data/2020/11/csv';
  }

  async processAllFiles() {
    const files = fs.readdirSync(this.dataPath)
      .filter(file => file.endsWith('_prof.csv'))
      .sort();
    
    console.log(`Processing ${files.length} CSV files from November 2020...`);
    
    for (const file of files) {
      const filePath = path.join(this.dataPath, file);
      console.log(`Processing: ${file}`);
      await this.processCsvFile(filePath);
    }
  }

  async processCsvFile(filePath) {
    try {
      const csvContent = fs.readFileSync(filePath, 'utf8');
      
      const parsed = Papa.parse(csvContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        delimitersToGuess: [',', '\t', '|', ';']
      });

      if (parsed.errors.length > 0) {
        console.warn(`CSV parsing warnings for ${filePath}:`, parsed.errors);
      }

      const data = parsed.data;
      console.log(`Found ${data.length} records in ${path.basename(filePath)}`);

      // Group by float/platform for batch processing
      const floatGroups = this.groupByFloat(data);
      
      for (const [floatId, profiles] of Object.entries(floatGroups)) {
        await this.processFloatData(floatId, profiles);
      }
      
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
    }
  }

  groupByFloat(data) {
    const groups = {};
    
    for (const row of data) {
      // Handle different possible column names for platform/float ID
      const floatId = row.PLATFORM_NUMBER || row.platform_number || 
                     row.FLOAT_ID || row.float_id || row.WMO || row.wmo;
      
      if (!floatId) continue;
      
      const floatKey = String(floatId).trim();
      if (!groups[floatKey]) {
        groups[floatKey] = [];
      }
      groups[floatKey].push(row);
    }
    
    return groups;
  }

  async processFloatData(floatId, profiles) {
    try {
      // Get representative coordinates for float registration
      const validProfile = profiles.find(p => 
        this.isValidCoordinate(p.LATITUDE || p.latitude) && 
        this.isValidCoordinate(p.LONGITUDE || p.longitude)
      );

      if (!validProfile) {
        console.warn(`No valid coordinates found for float ${floatId}`);
        return;
      }

      // Insert/update float info
      await this.upsertFloat(floatId, validProfile);
      
      // Group profiles by date/cycle for batch processing
      const profileGroups = this.groupProfiles(profiles);
      
      for (const profileGroup of profileGroups) {
        const profileId = await this.insertProfile(floatId, profileGroup[0]);
        await this.insertMeasurements(profileId, profileGroup);
      }
      
    } catch (error) {
      console.error(`Error processing float ${floatId}:`, error);
    }
  }

  groupProfiles(profiles) {
    const groups = new Map();
    
    for (const profile of profiles) {
      const cycleNum = profile.CYCLE_NUMBER || profile.cycle_number || 0;
      const date = this.extractDate(profile);
      const key = `${cycleNum}_${date}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(profile);
    }
    
    return Array.from(groups.values());
  }

  async upsertFloat(floatId, sampleProfile) {
    const lat = sampleProfile.LATITUDE || sampleProfile.latitude;
    const lon = sampleProfile.LONGITUDE || sampleProfile.longitude;
    
    await this.prisma.argo_floats.upsert({
      where: { float_id: floatId },
      update: {
        last_position_lat: lat,
        last_position_lon: lon,
      },
      create: {
        float_id: floatId,
        wmo_number: floatId,
        last_position_lat: lat,
        last_position_lon: lon,
        deployment_date: new Date('2020-11-01'),
        status: 'active',
        platform_type: 'ARGO_FLOAT'
      }
    });
  }

  async insertProfile(floatId, sampleRow) {
    const profileData = {
      float_id: floatId,
      profile_date: this.extractDate(sampleRow),
      cycle_number: sampleRow.CYCLE_NUMBER || sampleRow.cycle_number || 0,
      latitude: sampleRow.LATITUDE || sampleRow.latitude,
      longitude: sampleRow.LONGITUDE || sampleRow.longitude,
      profile_direction: sampleRow.DIRECTION || sampleRow.direction || 'A'
    };

    const profile = await this.prisma.argo_profiles.create({
      data: profileData
    });
    
    return profile.id;
  }

  async insertMeasurements(profileId, measurements) {
    const validMeasurements = [];
    
    for (const row of measurements) {
      const pressure = row.PRES || row.pressure || row.PRESSURE;
      const temperature = row.TEMP || row.temperature || row.TEMPERATURE;
      const salinity = row.PSAL || row.salinity || row.SALINITY;
      const qualityFlag = row.TEMP_QC || row.temp_qc || row.QUALITY_FLAG || '1';

      // Only insert if we have valid pressure and temperature
      if (this.isValidValue(pressure) && this.isValidValue(temperature)) {
        validMeasurements.push({
          profile_id: profileId,
          pressure: Number(pressure),
          temperature: Number(temperature),
          salinity: this.isValidValue(salinity) ? Number(salinity) : null,
          depth: this.pressureToDepth(Number(pressure)),
          quality_flag: String(qualityFlag).charAt(0) || '1'
        });
      }
    }

    if (validMeasurements.length > 0) {
      await this.prisma.argo_measurements.createMany({
        data: validMeasurements,
        skipDuplicates: true
      });
      console.log(`Inserted ${validMeasurements.length} measurements for profile ${profileId}`);
    }
  }

  extractDate(row) {
    // Handle various date formats in CSV
    const dateStr = row.JULD || row.juld || row.DATE || row.date || row.REFERENCE_DATE_TIME;
    
    if (!dateStr) {
      return new Date('2020-11-01'); // Default fallback
    }

    // Try parsing different date formats
    let date = new Date(dateStr);
    
    // If invalid, try as Julian day (ARGO standard)
    if (isNaN(date.getTime()) && typeof dateStr === 'number') {
      const argoEpoch = new Date('1950-01-01T00:00:00Z');
      date = new Date(argoEpoch.getTime() + (dateStr * 24 * 60 * 60 * 1000));
    }
    
    return isNaN(date.getTime()) ? new Date('2020-11-01') : date;
  }

  isValidValue(value) {
    return value !== null && value !== undefined && 
           !isNaN(Number(value)) && Number(value) !== 99999.0 && 
           Number(value) > -999 && value !== '';
  }

  isValidCoordinate(coord) {
    const num = Number(coord);
    return !isNaN(num) && num >= -90 && num <= 90; // Basic lat/lon range check
  }

  pressureToDepth(pressure) {
    // Approximate pressure to depth conversion
    return pressure * 1.019716;
  }
}

// Usage script
const processor = new ArgoCsvProcessor();
processor.processAllFiles()
  .then(() => {
    console.log('CSV data processing completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('CSV processing failed:', error);
    process.exit(1);
  });
```

## 10. Interactive Features

### Map Interactions
- **Float Clustering**: Zoom-dependent clustering with count badges
- **Click Actions**: Float details popup with basic profile chart
- **Draw Tools**: Rectangle/polygon selection for spatial queries
- **Layer Toggle**: Bathymetry, sea surface temperature overlays
- **Time Animation**: Play button for temporal visualization

### Research Tools
- **Profile Comparison**: Side-by-side T/S diagrams
- **Cross-section Views**: Latitude/longitude transect analysis
- **Statistical Summaries**: Min/max/avg calculations for regions
- **Quality Flags**: Visual indicators for data quality
- **Bookmark System**: Save interesting locations/queries

## 11. Export Capabilities

### Data Export Formats
- **CSV**: Profile data with metadata headers
- **NetCDF**: Original format preservation for scientific use
- **JSON**: API-compatible format
- **Images**: High-resolution map captures, chart exports

### Export Features
- **Filtered Exports**: Based on spatial/temporal selection
- **Metadata Inclusion**: Float information, QC flags, provenance
- **Batch Downloads**: Multiple floats/profiles in single archive
- **Citation Information**: Proper data attribution included

## 12. Performance Specifications

### Response Times
- Map load: < 2 seconds
- Chat response: < 1 second (hardcoded)
- Profile visualization: < 3 seconds
- Data export generation: < 10 seconds

### Data Handling
- Concurrent users: 50+
- Database connections: Pooled (max 20)
- Memory usage: < 2GB per container
- Storage: ~2GB for November 2020 dataset (30 files)

## 13. Development Phases

### Phase 1: Core Infrastructure (Week 1-2)
- Docker environment setup
- Database schema implementation
- Basic CRUD APIs
- React app scaffolding

### Phase 2: Map & Visualization (Week 2-3)
- Leaflet integration
- Float positioning display
- Basic profile charts
- UI component development

### Phase 3: Chatbot & Integration (Week 3-4)
- Hardcoded response system
- Map-chat interaction
- Export functionality
- Government styling implementation

### Phase 4: Data Integration & Polish (Week 4-5)
- NetCDF processing pipeline
- Sample data ingestion
- Performance optimization
- Testing and bug fixes

## 14. Deployment & Maintenance

### Local Development
```bash
# Clone repository
git clone [repository-url] floatchat
cd floatchat

# Start development environment
docker-compose up -d

# Run data ingestion with CSV files
npm run ingest-csv -- --path ./Data/2020/11/csv

# Access application
# Frontend: http://localhost:3000
# API: http://localhost:5000
# Database: localhost:5432
```

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://postgres:oceandata2024@postgres:5432/floatchat

# API Configuration  
NODE_ENV=development
PORT=5000
JWT_SECRET=your-secret-key

# External Services
MAPBOX_TOKEN=your-mapbox-token (optional)
```

This PRD provides a comprehensive blueprint for implementing FloatChat with verified technologies, realistic scope, and government-appropriate design standards. The focus on hardcoded chatbot responses and PostgreSQL-only storage simplifies the initial implementation while maintaining the appearance of advanced AI capabilities.
