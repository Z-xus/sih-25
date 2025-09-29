import { useEffect, useMemo, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Polygon, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, BarChart, Bar, Area, AreaChart, ComposedChart } from 'recharts'
import { MessageSquare, Download, Map as MapIcon, Filter, BarChart3, Layers, Settings, Search, TrendingUp, Globe, Thermometer, Droplets, Target, Zap, Activity, Waves, Navigation } from 'lucide-react'

const API_URL = (import.meta as any).env.VITE_API_URL || (window as any).REACT_APP_API_URL || 'http://localhost:5000'

// Create custom marker icon
const createFloatIcon = (float: any, isSelected: boolean) => {
  const getMarkerColor = () => {
    if (isSelected) return '#ef4444'
    if (float.status === 'active') return '#3b82f6'
    return '#6b7280'
  }

  const size = isSelected ? 20 : 16
  const color = getMarkerColor()

  return L.divIcon({
    html: `
      <div class="relative">
        ${float.status === 'active' ? `
          <div class="absolute inset-0 rounded-full animate-ping opacity-20" 
               style="background-color: ${color}; width: ${size * 1.5}px; height: ${size * 1.5}px; margin-left: -${size * 0.25}px; margin-top: -${size * 0.25}px;"></div>
        ` : ''}
        <div class="rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs"
             style="background-color: ${color}; width: ${size}px; height: ${size}px; font-size: ${Math.max(8, size * 0.6)}px;">
          ${float.float_id.slice(-2)}
        </div>
        <div class="absolute top-0 left-0 mt-6 bg-white px-2 py-1 rounded shadow text-xs font-medium text-gray-700 whitespace-nowrap">
          ${float.float_id}
        </div>
      </div>
    `,
    className: 'custom-float-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  })
}

// Map component for dynamic updates
function MapUpdater({ floats, selectedFloats, trajectory, showHeatmap, onFloatSelect }: any) {
  const map = useMap()
  
  useEffect(() => {
    if (floats.length > 0) {
      const bounds = floats.map(f => [f.last_position_lat, f.last_position_lon])
      map.fitBounds(bounds as any, { padding: [20, 20] })
    }
  }, [floats, map])

  return null
}

// Regional boundaries for context
const ArabianSeaBoundary = [
  [25, 50], [25, 78], [12, 78], [12, 50], [25, 50]
]

const IndianOceanBoundary = [
  [-20, 40], [-20, 120], [30, 120], [30, 40], [-20, 40]
]

export default function App() {
  const [floats, setFloats] = useState<any[]>([])
  const [trajectory, setTrajectory] = useState<any[]>([])
  const [chat, setChat] = useState<string>('')
  const [chatResponse, setChatResponse] = useState<string>('')
  const [measurements, setMeasurements] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({ start: '2020-11-01', end: '2020-11-30' })
  const [selectedFloat, setSelectedFloat] = useState<any>(null)
  const [analysisMode, setAnalysisMode] = useState<'overview' | 'profiles' | 'comparison' | 'statistics'>('overview')
  const [selectedFloats, setSelectedFloats] = useState<string[]>([])
  const [depthRange, setDepthRange] = useState<{min: number, max: number}>({ min: 0, max: 2000 })
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [statistics, setStatistics] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [tempRange, setTempRange] = useState<{min: number, max: number}>({ min: 0, max: 30 })
  const [salinityRange, setSalinityRange] = useState<{min: number, max: number}>({ min: 30, max: 40 })
  const [polygonMode, setPolygonMode] = useState(false);
  const [polygonVertices, setPolygonVertices] = useState<[number, number][]>([]);
  const [floatsFiltered, setFloatsFiltered] = useState<string[] | null>(null); // null = no filter

  // Simple color functions for scientific visualization
  const getTempColor = (temp: number) => {
    const normalized = Math.max(0, Math.min(1, (temp - tempRange.min) / (tempRange.max - tempRange.min)))
    const hue = (1 - normalized) * 240 // Blue to red
    return `hsl(${hue}, 70%, 50%)`
  }

  const getSalinityColor = (salinity: number) => {
    const normalized = Math.max(0, Math.min(1, (salinity - salinityRange.min) / (salinityRange.max - salinityRange.min)))
    const hue = normalized * 240 // Blue to cyan
    return `hsl(${hue}, 70%, 50%)`
  }

  useEffect(() => {
    loadFloats()
  }, [statusFilter, dateRange])

  const loadFloats = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (dateRange.start && dateRange.end) params.set('date_range', `${dateRange.start},${dateRange.end}`)
    
    try {
      const response = await fetch(`${API_URL}/api/floats?${params.toString()}`)
      const data = await response.json()
      setFloats(data)
      calculateStatistics(data)
    } catch (error) {
      console.error('Error loading floats:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStatistics = (floatData: any[]) => {
    const stats = {
      totalFloats: floatData.length,
      activeFloats: floatData.filter(f => f.status === 'active').length,
      avgLat: floatData.reduce((sum, f) => sum + (f.last_position_lat || 0), 0) / floatData.length,
      avgLon: floatData.reduce((sum, f) => sum + (f.last_position_lon || 0), 0) / floatData.length,
      latRange: {
        min: Math.min(...floatData.map(f => f.last_position_lat || 0)),
        max: Math.max(...floatData.map(f => f.last_position_lat || 0))
      },
      lonRange: {
        min: Math.min(...floatData.map(f => f.last_position_lon || 0)),
        max: Math.max(...floatData.map(f => f.last_position_lon || 0))
      }
    }
    setStatistics(stats)
  }

  const handleSelectFloat = useCallback(async (floatId: string) => {
    console.log('Selected float:', floatId)
    try {
      const [trajRes, profilesRes] = await Promise.all([
        fetch(`${API_URL}/api/floats/${floatId}/trajectory`),
        fetch(`${API_URL}/api/floats/${floatId}/profiles`)
      ])
      
      const trajData = await trajRes.json()
      const profilesData = await profilesRes.json()
      
      setTrajectory(trajData.points || [])
      setSelectedFloat(floats.find(f => f.float_id === floatId))
      
      if (profilesData.profiles?.[0]?.id) {
        const measurementsRes = await fetch(`${API_URL}/api/profiles/${profilesData.profiles[0].id}/measurements`)
        const measurementsData = await measurementsRes.json()
        setMeasurements(measurementsData.measurements || [])
      }
      
      if (!selectedFloats.includes(floatId)) {
        setSelectedFloats([...selectedFloats, floatId])
      }
    } catch (error) {
      console.error('Error loading float data:', error)
    }
  }, [floats, selectedFloats])

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch(`${API_URL}/api/chat/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chat })
      })
      const data = await response.json()
      setChatResponse(data.response)
    } catch (error) {
      console.error('Error sending chat:', error)
    }
  }

  const center = useMemo(() => ({ lat: 15, lng: 75 }), [])

  // Heatmap data for visualization using CircleMarkers
  const heatmapData = useMemo(() => 
    floats.map(f => ({
      lat: f.last_position_lat,
      lng: f.last_position_lon,
      intensity: 1,
      color: f.status === 'active' ? '#3b82f6' : '#6b7280'
    })), [floats]
  )

  // Filter out duplicate WMO numbers
  const uniqueFloats = useMemo(() => {
    const seen = new Set();
    return floats.filter(float => {
      if (seen.has(float.wmo_number)) {
        return false;
      }
      seen.add(float.wmo_number);
      return true;
    });
  }, [floats]);

  const renderAnalysisPanel = () => {
    switch (analysisMode) {
      case 'profiles':
        return (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-navy mb-3 flex items-center gap-2">
                <Thermometer size={18} /> Temperature Profile
              </h3>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={measurements.map((m, i) => ({ depth: m.depth, temp: m.temperature }))}>
                    <XAxis dataKey="depth" label={{ value: 'Depth (m)', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value, name) => [value, name === 'temp' ? 'Temperature' : name]} />
                    <Line type="monotone" dataKey="temp" stroke="#ef4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-navy mb-3 flex items-center gap-2">
                <Droplets size={18} /> Salinity Profile
              </h3>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={measurements.map((m, i) => ({ depth: m.depth, salinity: m.salinity }))}>
                    <XAxis dataKey="depth" label={{ value: 'Depth (m)', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Salinity (PSU)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value, name) => [value, name === 'salinity' ? 'Salinity' : name]} />
                    <Line type="monotone" dataKey="salinity" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )
      
      case 'comparison':
        return (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-navy mb-3 flex items-center gap-2">
                <BarChart3 size={18} /> Multi-Float Comparison
              </h3>
              <div className="text-sm text-gray-600 mb-3">
                Selected floats: {selectedFloats.length}
              </div>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={floats.filter(f => selectedFloats.includes(f.float_id)).slice(0, 5)}>
                    <XAxis dataKey="float_id" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="last_position_lat" fill="#3b82f6" name="Latitude" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )
      
      case 'statistics':
        return (
          <div className="space-y-4">
            {statistics && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-semibold text-navy mb-3 flex items-center gap-2">
                  <Activity size={18} /> Regional Statistics
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="font-medium">Total Floats</div>
                    <div className="text-2xl font-bold text-navy">{statistics.totalFloats}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="font-medium">Active Floats</div>
                    <div className="text-2xl font-bold text-green-600">{statistics.activeFloats}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="font-medium">Latitude Range</div>
                    <div className="text-sm">{statistics.latRange.min.toFixed(2)}° to {statistics.latRange.max.toFixed(2)}°</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="font-medium">Longitude Range</div>
                    <div className="text-sm">{statistics.lonRange.min.toFixed(2)}° to {statistics.lonRange.max.toFixed(2)}°</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      
      default:
        return (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-navy mb-3 flex items-center gap-2">
                <Globe size={18} /> Quick Overview
              </h3>
              <div className="text-sm text-gray-600 space-y-2">
                <div>• Click on float markers to view detailed profiles</div>
                <div>• Use filters to narrow down data by status and date</div>
                <div>• Switch analysis modes for different research perspectives</div>
                <div>• Export data in CSV format for further analysis</div>
              </div>
            </div>
          </div>
        )
    }
  }

  // Move the polygon mode logic into a component that is a child of MapContainer
  function PolygonModeHandler({ polygonMode, setPolygonVertices }: any) {
    const map = useMap();

    useEffect(() => {
      if (polygonMode) {
        map.dragging.disable();
        map.on('click', (e: L.LeafletMouseEvent) => {
          setPolygonVertices((prev: [number, number][]) => [...prev, [e.latlng.lat, e.latlng.lng]]);
        });
      } else {
        map.dragging.enable();
        map.off('click');
      }

      return () => {
        map.dragging.enable();
        map.off('click');
      };
    }, [polygonMode, map, setPolygonVertices]);

    return null;
  }

  useEffect(() => {
    if (polygonVertices.length < 3) return;
    const polygon = L.polygon(polygonVertices);
    const inside = floats
      .filter(f => f.last_position_lat && f.last_position_lon)
      .filter(f =>
        polygon.getBounds().contains([f.last_position_lat, f.last_position_lon])
      ) // Removed incorrect `polygon.contains` usage
      .map(f => f.float_id);
    setFloatsFiltered(inside);
  }, [polygonVertices, floats]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <header className="bg-navy text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blueAccent rounded-lg flex items-center justify-center">
                <Waves size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold">FloatChat Research Platform</h1>
                <p className="text-sm opacity-90">ARGO Ocean Data Analysis & Visualization</p>
              </div>
            </div>
            <nav className="hidden md:flex space-x-6 text-sm">
              <a href="#" className="hover:text-blueAccent transition-colors">Data Explorer</a>
              <a href="#" className="hover:text-blueAccent transition-colors">Analysis Tools</a>
              <a href="#" className="hover:text-blueAccent transition-colors">Documentation</a>
              <a href="#" className="hover:text-blueAccent transition-colors">About</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-12 gap-6">
          {/* Map Section */}
          <section className="col-span-12 lg:col-span-8">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-navy font-semibold">
                  <MapIcon size={20} />
                  Interactive Ocean Data Map
                  <span className="text-sm text-gray-600 ml-2">(Arabian Sea Region: 12°N-25°N, 50°E-78°E)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={`px-3 py-1 rounded text-sm ${showHeatmap ? 'bg-navy text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    {showHeatmap ? 'Markers' : 'Heatmap'}
                  </button>
                  <button
                    onClick={loadFloats}
                    disabled={loading}
                    className="px-3 py-1 bg-blueAccent text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
              </div>
              
              <div style={{ height: '600px', position: 'relative' }}>
                <MapContainer center={[center.lat, center.lng]} zoom={5} style={{ height: '100%', width: '100%' }}>
                  <TileLayer 
                    attribution='&copy; OpenStreetMap contributors' 
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                  />
                  
                  <MapUpdater floats={uniqueFloats} selectedFloats={selectedFloats} trajectory={trajectory} showHeatmap={showHeatmap} onFloatSelect={handleSelectFloat} />
                  
                  {/* Heatmap layer using CircleMarkers */}
                  {showHeatmap && heatmapData.map((point, index) => (
                    <CircleMarker
                      key={`heatmap-${index}`}
                      center={[point.lat, point.lng]}
                      radius={20}
                      pathOptions={{
                        color: point.color,
                        fillColor: point.color,
                        fillOpacity: 0.3,
                        weight: 1
                      }}
                    />
                  ))}
                  
                  {/* Custom float markers */}
                  {!showHeatmap && floats.map(float => {
                    if (floatsFiltered && !floatsFiltered.includes(float.float_id)) return null;
                    return (
                      <Marker
                        key={float.float_id}
                        position={[float.last_position_lat || 0, float.last_position_lon || 0]}
                        icon={createFloatIcon(float, selectedFloats.includes(float.float_id))}
                        eventHandlers={{ click: () => handleSelectFloat(float.float_id) }}
                      >
                        <Popup>
                          <div className="space-y-2 min-w-[200px]">
                            <div className="font-semibold text-navy">Float {float.float_id}</div>
                            <div className="text-sm space-y-1">
                              <div><span className="font-medium">Status:</span> {float.status}</div>
                              <div><span className="font-medium">Position:</span> {float.last_position_lat?.toFixed(3)}°, {float.last_position_lon?.toFixed(3)}°</div>
                              <div><span className="font-medium">Platform:</span> {float.platform_type}</div>
                            </div>
                            <button 
                              onClick={() => handleSelectFloat(float.float_id)}
                              className="w-full mt-2 px-3 py-1 bg-navy text-white rounded text-sm hover:bg-blue-800"
                            >
                              Analyze Profile
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                  
                  {/* Trajectory */}
                  {trajectory.length > 0 && (
                    <Polyline 
                      positions={trajectory.map(p => [p.latitude, p.longitude]) as any} 
                      color="#ef4444" 
                      weight={3}
                      opacity={0.7}
                    />
                  )}

                  {/* Draw the polygon as a visual guide */}
                  {polygonVertices.length > 0 && (
                    <Polygon positions={polygonVertices} pathOptions={{ color: 'red', weight: 2, fillOpacity: 0.1 }} />
                  )}

                  <PolygonModeHandler polygonMode={polygonMode} setPolygonVertices={setPolygonVertices} />
                </MapContainer>
                
                {/* Floating Legend */}
                <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
                  <h4 className="font-semibold text-navy mb-2">Float Status</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span>Active ({floats.filter(f => f.status === 'active').length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                      <span>Inactive ({floats.filter(f => f.status === 'inactive').length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span>Selected ({selectedFloats.length})</span>
                    </div>
                  </div>
                </div>

                {/* Adding the polygon toggle button to the map controls */}
                <div className="absolute top-4 left-4 z-[1000]">
                  <button
                    onClick={() => {
                      setPolygonMode(!polygonMode);
                      setPolygonVertices([]);
                      if (polygonMode) setFloatsFiltered(null); // reset filter when exiting mode
                    }}
                    className={`px-3 py-1 rounded text-sm ${polygonMode ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    {polygonMode ? 'Cancel Polygon' : 'Draw Polygon'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Analysis Panel */}
          <aside className="col-span-12 lg:col-span-4 space-y-4">
            {/* Analysis Mode Selector */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-navy">Analysis Tools</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'overview', label: 'Overview', icon: Globe },
                    { key: 'profiles', label: 'Profiles', icon: Thermometer },
                    { key: 'comparison', label: 'Compare', icon: BarChart3 },
                    { key: 'statistics', label: 'Statistics', icon: Activity }
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setAnalysisMode(key as any)}
                      className={`p-3 rounded-lg text-sm font-medium flex flex-col items-center gap-1 ${
                        analysisMode === key 
                          ? 'bg-navy text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Icon size={18} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b flex items-center gap-2">
                <Filter size={18} />
                <h3 className="font-semibold text-navy">Research Filters</h3>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select 
                    value={statusFilter} 
                    onChange={e => setStatusFilter(e.target.value)} 
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="date" 
                      value={dateRange.start} 
                      onChange={e => setDateRange(v => ({...v, start: e.target.value}))} 
                      className="border rounded px-2 py-2 text-sm" 
                    />
                    <input 
                      type="date" 
                      value={dateRange.end} 
                      onChange={e => setDateRange(v => ({...v, end: e.target.value}))} 
                      className="border rounded px-2 py-2 text-sm" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temperature Range (°C)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="number" 
                      value={tempRange.min} 
                      onChange={e => setTempRange(v => ({...v, min: Number(e.target.value)}))} 
                      className="border rounded px-2 py-2 text-sm" 
                      placeholder="Min"
                    />
                    <input 
                      type="number" 
                      value={tempRange.max} 
                      onChange={e => setTempRange(v => ({...v, max: Number(e.target.value)}))} 
                      className="border rounded px-2 py-2 text-sm" 
                      placeholder="Max"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salinity Range (PSU)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="number" 
                      value={salinityRange.min} 
                      onChange={e => setSalinityRange(v => ({...v, min: Number(e.target.value)}))} 
                      className="border rounded px-2 py-2 text-sm" 
                      placeholder="Min"
                    />
                    <input 
                      type="number" 
                      value={salinityRange.max} 
                      onChange={e => setSalinityRange(v => ({...v, max: Number(e.target.value)}))} 
                      className="border rounded px-2 py-2 text-sm" 
                      placeholder="Max"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis Results */}
            {renderAnalysisPanel()}

            {/* Chat Interface */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b flex items-center gap-2">
                <MessageSquare size={18} />
                <h3 className="font-semibold text-navy">Research Assistant</h3>
              </div>
              <form onSubmit={handleChatSubmit} className="p-4 space-y-3">
                <input 
                  value={chat} 
                  onChange={e => setChat(e.target.value)} 
                  placeholder="Ask about ocean data, float analysis, or research insights..." 
                  className="w-full border rounded px-3 py-2 text-sm" 
                />
                <button 
                  type="submit"
                  className="w-full bg-navy text-white px-4 py-2 rounded text-sm hover:bg-blue-800"
                >
                  Send Query
                </button>
              </form>
              {chatResponse && (
                <div className="px-4 pb-4">
                  <div className="bg-gray-50 p-3 rounded text-sm text-gray-700">
                    {chatResponse}
                  </div>
                </div>
              )}
            </div>

            {/* Export Options */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-navy">Export Data</h3>
                <Download size={18} />
              </div>
              <div className="p-4 space-y-2">
                <a 
                  href={`${API_URL}/api/export/csv/2902746`} 
                  className="block w-full bg-green-600 text-white px-4 py-2 rounded text-sm text-center hover:bg-green-700"
                >
                  Download CSV
                </a>
                <div className="text-xs text-gray-500 text-center">
                  Export includes selected float data with full profiles
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t mt-8">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>© 2024 FloatChat Research Platform - Ministry of Ocean Sciences</p>
            <p className="mt-1">Advanced ARGO Data Analysis & Visualization System</p>
          </div>
        </div>
      </footer>
    </div>
  )
}