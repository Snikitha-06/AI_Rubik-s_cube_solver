// Import global stylesheet for custom fonts, layouts, and styles
import './App.css';
// Import the main container component of the Rubik's Cube Solver application
import CubeApp from './components/CubeApp';

// Define the root App component that wraps and mounts our cube app UI
function App() {
  // Render the primary CubeApp component
  return <CubeApp />;
}

// Export the App component as default for entry point mounting
export default App;
