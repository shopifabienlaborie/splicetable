/**
 * Slider Component with TextField Integration
 * Extracted from Figma Design System
 * 
 * A range input control for numeric values with custom thumb design and editable text field.
 * 
 * Props:
 * - value: number - current value
 * - min: number - minimum value (default: 0)
 * - max: number - maximum value (default: 100)
 * - step: number - step increment (default: 1)
 * - onChange: function(value) - called when value changes
 * - showPercentage: boolean - display value as percentage (default: false)
 * - disabled: boolean
 * - className: string
 * - TextField: React Component - TextField component (must be passed in)
 */

const Slider = ({ 
  value = 50,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  showPercentage = false,
  disabled = false,
  className = '',
  TextField
}) => {
  const [textValue, setTextValue] = React.useState(String(value));
  const [error, setError] = React.useState(false);

  // Update text value when slider value changes externally
  React.useEffect(() => {
    const displayValue = String(value);
    setTextValue(displayValue);
    setError(false);
  }, [value, showPercentage]);

  const handleSliderChange = (e) => {
    if (!disabled && onChange) {
      const newValue = Number(e.target.value);
      onChange(newValue);
    }
  };

  const handleTextFieldChange = (newValue) => {
    // Strip any % signs in case user pastes a value with one
    setTextValue(newValue.replace(/%/g, ''));
    setError(false);
  };

  const handleTextFieldBlur = () => {
    if (!disabled && onChange) {
      // Remove any percentage signs if present
      let numericValue = textValue.replace(/%/g, '').trim();
      
      // Check if it's a valid number
      const parsed = Number(numericValue);
      
      if (isNaN(parsed) || numericValue === '') {
        // Invalid input - revert to current value
        setTextValue(showPercentage ? String(value) : String(value));
        setError(true);
        setTimeout(() => setError(false), 1000);
      } else {
        // Clamp to min/max range
        const clampedValue = Math.max(min, Math.min(max, parsed));
        onChange(clampedValue);
        setTextValue(String(clampedValue));
      }
    }
  };

  const displayValue = showPercentage ? `${textValue}%` : textValue;

  return (
    <div className={`slider-component ${disabled ? 'disabled' : ''} ${className}`}>
      <div className="slider-track-container">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          disabled={disabled}
          className="slider-input"
        />
      </div>
      {TextField ? (
        <div className="slider-text-field-wrapper">
          <TextField
            type="text"
            value={textValue}
            onChange={handleTextFieldChange}
            onBlur={handleTextFieldBlur}
            disabled={disabled}
            error={error}
            suffix={showPercentage ? '%' : ''}
            className="slider-text-field"
          />
        </div>
      ) : (
        <div className="slider-value-container">
          <div className="slider-value-display">
            {displayValue}
          </div>
        </div>
      )}
    </div>
  );
};

// For non-JSX usage
window.Slider = Slider;
