/**
 * Segmented Control Component
 * 3-layer design matching Button pattern:
 *   Root (gradient frame) → Item outer (elevated surface) → Item inner (content surface)
 * 
 * Props:
 * - items: array of item objects { label: string, value: string, iconBefore?: ReactNode, iconAfter?: ReactNode }
 * - value: currently selected value
 * - onChange: function(value) - called when selection changes
 * - disabled: boolean
 * - fullWidth: boolean
 * - showDot: boolean (default true) - show/hide the active indicator dot
 */

const SegmentedControl = ({ 
  items = [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' }
  ],
  value,
  onChange,
  disabled = false,
  fullWidth = false,
  showDot = true,
  className = ''
}) => {
  // Default icon component (dice icon) - using Icons/dice.svg
  const DefaultIcon = () => (
    <img src="Icons/dice.svg" alt="" width="16" height="16" style={{display: 'block'}} />
  );

  const renderIcon = (icon) => {
    if (icon === true) return <DefaultIcon />;
    if (icon === false || !icon) return null;
    return icon;
  };

  const [pressingActive, setPressingActive] = React.useState(false);

  const handleItemClick = (itemValue) => {
    if (!disabled && onChange) {
      onChange(itemValue);
    }
  };

  const getPositionClass = (index) => {
    if (items.length === 1) return 'position-first';
    if (index === 0) return 'position-first';
    if (index === items.length - 1) return 'position-last';
    return 'position-middle';
  };

  // Determine which sides of an inactive item need shadow clipping.
  // Clip the side that faces another inactive neighbor to prevent bleed.
  // Leave the side open if it faces the active item or the component edge.
  const getClipClass = (index) => {
    if (value === items[index].value) return ''; // active — no shadow, no clip
    const leftIsInactive = index > 0 && items[index - 1].value !== value;
    const rightIsInactive = index < items.length - 1 && items[index + 1].value !== value;
    if (leftIsInactive && rightIsInactive) return 'clip-both';
    if (leftIsInactive) return 'clip-left';
    if (rightIsInactive) return 'clip-right';
    return '';
  };

  return (
    <div 
      className={`segmented-control ${fullWidth ? 'full-width' : ''} ${disabled ? 'disabled' : ''} ${pressingActive ? 'pressing-active' : ''} ${className}`}
      role="radiogroup"
      onMouseUp={() => setPressingActive(false)}
      onMouseLeave={() => setPressingActive(false)}
    >
      {items.map((item, index) => {
        const isActive = value === item.value;
        const hasIconBefore = item.iconBefore !== undefined && item.iconBefore !== false;
        const hasIconAfter = item.iconAfter !== undefined && item.iconAfter !== false;
        const posClass = getPositionClass(index);
        const clipClass = getClipClass(index);

        return (
          <button
            key={item.value}
            className={`segmented-control-item ${isActive ? 'active' : ''} ${posClass} ${clipClass}`}
            onClick={() => handleItemClick(item.value)}
            onMouseDown={isActive ? () => setPressingActive(true) : undefined}
            disabled={disabled}
            type="button"
            role="radio"
            aria-checked={isActive}
          >
            <div className="sc-item-inner">
                  {showDot && <span className="sc-active-dot" />}
                  {hasIconBefore && (
                    <span className="segmented-control-icon">
                      {renderIcon(item.iconBefore)}
                    </span>
                  )}
                  {item.label && (
                    <span className="segmented-control-label">{item.label}</span>
                  )}
                  {hasIconAfter && (
                    <span className="segmented-control-icon">
                      {renderIcon(item.iconAfter)}
                    </span>
                  )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

// For non-JSX usage
window.SegmentedControl = SegmentedControl;
