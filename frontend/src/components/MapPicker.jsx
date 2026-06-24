import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Circle } from 'react-leaflet';
import { Search, MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const MapPicker = ({ latitude, longitude, address, onLocationSelect, radius }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
    const [mapInstance, setMapInstance] = useState(null);
    const searchRef = useRef(null);
    const debounceTimer = useRef(null);

    const position = React.useMemo(() => 
        latitude && longitude ? [parseFloat(latitude), parseFloat(longitude)] : null,
    [latitude, longitude]);
    
    const defaultCenter = [23.0225, 72.5714];

    useEffect(() => {
        // Auto-detect location for new branches
        if (!latitude && !longitude) {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude: lat, longitude: lon } = position.coords;
                        reverseGeocode(lat, lon);
                    },
                    (error) => {
                        console.warn("Geolocation permission denied or error:", error);
                    }
                );
            }
        }

        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (query.length < 3) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                // Photon API for better POI search (Metro stations, etc.)
                let biasParams = '';
                if (mapInstance) {
                    const center = mapInstance.getCenter();
                    biasParams = `&lat=${center.lat}&lon=${center.lng}`;
                }

                const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}${biasParams}&limit=10`);
                const data = await response.json();
                
                // Format Photon results to match our expectations
                const formattedResults = data.features.map(f => ({
                    display_name: [
                        f.properties.name,
                        f.properties.street,
                        f.properties.city,
                        f.properties.state,
                        f.properties.country
                    ].filter(Boolean).join(', '),
                    lat: f.geometry.coordinates[1],
                    lon: f.geometry.coordinates[0]
                }));

                setSearchResults(formattedResults);
                setShowDropdown(true);
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    };

    const handleSelectResult = (result) => {
        const lat = parseFloat(result.lat).toFixed(10);
        const lon = parseFloat(result.lon).toFixed(10);
        onLocationSelect(lat, lon, result.display_name);
        setSearchQuery(result.display_name);
        setShowDropdown(false);
    };

    const reverseGeocode = async (lat, lon) => {
        setIsReverseGeocoding(true);
        try {
            // Using Nominatim for reverse geocoding as it's more accurate for coordinates
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
            const data = await response.json();
            const formattedLat = parseFloat(lat).toFixed(10);
            const formattedLon = parseFloat(lon).toFixed(10);
            if (data && data.display_name) {
                onLocationSelect(formattedLat, formattedLon, data.display_name);
            } else {
                onLocationSelect(formattedLat, formattedLon, '');
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            const formattedLat = parseFloat(lat).toFixed(10);
            const formattedLon = parseFloat(lon).toFixed(10);
            onLocationSelect(formattedLat, formattedLon, '');
        } finally {
            setIsReverseGeocoding(false);
        }
    };

    const MapEvents = () => {
        const map = useMapEvents({
            click(e) {
                const { lat, lng } = e.latlng;
                reverseGeocode(lat, lng);
            },
        });
        
        useEffect(() => {
            if (map) setMapInstance(map);
        }, [map]);
        
        return null;
    };

    const ChangeView = ({ center }) => {
        const map = useMap();
        useEffect(() => {
            if (center) {
                map.setView(center, 17);
            }
        }, [center, map]);
        return null;
    };

    return (
        <div className="map-picker-container" style={{ position: 'relative', width: '100%' }}>
            <div ref={searchRef} style={{ marginBottom: '12px', position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                    <Search 
                        size={18} 
                        style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} 
                    />
                    <input
                        type="text"
                        className="hrm-input"
                        placeholder="Search for a location"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        style={{ paddingLeft: '44px', height: '48px', fontSize: '14px' }}
                    />
                    {isSearching && (
                        <Loader2 
                            size={18} 
                            className="animate-spin" 
                            style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-blue)' }} 
                        />
                    )}
                </div>

                {showDropdown && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        background: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        marginTop: '4px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        maxHeight: '200px',
                        overflowY: 'auto'
                    }}>
                        {searchResults.length > 0 ? (
                            searchResults.map((result, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleSelectResult(result)}
                                    style={{
                                        padding: '12px 16px',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        borderBottom: index === searchResults.length - 1 ? 'none' : '1px solid #F1F5F9',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = '#F8FAFC'}
                                    onMouseLeave={(e) => e.target.style.background = 'white'}
                                >
                                    {result.display_name}
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '12px 16px', fontSize: '13px', color: '#64748B', textAlign: 'center' }}>
                                No locations found
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div style={{ 
                height: '300px', 
                width: '100%', 
                borderRadius: '16px', 
                overflow: 'hidden', 
                border: '1px solid #E2E8F0',
                position: 'relative'
            }}>
                <MapContainer 
                    center={position || defaultCenter} 
                    zoom={position ? 17 : 12} 
                    style={{ height: '100%', width: '100%', cursor: 'crosshair' }}
                >
                    <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                    />
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
                        opacity={0.8}
                        zIndex={1000}
                    />
                    <MapEvents />
                    {position && (
                        <>
                            <Marker position={position} icon={DefaultIcon} />
                            <Circle 
                                center={position}
                                radius={radius}
                                pathOptions={{
                                    fillColor: '#3B82F6',
                                    fillOpacity: 0.15,
                                    color: '#0052ff',
                                    weight: 2,
                                    dashArray: '5, 8'
                                }}
                            />
                            <ChangeView center={position} />
                        </>
                    )}
                </MapContainer>
                
                {isReverseGeocoding && (
                    <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        zIndex: 1000,
                        background: 'white',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 700,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--primary-blue)'
                    }}>
                        <Loader2 size={12} className="animate-spin" />
                        Fetching location...
                    </div>
                )}
            </div>

            <div style={{ marginTop: '12px' }}>
                {!position ? (
                    <p style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} /> Search for a location above or click on the map to set location
                    </p>
                ) : (
                    <p style={{ fontSize: '12px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                        <CheckCircle2 size={14} /> Location pinned
                    </p>
                )}
            </div>
        </div>
    );
};

export default MapPicker;
