/**
 * Divider Component
 * Extracted from Figma Design System
 * 
 * A horizontal divider line for separating content sections.
 * Features subtle shadows and bevel effects.
 * 
 * Props:
 * - spacing: 'sm' | 'md' | 'lg' - vertical spacing around divider (default: 'md')
 * - className: string
 */

const Divider = ({ 
  spacing = 'md',
  className = ''
}) => {
  const spacingClasses = {
    sm: 'divider-spacing-sm',
    md: 'divider-spacing-md',
    lg: 'divider-spacing-lg'
  };

  return (
    <div className={`divider-wrapper ${spacingClasses[spacing]} ${className}`}>
      <div className="divider-line"></div>
    </div>
  );
};

// For non-JSX usage
window.Divider = Divider;
