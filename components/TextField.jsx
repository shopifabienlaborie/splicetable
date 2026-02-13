/**
 * TextField Component
 * Extracted from Figma Design System
 * 
 * A text input field with optional icons and multiple states.
 * 
 * Props:
 * - value: string - current value
 * - onChange: function(value) - called when value changes
 * - onBlur: function(e) - called when input loses focus
 * - placeholder: string - placeholder text
 * - type: 'text' | 'number' | 'email' | 'password' - input type (default: 'text')
 * - iconBefore: boolean | ReactNode - icon before text
 * - iconAfter: boolean | ReactNode - icon after text
 * - disabled: boolean
 * - error: boolean | string - error state or error message
 * - className: string
 */

const TextField = ({ 
  value = '',
  onChange,
  onBlur,
  placeholder = '',
  type = 'text',
  iconBefore = false,
  iconAfter = false,
  suffix = '',
  disabled = false,
  error = false,
  dropdown = null,
  className = ''
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const componentRef = React.useRef(null);

  // Default icon component (dice icon) - using Icons/dice.svg
  const DefaultIcon = () => (
    <img src="Icons/dice.svg" alt="" width="16" height="16" style={{display: 'block'}} />
  );

  const renderIcon = (icon) => {
    if (icon === true) return <DefaultIcon />;
    if (icon === false || !icon) return null;
    return icon;
  };

  const handleChange = (e) => {
    if (!disabled && onChange) {
      onChange(e.target.value);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  const handleBlur = (e) => {
    // Check if the new focus target is inside the component (e.g. dropdown)
    // If so, don't close the dropdown
    if (componentRef.current && componentRef.current.contains(e.relatedTarget)) {
      return;
    }
    setIsFocused(false);
    if (onBlur) {
      onBlur(e);
    }
  };

  return (
    <div ref={componentRef} className={`text-field-component ${disabled ? 'disabled' : ''} ${error ? 'error' : ''} ${isFocused ? 'focused' : ''} ${dropdown ? 'has-dropdown' : ''} ${className}`}>
      <div className="text-field-container">
        <div className="text-field-inner">
          {iconBefore && (
            <div className="text-field-icon">
              {renderIcon(iconBefore)}
            </div>
          )}
          <input
            type={type}
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="text-field-input"
          />
          {suffix && (
            <span className="text-field-suffix">{suffix}</span>
          )}
          {iconAfter && (
            <div className="text-field-icon">
              {renderIcon(iconAfter)}
            </div>
          )}
        </div>
        <div className="text-field-shadow-overlay"></div>
      </div>
      {dropdown && isFocused && (
        <div className="text-field-dropdown" onMouseDown={(e) => e.preventDefault()}>
          {dropdown}
        </div>
      )}
      {error && typeof error === 'string' && (
        <div className="text-field-error-message">{error}</div>
      )}
    </div>
  );
};

// For non-JSX usage
window.TextField = TextField;
