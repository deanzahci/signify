# Neo-Brutalist Style Guide for Signify App

## Design Philosophy
Neo-brutalism combines bold, stark design elements with modern functionality. This style features:
- Heavy borders and shadows
- Bold, contrasting colors
- Minimal rounded corners
- Strong typography
- Clear visual hierarchy

## Color Palette

### Primary Colors
- **Brutal Blue (Primary)**: `#0066FF` - Main accent color for CTAs, links, and primary actions
- **Brutal Blue Dark**: `#0052CC` - Hover states and pressed states for primary elements
- **Brutal Black**: `#000000` - Borders, text, and shadows
- **Brutal White**: `#FFFFFF` - Backgrounds and inverse text

### Secondary Colors
- **Brutal Gray**: `#E5E5E5` - Secondary backgrounds and disabled states
- **Brutal Yellow**: `#FFD93D` - Warnings and highlights
- **Brutal Red**: `#FF3333` - Errors and destructive actions
- **Brutal Green**: `#00CC66` - Success states and confirmations
- **Brutal Purple**: `#9933FF` - Special features and premium elements

## Typography

### Font Families
- **Headers**: Arial Black or system bold sans-serif
- **Body**: Arial or system sans-serif
- **Code/Numbers**: Courier New or system monospace

### Font Sizes
- **H1**: 32-40px - Page titles
- **H2**: 24-28px - Section headers
- **H3**: 20px - Subsections
- **Body**: 16px - Regular text
- **Small**: 14px - Helper text
- **Tiny**: 12px - Metadata

### Font Weights
- Headers: 900 (Black)
- Subheaders: 700 (Bold)
- Body: 400 (Regular)
- Emphasis: 600 (Semi-bold)

## Component Patterns

### Buttons

#### Primary Button
```javascript
className="bg-brutal-blue text-brutal-white border-brutal border-brutal-black shadow-brutal font-bold px-6 py-3 active:translate-x-1 active:translate-y-1 active:shadow-none"
```

#### Secondary Button
```javascript
className="bg-brutal-white text-brutal-black border-brutal border-brutal-black shadow-brutal font-bold px-6 py-3 active:translate-x-1 active:translate-y-1 active:shadow-none"
```

#### Destructive Button
```javascript
className="bg-brutal-red text-brutal-white border-brutal border-brutal-black shadow-brutal font-bold px-6 py-3 active:translate-x-1 active:translate-y-1 active:shadow-none"
```

### Cards
```javascript
className="bg-brutal-white border-brutal border-brutal-black shadow-brutal p-4"
```

### Input Fields
```javascript
className="bg-brutal-white border-brutal border-brutal-black px-4 py-3 font-mono focus:bg-brutal-gray"
```

### Modals
```javascript
className="bg-brutal-white border-brutal border-brutal-black shadow-brutal-xl p-6"
```

## Layout Principles

### Spacing
- Use consistent spacing units: 8px, 16px, 24px, 32px, 48px
- Margins between sections: 32-48px
- Padding inside containers: 16-24px
- Gap between elements: 8-16px

### Borders
- Default border width: 3px
- Border color: Always black (`#000000`)
- No rounded corners (border-radius: 0)

### Shadows
- Small elements: `2px 2px 0px #000000`
- Regular elements: `4px 4px 0px #000000`
- Large elements: `6px 6px 0px #000000`
- Modals/Overlays: `8px 8px 0px #000000`

## Animation Guidelines

### Interactions
- **Hover**: Slight color change or shadow increase
- **Active/Press**: Translate 1-2px down-right, remove shadow
- **Focus**: Add bold outline or increase border width

### Transitions
- Keep transitions snappy: 150-200ms
- Use ease-out easing for most animations
- No smooth/slow fades - keep it punchy

### Example Animation Classes
```javascript
// Button press effect
"active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-150"

// Hover effect
"hover:shadow-brutal-lg transition-shadow duration-150"
```

## Accessibility

### Color Contrast
- Ensure all text meets WCAG AA standards
- Primary blue on white: 4.5:1 ratio ✓
- Black on white: 21:1 ratio ✓

### Focus States
- All interactive elements must have visible focus states
- Use 4px outline or increased border width
- Never remove focus indicators

### Touch Targets
- Minimum touch target: 44x44px
- Add adequate padding to small elements
- Ensure proper spacing between interactive elements

## Component Library Usage

### Reusable Components Location
All reusable neo-brutalist components are in `/components/neobrutalist/`

### Component Naming Convention
- `NB` prefix for all neo-brutalist components
- Example: `NBButton`, `NBCard`, `NBInput`, `NBModal`

### Import Example
```javascript
import NBButton from '../components/neobrutalist/NBButton';
```

## Implementation Notes

### Using with NativeWind
- All Tailwind classes work with NativeWind
- Use `className` prop instead of `style`
- Combine with style prop when needed for dynamic values

### Platform-Specific Styling
```javascript
import { Platform } from 'react-native';

className={Platform.select({
  ios: "shadow-brutal-lg",
  android: "elevation-8"
})}
```

## Do's and Don'ts

### Do's
✓ Use bold, high-contrast colors
✓ Apply thick black borders consistently
✓ Use hard shadows without blur
✓ Keep interfaces clean and minimal
✓ Make interactions obvious and satisfying

### Don'ts
✗ Don't use rounded corners
✗ Don't use gradients or subtle colors
✗ Don't use thin borders or light shadows
✗ Don't overcomplicate layouts
✗ Don't use smooth/slow animations

## Quick Reference

### Essential Classes
```javascript
// Containers
"bg-brutal-white border-brutal border-brutal-black shadow-brutal"

// Primary Action
"bg-brutal-blue text-brutal-white border-brutal border-brutal-black shadow-brutal"

// Typography
"font-bold text-brutal-black"
"font-mono text-sm"

// Spacing
"p-4 m-4 gap-4"

// Interactive
"active:translate-x-1 active:translate-y-1 active:shadow-none"
```

This style guide ensures consistency across the app while maintaining the bold, distinctive neo-brutalist aesthetic.