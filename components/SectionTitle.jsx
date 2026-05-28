/**
 * SectionTitle Component
 * Collapsible section header with debossed label and chevron.
 *
 * Props:
 * - label: string          — section name displayed
 * - level: number           — 1 (default, collapsible) or 2 (back icon on left, no collapse)
 * - defaultOpened: boolean  — initial collapsed state (default: true, Level 1 only)
 * - onToggle: fn(opened)   — called after toggling, receives new opened state (Level 1 only)
 * - onClick: fn()           — called on click (Level 2 only, e.g. navigate back)
 * - className: string
 */

const SectionTitle = ({
  label = 'Section title',
  level = 1,
  defaultOpened = true,
  onToggle,
  onClick,
  className = ''
}) => {
  const [opened, setOpened] = React.useState(defaultOpened);

  const handleClick = () => {
    if (level === 2) {
      if (onClick) onClick();
      return;
    }
    const next = !opened;
    setOpened(next);
    if (onToggle) onToggle(next);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  // Inline chevron SVG so fill follows currentColor (themed via CSS)
  const ChevronIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M5.5 6.5H6.5V7.5H7.5V8.5H8.5V7.5H9.5V6.5H10.5V5.5H11.5V7.5H10.5V8.5H9.5V9.5H8.5V10.5H7.5V9.5H6.5V8.5H5.5V7.5H4.5V5.5H5.5V6.5Z"
        fill="currentColor"
      />
    </svg>
  );

  const BackIcon = () => (
    <img src="Icons/back.svg" alt="" width="16" height="16" style={{display: 'block'}} />
  );

  // Level 2: back icon on left, label on right, no chevron
  if (level === 2) {
    return (
      <div
        className={`section-title-component level-2 ${className}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={label}
      >
        <div className="section-title-icon">
          <BackIcon />
        </div>
        <span className="section-title-label">{label}</span>
      </div>
    );
  }

  // Level 1 (default): label on left, chevron on right
  return (
    <div
      className={`section-title-component ${opened ? 'opened' : 'closed'} ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-expanded={opened}
      aria-label={label}
    >
      <span className="section-title-label">{label}</span>
      <div className="section-title-icon">
        <ChevronIcon />
      </div>
    </div>
  );
};

window.SectionTitle = SectionTitle;
