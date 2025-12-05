<template>
    <div class="attack-map-wrapper">
        <div ref="mapContainer" class="map-container"></div>
        <div class="map-legend" v-if="attacks.length > 0">
            <div class="legend-item">
                <span class="dot attacker-dot"></span> {{ $t('components.map.attacker') }}
            </div>
            <div class="legend-item">
                <span class="dot target-dot"></span> {{ $t('components.map.target') }}
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted, watch, ref, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const props = defineProps({
    attacks: {
        type: Array,
        required: true,
        default: () => []
    },
    honeypotLocation: {
        type: Object,
        default: () => ({ lat: 48.8566, lng: 2.3522, label: 'Honeypot (Paris)' })
    }
});

let map = null;
let markersLayer = null;
const mapContainer = ref(null);

// Icons

const targetIcon = L.divIcon({
    className: 'custom-div-icon',
    html: "<div class='target-marker'><div class='pulse'></div></div>",
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

// 0. Defines
const DEFCON_COLORS = {
    5: '#1e88e5', // Blue
    4: '#43a047', // Green
    3: '#fdd835', // Yellow
    2: '#e53935', // Red
    1: '#ffffff'  // White
};

const getDefconColor = (level) => DEFCON_COLORS[level] || '#ff4444';

// Custom Arrow Icon factory
const createArrowIcon = (degree, color) => {
    return L.divIcon({
        className: 'arrow-icon',
        html: `<div style="transform: rotate(${-degree}deg); font-size: 16px; color: ${color}; text-shadow: 0 0 5px ${color};">➤</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
};

const initMap = () => {
    if (map) return;
    const hp = props.honeypotLocation;

    // Init map
    map = L.map(mapContainer.value, {
        center: [hp.lat, hp.lng],
        zoom: 4,
        minZoom: 3, // Prevent zooming out to infinity
        maxBounds: [[-90, -180], [90, 180]], // Restrict panning to one world
        maxBoundsViscosity: 1.0, // Sticky bounds
        scrollWheelZoom: true, // Enable scroll zoom
        zoomControl: true, // Enable zoom controls
        attributionControl: false
    });

    // Esri Dark Gray Canvas (Lighter Dark Theme)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 16,
        noWrap: true // Prevent repeating tiles
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);

    // Render initial data
    renderAttacks();
};

const calculateAngle = (lat1, lng1, lat2, lng2) => {
    // Simple angle calculation for bearing
    const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
    const brng = Math.atan2(y, x);
    return (brng * 180 / Math.PI + 360) % 360; // Degrees
};

// Helper: parse "lat,lng" string
const parseLoc = (locStr) => {
    if (!locStr) return null;
    const parts = locStr.split(',');
    if (parts.length !== 2) return null;
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
};

const renderAttacks = () => {
    if (!map) return;
    markersLayer.clearLayers();

    const hp = props.honeypotLocation;

    // 1. Draw Honeypot
    L.marker([hp.lat, hp.lng], { icon: targetIcon })
        .bindPopup(`<b>${hp.label}</b>`)
        .addTo(markersLayer);

    // 2. Draw Attackers
    if (!props.attacks || props.attacks.length === 0) return;

    const validBounds = L.latLngBounds([[hp.lat, hp.lng]]);

    // Group attacks by location key to handle overlaps
    const grouped = {};
    props.attacks.forEach(attack => {
        const ipInfo = attack.ipDetails?.ipinfo;
        const locStr = ipInfo?.loc;
        if (!locStr) return;

        const parts = locStr.split(',');
        if (parts.length !== 2) return;
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (isNaN(lat) || isNaN(lng)) return;

        const key = `${lat},${lng}`;
        if (!grouped[key]) grouped[key] = { lat, lng, items: [] };
        grouped[key].items.push(attack);
    });

    // Render grouped attacks
    Object.values(grouped).forEach(group => {
        group.items.forEach((attack, i) => {
            let finalLoc = { lat: group.lat, lng: group.lng };

            // Apply Spiral Layout if more than 1 item in group
            if (group.items.length > 1) {
                // Spiral parameters optimized for visibility at Zoom 2-3
                // Angle spacing: Golden Angle (~2.4 radians) prevents alignment
                // Radius spacing: Grows with square root of index for uniform density
                const angle = i * 2.4;
                const radiusStep = 1.5; // Degrees (~150km, visible on world map)
                const radius = radiusStep * Math.sqrt(i + 1);

                finalLoc.lat += radius * Math.cos(angle);
                finalLoc.lng += radius * Math.sin(angle);
            }

            // Helper: Quadratic Bezier curve
            const getQuadraticBezierXYatT = (startPt, controlPt, endPt, T) => {
                const x = Math.pow(1 - T, 2) * startPt.x + 2 * (1 - T) * T * controlPt.x + Math.pow(T, 2) * endPt.x;
                const y = Math.pow(1 - T, 2) * startPt.y + 2 * (1 - T) * T * controlPt.y + Math.pow(T, 2) * endPt.y;
                return { x, y };
            };

            const getCurvePoints = (startLat, startLng, endLat, endLng) => {
                const numPoints = 50;
                const points = [];

                // Project points to simple plane for calculation (Mercatorish approximation locally sufficient for visual curve)
                // For global "missile" feel, a simple offset to the "North" logic is often visually clearer than perpendicular
                // relative to the line, but let's try perpendicular for a true arc.

                // Using pixels or simple lat/lng space? Lat/Lng space works for Leaflet polylines usually.

                const startPt = { x: startLng, y: startLat };
                const endPt = { x: endLng, y: endLat };

                // Midpoint
                const midX = (startPt.x + endPt.x) / 2;
                const midY = (startPt.y + endPt.y) / 2;

                // Distance (approx)
                const dist = Math.sqrt(Math.pow(endPt.x - startPt.x, 2) + Math.pow(endPt.y - startPt.y, 2));

                // Control Point: Perpendicular offset
                // Vector
                const vX = endPt.x - startPt.x;
                const vY = endPt.y - startPt.y;

                // Normal vector (-y, x)
                // Curve "up" or "Left/Right"? 
                // To simulate missile, often "Up" (North) is faked by adding Y.
                // But varying offset creates chaos.
                // Let's use a fixed "Arc Height" ratio.
                const arcHeight = 0.2; // 20% of distance

                // Perpendicular
                let cpX = midX - vY * arcHeight;
                let cpY = midY + vX * arcHeight;

                // Fix: If arc goes too far south/north/weird, maybe simpler is just "add to Latitude"?
                // "Missile trajectory" usually looks like a Great Circle (Geodesic). 
                // A Bezier curve simulates this well if we just bow it out.
                // Let's stick to perpendicular.

                const controlPt = { x: cpX, y: cpY };

                for (let i = 0; i <= numPoints; i++) {
                    const t = i / numPoints;
                    const pos = getQuadraticBezierXYatT(startPt, controlPt, endPt, t);
                    points.push([pos.y, pos.x]); // Leaflet uses [lat, lng]
                }

                return points;
            };

            // Calculate angle at specific T on curve for arrow
            const getAngleAtT = (startPt, controlPt, endPt, T) => {
                // Exact tangent can be found by derivative of Bezier
                // B'(t) = 2(1-t)(P1-P0) + 2t(P2-P1)
                const dx = 2 * (1 - T) * (controlPt.x - startPt.x) + 2 * T * (endPt.x - controlPt.x);
                const dy = 2 * (1 - T) * (controlPt.y - startPt.y) + 2 * T * (endPt.y - controlPt.y);
                return (Math.atan2(dy, dx) * 180 / Math.PI); // Degrees, 0 is East (standard math)
            };

            // Logic for Color & Width
            const color = getDefconColor(attack.dangerLevel);

            // Width based on Speed (RPS) and Intensity (Total Logs)
            // Base width: 2
            // RPS factor: up to +4
            // Log factor: up to +4
            // Max width: ~10
            const rps = attack.rps || 0;
            const logCount = attack.totaleLogs || 1;

            let weight = 2 + (Math.min(rps, 20) / 4) + (Math.log10(logCount) * 1.5);
            weight = Math.min(Math.max(weight, 1), 12); // Clamp between 1 and 12

            const ipInfo = attack.ipDetails?.ipinfo;

            // Marker - use colored dot if possible, or fallback to standard red for simplicity 
            // but user asked for "color arrow", implies line/arrow specific.
            // Let's keep marker standard but maybe add a border color?
            // For now standard red marker is fine for "Attacker", 
            // but maybe we can tint it? Leaflet DivIcon allows HTML.
            // Let's create a dynamic marker icon too?
            // User requested "arrow color", let's stick to line/arrow first.

            const dynamicMarker = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class='attacker-marker' style='background-color: ${color}; box-shadow: 0 0 8px ${color};'></div>`,
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            });

            const m = L.marker([finalLoc.lat, finalLoc.lng], { icon: dynamicMarker, zIndexOffset: 100 })
                .bindPopup(`
                <div>
                    <b>${attack.request.ip}</b><br>
                    ${ipInfo.city || ''} (${ipInfo.country || '?'})<br>
                    Score: ${attack.dangerScore}<br>
                    Level: ${attack.dangerLevel}<br>
                    RPS: ${rps.toFixed(2)}
                </div>
                `)
                .addTo(markersLayer);

            // Curve: Attacker -> Honeypot
            // Recalculate control point for angle usage
            const sP = { x: finalLoc.lng, y: finalLoc.lat };
            const eP = { x: hp.lng, y: hp.lat };
            const dist = Math.sqrt(Math.pow(eP.x - sP.x, 2) + Math.pow(eP.y - sP.y, 2));
            // Control Point Logic mirrored
            const vX = eP.x - sP.x;
            const vY = eP.y - sP.y;
            const arcHeight = 0.2;
            const cP = { x: (sP.x + eP.x) / 2 - vY * arcHeight, y: (sP.y + eP.y) / 2 + vX * arcHeight };

            const curvePoints = getCurvePoints(finalLoc.lat, finalLoc.lng, hp.lat, hp.lng);

            // Polyline with flow class
            const polyline = L.polyline(curvePoints, {
                color: color,
                weight: weight,
                opacity: 0.8,
                className: 'missile-line' // Hook for CSS animation
            }).addTo(markersLayer);

            // Arrow Position (e.g. at 60% of path)
            const arrowT = 0.6;
            // Calculate position at T
            const arrowPosXY = getQuadraticBezierXYatT(sP, cP, eP, arrowT);
            const arrowAngle = getAngleAtT(sP, cP, eP, arrowT);

            // Determine icon rotation adjustment:
            // Standard math 0 is East (Right). 
            // Our icon ➤ points Right.
            // CSS rotation is Clockwise, Math is Counter-Clockwise. 
            // We handle inversion in createArrowIcon.

            const arrowM = L.marker([arrowPosXY.y, arrowPosXY.x], {
                icon: createArrowIcon(arrowAngle, color),
                interactive: false,
                zIndexOffset: 50
            }).addTo(markersLayer);

            validBounds.extend([finalLoc.lat, finalLoc.lng]);
        });
    });

    // Fit bounds if we have points, but don't zoom in too much
    if (props.attacks.length > 0) {
        map.fitBounds(validBounds, { padding: [50, 50], maxZoom: 12 });
    }
};

