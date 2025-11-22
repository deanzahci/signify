# Signify Project Context

## Project Overview
**Signify** is a real-time American Sign Language (ASL) recognition application. It features a split architecture with a Python-based machine learning backend for inference and a React Native (Expo) frontend for the user interface. The system supports both static gesture recognition (letters) and sequential gesture recognition (words/phrases).

## Architecture

### 1. Backend (`back/`)
The backend is a high-performance WebSocket server designed for low-latency ML inference.
- **Stack:** Python 3.11+, `websockets`, `asyncio`.
- **ML Inference:** Migrated from raw PyTorch to **ONNX Runtime** for speed (~100ms latency).
- **Computer Vision:** `mediapipe` for hand landmark extraction, `opencv-python-headless` for image processing.
- **Entry Point:** `back/main.py` initializes the `SignifyServer`.
- **Deployment:** Dockerized (`Dockerfile`), configured for Railway (`railway.toml`).
- **Key Components:**
    - `app/producer.py`: Handles incoming WebSocket messages and pipeline coordination.
    - `services/inference.py` & `services/onnx_predictor.py`: Core inference logic.
    - `services/preprocessing.py`: Normalization and landmark extraction.

### 2. Frontend (`front/signify/`)
A cross-platform mobile application built with React Native and Expo.
- **Stack:** Expo (SDK 54), React Native 0.81, NativeWind (Tailwind CSS), Firebase.
- **Key Features:**
    - **Game Modes:** Quiz, Speed, and Word games to practice ASL.
    - **Real-time Feedback:** Uses camera input to detect signs via WebSocket connection to the backend.
    - **Social:** Leaderboards and user profiles.
- **Routing:** Expo Router (File-based routing).
- **Styling:** NativeWind (`global.css`, `tailwind.config.js`).

### 3. Machine Learning (`model/`)
The ML pipeline handles data preparation, training, and export.
- **Models:**
    - **MLP:** For static letter recognition (Kaggle ASL Alphabet).
    - **LSTM/TCN:** For sequential word recognition (MS-ASL).
- **Workflow:** Data -> MediaPipe Landmarks -> PyTorch Training -> ONNX Export -> Backend Inference.
- **Output:** Full softmax distribution for all classes (letters/words) to provide confidence scores.

## Building and Running

### Backend
1.  **Navigate to directory:** `cd back`
2.  **Install dependencies:** `pip install -r requirements.txt`
3.  **Ensure Model Exists:** Verify `back/models/lstm_best_acc0.9946.onnx` exists.
4.  **Run Server:** `python main.py`
    - Server listens on `0.0.0.0:8765`.
    - Logs are output to console and `logs/server.log`.

### Frontend
1.  **Navigate to directory:** `cd front/signify`
2.  **Install dependencies:** `npm install`
3.  **Start Expo:** `npx expo start`
    - Use `w` for web, `a` for Android, `i` for iOS.

### Docker (Backend)
The backend can be built and run using Docker:
```bash
docker build -t signify-backend ./back
docker run -p 8765:8765 signify-backend
```

## Development Conventions

- **Code Style:**
    - **Python:** Follows PEP 8. Type hinting is encouraged (`typing` module).
    - **JavaScript/TypeScript:** ESLint is configured. Uses Functional Components and Hooks.
- **Testing:**
    - Backend tests are in `back/tests/`. Run with `python -m pytest back/tests/` (or similar).
    - Frontend linting via `npm run lint`.
- **State Management:**
    - Backend uses a custom `PipelineState` class.
    - Frontend uses React Context (`AuthContext`, `ThemeContext`).
- **Communication:**
    - Communication between Frontend and Backend happens via WebSockets.
    - Protocol involves sending/receiving JSON payloads or binary image data (check `back/app/consumer.py` or `front/signify/services/websocket.js` for protocol details).

## Key Documentation Files
- `back/ONNX_MIGRATION_SUMMARY.md`: Details the shift to ONNX for performance.
- `back/QUICKSTART_ONNX.md`: Guide for setting up the inference server.
- `model/IMPLEMENTATION_SUMMARY.md`: Detailed architectural breakdown of the ML models.
- `front/signify/README.md`: Frontend setup guide.
