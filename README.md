# NxNxN Rubik's Cube Solver (3x3 - 21x21)

A professional-grade, high-performance Rubik's Cube application capable of simulating and solving cubes ranging from the classic 3x3 up to the massive 21x21. 

## 🌟 Key Features

- **Dynamic NxN Support**: Seamlessly switch between any cube size from 3x3x3 up to 21x21x21.
- **High-Performance 3D Visualization**: Optimized rendering using "Surface-Only" logic to ensure smooth interaction even with 21x21 cubes (2,400+ visible pieces).
- **Dual Input Methods**:
  - **Camera Capture**: Scan physical cubes (up to 5x5) using your webcam with real-time color detection.
  - **Manual Editor**: Interactive 2D grid editor with "Paint Face" shortcuts for rapid setup of large cubes.
- **Advanced Solving Engine**:
  - **3x3**: Uses the optimal **Kociemba Algorithm** for the shortest possible solutions.
  - **NxN (4x4 - 21x21)**: Utilizes a **Reduction Method** and **Move Retracing** to provide guaranteed solutions for high-order cubes.
- **Interactive Playback**: Step through solutions with full play/pause, speed controls, and move descriptions.

---

## 🛠️ Tech Stack

- **Frontend**: React, Three.js (@react-three/fiber), Vite.
- **Backend**: Python, Flask, OpenCV (Color Detection), Kociemba (Solver).
- **Styling**: Vanilla CSS with modern dark-mode aesthetics.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **Python** (3.8 or higher)
- **Webcam** (for camera scanning feature)

### 2. Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install flask flask-cors opencv-python numpy kociemba magiccube
   ```
3. Start the API server:
   ```bash
   python server.py
   ```
   *The server will run on `http://127.0.0.1:5000`*

### 3. Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *The app will be available at the URL shown in your terminal (typically `https://localhost:5173` or similar).*

---

## 📖 How to Use

### Step 1: Select Your Cube Size
Use the **SIZE slider** in the header to select your desired cube dimensions (e.g., 3x3, 9x9, or 21x21).

### Step 2: Input the Cube State
- **Option A (Manual)**: Select a color from the palette and click on the 2D grid to paint stickers. Use "Paint Entire Face" for large cubes.
- **Option B (Camera)**: For 3x3 to 5x5 cubes, use the "Scan" tab. Follow the on-screen prompts to scan all 6 faces.

### Step 3: Solve the Cube
1. Click the **🔮 Solve** button. 
2. The backend will calculate the solution. For large cubes, this may involve reducing the cube to a 3x3 state first.
3. Once the solution appears in the right panel, use the **▶ Play** button to watch the 3D model solve itself!

---

## ⚠️ Troubleshooting
- **Color Detection**: Ensure you have good lighting when using the camera. If colors look wrong, you can quickly fix them in the Manual Editor.
- **Performance**: If a 21x21 cube feels laggy, try closing other browser tabs. The app is optimized, but high-order cubes are computationally intensive.
- **Solver Limit**: Optimal (shortest) solving is reserved for 3x3. For NxN, the solver focuses on reliability and correctness over move count.
