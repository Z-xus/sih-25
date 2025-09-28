## FloatChat - ARGO Ocean Data Research Platform

AI-Powered Conversational Interface for ARGO Ocean Data Discovery and Visualization.

### Tech Stack
- Backend: Node.js 20 (Express), Direct CSV processing
- Frontend: React 18 + TypeScript, Tailwind CSS, React-Leaflet, Recharts
- Infra: Docker + docker-compose

### Prerequisites (Arch Linux)
- Docker and Docker Compose: `sudo pacman -S docker docker-compose`
- Enable/start Docker: `sudo systemctl enable --now docker`

### Getting Started
```bash
cd /home/neon/Test/sih-25
docker-compose up -d --build
```

**Access the application:**
- Frontend: http://localhost:3000
- API: http://localhost:5000

### Real Data Processing
The system directly processes ARGO CSV data from `./Data/2020/11/csv/` (30 files, November 2020).

**Features:**
- **Real Oceanographic Data**: Temperature, salinity, pressure from actual ARGO floats
- **Interactive Map**: Click floats to view detailed profiles and trajectories
- **Research Tools**: Profile analysis, multi-float comparison, statistical summaries
- **Data Export**: Download CSV files with measurement data
- **Government UI**: Professional navy blue design with research-grade visualizations

**Data includes:**
- 30 daily profile files (20201101_prof.csv to 20201130_prof.csv)
- Real temperature, salinity, and pressure measurements
- Float positions and trajectories in the Indian Ocean
- Quality-controlled oceanographic data

### No Database Required!
- Direct CSV processing - no PostgreSQL setup needed
- In-memory data loading - fast and simple
- Real data from your CSV files - no mock data


