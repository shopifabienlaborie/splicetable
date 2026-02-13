/**
 * SectionTitle Component
 * Collapsible section header with debossed label and chevron.
 *
 * Props:
 * - label: string          — section name displayed
 * - defaultOpened: boolean  — initial collapsed state (default: true)
 * - onToggle: fn(opened)   — called after toggling, receives new opened state
 * - className: string
 */

const SectionTitle = ({
  label = 'Section title',
  defaultOpened = true,
  onToggle,
  className = ''
}) => {
  const [opened, setOpened] = React.useState(defaultOpened);

  const handleClick = () => {
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
