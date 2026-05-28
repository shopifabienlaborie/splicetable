/**
 * Button Component
 * 3-layer design from Figma: Root (gradient frame) → Outer (elevated surface) → Inner (content surface)
 * 
 * Props:
 * - variant: 'plain' | 'outline' (accepted for backward compat, unified visual)
 * - size: 'default' | 'large' (large doubles paddings via tokens)
 * - iconBefore: boolean | ReactNode (default: false)
 * - iconAfter: boolean | ReactNode (default: false)
 * - label: string (default: 'Label')
 * - onClick: function
 * - disabled: boolean
 * - fullWidth: boolean
 * - active: boolean (toggle/selected state — optional)
 * - className: string
 */

const Button = ({ 
  variant = 'plain',
  size = 'default',
  iconBefore = false,
  iconAfter = false,
  label = 'Label',
  onClick,
  disabled = false,
  fullWidth = false,
  active = false,
  className = ''
}) => {
  // Default icon component (dice icon) - using Icons/dice.svg
  const DefaultIcon = () => (
    <img src="Icons/dice.svg" alt="" width="16" height="16" style={{display: 'block'}} />
  );
  
  const renderIcon = (icon) => {
    if (icon === true) return <DefaultIcon />;
    if (icon === false) return null;
    return icon;
  };

  return (
    <button
      className={`button-component ${size === 'large' ? 'large' : ''} ${fullWidth ? 'full-width' : ''} ${active ? 'active' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      <div className="button-outer">
        <div className="button-inner">
          {iconBefore && <span className="button-icon">{renderIcon(iconBefore)}</span>}
          {label && <span className="button-label">{label}</span>}
          {iconAfter && <span className="button-icon">{renderIcon(iconAfter)}</span>}
        </div>
      </div>
    </button>
  );
};

// For non-JSX usage
window.Button = Button;
