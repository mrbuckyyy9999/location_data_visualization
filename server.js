const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// 1. A crude 1D Kalman Filter written in vanilla JavaScript
class SimpleKalman {
    constructor(R = 0.0001, Q = 0.00001) {
        this.R = R; // Measurement noise (GPS inaccuracy)
        this.Q = Q; // Process noise (Walking momentum variance)
        this.p = 1; // Estimation error
        this.x = null; // Current estimated value
    }
    filter(measurement) {
        if (this.x === null) {
            this.x = measurement;
            return this.x;
        }
        this.p = this.p + this.Q;
        let K = this.p / (this.p + this.R);
        this.x = this.x + K * (measurement - this.x);
        this.p = (1 - K) * this.p;
        return this.x;
    }
}

let peers = {}; 

app.post('/update', (req, res) => {
    const { peerId, lat, lng } = req.body;
    
    // 2. Initialize the peer's history and their dedicated filters
    if (!peers[peerId]) {
        peers[peerId] = {
            path: [], // Array to hold the trail of coordinates
            filterLat: new SimpleKalman(),
            filterLng: new SimpleKalman(),
            timestamp: Date.now()
        };
    }

    // 3. Smooth the raw GPS data using the Kalman filters
    const smoothedLat = peers[peerId].filterLat.filter(lat);
    const smoothedLng = peers[peerId].filterLng.filter(lng);

    // 4. Save to history array (GeoJSON requires [Longitude, Latitude])
    peers[peerId].path.push([smoothedLng, smoothedLat]);
    peers[peerId].timestamp = Date.now();

    res.sendStatus(200);
});

app.get('/locations.geojson', (req, res) => {
    let features = [];

    Object.keys(peers).forEach(id => {
        const peer = peers[id];
        if (peer.path.length === 0) return;

        // 5a. Build the Trail (LineString)
        if (peer.path.length > 1) {
            features.push({
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": peer.path // The whole array of history
                },
                "properties": { "name": `${id}'s Path` }
            });
        }

        // 5b. Build the Current Location (Point)
        const currentLocation = peer.path[peer.path.length - 1];
        features.push({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": currentLocation // Just the newest coordinate
            },
            "properties": { "name": id }
        });
    });

    // Send BOTH the trail and the dot back to the phone
    res.json({
        "type": "FeatureCollection",
        "features": features
    });
});

app.listen(3000, () => console.log('API running with Kalman Filtering'));
