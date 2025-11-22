# Sign Language Recognition WebSocket Integration

## Overview
This document describes the real-time sign language recognition integration between the React Native frontend and the Python backend via WebSocket.

## Implementation Status
✅ **Frontend Ready** - WebSocket client, frame capture, and UI integration complete
⚠️ **Backend Pending** - Waiting for backend API to come online

## Configuration

### WebSocket URL
Edit `config/signRecognition.js` to set your backend URL:

```javascript
websocket: {
  url: 'ws://localhost:8000/ws', // Change this to your backend URL
}
```

## Data Flow

### 1. Frontend → Backend (Request)
```javascript
{
  "jpeg_blob": "<base64_encoded_jpeg>",  // Camera frame as base64 JPEG
  "new_letter": "A" or null               // Target letter (null = no change)
}
```

**Logging:** The frontend logs every frame sent:
```
📤 Sending to backend: {
  new_letter: "A",
  jpeg_size: 45678,
  timestamp: "2024-11-21T20:30:00.000Z",
  format: "base64 encoded JPEG"
}
```

### 2. Backend → Frontend (Response)
```javascript
{
  "maxarg_letter": "A",     // AI's best guess for the sign
  "target_arg_prob": 0.85   // Confidence score (0-1)
}
```

**Logging:** The frontend logs every response:
```
📥 Received from backend: {
  maxarg_letter: "A",
  target_arg_prob: 0.85,
  timestamp: "2024-11-21T20:30:00.100Z"
}
```

## Key Features

### Automatic Detection
- **Quiz Mode**: 80% confidence threshold, 3 consecutive detections required
- **Speed Mode**: 70% confidence threshold, 2 consecutive detections (faster gameplay)
- Auto-advances to next letter when threshold met

### Visual Feedback
- Real-time confidence progress bar
- Connection status indicator (green = connected, red = offline)
- Shows detected letter vs. target letter

### Offline Mode
- **When API is offline**: Shows "AI NOT ONLINE - Test Mode"
- Falls back to manual test button
- All WebSocket errors logged with "⚠️ API NOT ONLINE"

### Frame Capture
- 10 FPS (100ms intervals)
- JPEG quality: 0.5
- Max width: 640px
- Base64 encoded

## Testing Without Backend

The app works in "Test Mode" when the backend is offline:
1. Shows "AI NOT ONLINE - Test Mode" indicator
2. Displays manual test button for simulating detection
3. Logs all attempted connections and data that would be sent

## Console Monitoring

Open browser dev tools or React Native debugger to see:

```
🔌 Attempting WebSocket connection to: ws://localhost:8000/ws
⚠️ API NOT ONLINE - Cannot establish WebSocket connection
📸 Frame captured: {frameNumber: 1, size: "45.2 KB"}
📤 Sending to backend: {new_letter: "A", jpeg_size: 46234}
⚠️ API NOT ONLINE - Cannot send frame, WebSocket not connected
```

## Files Created

1. **services/websocket.js** - WebSocket client with reconnection logic
2. **utils/frameCapture.js** - Camera frame extraction utility
3. **services/signDetection.js** - Coordinates detection logic
4. **config/signRecognition.js** - Configuration settings

## Backend Requirements

Your backend should:
1. Accept WebSocket connections at the configured URL
2. Handle the JSON payload format described above
3. Send "emergency reset" when `new_letter` is non-null
4. Return confidence scores in real-time
5. Implement the temporal smoothing as specified

## Troubleshooting

### "API NOT ONLINE" Messages
- Backend is not running or not accessible
- Check WebSocket URL in config/signRecognition.js
- Verify backend is listening on correct port

### No Frame Capture
- Camera permissions not granted
- Camera not ready (wait for onCameraReady)
- Check console for "📸 Frame captured" messages

### Detection Not Working
- Check confidence threshold settings
- Verify target letter is being set correctly
- Monitor console for "🤖 Recognition result" logs

## Quick Start

1. Start your backend WebSocket server
2. Update `config/signRecognition.js` with backend URL
3. Run the app: `npm start`
4. Grant camera permissions when prompted
5. Start Quiz or Speed game
6. Monitor console for real-time logs