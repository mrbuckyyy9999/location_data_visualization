const express = require('express');
const cors = require('cors'); // Allows your phones to talk to the server
const app = express();

app.use(express.json());
app.use(cors());

// Temporary memory to store your peers' locations
let peers = {}; 

// 1. RECEIVE DATA: The Emitter phone posts raw data here
app.post('/update', (req, res) => {
    const { peerId, lat, lng } = req.body;
    peers[peerId] = { lat: lat, lng: lng, timestamp: Date.now() };
    res.sendStatus(200);
});

// 2. SEND DATA: The Visualizer phone asks for GeoJSON here
app.get('/locations.geojson', (req, res) => {
    
    // We dynamically build a standard GeoJSON FeatureCollection
    const features = Object.keys(peers).map(id => {
        return {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                // IMPORTANT: GeoJSON is always [Longitude, Latitude]
                "coordinates": [peers[id].lng, peers[id].lat] 
            },
            "properties": {
                "name": id,
                "lastUpdate": peers[id].timestamp
            }
        };
    });

    // Send the correctly formatted GeoJSON object back to the map
    res.json({
        "type": "FeatureCollection",
        "features": features
    });
});

app.listen(3000, () => console.log('API is running'));