onMounted(() => {
    initMap();
});

watch(() => props.attacks, () => {
    renderAttacks();
}, { deep: true });

onBeforeUnmount(() => {
    if (map) {
        map.remove();
        map = null;
    }
});

</script>

<style scoped>
.attack-map-wrapper {
    position: relative;
    width: 100%;
    height: 400px;
    background: #1e1e1e;
    border-radius: 8px;
    overflow: hidden;
}

.map-container {
    width: 100%;
    height: 100%;
    z-index: 1;
}

.map-legend {
    position: absolute;
    bottom: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.7);
    padding: 10px;
    border-radius: 4px;
    z-index: 1000;
    color: #fff;
    font-size: 12px;
}

.legend-item {
    display: flex;
    align-items: center;
    margin-bottom: 4px;
}

.dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 8px;
}

.attacker-dot {
    background: #ff4444;
    box-shadow: 0 0 5px #ff4444;
}

.target-dot {
    background: #00ff00;
    box-shadow: 0 0 8px #00ff00;
}

/* Global Styles for Pins (needed because Leaflet renders outside scope) */
:global(.attacker-marker) {
    width: 12px;
    height: 12px;
    background-color: #ff4444;
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(255, 68, 68, 0.8);
    border: 1px solid #fff;
}

:global(.target-marker) {
    width: 16px;
    height: 16px;
    position: relative;
    background-color: #00ff00;
    /* Green Target */
    border-radius: 50%;
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.8);
    border: 2px solid #fff;
    display: flex;
    align-items: center;
    justify-content: center;
}

:global(.target-marker .pulse) {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 2px solid #00ff00;
    animation: pulse-animation 2s infinite;
}

@keyframes pulse-animation {
    0% {
        transform: scale(1);
        opacity: 1;
    }

    100% {
        transform: scale(3);
        opacity: 0;
    }
}

:global(.arrow-icon) {
    /* Reset leaflet default */
    background: transparent;
    border: none;
}

:global(.missile-line) {
    stroke-dasharray: 8, 12;
    /* Dash pattern */
    animation: missile-flow 1s linear infinite;
    /* Fast flow animation */
}

@keyframes missile-flow {
    to {
        stroke-dashoffset: -20;
        /* Move dashes */
    }
}
</style>
