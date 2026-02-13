/**
 * Navbar Component
 * Extracted from Figma Design System
 * 
 * A navigation bar with double-layer container structure.
 * Contains ImageReplacer (left), SegmentedControl (center), and Theme toggle (right).
 * 
 * Props:
 * - imageSrc: string - image for the ImageReplacer
 * - fileName: string - filename for the ImageReplacer
 * - onImageChange: function(file, previewUrl) - called when image changes
 * - onImageReset: function() - called when image reset
 * - selectedView: string - selected view in segmented control ('grid' | 'free' | 'palette')
 * - onViewChange: function(value) - called when view changes
 * - hideViewToggle: boolean - if true, hides the center view toggle (unified mode system)
 * - theme: string - current theme ('light' | 'dark')
 * - onThemeChange: function(value) - called when theme changes
 * - disabled: boolean
 * - className: string
 */

// Light mode icon (sun) - using Icons/light.svg
const LightIcon = () => (
  <img src="Icons/light.svg" alt="" width="16" height="16" style={{display: 'block'}} />
);

// Dark mode icon (moon) - using Icons/dark.svg
const DarkIcon = () => (
  <img src="Icons/dark.svg" alt="" width="16" height="16" style={{display: 'block'}} />
);

const Navbar = ({ 
  imageSrc = '',
  fileName = 'img_name.jpg',
  onImageChange,
  onImageReset,
  selectedView = 'grid',
  onViewChange,
  hideViewToggle = false,
  theme = 'light',
  onThemeChange,
  disabled = false,
  className = ''
}) => {
  // Get components from global scope
  const ImageReplacerComponent = window.ImageReplacer;
  const SegmentedControlComponent = window.SegmentedControl;
  
  // Debug: log component availability
  console.log('Navbar render - SegmentedControl available:', !!SegmentedControlComponent, 'ImageReplacer available:', !!ImageReplacerComponent);

  return (
    <div className={`navbar-component ${disabled ? 'disabled' : ''} ${className}`}>
      {/* Outer container */}
      <div className="navbar-outer">
        {/* Inner container */}
        <div className="navbar-inner">
          {/* Left: ImageReplacer */}
          <div className="navbar-left">
            {typeof ImageReplacerComponent !== 'undefined' && (
              <ImageReplacerComponent
                imageSrc={imageSrc}
                fileName={fileName}
                onImageChange={onImageChange}
                onReset={onImageReset}
                disabled={disabled}
              />
            )}
          </div>

          {/* Center: SegmentedControl (hidden when hideViewToggle is true) */}
          {!hideViewToggle && (
            <div className="navbar-center">
              {typeof SegmentedControlComponent !== 'undefined' && (
                <SegmentedControlComponent
                  items={[
                    { value: 'grid', label: 'Stretch' },
                    { value: 'free', label: 'Scatter' },
                    { value: 'palette', label: 'Stain' }
                  ]}
                  value={selectedView}
                  onChange={onViewChange}
                  disabled={disabled}
                />
              )}
            </div>
          )}

          {/* Right: Theme Toggle */}
          <div className="navbar-right">
            {typeof SegmentedControlComponent !== 'undefined' && (
              <SegmentedControlComponent
                items={[
                  { value: 'light', iconBefore: <LightIcon /> },
                  { value: 'dark', iconBefore: <DarkIcon /> }
                ]}
                value={theme}
                onChange={onThemeChange}
                disabled={disabled}
              />
            )}
          </div>

          {/* Inner shadow overlay */}
          <div className="navbar-inner-shadow"></div>
        </div>
      </div>
    </div>
  );
};

// For non-JSX usage
window.Navbar = Navbar;
