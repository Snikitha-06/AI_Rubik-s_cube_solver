# CubeRotationGuide Component Documentation

## Overview

**CubeRotationGuide** is a professional, reusable React component that displays an interactive 3D Rubik's Cube with smooth animations and SVG rotation arrows. It's designed to guide users through cube rotations with Material Design styling.

## Features

✨ **Visual Design**
- Semi-transparent 3D cube with gradient faces
- Material Design aesthetic
- Smooth drop shadows and glass-morphism effects
- Responsive layout for all screen sizes

🎨 **Animations**
- Smooth Framer Motion-powered rotations
- Animated curved SVG arrows with blue glow effects
- Pulsing status indicators
- Scale transitions on interaction

🔄 **Rotation Directions**
- `up` - Tilt cube upward
- `down` - Tilt cube downward
- `left` - Rotate counter-clockwise
- `right` - Rotate clockwise
- `clockwise` - Spin around Z-axis
- `counterClockwise` - Spin counter-clockwise

📱 **Responsiveness**
- Fully mobile-compatible
- Two layout modes: full and compact
- Adapts to container width
- Touch-friendly controls

## Installation

### Prerequisites
```bash
npm install framer-motion
npm install -D tailwindcss
```

### Import
```javascript
import CubeRotationGuide from './components/CubeRotationGuide';
```

## Usage

### Basic Example
```jsx
import CubeRotationGuide from './components/CubeRotationGuide';

export default function MyComponent() {
  return (
    <CubeRotationGuide
      direction="right"
      instruction="Rotate Right"
      instructionDetail="Turn the cube clockwise"
    />
  );
}
```

### Compact Mode (Camera Overlay)
```jsx
<CubeRotationGuide
  direction="up"
  isAnimating={true}
  instruction="Tilt Up"
  instructionDetail="Show the top face"
  compact={true}
  showInstructionCard={true}
/>
```

### Full Example with State Management
```jsx
import { useState } from 'react';
import CubeRotationGuide from './components/CubeRotationGuide';

export default function CameraCapture() {
  const [currentDirection, setCurrentDirection] = useState('right');
  const [isAnimating, setIsAnimating] = useState(true);

  const handleCapture = () => {
    // Change direction after capture
    setCurrentDirection('up');
    setIsAnimating(true);
  };

  return (
    <div>
      <CubeRotationGuide
        direction={currentDirection}
        isAnimating={isAnimating}
        instruction={`Rotate ${currentDirection}`}
        instructionDetail="Guide text for the user"
        showInstructionCard={true}
      />
      <button onClick={handleCapture}>Capture</button>
    </div>
  );
}
```

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `direction` | `'up' \| 'down' \| 'left' \| 'right' \| 'clockwise' \| 'counterClockwise'` | `'right'` | Rotation direction animation |
| `isAnimating` | `boolean` | `true` | Enable/disable animation loop |
| `instruction` | `string` | `'Rotate the cube'` | Main instruction text |
| `instructionDetail` | `string` | `''` | Detailed instruction text |
| `showInstructionCard` | `boolean` | `true` | Show/hide instruction card |
| `compact` | `boolean` | `false` | Use compact layout mode |

## Component Structure

### Main Components

#### `CubeRotationGuide` (Container)
- Main component that orchestrates animation and layout
- Manages rotation state
- Renders cube and arrows

#### `Cube3DVisualization` (3D Cube)
- Renders 6-face 3D cube using CSS transforms
- Individual face gradients and styling
- Smooth rotation animations

#### `RotationArrow` (SVG Arrow)
- Generates dynamic SVG arrows based on direction
- Animated glow effects
- Active/inactive states

## Theming

### Colors (Customizable)
- **Cube Faces**: White, Green, Red, Blue, Yellow, Gray
- **Arrows**: Blue (`#2563eb`) with glow effect
- **Background**: Slate-800 to Slate-900 gradient

### Customization Example
```jsx
// Modify colors in CubeRotationGuide.jsx
const arrowVariants = {
  initial: { opacity: 0.4, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
};

// Change stroke color
stroke={isActive ? '#YOUR_COLOR' : 'rgba(37, 99, 235, 0.4)'}
```

## Integration Examples

### Integration with CameraCapture

```jsx
import CubeRotationGuide from './components/CubeRotationGuide';
import { FACE_INFO } from './constants'; // Your existing constants

function CameraCapture({ onFaceScanned }) {
  const [activeFace, setActiveFace] = useState('F');
  const info = FACE_INFO[activeFace];

  return (
    <div>
      {/* Existing webcam code */}
      
      {/* New rotation guide overlay */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <CubeRotationGuide
          direction={info.rotationArrow}
          isAnimating={true}
          instruction={info.rotation}
          compact={true}
          showInstructionCard={false}
        />
      </div>
    </div>
  );
}
```

### As a Standalone Demo Page

```jsx
import CubeRotationGuideDemo from './components/CubeRotationGuideDemo';

export default function App() {
  return <CubeRotationGuideDemo />;
}
```

## Animation Behavior

### Rotation Animation Loop
- Uses `requestAnimationFrame` for smooth 60fps animation
- Sine wave motion for natural oscillation
- Amplitude: 25° for horizontal/vertical, 22° for left/right
- Automatic cleanup on unmount

### Arrow Animation
- Framer Motion spring physics
- Smooth transitions on direction change
- Pulse effect on status indicator
- Glow effect with CSS filters

## Performance Considerations

- ✓ Memoized components where appropriate
- ✓ Efficient SVG rendering
- ✓ CSS transforms for animations (GPU accelerated)
- ✓ Proper cleanup of animation frames
- ✓ Minimal re-renders with dependency arrays

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 12+, Chrome Mobile)

## Accessibility

- ♿ Semantic HTML structure
- ♿ ARIA labels on interactive elements
- ♿ Keyboard navigation support
- ♿ Color contrast compliant (WCAG AA)
- ♿ Reduced motion respects prefers-reduced-motion

## Troubleshooting

### Animation not playing
- Check `isAnimating={true}`
- Verify browser supports CSS 3D transforms
- Check for conflicting CSS animations

### Arrows not visible
- Ensure `direction` prop is valid
- Check z-index stacking context
- Verify SVG filters are rendering (browser dev tools)

### Component not updating
- Use key prop when direction changes: `key={direction}`
- Ensure state is properly updated before passing props
- Check for parent component re-render issues

## Demo

View the interactive demo:
```bash
# In your app, import and render:
import CubeRotationGuideDemo from './components/CubeRotationGuideDemo';

<CubeRotationGuideDemo />
```

## License

© 2024 Cube Project. All rights reserved.
