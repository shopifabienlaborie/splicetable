# Osmosis React Components

This directory contains React components extracted directly from Figma with 1:1 fidelity.

## Current Components

### 1. Button Component
- **Location**: `Button.jsx` + `Button.css`
- **Source**: Extracted from Figma Desktop using MCP integration
- **Status**: ✅ Complete with interactive demo on design-system page

### 2. Segmented Control Component
- **Location**: `SegmentedControl.jsx` + `SegmentedControl.css`
- **Source**: Extracted from Figma Desktop using MCP integration
- **Status**: ✅ Complete with interactive demo on design-system page

### 3. Slider Component
- **Location**: `Slider.jsx` + `Slider.css`
- **Source**: Extracted from Figma Desktop using MCP integration
- **Status**: ✅ Complete with interactive demo on design-system page

### 4. Divider Component
- **Location**: `Divider.jsx` + `Divider.css`
- **Source**: Extracted from Figma Desktop using MCP integration
- **Status**: ✅ Complete with interactive demo on design-system page

### 5. TextField Component
- **Location**: `TextField.jsx` + `TextField.css`
- **Source**: Extracted from Figma Desktop using MCP integration
- **Status**: ✅ Complete with interactive demo on design-system page
- **Integration**: Used in Slider component for editable numeric input

#### Features
- Two variants: `plain` (default elevated style) and `outline` (border style)
- Icon support before/after label
- Disabled state
- Full width option
- Fully responsive to dark mode via CSS variables

#### Props
```jsx
<Button
  variant="plain"          // 'plain' | 'outline'
  label="Click me"         // string
  iconBefore={true}        // boolean | ReactNode
  iconAfter={false}        // boolean | ReactNode
  disabled={false}         // boolean
  fullWidth={false}        // boolean
  onClick={() => {}}       // function
  className=""             // string
/>
```

#### Design System Integration
The Button component uses CSS variables from `style.css`:
- Surface colors: `--surface-above`, `--surface-ground`, `--surface-below`, `--surface-profound`
- Content colors: `--content-primary`
- Borders: `--inner-top-light`, `--inner-shadow`, `--inner-side-shadow`, `--outer-bottom-light`
- Spacing: `--spacing-150`, `--spacing-200`, `--spacing-300`
- Radius: `--radius-sm`, `--radius-lg`

---

### Segmented Control Component

#### Features
- Supports 2-4 segments
- Text and icon support per segment
- Active state with elevated shadow effect
- Disabled state
- Full width option
- Fully responsive to dark mode via CSS variables

#### Props
```jsx
<SegmentedControl
  items={[
    { label: 'Option 1', value: 'opt1', iconBefore: true },
    { label: 'Option 2', value: 'opt2' }
  ]}
  value={selectedValue}       // string
  onChange={(value) => {}}    // function
  disabled={false}            // boolean
  fullWidth={false}           // boolean
  className=""                // string
/>
```

#### Item Object Structure
```jsx
{
  label: string,           // Display label
  value: string,           // Unique value identifier
  iconBefore?: ReactNode,  // Optional icon before label (true for default icon)
  iconAfter?: ReactNode    // Optional icon after label (true for default icon)
}
```

#### Design System Integration
The SegmentedControl component uses CSS variables from `style.css`:
- Surface colors: `--surface-below`, `--surface-above`, `--surface-ground`
- Content colors: `--content-primary`
- Borders: `--inner-shadow`, `--inner-side-shadow`, `--inner-top-light`, `--outer-bottom-light`
- Spacing: `--spacing-150`, `--spacing-200`, `--spacing-300`
- Radius: `--radius-sm`, `--radius-lg`

---

### Slider Component

#### Features
- Custom styled track and thumb
- **Editable TextField for numeric input** (replaces static display)
- User can drag slider OR type value directly
- Automatic value clamping to min/max range
- Non-numeric input rejection with visual feedback
- Percentage display option
- Configurable min, max, step
- Disabled state
- Fully responsive to dark mode via CSS variables

#### Props
```jsx
<Slider
  value={50}                   // number
  min={0}                      // number
  max={100}                    // number
  step={1}                     // number
  onChange={(value) => {}}     // function
  showPercentage={false}       // boolean
  disabled={false}             // boolean
  TextField={TextField}        // React Component (pass TextField component)
  className=""                 // string
/>
```

**Note**: The `TextField` prop is optional. If not provided, falls back to static value display.

