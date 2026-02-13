/**
 * ImageReplacer Component
 * Extracted from Figma Design System
 * 
 * A clickable component that allows users to replace an image via OS file picker.
 * Shows thumbnail, filename (truncated at 32 chars), and reset icon.
 * 
 * Props:
 * - imageSrc: string - current image URL/path
 * - fileName: string - current filename
 * - onImageChange: function(file, previewUrl) - called when new image selected
 * - onReset: function() - called when reset button clicked
 * - accept: string - accepted file types (default: 'image/*')
 * - disabled: boolean
 * - className: string
 */

const ImageReplacer = ({ 
  imageSrc = '',
  fileName = 'No image selected',
  onImageChange,
  onReset,
  accept = 'image/*',
  disabled = false,
  className = ''
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [currentImage, setCurrentImage] = React.useState(imageSrc);
  const [currentFileName, setCurrentFileName] = React.useState(fileName);
  const fileInputRef = React.useRef(null);

  // Update internal state when props change
  React.useEffect(() => {
    setCurrentImage(imageSrc);
  }, [imageSrc]);

  React.useEffect(() => {
    setCurrentFileName(fileName);
  }, [fileName]);

  // Truncate filename to 32 characters
  const truncateFileName = (name) => {
    if (!name) return 'No image selected';
    if (name.length <= 32) return name;
    
    // Try to preserve extension
    const lastDot = name.lastIndexOf('.');
    if (lastDot > 0 && name.length - lastDot <= 5) {
      const ext = name.substring(lastDot);
      const nameWithoutExt = name.substring(0, lastDot);
      const truncated = nameWithoutExt.substring(0, 32 - ext.length - 3);
      return `${truncated}...${ext}`;
    }
    
    return name.substring(0, 29) + '...';
  };

  // Reset icon component - using Icons/reset.svg
  const ResetIcon = () => (
    <img src="Icons/reset.svg" alt="" width="16" height="16" style={{display: 'block'}} />
  );

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    
    // Update internal state
    setCurrentImage(previewUrl);
    setCurrentFileName(file.name);

    // Call parent callback
    if (onImageChange) {
      onImageChange(file, previewUrl);
    }

    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  const handleReset = (e) => {
    e.stopPropagation();
    
    setCurrentImage('');
    setCurrentFileName('No image selected');
    
    if (onReset) {
      onReset();
    }
  };

  return (
    <div 
      className={`image-replacer ${isHovered ? 'hover' : ''} ${disabled ? 'disabled' : ''} ${className}`}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={disabled}
        style={{ display: 'none' }}
        aria-label="Upload image"
      />

      {/* Thumbnail */}
      <div className="image-replacer-thumbnail">
        {currentImage ? (
          <img 
            src={currentImage} 
            alt={currentFileName}
            className="image-replacer-image"
          />
        ) : (
          <div className="image-replacer-placeholder">
            <img src="Icons/img.svg" alt="" width="20" height="20" style={{display: 'block'}} />
          </div>
        )}
        <div className="image-replacer-thumbnail-shadow"></div>
      </div>

      {/* Filename */}
      <div className="image-replacer-filename">
        {truncateFileName(currentFileName)}
      </div>

      {/* Reset button */}
      {currentImage && (
        <button
          className="image-replacer-reset"
          onClick={handleReset}
          disabled={disabled}
          type="button"
          aria-label="Reset image"
        >
          <ResetIcon />
        </button>
      )}

      {/* Hover overlay */}
      {isHovered && <div className="image-replacer-hover-overlay"></div>}
    </div>
  );
};

// For non-JSX usage
window.ImageReplacer = ImageReplacer;
