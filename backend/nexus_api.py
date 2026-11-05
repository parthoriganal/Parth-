"""Nexus Core — Immersive full-stack data visualization API.
Flask backend serving generative data for a Three.js particle cosmos.
Runs on port 5001. Frontend (Vite) proxies /api/nexus here.
"""
import os
import json
import time
import random
import math
import threading
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ── in-memory "live" data store (simulates a real-time telemetry feed) ──────
_state_lock = threading.Lock()
_state = {
    "t": 0.0,
    "particles": [],
    "metrics": {},
    "events": [],
}

N_PARTICLES = 4000


def _noise(x, y, z):
    """Simple deterministic pseudo-noise (good enough for visuals)."""
    return (
        math.sin(x * 1.7 + z * 1.3) * math.cos(y * 2.1 + x * 0.9)
        + math.sin(y * 3.2 + z * 0.7) * 0.5
    ) * 0.5 + 0.5


def _generate_particles(t):
    """Generate a particle cosmos whose shape drifts over time."""
    pts = []
    for i in range(N_PARTICLES):
        # spherical Fibonacci lattice for even distribution
        phi = math.pi * (3.0 - math.sqrt(5.0))  # golden angle in radians
        y = 1 - (i / float(N_PARTICLES - 1)) * 2  # y from 1 to -1
        radius = math.sqrt(1 - y * y)
        theta = phi * i
        x = math.cos(theta) * radius
        z = math.sin(theta) * radius

        # time-driven warp
        warp = 1.0 + 0.35 * _noise(x * 3 + t * 0.5, y * 3 + t * 0.3, z * 2 + t * 0.4)
        x *= warp
        y *= warp
        z *= warp

        # add a second swirling arm
        swirl = 0.6 * math.sin(t * 0.7 + i * 0.01)
        x2 = x * math.cos(swirl) - z * math.sin(swirl)
        z2 = x * math.sin(swirl) + z * math.cos(swirl)

        # data-derived attributes
        density = _noise(x * 2 + t, y * 2, z * 2 + t)
        energy = _noise(x * 4 + t * 0.8, y * 4, z * 4 + t * 0.6)
        age = random.random()

        pts.append({
            "id": i,
            "x": round(x2 * 12, 4),
            "y": round(y * 12 + swirl * 3, 4),
            "z": round(z2 * 12, 4),
            "density": round(density, 4),
            "energy": round(energy, 4),
            "age": round(age, 4),
            # color derived from position + energy (hue 0-1)
            "hue": round(((x + 1) / 2 * 0.6 + energy * 0.4 + t * 0.02) % 1.0, 4),
        })
    return pts


def _tick():
    """Advance the simulation clock."""
    with _state_lock:
        _state["t"] += 0.05
        _state["particles"] = _generate_particles(_state["t"])
        _state["metrics"] = {
            "particleCount": N_PARTICLES,
            "clock": round(_state["t"], 3),
            "fps_target": 60,
            "energy": round(random.uniform(0.4, 0.95), 3),
            "coherence": round(0.5 + 0.4 * math.sin(_state["t"] * 0.3), 3),
            "uptime": round(time.time(), 1),
        }
        # occasional "event"
        if random.random() < 0.08:
            _state["events"].append({
                "id": int(time.time() * 1000),
                "type": random.choice(["pulse", "burst", "drift", "flare"]),
                "intensity": round(random.uniform(0.5, 1.0), 3),
                "ts": datetime.utcnow().isoformat() + "Z",
            })
            if len(_state["events"]) > 20:
                _state["events"] = _state["events"][-20:]


def _background_loop():
    while True:
        _tick()
        time.sleep(0.1)


# start background simulation thread
threading.Thread(target=_background_loop, daemon=True).start()


# ── routes ─────────────────────────────────────────────────────────────────
@app.get("/api/nexus/health")
def health():
    return jsonify({"status": "ok", "service": "nexus-api", "time": datetime.utcnow().isoformat() + "Z"})


@app.get("/api/nexus/particles")
def particles():
    """Return the current particle cosmos snapshot."""
    with _state_lock:
        return jsonify({
            "count": len(_state["particles"]),
            "t": _state["t"],
            "particles": _state["particles"],
            "metrics": _state["metrics"],
        })


@app.get("/api/nexus/metrics")
def metrics():
    with _state_lock:
        return jsonify(_state["metrics"])


@app.get("/api/nexus/events")
def events():
    with _state_lock:
        return jsonify({"events": list(_state["events"])})


@app.post("/api/nexus/interact")
def interact():
    """Receive mouse/camera interaction from the client and echo a modified state."""
    data = request.get_json(silent=True) or {}
    mx = float(data.get("mouseX", 0.0))
    my = float(data.get("mouseY", 0.0))
    with _state_lock:
        # warp the simulation slightly based on interaction
        _state["t"] += 0.02 * (abs(mx) + abs(my))
        _state["particles"] = _generate_particles(_state["t"])
        return jsonify({
            "ack": True,
            "mouseX": mx,
            "mouseY": my,
            "t": _state["t"],
            "particleCount": len(_state["particles"]),
        })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