#### Design System Integration
The Slider component uses CSS variables from `style.css`:
- Surface colors: `--surface-below`, `--surface-above`
- Content colors: `--content-primary`
- Borders: `--inner-shadow`, `--inner-side-shadow`, `--inner-top-light`, `--outer-bottom-light`
- Spacing: `--spacing-150`
- Radius: `--radius-sm`, `--radius-full`

---

### Divider Component

#### Features
- Clean horizontal line separator
- Subtle shadows and bevel effects from Figma
- Configurable spacing (small, medium, large)
- Fully responsive to dark mode via CSS variables

#### Props
```jsx
<Divider
  spacing="md"     // 'sm' | 'md' | 'lg'
  className=""     // string
/>
```

#### Design System Integration
The Divider component uses CSS variables from `style.css`:
- Surface colors: `--surface-below`
- Borders: `--inner-shadow`, `--inner-side-shadow`, `--outer-bottom-light`
- Spacing: `--spacing-100`, `--spacing-200`

---

### TextField Component

#### Features
- Text input field with Figma-accurate styling
- Multiple input types (text, number, email, password)
- Optional icons before/after text
- Multiple states: default, focused, error, disabled
- Integrated with Slider component for editable numeric input
- Automatic value validation and clamping when used with Slider
- Fully responsive to dark mode via CSS variables

#### Props
```jsx
<TextField
  value=""                        // string
  onChange={(value) => {}}        // function
  onBlur={(e) => {}}             // function
  placeholder="Enter text..."     // string
  type="text"                     // 'text' | 'number' | 'email' | 'password'
  iconBefore={true}              // boolean | ReactNode
  iconAfter={false}              // boolean | ReactNode
  disabled={false}               // boolean
  error={false}                  // boolean | string (error message)
  className=""                   // string
/>
```

#### Slider Integration
The TextField is integrated with the Slider component to provide an editable numeric input:
- User can type a number directly
- Values outside min/max range are automatically clamped
- Non-numeric input is rejected and reverts to previous value
- Percentage display is supported
- Syncs bidirectionally with slider position

#### Design System Integration
The TextField component uses CSS variables from `style.css`:
- Surface colors: `--surface-below`, `--surface-above`
- Content colors: `--content-primary`, `--content-secondary`
- Borders: `--inner-shadow`, `--inner-side-shadow`, `--outer-bottom-light`
- Spacing: `--spacing-150`, `--spacing-200`
- Radius: `--radius-sm`

## Interactive Demos

Both components have interactive demos on the design-system page:

### Button Demo
- Toggle between Plain and Outline variants
- Edit the label text
- Toggle icons before/after
- Enable/disable the button
- Toggle full width mode
- See all variants at once

### Segmented Control Demo
- Choose number of items (2, 3, or 4)
- Toggle icons on/off
- Enable/disable the control
- Toggle full width mode
- See examples with text, icons, and different segment counts
- Real-time selection feedback

### Slider Demo
- **Interactive TextField integration** - type numbers directly!
- Values automatically clamped to min/max range
- Non-numeric input rejected with visual feedback
- Adjust min, max, and step values
- Toggle percentage display
- Enable/disable the slider
- See examples with editable text fields
- Real-time bidirectional sync between slider and text field

### Divider Demo
- Choose spacing size (small, medium, large)
- See examples in context with content above/below
- Visual demonstration of spacing differences

### TextField Demo
- Live controls for icon, disabled, and error states
- Examples of different input types (text, number, email)
- All states demonstrated (default, focused, error, disabled)
- Shows integration with Slider component
- Real-time value updates

## Development Notes

### Technology Stack
- React 18 (via CDN on design-system page)
- Babel Standalone for JSX transformation
- Pure CSS using design tokens
- No build system required for demos

### Design Fidelity
Components are extracted using Figma's MCP integration, ensuring:
1. Exact match to Figma designs
2. Proper use of design tokens/variables
3. All variants and states preserved
4. Shadows, spacing, and typography match exactly

### Future Components
As more components are added from Figma, they will follow the same pattern:
- ComponentName.jsx (React component)
- ComponentName.css (Styles using CSS variables)
- Interactive demo on design-system.html
- Props documentation in props table

## Usage in Main App

These components are currently isolated to the design-system page. To use them in the main app:
1. Set up a proper React build system (Vite, Create React App, etc.)
2. Import the component: `import Button from './components/Button'`
3. Use with props as documented

The components are designed to be plug-and-play with your existing design tokens.
