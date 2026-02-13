/**
 * Knob Component
 * 3-layer elevated circular control (same pattern as Button).
 * Replaces Slider for compact, tactile value adjustment.
 *
 * Props:
 * - label: string — displayed below knob at rest
 * - value: number — current value
 * - min: number (default: 0)
 * - max: number (default: 100)
 * - step: number (default: 1)
 * - defaultValue: number — value for reset (defaults to min)
 * - onChange: function(value) — called when value changes
 * - showPercentage: boolean — append % suffix (default: false)
 * - disabled: boolean
 * - className: string
 */

const Knob = ({
  label = 'Label',
  value = 50,
  min = 0,
  max = 100,
  step = 1,
  defaultValue,
  onChange,
  showPercentage = false,
  disabled = false,
  className = ''
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState('');
  const knobRef = React.useRef(null);
  const inputRef = React.useRef(null);

  // ─── Rotation math ─────────────────────────
  const ARC_START = -133;
  const ARC_END = 133;
  const ARC_RANGE = ARC_END - ARC_START; // 266°
  const percentage = max !== min ? (value - min) / (max - min) : 0;
  const rotation = ARC_START + percentage * ARC_RANGE;

  // ─── Dot ring generation ───────────────────
  const DOT_COUNT = 10; // 10 segments → 11 tick marks
  const dots = React.useMemo(() => {
    const result = [];
    for (let i = 0; i <= DOT_COUNT; i++) {
      const dotPct = i / DOT_COUNT;
      const angle = ARC_START + dotPct * ARC_RANGE;
      const rad = (angle - 90) * Math.PI / 180;
      const r = 28; // radius in SVG viewBox (64×64, center 32,32)
      result.push({
        x: 32 + r * Math.cos(rad),
        y: 32 + r * Math.sin(rad),
        angle, // CSS angle for radial alignment
        lit: percentage > 0 && dotPct <= percentage
      });
    }
    return result;
  }, [percentage]);

  // ─── Helpers ───────────────────────────────
  const clamp = (v) => {
    v = Math.round(v / step) * step;
    // Fix floating point: round to step's decimal precision
    const decimals = (String(step).split('.')[1] || '').length;
    v = parseFloat(v.toFixed(decimals));
    return Math.max(min, Math.min(max, v));
  };

  const fire = (v) => { if (onChange) onChange(v); };

  const showActive = isHovered || isDragging;

  // ─── Pointer drag ─────────────────────────
  const handlePointerDown = (e) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);

    const startY = e.clientY;
    const startVal = value;
    const range = max - min;

    const onMove = (e) => {
      const dy = startY - e.clientY; // up = positive
      const sensitivity = range / 150; // 150 px → full range
      fire(clamp(startVal + dy * sensitivity));
    };

    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // ─── Wheel ─────────────────────────────────
  const handleWheel = (e) => {
    if (disabled) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? step : -step;
    fire(clamp(value + delta));
  };

  // ─── Keyboard (arrow keys) ─────────────────
  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      fire(clamp(value + step));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      fire(clamp(value - step));
    }
  };

  // ─── Reset ─────────────────────────────────
  const handleReset = (e) => {
    e.stopPropagation();
    fire(defaultValue !== undefined ? defaultValue : min);
  };

  // ─── Inline editing ───────────────────────
  const startEditing = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(String(value));
    // Focus input on next tick
    setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
  };

  const commitEdit = () => {
    setIsEditing(false);
    const parsed = parseFloat(editValue.replace(/%/g, ''));
    if (!isNaN(parsed)) fire(clamp(parsed));
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  // Close editing when hover leaves
  React.useEffect(() => {
    if (!isHovered && !isDragging) setIsEditing(false);
  }, [isHovered, isDragging]);

  // ─── Reset icon (imported from Icons folder) ──
  const ResetIcon = () => (
    <img src="Icons/reset.svg" alt="" width="16" height="16" style={{display: 'block'}} />
  );

  // ─── Render ────────────────────────────────
  return (
    <div
      className={`knob-component ${disabled ? 'disabled' : ''} ${isDragging ? 'dragging' : ''} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Knob body: dots + handle */}
      <div className="knob-body">
        {/* Dot ring */}
        <svg className="knob-dots" viewBox="0 0 64 64" width="64" height="64">
          {dots.map((d, i) => (
            <rect
              key={i}
              x={d.x - 1}
              y={d.y - 2}
              width="2"
              height="4"
              rx="1"
              transform={`rotate(${d.angle}, ${d.x}, ${d.y})`}
              className={d.lit ? 'dot-lit' : 'dot-unlit'}
            />
          ))}
        </svg>

        {/* 3-layer knob handle */}
        <div
          className="knob-handle"
          ref={knobRef}
          onPointerDown={handlePointerDown}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
          tabIndex={disabled ? -1 : 0}
          role="slider"
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-label={label}
        >
          <div className="knob-outer">
            <div className="knob-inner">
              <div className="knob-indicator" style={{ transform: `rotate(${rotation}deg)` }}>
                <div className="knob-bar" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Value field — both layers always rendered, crossfade via opacity */}
      <div className={`knob-value-field ${showActive ? 'active' : ''}`}>
        {/* Label layer — visible at rest, fades out on hover */}
        <span className="knob-label-layer">{label}</span>

        {/* Value layer — fades in on hover */}
        <div className="knob-value-layer">
          <div className="knob-value-content">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                className="knob-edit-input"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value.replace(/%/g, ''))}
                onBlur={commitEdit}
                onKeyDown={handleEditKeyDown}
              />
            ) : (
              <span className="knob-value-text" onClick={startEditing}>
                {String(value)}
              </span>
            )}
            {showPercentage && <span className="knob-suffix">%</span>}
          </div>
          <button className="knob-reset" onClick={handleReset} type="button" aria-label="Reset">
            <ResetIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

window.Knob = Knob;
