/**
 * Select Component
 * Same 3-layer design as Button: Root (gradient frame) → Outer (elevated surface) → Inner (content)
 * Differences from Button: inner padding 6px all around, label fills container.
 * 
 * Props:
 * - value: string - current selected value
 * - onChange: function(value) - called when selection changes
 * - options: array - array of {value, label, icon} objects
 * - placeholder: string - placeholder text when no value selected
 * - icon: boolean | ReactNode - icon before label (true for default icon)
 * - iconDynamic: boolean - if true, icon changes based on selected option's icon
 * - iconOnly: boolean - if true, hides the label text (icon acts as identifier)
 * - disabled: boolean
 * - fullWidth: boolean
 * - className: string
 */

const Select = ({ 
  value = '',
  onChange,
  options = [],
  placeholder = 'Select...',
  icon = false,
  iconDynamic = false,
  iconOnly = false,
  disabled = false,
  fullWidth = false,
  className = ''
}) => {
  const selectRef = React.useRef(null);

  // Default icon component (dice icon) - using Icons/dice.svg
  const DefaultIcon = () => (
    <img src="Icons/dice.svg" alt="" width="16" height="16" style={{display: 'block'}} />
  );

  // Select dropdown indicator icon - using Icons/select.svg
  const SelectIndicator = () => (
    <img src="Icons/select.svg" alt="" width="16" height="16" style={{display: 'block'}} />
  );

  const renderIcon = (iconProp) => {
    if (iconProp === true) return <DefaultIcon />;
    if (iconProp === false || !iconProp) return null;
    return iconProp;
  };

  // Get the currently selected option
  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption ? (selectedOption.displayLabel || selectedOption.label) : placeholder;
  const isPlaceholder = !selectedOption;
  
  // Determine which icon to show
  const displayIcon = iconDynamic && selectedOption?.icon 
    ? selectedOption.icon 
    : icon;

  const handleSelectChange = (e) => {
    if (!disabled && onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <div className={`select-component ${fullWidth ? 'full-width' : ''} ${iconOnly ? 'icon-only' : ''} ${disabled ? 'disabled' : ''} ${className}`}>
      <div className="select-outer">
        <div className="select-inner">
          {displayIcon && (
            <span className="select-icon">
              {renderIcon(displayIcon)}
            </span>
          )}
          {!iconOnly && (
            <span className={`select-label ${isPlaceholder ? 'placeholder' : ''}`}>
              {displayLabel}
            </span>
          )}
          {!iconOnly && (
            <span className="select-icon">
              <SelectIndicator />
            </span>
          )}
        </div>
      </div>
      
      {/* Native select element (hidden but functional) */}
      <select
        ref={selectRef}
        value={value}
        onChange={handleSelectChange}
        disabled={disabled}
        className="select-native"
      >
        {placeholder && !value && (
          <option value="" disabled>{placeholder}</option>
        )}
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

// For non-JSX usage
window.Select = Select;
