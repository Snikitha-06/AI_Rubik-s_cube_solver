// Import React state hooks
import { useState } from 'react';
// Import the CubeRotationGuide component to display
import CubeRotationGuide from './CubeRotationGuide';

// Demo page component to showcase and interact with the CubeRotationGuide
export default function CubeRotationGuideDemo() {
  // State hook tracking current active rotation direction
  const [direction, setDirection] = useState('right');
  // State hook tracking whether animations are enabled
  const [isAnimating, setIsAnimating] = useState(true);
  // State hook tracking whether compact view mode is enabled
  const [compact, setCompact] = useState(false);

  // List of all rotation directions supported by the guide
  const directions = ['up', 'down', 'left', 'right', 'clockwise', 'counterClockwise'];

  // Text details mapping for each direction option
  const instructionMap = {
    up: { text: 'Tilt Up', detail: 'Rotate cube upward to show top face' },
    down: { text: 'Tilt Down', detail: 'Rotate cube downward to show bottom face' },
    left: { text: 'Rotate Left', detail: 'Rotate cube counter-clockwise (⟲)' },
    right: { text: 'Rotate Right', detail: 'Rotate cube clockwise (⟳)' },
    clockwise: { text: 'Clockwise Spin', detail: 'Spin cube clockwise around Z-axis' },
    counterClockwise: { text: 'Counter-Clockwise', detail: 'Spin cube counter-clockwise' },
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Banner Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Cube Rotation Guide</h1>
          <p className="text-blue-300">Professional Rubik's Cube solver indicator with smooth animations</p>
        </div>

        {/* Configuration panel container */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 mb-8 border border-blue-500/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Direction Selector Panel */}
            <div>
              <label className="block text-white font-semibold mb-3">Direction</label>
              <div className="grid grid-cols-3 gap-2">
                {directions.map(dir => (
                  <button
                    key={dir}
                    onClick={() => setDirection(dir)} // Switch active preview direction
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                      direction === dir
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {dir.split(/(?=[A-Z])/).join(' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkbox triggers for visual states */}
            <div className="flex flex-col gap-3 justify-between">
              {/* Animation toggle checkbox */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnimating}
                  onChange={e => setIsAnimating(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-white font-semibold">Animate</span>
              </label>
              {/* Compact mode toggle checkbox */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={compact}
                  onChange={e => setCompact(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-white font-semibold">Compact Mode</span>
              </label>
            </div>
          </div>
        </div>

        {/* Display main interactive preview area */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Live Preview</h2>
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-blue-500/20">
            {/* Render interactive guide with active settings */}
            <CubeRotationGuide
              direction={direction}
              isAnimating={isAnimating}
              instruction={instructionMap[direction].text}
              instructionDetail={instructionMap[direction].detail}
              showInstructionCard={true}
              compact={compact}
            />
          </div>
        </div>

        {/* Feature showcase grids showcasing all states simultaneously */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">All Directions Preview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {directions.map(dir => (
              <div key={dir} className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20 hover:border-blue-500/50 transition-all">
                <h3 className="text-lg font-bold text-white mb-4">
                  {dir.split(/(?=[A-Z])/).join(' ')}
                </h3>
                <div className="h-40 bg-gradient-to-br from-slate-900 to-slate-950 rounded-lg flex items-center justify-center">
                  <div className="scale-50">
                    <CubeRotationGuide
                      direction={dir}
                      isAnimating={true}
                      showInstructionCard={false}
                      compact={true}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inline Component usage instructions and markdown code docs */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-blue-500/20">
          <h2 className="text-2xl font-bold text-white mb-6">Usage Examples</h2>

          <div className="space-y-6">
            {/* Simple component import/render block */}
            <div>
              <h3 className="text-lg font-semibold text-blue-300 mb-3">Basic Usage</h3>
              <pre className="bg-slate-900 rounded-lg p-4 overflow-x-auto text-sm text-green-400">
{`import CubeRotationGuide from './components/CubeRotationGuide';

function MyComponent() {
  return (
    <CubeRotationGuide
      direction="right"
      instruction="Rotate Right"
      instructionDetail="Turn the cube clockwise"
    />
  );
}`}
              </pre>
            </div>

            {/* Overlay camera wrapper render code block */}
            <div>
              <h3 className="text-lg font-semibold text-blue-300 mb-3">Compact Mode (Camera Overlay)</h3>
              <pre className="bg-slate-900 rounded-lg p-4 overflow-x-auto text-sm text-green-400">
{`<CubeRotationGuide
  direction="up"
  isAnimating={true}
  instruction="Tilt Up"
  instructionDetail="Show the top face"
  compact={true}
  showInstructionCard={true}
/>`}
              </pre>
            </div>

            {/* Reference properties table */}
            <div>
              <h3 className="text-lg font-semibold text-blue-300 mb-3">Props Reference</h3>
              <div className="bg-slate-900 rounded-lg p-4 space-y-2 text-sm font-mono">
                <div className="text-gray-300">
                  <span className="text-blue-400">direction</span>
                  <span className="text-gray-500">: 'up' | 'down' | 'left' | 'right' | 'clockwise' | 'counterClockwise'</span>
                </div>
                <div className="text-gray-300">
                  <span className="text-blue-400">isAnimating</span>
                  <span className="text-gray-500">: boolean</span>
                </div>
                <div className="text-gray-300">
                  <span className="text-blue-400">instruction</span>
                  <span className="text-gray-500">: string</span>
                </div>
                <div className="text-gray-300">
                  <span className="text-blue-400">instructionDetail</span>
                  <span className="text-gray-500">: string</span>
                </div>
                <div className="text-gray-300">
                  <span className="text-blue-400">showInstructionCard</span>
                  <span className="text-gray-500">: boolean (default: true)</span>
                </div>
                <div className="text-gray-300">
                  <span className="text-blue-400">compact</span>
                  <span className="text-gray-500">: boolean (default: false)</span>
                </div>
              </div>
            </div>

            {/* Features description list */}
            <div>
              <h3 className="text-lg font-semibold text-blue-300 mb-3">✨ Features</h3>
              <ul className="space-y-2 text-gray-300">
                <li>✓ Semi-transparent 3D cube with Material Design styling</li>
                <li>✓ Animated curved SVG arrows with blue glow effects</li>
                <li>✓ Smooth CSS + Framer Motion animations</li>
                <li>✓ Face highlights based on rotation direction</li>
                <li>✓ Mobile responsive layout</li>
                <li>✓ Camera overlay compatibility</li>
                <li>✓ Clockwise and counter-clockwise indicators</li>
                <li>✓ Dynamic SVG arrow generation</li>
                <li>✓ Reusable, fully customizable component</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
