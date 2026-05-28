/**
 * Control Component
 * Extracted from Figma Design System
 * 
 * A molecule component that wraps different control types (Button, Slider, SegmentedControl, etc.)
 * with consistent labeling and styling. Label is centered with corner bracket decorations
 * formed by subdivided frames with top + left/right borders.
 * 
 * Props:
 * - label: string - main label text
 * - description: string - optional description text below control
 * - helperText: string - optional helper text below control
 * - children: ReactNode - the control component to display (Button, Slider, etc.)
 * - className: string
 */

const Control = ({ 
  label = 'Label',
  description = '',
  helperText = '',
  children,
  className = ''
}) => {
  return (
    <div className={`control-component ${className}`}>
      {/* Centered label row with corner bracket decorations */}
      <div className="control-label-row">
        {/* Left half: spacer | bracket column */}
        <div className="control-label-half control-label-half-left">
          <div className="control-label-spacer" />
          <div className="control-label-bracket">
            <div className="control-label-bracket-top" />
            <div className="control-label-bracket-bottom" />
          </div>
        </div>

        {/* Right half: bracket column | spacer */}
        <div className="control-label-half control-label-half-right">
          <div className="control-label-bracket">
            <div className="control-label-bracket-top" />
            <div className="control-label-bracket-bottom" />
          </div>
          <div className="control-label-spacer" />
        </div>

        {/* Label text — absolutely centered, masks brackets behind it */}
        <span className="control-label-text">{label}</span>
      </div>

      {/* Control content area */}
      <div className="control-content">
        {children}
      </div>

      {/* Description (below control) */}
      {description && (
        <div className="control-description">
          {description}
        </div>
      )}

      {/* Helper text */}
      {helperText && (
        <div className="control-helper-text">
          {helperText}
        </div>
      )}
    </div>
  );
};

// For non-JSX usage
window.Control = Control;
