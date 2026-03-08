class ImageGridSplitter {
    constructor() {
        this.image = null;
        this.imageDataURL = null; // Store image data for mode switching
        
        // Unified mode system: Content (image/color) + Layout (grid/scatter)
        this.contentMode = 'image'; // 'image' or 'color'
        this.layoutMode = 'grid'; // 'grid' or 'scatter'
        
        // Legacy mode for backwards compatibility (computed from contentMode + layoutMode)
        this.mode = 'grid';
        
        // Unified cell properties
        this.cellCount = 16; // Unified count (replaces gridSize, freestyleCellCount, paletteColorCount)
        this.cellSize = 0; // Unified size adjustment (-100 to +100, displayed as 0%-200%)
        this.cellSpread = 0; // Unified spread adjustment (-400 to +400%)
        
        // Legacy properties (kept for backwards compatibility)
        this.gridSize = 4;
        this.freestyleCellCount = 16;
        this.paletteColorCount = 16;
        this.gridCellScale = 0;
        this.freestyleCellScale = 0;
        this.paletteCellScale = 0;
        this.gridCellSpread = 0;
        this.freestyleCellSpread = 0;
        this.paletteCellSpread = 0;
        
        this.scale = 100; // Scale percentage (fixed at 100)
        this.imageFit = 'fill'; // Default to fill mode
        this.cellBorderRadius = 0; // Border radius percentage (0-100%), 0 for Stretch, 100 for Scatter
        this.cellTumble = 0; // Random rotation intensity for grid cells (0-100)
        this.cellRotations = []; // Store random rotations for each cell
        this.extractedColors = []; // Store extracted colors from image
        this.gridCellColors = []; // Store colors for color+grid mode
        this.columnWidths = [];
        this.rowHeights = [];
        this.isDragging = false;
        this.dragType = null;
        this.dragCol = null;
        this.dragRow = null;
        this.dragStart = { x: 0, y: 0 };
        this.dragThreshold = 10;
        
        // Canvas framing properties
        this.canvasRatio = 'original';
        this.canvasBackground = 'transparent';
        this.canvasColor = '#ffffff';
        this.canvasScale = 100;
        
        // Export scale multiplier (1, 1.5, 2, 4)
        this.exportScale = 1;
        
        // Background image (for "image" background type)
        this.backgroundImage = null;
        this.backgroundImageName = null;
        
        // Freestyle mode properties
        this.freestyleCells = [];
        this.cellShape = 'rounded';
        this.snapThreshold = 20; // pixels difference to trigger snap
        this.selectedCellIndex = null; // Index of currently selected cell
        this.aspectRatioLocked = true; // Whether W/H aspect ratio is locked (default: locked)
        this.lastAspectRatio = 1; // Store aspect ratio when locking
        this.cellDetailAspectLocked = true; // Whether cell detail panel W/H ratio is locked
        this.cellDetailLastAspectRatio = 1; // Store cell detail aspect ratio when locking
        this.cellWidthValue = 100; // Current width value for sliders
        this.cellHeightValue = 100; // Current height value for sliders
        this.chaosLevel = 50; // Chaos level for scatter mode (0-100%)
        this.hiddenCells = new Set(); // Set of cell indices hidden in Stretch mode
        
        // Animation state
        this.hasAnimatedEnter = false;
        
        // ─── Performance: render throttling ───────────────
        this._renderPending = false;
        this._layoutPending = false;
        this._sidebarUpdatePending = false;
        this._cellImageCache = null;       // Map<string, dataURL>
        this._cellImageCacheKey = null;    // tracks image + gridSize for invalidation
        this._imageHasAlpha = false;       // true when source image contains transparent pixels
        this._cellCanvas = null;           // reusable canvas for getCachedCellImage
        this._cellCanvasCtx = null;        // reusable 2d context
        this._canvasContentWrapper = null; // cached for grid-only swap fast path
        this._countKnobLoading = false;   // true while Count knob debounce is pending
        
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        this.sidebarWrapper = document.querySelector('.sidebar-wrapper');
        this.sidebar = document.querySelector('.sidebar');
        this.homeScreen = document.getElementById('homeScreen');
        this.imageUpload = document.getElementById('imageUpload');
        this.imageUploadCenter = document.getElementById('imageUploadCenter');
        this.canvasColorPicker = document.getElementById('canvasColorPicker');
        this.canvasColorInput = document.getElementById('canvasColor');
        this.colorSwatchesContainer = document.getElementById('colorSwatches');
        this.canvasControls = document.getElementById('canvasControls');
        this.gridContainer = document.getElementById('gridContainer');
        this.gridControls = document.getElementById('gridControls');
        this.freestyleControls = document.getElementById('freestyleControls');
        this.paletteControls = document.getElementById('paletteControls');
        this.floatingImages = document.querySelectorAll('.floating-image');
        
        // Dimension controls (Scatter mode)
        this.dimensionsGroup = document.getElementById('dimensionsGroup');
        
        // Store current filename for navbar
        this.currentFileName = 'Upload image';
        this.currentImageSrc = null;
    }

    attachEventListeners() {
        this.imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));
        this.imageUploadCenter.addEventListener('change', (e) => this.handleImageUpload(e));
        
        // Track space key for panning
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.isSpacePressed) {
                this.isSpacePressed = true;
                
                // Only show space-pressed cursor if canvas is overflowing or no canvas
                const canvasContainer = document.querySelector('.canvas-container');
                if (!canvasContainer || this.isCanvasOverflowing()) {
                    this.gridContainer.classList.add('space-pressed');
                }
                e.preventDefault();
            }
            // Escape key deselects cell
            if (e.key === 'Escape') {
                this.deselectCell();
            }
            // Backspace toggles hide on selected cell (Stretch mode only)
            if (e.key === 'Backspace' && this.selectedCellIndex !== null && this.mode === 'grid') {
                e.preventDefault();
                const idx = this.selectedCellIndex;
                if (this.hiddenCells.has(idx)) {
                    this.hiddenCells.delete(idx);
                } else {
                    this.hiddenCells.add(idx);
                }
                this.scheduleRender();
                this.scheduleSidebarUpdate('cellDetail');
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                this.isSpacePressed = false;
                this.isPanning = false;
                this.gridContainer.classList.remove('space-pressed', 'panning');
            }
        });
        
        // Pinch zoom with trackpad/touch
        this.gridContainer.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                // Pinch zoom
                e.preventDefault();
                const delta = -e.deltaY * 0.01;
                this.handleZoom(delta);
            }
        }, { passive: false });
        
        // Touch events for pinch zoom on mobile
        this.gridContainer.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.gridContainer.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.gridContainer.addEventListener('touchend', () => this.handleTouchEnd());
        
        // Click on canvas area deselects cell
        this.gridContainer.addEventListener('click', (e) => {
            if (e.target === this.gridContainer || e.target.classList.contains('canvas-container') || e.target.classList.contains('freestyle-container') || e.target.classList.contains('canvas-content-wrapper')) {
                this.deselectCell();
            }
        });
        
        // Mouse events for SPACE+drag panning
        this.gridContainer.addEventListener('mousedown', (e) => this.handlePanStart(e));
        document.addEventListener('mousemove', (e) => {
            this.handlePanMove(e);
            this.handleMouseMove(e);
        });
        document.addEventListener('mouseup', () => {
            this.handlePanEnd();
            this.handleMouseUp();
        });
        
        // Color input now handled by React TextField in sidebar
        if (this.canvasColorInput) {
            this.canvasColorInput.addEventListener('input', (e) => this.handleCanvasColorChange(e));
        }
        
        // Shape button handlers are now in React components
        
        // Floating image click handlers are now in index.html
    }

    handleModeChange() {
        this._canvasContentWrapper = null;
        if (this.image) {
            this.initializeForMode();
            this.renderContent();
        }
        this.updateNavbar();
    }
    
    handleUnifiedModeChange() {
        this.deselectCell();
        this._canvasContentWrapper = null;
        
        if (this.layoutMode === 'grid') {
            this.mode = 'grid';
        } else {
            this.mode = 'freestyle';
        }
        
        // Sync unified cellCount to mode-specific properties
        this.gridSize = Math.round(Math.sqrt(this.cellCount));
        this.freestyleCellCount = this.cellCount;
        this.paletteColorCount = this.cellCount;
        
        // Sync unified cellSize and cellSpread to mode-specific properties
        this.gridCellScale = this.cellSize;
        this.freestyleCellScale = this.cellSize;
        this.paletteCellScale = this.cellSize;
        this.gridCellSpread = this.cellSpread;
        this.freestyleCellSpread = this.cellSpread;
        this.paletteCellSpread = this.cellSpread;
        
        // Set mode-appropriate default radius when switching layout
        if (this.layoutMode === 'scatter') {
            if (this.cellBorderRadius === 0) this.cellBorderRadius = 100;
        } else {
            if (this.cellBorderRadius === 100) this.cellBorderRadius = 0;
        }
        
        if (this.image) {
            this.initializeForMode();
            this.renderContent();
        }
        
        // Update navbar
        this.updateNavbar();
    }
    
    handleCellCountChange(event) {
        this.deselectCell();
        
        this.cellCount = parseInt(event.target.value);
        
        const oldGridSize = this.gridSize;
        this.gridSize = Math.round(Math.sqrt(this.cellCount));
        this.freestyleCellCount = this.cellCount;
        this.paletteColorCount = this.cellCount;
        
        if (!this.image) return;

        // Lightweight data prep (arrays only — no DOM work)
        this.columnWidths = this.resizeArray(this.columnWidths, this.gridSize, 1);
        this.rowHeights = this.resizeArray(this.rowHeights, this.gridSize, 1);
        if (oldGridSize != null && this.cellRotations && this.cellRotations.length > 0) {
            this.cellRotations = this.remapCellRotations(this.cellRotations, oldGridSize, this.gridSize);
        } else {
            this.generateCellRotations();
        }

        // Enter loading state on the Count knob
        this._countKnobLoading = true;

        // Show a lightweight skeleton immediately (one rAF to coalesce)
        if (!this._skeletonPending) {
            this._skeletonPending = true;
            requestAnimationFrame(() => {
                this._skeletonPending = false;
                this._showCountSkeleton();
            });
        }

        // Debounce the full image render until the user stops dragging
        clearTimeout(this._countDebounceTimer);
        this._countDebounceTimer = setTimeout(() => {
            if (this.mode === 'freestyle') this.initializeFreestyleCells();
            if (this.contentMode === 'color') this.extractColorsForGrid();
            this.renderContent();
            this._countKnobLoading = false;
            if (window.updateSidebarComponents) window.updateSidebarComponents(this, new Set(['cellCount']));
        }, 180);
    }

    _showCountSkeleton() {
        const cw = this._canvasContentWrapper;
        if (!cw || this.mode !== 'grid') return;

        const oldGrid = cw.querySelector('.grid');
        if (!oldGrid) return;

        const gs = this.gridSize;
        const grid = document.createElement('div');
        grid.className = 'grid grid-skeleton';
        grid.style.width = oldGrid.style.width;
        grid.style.height = oldGrid.style.height;
        grid.style.gridTemplateColumns = `repeat(${gs}, 1fr)`;
        grid.style.gridTemplateRows = `repeat(${gs}, 1fr)`;

        const parts = new Array(gs * gs);
        for (let i = 0; i < gs * gs; i++) {
            parts[i] = '<div class="grid-cell"></div>';
        }
        grid.innerHTML = parts.join('');

        cw.replaceChild(grid, oldGrid);
    }
    
    updateNavbar() {
        const navbarContainer = document.getElementById('navbar-root');
        
        // Show navbar only if image is loaded
        if (this.image) {
            navbarContainer.classList.add('visible');
        } else {
            navbarContainer.classList.remove('visible');
        }
        
        // Update the navbar component with current state
        if (!window.navbarRoot) {
            window.navbarRoot = ReactDOM.createRoot(navbarContainer);
        }
        
        const self = this;
        
        // Update stored navbar state for consistency
        if (window.navbarState) {
            window.navbarState.imageSrc = this.currentImageSrc;
            window.navbarState.fileName = this.currentFileName;
        }
        
        window.navbarRoot.render(
            React.createElement(window.Navbar, {
                imageSrc: this.currentImageSrc,
                fileName: this.currentFileName,
                onImageChange: (file) => {
                    const event = new Event('change', { bubbles: true });
                    const fileInput = document.getElementById('imageUpload');
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    fileInput.files = dataTransfer.files;
                    fileInput.dispatchEvent(event);
                },
                onImageReset: () => {
                    this.handleImageReset();
                },
                onReset: () => {
                    if (this.image) {
                        this.resetToDefaults();
                        this.initializeForMode();
                        this.renderContent();
                        this.updateNavbar();
                        if (window.updateSidebarComponents) window.updateSidebarComponents(this);
                    }
                },
                hideViewToggle: true,
                theme: window.currentTheme || 'light',
                onThemeChange: (theme) => {
                    console.log('Theme change requested (script.js):', theme);
                    window.currentTheme = theme;
                    if (theme === 'dark') {
                        document.documentElement.classList.add('dark-mode');
                        document.documentElement.classList.remove('light-mode');
                    } else {
                        document.documentElement.classList.add('light-mode');
                        document.documentElement.classList.remove('dark-mode');
                    }
                    self.updateNavbar();
                },
                disabled: false
            })
        );
        
        // Update sidebar components to reflect current state
        if (window.updateSidebarComponents) {
            window.updateSidebarComponents(this);
        }
    }

    handleShapeChange(event) {
        // cellShape is already set by React component
        // Just update existing cells
        if (this.mode === 'freestyle') {
            this.updateCellShapes();
        }
    }

    // Dimension controls handlers (Scatter mode) - Slider-based
    handleCellWidthSliderChange(value) {
        const newWidth = value;
        let newHeight = this.cellHeightValue;
        
        if (this.aspectRatioLocked) {
            newHeight = Math.round(newWidth / this.lastAspectRatio);
            this.cellHeightValue = newHeight;
        }
        
        this.cellWidthValue = newWidth;
        this.applyCellDimensions(newWidth, newHeight);
    }

    handleCellHeightSliderChange(value) {
        const newHeight = value;
        let newWidth = this.cellWidthValue;
        
        if (this.aspectRatioLocked) {
            newWidth = Math.round(newHeight * this.lastAspectRatio);
            this.cellWidthValue = newWidth;
        }
        
        this.cellHeightValue = newHeight;
        this.applyCellDimensions(newWidth, newHeight);
    }

    applyCellDimensions(width, height) {
        if (this.selectedCellIndex !== null) {
            const cells = document.querySelectorAll('.freestyle-cell');
            const cell = cells[this.selectedCellIndex];
            const cellData = this.freestyleCells[this.selectedCellIndex];
            if (cell && cellData) {
                const currentWidth = parseFloat(cell.style.width) || cell.offsetWidth;
                const currentHeight = parseFloat(cell.style.height) || cell.offsetHeight;
                const deltaW = width - currentWidth;
                const deltaH = height - currentHeight;

                // Accumulate center compensation in data-x/data-y
                const ox = (parseFloat(cell.getAttribute('data-x')) || 0) - deltaW / 2;
                const oy = (parseFloat(cell.getAttribute('data-y')) || 0) - deltaH / 2;
                cell.setAttribute('data-x', ox);
                cell.setAttribute('data-y', oy);

                cell.style.width = `${width}px`;
                cell.style.height = `${height}px`;

                if (this.cellBorderRadius > 0) {
                    cell.style.borderRadius = `${this.getBorderRadiusPx(width, height)}px`;
                }

                cellData.width = width;
                cellData.height = height;
                cellData.individuallyModified = true;

                // Rebuild this cell's transform (spread + scale + rotation + offset)
                this._updateFreestyleCellStyles();
            }
        } else {
            this.resizeAllCellsToSize(width, height);
        }
    }

    toggleAspectLock() {
        this.aspectRatioLocked = !this.aspectRatioLocked;
        
        // Store current aspect ratio when locking
        if (this.aspectRatioLocked) {
            this.lastAspectRatio = this.cellWidthValue / this.cellHeightValue;
        }
    }

    selectCell(index) {
        // Deselect previous
        this.deselectCell();
        
        this.selectedCellIndex = index;

        if (this.mode === 'grid') {
            // Grid / Stretch mode: highlight the grid cell
            const cells = document.querySelectorAll('.grid-cell');
            if (cells[index]) {
                cells[index].classList.add('selected');
            }
            // Capture initial aspect ratio for lock
            const col = index % this.gridSize;
            const row = Math.floor(index / this.gridSize);
            const totalColW = this.columnWidths.reduce((a, b) => a + b, 0);
            const totalRowH = this.rowHeights.reduce((a, b) => a + b, 0);
            const wp = (this.columnWidths[col] / totalColW) * 100;
            const hp = (this.rowHeights[row] / totalRowH) * 100;
            this.cellDetailLastAspectRatio = wp / hp;
        } else {
            // Scatter / Freestyle mode
            const cells = document.querySelectorAll('.freestyle-cell');
            if (cells[index]) {
                cells[index].classList.add('selected');
                
                // Update dimension values with this cell's values
                const cellData = this.freestyleCells[index];
                if (cellData) {
                    this.cellWidthValue = Math.round(cellData.width);
                    this.cellHeightValue = Math.round(cellData.height);
                    // Capture initial aspect ratio for lock
                    this.cellDetailLastAspectRatio = cellData.width / cellData.height;
                }
            }
        }
        
        // Update hint text
        const hint = document.getElementById('scatterHint');
        if (hint) {
            hint.textContent = 'Editing selected cell';
        }

        // Slide sidebar to Panel 2
        const panels = document.getElementById('sidebarPanels');
        if (panels) panels.classList.add('show-panel-2');

        // Refresh sidebar (renders cell detail panel)
        if (window.updateSidebarComponents) {
            window.updateSidebarComponents(this);
        }
    }

    deselectCell() {
        if (this.selectedCellIndex !== null) {
            // Remove highlight from whichever cell type is active
            const freestyleCells = document.querySelectorAll('.freestyle-cell');
            const gridCells = document.querySelectorAll('.grid-cell');
            if (freestyleCells[this.selectedCellIndex]) {
                freestyleCells[this.selectedCellIndex].classList.remove('selected');
            }
            if (gridCells[this.selectedCellIndex]) {
                gridCells[this.selectedCellIndex].classList.remove('selected');
            }
            this.selectedCellIndex = null;
        }
        
        // Reset hint text
        const hint = document.getElementById('scatterHint');
        if (hint) {
            hint.textContent = 'Select one to edit individually';
        }
        
        // Slide sidebar back to Panel 1
        const panels = document.getElementById('sidebarPanels');
        if (panels) panels.classList.remove('show-panel-2');
        
        // Update values from cells
        this.updateDimensionValuesFromCells();

        // Refresh sidebar
        if (window.updateSidebarComponents) {
            window.updateSidebarComponents(this);
        }
    }

    updateDimensionValuesFromCells() {
        if (!this.freestyleCells.length) return;
        
        // Use first cell's dimensions as reference
        const firstCell = this.freestyleCells[0];
        if (firstCell) {
            this.cellWidthValue = Math.round(firstCell.width);
            this.cellHeightValue = Math.round(firstCell.height);
        }
    }

    handleFitChange(event) {
        this.imageFit = event.target.dataset.fit;
        this._canvasContentWrapper = null;
        
        if (this.image) {
            requestAnimationFrame(() => this.renderContent());
        }
    }

    handleCanvasRatioChange(event) {
        this.canvasRatio = event.target.value;
        this._canvasContentWrapper = null;
        
        if (this.image) {
            requestAnimationFrame(() => this.renderContent());
        }
    }

    handleCanvasBackgroundChange(event) {
        this.canvasBackground = event.target.value;
        this._canvasContentWrapper = null;
        
        if (this.canvasBackground === 'image' && !this.backgroundImage && this.image) {
            this.backgroundImage = this.image;
        }
        
        if (this.canvasColorPicker) {
            if (this.canvasBackground === 'color') {
                this.canvasColorPicker.style.display = 'block';
                this.renderColorSwatches();
            } else {
                this.canvasColorPicker.style.display = 'none';
            }
        }
        
        if (this.image) {
            requestAnimationFrame(() => this.renderContent());
        }
    }

    handleCanvasColorChange(event) {
        this.canvasColor = event.target.value;
        this._canvasContentWrapper = null;
        this.updateColorSwatchSelection();
        if (this.image) {
            requestAnimationFrame(() => this.renderContent());
        }
    }
    
    renderColorSwatches() {
        if (!this.colorSwatchesContainer) return;
        
        // Get up to 8 colors from extractedColors
        const colors = this.extractedColors.slice(0, 8);
        
        if (colors.length === 0) {
            this.colorSwatchesContainer.innerHTML = '';
            return;
        }
        
        // Build the swatches HTML
        this.colorSwatchesContainer.innerHTML = colors.map((color, index) => {
            const hexColor = this.rgbToHex(color);
            const isSelected = this.canvasColor.toLowerCase() === hexColor.toLowerCase();
            return `<div class="color-swatch-item${isSelected ? ' selected' : ''}" 
                         data-color="${hexColor}" 
                         data-index="${index}"
                         style="background-color: ${color};"
                         title="${hexColor}"></div>`;
        }).join('');
        
        // Attach click listeners
        this.colorSwatchesContainer.querySelectorAll('.color-swatch-item').forEach(swatch => {
            swatch.addEventListener('click', (e) => this.handleSwatchClick(e));
        });
    }
    
    handleSwatchClick(event) {
        const swatch = event.currentTarget;
        const color = swatch.dataset.color;
        
        this.canvasColor = color;
        this._canvasContentWrapper = null;
        
        // Update the color picker input
        if (this.canvasColorInput) {
            this.canvasColorInput.value = color;
        }
        
        // Update swatch selection styling
        this.updateColorSwatchSelection();
        
        // Re-render the content
        if (this.image) {
            requestAnimationFrame(() => this.renderContent());
        }
    }
    
    updateColorSwatchSelection() {
        if (!this.colorSwatchesContainer) return;
        
        const swatches = this.colorSwatchesContainer.querySelectorAll('.color-swatch-item');
        swatches.forEach(swatch => {
            const swatchColor = swatch.dataset.color.toLowerCase();
            const currentColor = this.canvasColor.toLowerCase();
            if (swatchColor === currentColor) {
                swatch.classList.add('selected');
            } else {
                swatch.classList.remove('selected');
            }
        });
    }
    
    rgbToHex(rgbString) {
        // Handle rgb(r, g, b) or hsl(h, s%, l%) format
        if (rgbString.startsWith('rgb')) {
            const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
                const r = parseInt(match[1]);
                const g = parseInt(match[2]);
                const b = parseInt(match[3]);
                return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
            }
        } else if (rgbString.startsWith('hsl')) {
            // Convert HSL to RGB then to Hex
            const match = rgbString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            if (match) {
                const h = parseInt(match[1]) / 360;
                const s = parseInt(match[2]) / 100;
                const l = parseInt(match[3]) / 100;
                
                let r, g, b;
                if (s === 0) {
                    r = g = b = l;
                } else {
                    const hue2rgb = (p, q, t) => {
                        if (t < 0) t += 1;
                        if (t > 1) t -= 1;
                        if (t < 1/6) return p + (q - p) * 6 * t;
                        if (t < 1/2) return q;
                        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                        return p;
                    };
                    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                    const p = 2 * l - q;
                    r = hue2rgb(p, q, h + 1/3);
                    g = hue2rgb(p, q, h);
                    b = hue2rgb(p, q, h - 1/3);
                }
                return '#' + [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
                    .map(x => x.toString(16).padStart(2, '0')).join('');
            }
        }
        return rgbString; // Return as-is if not rgb/hsl format
    }

    handleCanvasScaleChange(event) {
        this.canvasScale = parseInt(event.target.value);
        this._canvasContentWrapper = null;
        if (this.image) {
            requestAnimationFrame(() => this.renderContent());
        }
    }

    /**
     * Detect whether an image contains any transparent pixels.
     * Samples a down-scaled version for speed (100x100 max).
     */
    detectImageAlpha(img) {
        const sampleSize = Math.min(100, img.width, img.height);
        const canvas = document.createElement('canvas');
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
        const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 254) return true; // any non-fully-opaque pixel
        }
        return false;
    }

    createDisplayImage(fullImage, maxDim = 1400) {
        if (fullImage.width <= maxDim && fullImage.height <= maxDim) {
            return Promise.resolve(fullImage);
        }
        const scale = maxDim / Math.max(fullImage.width, fullImage.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(fullImage.width * scale);
        canvas.height = Math.round(fullImage.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(fullImage, 0, 0, canvas.width, canvas.height);
        const img = new Image();
        return new Promise(resolve => {
            img.onload = () => resolve(img);
            img.src = this._imageHasAlpha
                ? canvas.toDataURL('image/png')
                : canvas.toDataURL('image/jpeg', 0.92);
        });
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.currentFileName = file.name;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.imageDataURL = e.target.result;
            this.currentImageSrc = this.imageDataURL;
            const img = new Image();
            img.onload = async () => {
                this.image = img;
                this._imageHasAlpha = this.detectImageAlpha(img);
                this.displayImage = await this.createDisplayImage(img);
                this.resetToDefaults();
                this.initializeForMode();
                this.renderContent();
                this.updateNavbar();
                if (window.updateSidebarComponents) window.updateSidebarComponents(this);
            };
            img.src = this.imageDataURL;
        };
        reader.readAsDataURL(file);
    }

    loadExampleImage(event) {
        const imagePath = event.currentTarget?.dataset?.image || event.target?.dataset?.image;
        const fileName = imagePath.split('/').pop();
        
        console.log('Loading example image:', imagePath);
        
        // Show loading state
        this.currentFileName = 'Loading...';
        this.updateNavbar();
        
        // Load with CORS for local files
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            console.log('Image loaded successfully:', imagePath);
            
            // Convert to data URL to avoid CORS issues later
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            try {
                // Detect transparency and choose format accordingly
                // PNG preserves alpha but produces much larger data URLs
                const hasAlpha = this.detectImageAlpha(img);
                this._imageHasAlpha = hasAlpha;
                this.imageDataURL = hasAlpha
                    ? canvas.toDataURL('image/png')
                    : canvas.toDataURL('image/jpeg', 0.85);
                this.currentImageSrc = this.imageDataURL;
                
                const finalImg = new Image();
                finalImg.onload = async () => {
                    this.image = finalImg;
                    this.displayImage = await this.createDisplayImage(finalImg);
                    this.currentFileName = fileName;
                    this.resetToDefaults();
                    this.initializeForMode();
                    this.renderContent();
                    this.updateNavbar();
                    if (window.updateSidebarComponents) window.updateSidebarComponents(this);
                };
                finalImg.src = this.imageDataURL;
            } catch (e) {
                console.error('CORS error converting to data URL:', e);
                this.currentFileName = 'CORS error - cannot load local file';
                this.updateNavbar();
                alert('Cannot load local images due to browser security. Please use a local server or upload the image instead.');
            }
        };
        
        img.onerror = (error) => {
            console.error('Failed to load image:', imagePath, error);
            this.currentFileName = 'Failed to load image';
            this.updateNavbar();
            alert('Failed to load image. Please check the browser console for details.');
        };
        
        img.src = imagePath;
    }

    handleGridSizeChange(event) {
        const oldGridSize = this.gridSize;
        this.gridSize = parseInt(event.target.value);
        if (this.image) {
            this._pendingOldGridSize = oldGridSize;
            if (!this._renderPending) {
                this._renderPending = true;
                requestAnimationFrame(() => {
                    this._renderPending = false;
                    this.initializeForMode(this._pendingOldGridSize);
                    this.renderContent();
                });
            }
        }
    }

    handleFreestyleCellCountChange(event) {
        this.freestyleCellCount = parseInt(event.target.value);
        if (this.image && this.mode === 'freestyle') {
            this.initializeFreestyleCells();
            requestAnimationFrame(() => this.renderContent());
        }
    }

    handlePaletteColorCountChange(event) {
        this.paletteColorCount = parseInt(event.target.value);
        if (this.image && this.mode === 'palette') {
            this.extractColors();
            this.initializePaletteCells();
            requestAnimationFrame(() => this.renderContent());
        }
    }

    // Resize an array: truncate if shorter, extend with defaultValue if longer.
    // Returns a fresh array if the source doesn't exist or is empty (first init).
    resizeArray(arr, newLength, defaultValue) {
        if (!arr || arr.length === 0) {
            return new Array(newLength).fill(defaultValue);
        }
        if (newLength <= arr.length) {
            return arr.slice(0, newLength);
        }
        return arr.concat(new Array(newLength - arr.length).fill(defaultValue));
    }

    // Remap cell rotations from oldGridSize to newGridSize, preserving by (row, col).
    // Cells that existed in the old grid keep their rotation; new cells get fresh randoms.
    remapCellRotations(oldRotations, oldGridSize, newGridSize) {
        const totalCells = newGridSize * newGridSize;
        const newRotations = [];
        for (let i = 0; i < totalCells; i++) {
            const row = Math.floor(i / newGridSize);
            const col = i % newGridSize;
            if (oldRotations && row < oldGridSize && col < oldGridSize) {
                // Preserve rotation from the same (row, col) in the old grid
                newRotations.push(oldRotations[row * oldGridSize + col]);
            } else {
                // New cell — generate a fresh random factor
                newRotations.push(Math.random() * 2 - 1);
            }
        }
        return newRotations;
    }

    resetToDefaults() {
        this._canvasContentWrapper = null;
        this.selectedCellIndex = null;
        const panels = document.getElementById('sidebarPanels');
        if (panels) panels.classList.remove('show-panel-2');
        
        // Reset all editor values to their constructor defaults
        this.contentMode = 'image';
        this.layoutMode = 'grid';
        this.mode = 'grid';
        
        this.cellCount = 16;
        this.cellSize = 0;
        this.cellSpread = 0;
        
        this.gridSize = 4;
        this.freestyleCellCount = 16;
        this.paletteColorCount = 16;
        this.gridCellScale = 0;
        this.freestyleCellScale = 0;
        this.paletteCellScale = 0;
        this.gridCellSpread = 0;
        this.freestyleCellSpread = 0;
        this.paletteCellSpread = 0;
        
        this.scale = 100;
        this.imageFit = 'fill';
        this.cellBorderRadius = 0;
        this.cellTumble = 0;
        this.cellRotations = [];
        this.columnWidths = [];
        this.rowHeights = [];
        this.hiddenCells = new Set();
        
        this.canvasRatio = 'original';
        this.canvasBackground = 'transparent';
        this.canvasColor = '#ffffff';
        this.canvasScale = 100;
        
        this.exportScale = 1;
        
        this.backgroundImage = null;
        this.backgroundImageName = null;
        
        this.extractedColors = []; // force re-extraction for new image
        this.gridCellColors = [];
        
        this.freestyleCells = [];
        this.cellShape = 'rounded';
        this.aspectRatioLocked = true;
        this.lastAspectRatio = 1;
        this.cellDetailAspectLocked = true;
        this.cellDetailLastAspectRatio = 1;
        this.cellWidthValue = 100;
        this.cellHeightValue = 100;
        this.chaosLevel = 50;
        
        this.hasAnimatedEnter = false;
    }

    initializeForMode(oldGridSize) {
        // Extract palette colors only when they haven't been computed yet
        // (they depend on the image, not on cell count / grid size)
        if (!this.extractedColors || this.extractedColors.length === 0) {
            this.extractColors();
        }
        
        // Extract per-cell colors when in color content mode
        // (these DO depend on gridSize so must re-run when grid changes)
        if (this.contentMode === 'color') {
            this.extractColorsForGrid();
        }
        
        if (this.mode === 'grid') {
            // Preserve column/row weights and rotations when resizing, fresh arrays on first init
            this.columnWidths = this.resizeArray(this.columnWidths, this.gridSize, 1);
            this.rowHeights = this.resizeArray(this.rowHeights, this.gridSize, 1);
            if (oldGridSize != null && this.cellRotations && this.cellRotations.length > 0) {
                this.cellRotations = this.remapCellRotations(this.cellRotations, oldGridSize, this.gridSize);
            } else {
                this.generateCellRotations();
            }
        } else {
            this.initializeFreestyleCells();
        }
    }

    generateCellRotations() {
        // Generate random rotations for each cell based on tumble intensity
        const totalCells = this.gridSize * this.gridSize;
        this.cellRotations = [];
        for (let i = 0; i < totalCells; i++) {
            // Random value between -1 and 1, scaled by tumble intensity
            const randomFactor = (Math.random() * 2 - 1);
            this.cellRotations.push(randomFactor);
        }
    }

    getMaxCellRadius() {
        // Calculate max radius based on the larger cell dimension
        if (!this.image) return 500; // Default fallback
        
        const cellWidth = this.image.width / this.gridSize;
        const cellHeight = this.image.height / this.gridSize;
        
        // Max useful radius is half of the larger dimension
        return Math.round(Math.max(cellWidth, cellHeight) / 2);
    }

    // Convert cellBorderRadius percentage (0-100) to pixel value for a given width/height
    getBorderRadiusPx(width, height) {
        if (this.cellBorderRadius <= 0) return 0;
        const maxRadius = Math.min(width, height) / 2;
        return (this.cellBorderRadius / 100) * maxRadius;
    }

    extractColors() {
        try {
            // Extract dominant colors from the image using optimized canvas sampling
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            // Scale down more aggressively for better performance
            const maxSize = 50; // Reduced from 100
            const scale = Math.min(maxSize / this.image.width, maxSize / this.image.height);
            canvas.width = Math.floor(this.image.width * scale);
            canvas.height = Math.floor(this.image.height * scale);
            
            ctx.drawImage(this.image, 0, 0, canvas.width, canvas.height);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            
            // Sample pixels and extract colors using optimized clustering
            const colorMap = new Map();
            const step = 8; // Increased step for faster sampling
            
            for (let i = 0; i < pixels.length; i += step * 4) {
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                const a = pixels[i + 3];
                
                if (a < 128) continue; // Skip transparent pixels
                
                // Quantize colors more aggressively to reduce similar colors
                const qr = Math.round(r / 40) * 40;
                const qg = Math.round(g / 40) * 40;
                const qb = Math.round(b / 40) * 40;
                const key = `${qr},${qg},${qb}`;
                
                colorMap.set(key, (colorMap.get(key) || 0) + 1);
            }
            
            // Sort colors by frequency and take top N
            const sortedColors = Array.from(colorMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, this.paletteColorCount)
                .map(([color]) => {
                    const [r, g, b] = color.split(',').map(Number);
                    return `rgb(${r}, ${g}, ${b})`;
                });
            
            this.extractedColors = sortedColors;
            this.renderColorSwatches();
            if (window.updateSidebarRoot) window.updateSidebarRoot(this, 'backgroundControl');
        } catch (e) {
            console.error('Error extracting colors (CORS):', e);
            const defaultColors = [];
            for (let i = 0; i < this.paletteColorCount; i++) {
                const hue = (i * 360 / this.paletteColorCount) % 360;
                defaultColors.push(`hsl(${hue}, 70%, 60%)`);
            }
            this.extractedColors = defaultColors;
            this.renderColorSwatches();
            if (window.updateSidebarRoot) window.updateSidebarRoot(this, 'backgroundControl');
        }
    }
    
    extractColorsForGrid() {
        // Extract average color per grid cell.
        // Uses a single downscaled getImageData instead of N² getImageData calls.
        try {
            const gs = this.gridSize;
            // Sample at least 8 px per cell so colour average is reasonable,
            // but cap total canvas to keep it fast (max ~200 × 200).
            const cellSample = Math.max(8, Math.min(24, Math.floor(200 / gs)));
            const sw = gs * cellSample;
            const sh = gs * cellSample;

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            canvas.width = sw;
            canvas.height = sh;
            ctx.drawImage(this.image, 0, 0, sw, sh);

            // One getImageData for the entire downscaled image
            const imageData = ctx.getImageData(0, 0, sw, sh);
            const pixels = imageData.data;

            this.gridCellColors = [];

            for (let row = 0; row < gs; row++) {
                for (let col = 0; col < gs; col++) {
                    let totalR = 0, totalG = 0, totalB = 0, count = 0;
                    const x0 = col * cellSample;
                    const y0 = row * cellSample;

                    for (let y = y0; y < y0 + cellSample; y++) {
                        for (let x = x0; x < x0 + cellSample; x++) {
                            const idx = (y * sw + x) * 4;
                            if (pixels[idx + 3] < 128) continue;
                            totalR += pixels[idx];
                            totalG += pixels[idx + 1];
                            totalB += pixels[idx + 2];
                            count++;
                        }
                    }

                    if (count > 0) {
                        this.gridCellColors.push(
                            `rgb(${Math.round(totalR / count)}, ${Math.round(totalG / count)}, ${Math.round(totalB / count)})`
                        );
                    } else {
                        this.gridCellColors.push('rgb(128, 128, 128)');
                    }
                }
            }
        } catch (e) {
            console.error('Error extracting grid colors:', e);
            this.gridCellColors = [];
            const totalCells = this.gridSize * this.gridSize;
            for (let i = 0; i < totalCells; i++) {
                const hue = (i * 360 / totalCells) % 360;
                this.gridCellColors.push(`hsl(${hue}, 70%, 60%)`);
            }
        }
    }

    initializePaletteCells() {
        this.freestyleCells = [];
        const containerWidth = this.gridContainer.clientWidth - 100;
        const containerHeight = this.gridContainer.clientHeight - 100;
        
        const cols = Math.ceil(Math.sqrt(this.paletteColorCount));
        const rows = Math.ceil(this.paletteColorCount / cols);
        
        const baseCellWidth = Math.min(200, containerWidth / cols);
        const baseCellHeight = Math.min(200, containerHeight / rows);
        
        const cellWidth = baseCellWidth;
        const cellHeight = baseCellHeight;
        
        const gridWidth = cellWidth * cols;
        const gridHeight = cellHeight * rows;
        
        const startX = (containerWidth - gridWidth) / 2 + 50;
        const startY = (containerHeight - gridHeight) / 2 + 50;
        
        const maxOffsetX = cellWidth * 0.3;
        const maxOffsetY = cellHeight * 0.3;
        
        // Create cells with colors
        for (let i = 0; i < this.paletteColorCount && i < this.extractedColors.length; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            
            const baseX = startX + (col * cellWidth);
            const baseY = startY + (row * cellHeight);
            
            const offsetX = (Math.random() - 0.5) * 2 * maxOffsetX;
            const offsetY = (Math.random() - 0.5) * 2 * maxOffsetY;
            
            this.freestyleCells.push({
                x: baseX + offsetX,
                y: baseY + offsetY,
                baseX: baseX,
                baseY: baseY,
                width: cellWidth,
                height: cellHeight,
                color: this.extractedColors[i] || this.extractedColors[0],
                individuallyModified: false
            });
        }
    }

    initializeFreestyleCells() {
        this._freestyleCellsJustRebuilt = true;
        this.freestyleCells = [];
        
        // Use the image/canvas aspect ratio so scatter cells match the
        // canvas shape instead of the viewport container shape.
        const viewW = this.gridContainer.clientWidth - 100;
        const viewH = this.gridContainer.clientHeight - 100;
        
        let targetAspect;
        if (this.canvasRatio === 'original') {
            targetAspect = this.image ? (this.image.width / this.image.height) : (viewW / viewH);
        } else {
            const [wr, hr] = this.canvasRatio.split(':').map(Number);
            targetAspect = wr / hr;
        }
        
        // Fit the target aspect ratio inside the available viewport area
        let containerWidth, containerHeight;
        if (viewW / viewH > targetAspect) {
            containerHeight = viewH;
            containerWidth = containerHeight * targetAspect;
        } else {
            containerWidth = viewW;
            containerHeight = containerWidth / targetAspect;
        }
        
        // Calculate grid dimensions based on cell count to evenly divide the image
        const cols = Math.ceil(Math.sqrt(this.freestyleCellCount));
        const rows = Math.ceil(this.freestyleCellCount / cols);
        
        // Apply scale to cell sizes (scale is percentage 50-200)
        const scaleMultiplier = this.scale / 100;
        const baseCellWidth = containerWidth / cols;
        const baseCellHeight = containerHeight / rows;
        const baseCellSize = Math.min(baseCellWidth, baseCellHeight);
        
        const cellWidth = baseCellSize * scaleMultiplier;
        const cellHeight = baseCellSize * scaleMultiplier;
        
        // Calculate the grid layout dimensions
        const gridWidth = cellWidth * cols;
        const gridHeight = cellHeight * rows;
        
        // Center the grid in the container
        const startX = (containerWidth - gridWidth) / 2 + 50;
        const startY = (containerHeight - gridHeight) / 2 + 50;
        
        // Chaos level controls offset amount (0-100%)
        const chaosMultiplier = this.chaosLevel / 100;
        
        // Factor in unified cellSize so chaos offsets scale with cell size
        const sizeFactor = 1 + (this.cellSize / 100);
        
        // Factor in unified cellSpread so chaos offsets scale with spread
        const spreadFactor = 1 + Math.abs(this.cellSpread) / 200;
        
        // Maximum random offset based on chaos level, accounting for size and spread
        const offsetMultiplier = Math.max(0.1, 1 - (scaleMultiplier - 1) * 0.5);
        const maxOffsetX = cellWidth * 0.5 * offsetMultiplier * chaosMultiplier * sizeFactor * spreadFactor;
        const maxOffsetY = cellHeight * 0.5 * offsetMultiplier * chaosMultiplier * sizeFactor * spreadFactor;
        
        // Create ordered list of image positions
        const imagePositions = [];
        let posIndex = 0;
        for (let row = 0; row < rows && posIndex < this.freestyleCellCount; row++) {
            for (let col = 0; col < cols && posIndex < this.freestyleCellCount; col++) {
                imagePositions.push({ row, col });
                posIndex++;
            }
        }
        
        // Shuffle image positions if chaos >= 50%
        // Shuffling increases from 50% to 100% chaos
        if (this.chaosLevel >= 50) {
            const shuffleIntensity = (this.chaosLevel - 50) / 50; // 0 at 50%, 1 at 100%
            const shuffleCount = Math.floor(imagePositions.length * shuffleIntensity);
            
            // Fisher-Yates partial shuffle
            for (let i = 0; i < shuffleCount; i++) {
                const j = Math.floor(Math.random() * imagePositions.length);
                const k = Math.floor(Math.random() * imagePositions.length);
                [imagePositions[j], imagePositions[k]] = [imagePositions[k], imagePositions[j]];
            }
        }
        
        // Create cells in a grid pattern with chaos-based offsets
        let cellIndex = 0;
        for (let row = 0; row < rows && cellIndex < this.freestyleCellCount; row++) {
            for (let col = 0; col < cols && cellIndex < this.freestyleCellCount; col++) {
                // Calculate base grid position
                const baseX = startX + (col * cellWidth);
                const baseY = startY + (row * cellHeight);
                
                // Add random offset based on chaos level (0 at 0% chaos)
                const offsetX = chaosMultiplier > 0 ? (Math.random() - 0.5) * 2 * maxOffsetX : 0;
                const offsetY = chaosMultiplier > 0 ? (Math.random() - 0.5) * 2 * maxOffsetY : 0;
                
                const x = baseX + offsetX;
                const y = baseY + offsetY;
                
                // Get image position (may be shuffled at high chaos)
                const imgPos = imagePositions[cellIndex];
                
                // Generate per-cell random rotation factor for tumble
                const rotationFactor = (Math.random() - 0.5) * 2; // -1 to 1
                
                this.freestyleCells.push({
                    imageRow: imgPos.row,
                    imageCol: imgPos.col,
                    imageCols: cols,
                    imageRows: rows,
                    baseX: baseX,
                    baseY: baseY,
                    x,
                    y,
                    width: cellWidth,
                    height: cellHeight,
                    rotationFactor: rotationFactor,
                    individuallyModified: false
                });
                
                cellIndex++;
            }
        }
        
        // Update dimension inputs with initial cell sizes
        this.updateDimensionValuesFromCells();
        
        // Deselect any previously selected cell
        this.selectedCellIndex = null;
    }

    randomizePositions() {
        if (this.mode !== 'freestyle' || !this.freestyleCells.length) return;
        
        // Randomize positions while maintaining approximate grid layout
        // Offset amount scales with the scale setting
        const scaleMultiplier = this.scale / 100;
        const offsetMultiplier = Math.max(0.1, 1 - (scaleMultiplier - 1) * 0.5);
        
        this.freestyleCells.forEach(cell => {
            const maxOffsetX = cell.width * 0.3 * offsetMultiplier;
            const maxOffsetY = cell.height * 0.3 * offsetMultiplier;
            
            const offsetX = (Math.random() - 0.5) * 2 * maxOffsetX;
            const offsetY = (Math.random() - 0.5) * 2 * maxOffsetY;
            
            cell.x = cell.baseX + offsetX;
            cell.y = cell.baseY + offsetY;
        });
        
        this.renderContent();
    }

    handleReset() {
        // Dismiss cell detail panel
        this.deselectCell();
        
        if (this.mode === 'grid') {
            this.columnWidths = new Array(this.gridSize).fill(1);
            this.rowHeights = new Array(this.gridSize).fill(1);
        } else {
            this.initializeFreestyleCells();
        }
        this.renderContent();
    }
    
    handleImageReset() {
        // Dismiss cell detail panel
        this.deselectCell();
        
        // Clear the image and return to placeholder
        this.image = null;
        this.imageDataURL = null;
        this.currentImageSrc = null;
        this.currentFileName = 'Upload image';
        this.hasAnimatedEnter = false; // Reset animation flag for next image
        
        // Hide sidebar
        if (this.sidebarWrapper) {
            this.sidebarWrapper.classList.remove('visible');
        }
        
        // Clear the grid container and show home screen
        this.gridContainer.innerHTML = '';
        if (this.homeScreen) {
            this.homeScreen.style.display = 'block';
            this.gridContainer.appendChild(this.homeScreen);
        }
        
        // Update navbar
        this.updateNavbar();
    }

    handleMouseMove(event) {
        if (!this.isDragging || this.mode !== 'grid') return;

        const deltaX = event.clientX - this.dragStart.x;
        const deltaY = event.clientY - this.dragStart.y;

        if (this.dragType === null) {
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);
            
            if (absX > this.dragThreshold || absY > this.dragThreshold) {
                this.dragType = absX > absY ? 'col' : 'row';
            } else {
                return;
            }
        }

        const baseSensitivity = 0.005;
        const minCellPx = 2; // minimum pixel size for any cell

        // Compute actual grid pixel dimensions (same logic as createGridContent)
        const containerWidth = this.gridContainer.clientWidth - 40;
        const containerHeight = this.gridContainer.clientHeight - 40;
        const aspectRatio = this.image.width / this.image.height;
        let gridPixelW, gridPixelH;
        if (containerWidth / containerHeight > aspectRatio) {
            gridPixelH = containerHeight;
            gridPixelW = gridPixelH * aspectRatio;
        } else {
            gridPixelW = containerWidth;
            gridPixelH = gridPixelW / aspectRatio;
        }

        if (this.dragType === 'col') {
            const rawChange = deltaX * baseSensitivity;
            const change = rawChange + rawChange * Math.abs(rawChange) * 0.5;
            const newWeight = this.baseWidth + change;

            // Compute dynamic max: other columns must remain >= minCellPx
            const otherWeights = this.columnWidths.filter((_, i) => i !== this.dragCol);
            const minOther = Math.min(...otherWeights);
            const sumOther = otherWeights.reduce((a, b) => a + b, 0);
            // minOther / (dragWeight + sumOther) * gridPixelW >= minCellPx
            // dragWeight <= minOther * gridPixelW / minCellPx - sumOther
            const maxWeight = (minOther * gridPixelW / minCellPx) - sumOther;

            // Also compute min: dragged column must be >= minCellPx
            // dragWeight / (dragWeight + sumOther) * gridPixelW >= minCellPx
            // Approximate: a very small fr value relative to others
            const minWeight = (minCellPx * sumOther) / (gridPixelW - minCellPx);

            this.columnWidths[this.dragCol] = Math.max(minWeight, Math.min(maxWeight, newWeight));
        } else if (this.dragType === 'row') {
            const rawChange = deltaY * baseSensitivity;
            const change = rawChange + rawChange * Math.abs(rawChange) * 0.5;
            const newWeight = this.baseHeight + change;

            const otherWeights = this.rowHeights.filter((_, i) => i !== this.dragRow);
            const minOther = Math.min(...otherWeights);
            const sumOther = otherWeights.reduce((a, b) => a + b, 0);
            const maxWeight = (minOther * gridPixelH / minCellPx) - sumOther;
            const minWeight = (minCellPx * sumOther) / (gridPixelH - minCellPx);

            this.rowHeights[this.dragRow] = Math.max(minWeight, Math.min(maxWeight, newWeight));
        }

        this.renderContent();
    }

    handleZoom(delta) {
        const oldZoom = this.zoom;
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + delta));
        
        if (oldZoom !== this.zoom) {
            this.applyTransform();
        }
    }

    isCanvasOverflowing() {
        const canvasContainer = document.querySelector('.canvas-container');
        if (!canvasContainer) return false;
        
        const containerRect = this.gridContainer.getBoundingClientRect();
        const canvasRect = canvasContainer.getBoundingClientRect();
        
        // Check if canvas is larger than viewport
        return canvasRect.width > containerRect.width || canvasRect.height > containerRect.height;
    }

    handlePanStart(event) {
        // Only pan when SPACE is pressed and not clicking on canvas container
        if (this.isSpacePressed) {
            const canvasContainer = event.target.closest('.canvas-container');
            
            // Don't pan if clicking on canvas container
            if (canvasContainer) {
                return;
            }
            
            this.isPanning = true;
            this.panStart = { x: event.clientX - this.panX, y: event.clientY - this.panY };
            this.gridContainer.classList.add('panning');
            event.preventDefault();
        }
    }

    handlePanMove(event) {
        if (!this.isPanning) return;
        
        this.panX = event.clientX - this.panStart.x;
        this.panY = event.clientY - this.panStart.y;
        this.applyTransform();
    }

    handlePanEnd() {
        if (this.isPanning) {
            this.isPanning = false;
            this.gridContainer.classList.remove('panning');
        }
    }

    handleTouchStart(event) {
        if (event.touches.length === 2) {
            // Start pinch zoom
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            this.lastPinchDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            event.preventDefault();
        }
    }

    handleTouchMove(event) {
        if (event.touches.length === 2) {
            // Pinch zoom
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const distance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            
            if (this.lastPinchDistance > 0) {
                const delta = (distance - this.lastPinchDistance) * 0.01;
                this.handleZoom(delta);
            }
            
            this.lastPinchDistance = distance;
            event.preventDefault();
        }
    }

    handleTouchEnd() {
        this.lastPinchDistance = 0;
    }

    applyTransform() {
        const containers = [
            document.querySelector('.grid-wrapper'),
            document.querySelector('.freestyle-container')
        ];
        
        containers.forEach(container => {
            if (container) {
                container.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
            }
        });
    }

    handleMouseUp() {
        if (this.isDragging) {
            // If dragType is still null, the mouse didn't move beyond the
            // threshold — treat this as a click and select the cell.
            if (this.dragType === null && this.dragRow !== null && this.dragCol !== null) {
                const cellIndex = this.dragRow * this.gridSize + this.dragCol;
                this.selectCell(cellIndex);
            }
            this.isDragging = false;
            this.dragType = null;
            this.dragCol = null;
            this.dragRow = null;
        }
    }

    startDrag(row, col, event) {
        if (this.mode !== 'grid') return;
        
        this.isDragging = true;
        this.dragType = null;
        this.dragRow = row;
        this.dragCol = col;
        this.dragStart = { x: event.clientX, y: event.clientY };
        this.baseWidth = this.columnWidths[col];
        this.baseHeight = this.rowHeights[row];
        event.preventDefault();
    }

    // ═══════════════════════════════════════════════════════
    // Performance: Throttled rendering & fast-path updates
    // ═══════════════════════════════════════════════════════

    /**
     * Schedule a full render on the next animation frame.
     * Coalesces multiple calls within the same frame into one render.
     */
    scheduleRender() {
        if (!this._renderPending) {
            this._renderPending = true;
            requestAnimationFrame(() => {
                this._renderPending = false;
                this._freestyleCellsJustRebuilt = false;
                this.renderContent();
            });
        }
    }

    /**
     * Schedule a sidebar UI update on the next animation frame.
     * Pass a rootKey string to update only that React root (e.g. 'cellSize').
     * Omit rootKey (or pass falsy) for a full refresh of every root.
     */
    scheduleSidebarUpdate(rootKey) {
        if (rootKey) {
            if (this._dirtyRoots === undefined) this._dirtyRoots = new Set();
            if (this._dirtyRoots) this._dirtyRoots.add(rootKey);
        } else {
            this._dirtyRoots = null;
        }

        if (!this._sidebarUpdatePending) {
            this._sidebarUpdatePending = true;
            requestAnimationFrame(() => {
                this._sidebarUpdatePending = false;
                const dirty = this._dirtyRoots;
                this._dirtyRoots = undefined;
                if (window.updateSidebarComponents) {
                    window.updateSidebarComponents(this, dirty);
                }
            });
        }
    }

    /**
     * Schedule a layout-only update on the next animation frame.
     * Coalesces multiple calls within the same frame into one pass.
     */
    updateLayoutStyles() {
        if (!this.image) return;
        if (!this._layoutPending) {
            this._layoutPending = true;
            requestAnimationFrame(() => {
                this._layoutPending = false;
                this._applyLayoutStyles();
            });
        }
    }

    _applyLayoutStyles() {
        if (!this.image) return;

        const contentWrapper = this._canvasContentWrapper
            || this.gridContainer.querySelector('.canvas-content-wrapper');
        if (contentWrapper) {
            contentWrapper.style.transform = `scale(${this.canvasScale / 100})`;
        }

        if (this.mode === 'grid') {
            this._updateGridCellStyles();
        } else if (this._freestyleCellsJustRebuilt) {
            this._freestyleCellsJustRebuilt = false;
            this.scheduleRender();
        } else {
            this._updateFreestyleCellStyles();
        }
    }

    /** Update transform + borderRadius on existing grid cells without DOM rebuild */
    _updateGridCellStyles() {
        const cells = this.gridContainer.querySelectorAll('.grid-cell');
        if (cells.length === 0) {
            // No existing cells — fall back to full render
            this.scheduleRender();
            return;
        }

        const gridCellW = this.image.width / this.gridSize;
        const gridCellH = this.image.height / this.gridSize;
        const radiusPx = this.cellBorderRadius > 0 ? this.getBorderRadiusPx(gridCellW, gridCellH) : 0;

        cells.forEach((cell) => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);

            // Rebuild transform
            const transforms = [];
            if (this.cellSpread !== 0) {
                const normalizedCol = (col + 0.5) / this.gridSize - 0.5;
                const normalizedRow = (row + 0.5) / this.gridSize - 0.5;
                const spreadFactor = this.cellSpread / 100;
                transforms.push(`translate(${normalizedCol * spreadFactor * 100}%, ${normalizedRow * spreadFactor * 100}%)`);
            }
            if (this.cellSize !== 0) {
                transforms.push(`scale(${1 + this.cellSize / 100})`);
            }
            if (this.cellTumble > 0) {
                const cellIndex = row * this.gridSize + col;
                const randomFactor = this.cellRotations[cellIndex] || 0;
                transforms.push(`rotate(${randomFactor * (this.cellTumble / 100) * 280}deg)`);
            }

            cell.style.transform = transforms.length > 0 ? transforms.join(' ') : '';
            cell.style.borderRadius = radiusPx > 0 ? `${radiusPx}px` : '';
        });
    }

    /**
     * Fast path: update CSS on existing freestyle/scatter cells.
     * Handles cellSize (scale), cellSpread (position), cellTumble (rotation),
     * and cellBorderRadius without a full DOM rebuild.
     */
    _updateFreestyleCellStyles() {
        const cells = this.gridContainer.querySelectorAll('.freestyle-cell');
        if (cells.length === 0) { this.scheduleRender(); return; }

        const geo = this._freestyleLayoutGeometry;
        if (!geo) { this.scheduleRender(); return; }

        const { scale, offsetX, offsetY, canvasWidth, canvasHeight } = geo;
        const cxCenter = canvasWidth / 2;
        const cyCenter = canvasHeight / 2;
        const spreadValue = this.cellSpread !== undefined ? this.cellSpread : this.freestyleCellSpread;
        const spreadFactor = 1 + (spreadValue / 100);
        const hasScale = this.cellSize !== 0;
        const scaleFactor = hasScale ? 1 + this.cellSize / 100 : 1;
        const hasTumble = this.cellTumble > 0;
        const tumbleScale = hasTumble ? (this.cellTumble / 100) * 280 : 0;
        const hasRadius = this.cellBorderRadius > 0;

        cells.forEach((cell) => {
            const idx = parseInt(cell.dataset.index);
            const cellData = this.freestyleCells[idx];
            if (!cellData) return;

            // Compute spread offset from base position (pure math, no DOM reads)
            const baseX = cellData.x * scale + offsetX;
            const baseY = cellData.y * scale + offsetY;
            const w = cellData.width * scale;
            const h = cellData.height * scale;
            const sx = (baseX + w / 2 - cxCenter) * (spreadFactor - 1);
            const sy = (baseY + h / 2 - cyCenter) * (spreadFactor - 1);

            // Include drag/resize offsets stored in data-x/data-y
            const dx = parseFloat(cell.getAttribute('data-x')) || 0;
            const dy = parseFloat(cell.getAttribute('data-y')) || 0;
            const tx = sx + dx;
            const ty = sy + dy;

            const transforms = [];
            if (tx !== 0 || ty !== 0) transforms.push(`translate(${tx}px,${ty}px)`);
            if (hasScale) transforms.push(`scale(${scaleFactor})`);
            if (hasTumble && cellData.rotationFactor !== undefined) {
                transforms.push(`rotate(${cellData.rotationFactor * tumbleScale}deg)`);
            }
            cell.style.transform = transforms.length > 0 ? transforms.join(' ') : '';

            if (hasRadius) {
                cell.style.borderRadius = `${this.getBorderRadiusPx(cellData.width, cellData.height)}px`;
            } else {
                cell.style.borderRadius = '0px';
            }
        });
    }

    /**
     * Get a cached cell image data URL, or create and cache one.
     * Cache is invalidated when image or grid structure changes.
     *
     * Performance notes:
     *  - Uses JPEG for opaque images (small data URLs, fast encode).
     *  - Falls back to PNG only when the source image has transparency.
     *  - Cell canvas size scales down with cell count to keep total memory bounded.
     */
    getCachedCellImage(row, col, gridSize, image) {
        const cacheKey = `${gridSize}-${image.src || 'img'}`;

        // Invalidate cache if image or grid changed
        if (this._cellImageCacheKey !== cacheKey) {
            this._cellImageCache = {};
            this._cellImageCacheKey = cacheKey;
        }

        const cellKey = `${row}-${col}`;
        if (this._cellImageCache[cellKey]) {
            return this._cellImageCache[cellKey];
        }

        // Generate the image
        const cellWidth = image.width / gridSize;
        const cellHeight = image.height / gridSize;
        const sx = col * cellWidth;
        const sy = row * cellHeight;

        // Scale down cell canvas at high cell counts to keep total memory bounded.
        // 256 cells × 400px = huge memory; taper to 200px above 64 cells, 120px above 144.
        const totalCells = gridSize * gridSize;
        const maxCellPx = totalCells > 144 ? 120 : totalCells > 64 ? 200 : 400;

        const w = Math.min(maxCellPx, cellWidth);
        const h = Math.min(maxCellPx, cellHeight);

        // Reuse a single canvas + context (avoids creating 256 DOM elements per render)
        if (!this._cellCanvas) {
            this._cellCanvas = document.createElement('canvas');
            this._cellCanvasCtx = this._cellCanvas.getContext('2d');
        }
        const canvas = this._cellCanvas;
        const ctx = this._cellCanvasCtx;

        // Only resize when dimensions change (avoids clearing + context reset overhead)
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(image, sx, sy, cellWidth, cellHeight, 0, 0, w, h);

        // Use PNG only when the source image has transparency; JPEG otherwise
        const dataURL = this._imageHasAlpha
            ? canvas.toDataURL('image/png')
            : canvas.toDataURL('image/jpeg', 0.92);
        this._cellImageCache[cellKey] = dataURL;
        return dataURL;
    }

    renderContent() {
        if (!this.image) return;

        // Animate home screen exit and show sidebar when image is loaded
        if (this.homeScreen && this.homeScreen.style.display !== 'none') {
            // Add exiting class to trigger fade out
            this.homeScreen.classList.add('exiting');
            // After animation completes, hide the home screen
            setTimeout(() => {
                if (this.homeScreen) {
                    this.homeScreen.style.display = 'none';
                    this.homeScreen.classList.remove('exiting');
                }
            }, 500);
        }
        if (this.sidebarWrapper) {
            this.sidebarWrapper.classList.add('visible');
        }

        // Always render with canvas
        this.renderWithCanvas();
    }

    renderWithCanvas() {
        // ── Fast path: if the canvas shell (container, background, wrapper) already
        // exists and only the grid cells changed, swap out just the grid element
        // instead of tearing down and rebuilding the whole tree.
        const contentWrapper = this._canvasContentWrapper;
        if (contentWrapper && this.mode === 'grid') {
            const oldGrid = contentWrapper.querySelector('.grid');
            if (oldGrid) {
                const wasSkeleton = oldGrid.classList.contains('grid-skeleton');
                const gridContent = this.createGridContent();
                if (wasSkeleton) gridContent.classList.add('grid-reveal');
                gridContent.style.width = oldGrid.style.width;
                gridContent.style.height = oldGrid.style.height;
                contentWrapper.replaceChild(gridContent, oldGrid);
                this.reapplyCellSelection();
                return;
            }
        }

        // ── Full rebuild ──────────────────────────────────────────
        this.gridContainer.innerHTML = '';
        this._canvasContentWrapper = null;

        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'canvas-container';
        
        if (!this.hasAnimatedEnter) {
            canvasContainer.classList.add('animate-enter');
            this.hasAnimatedEnter = true;
        }

        const containerWidth = this.gridContainer.clientWidth - 80;
        const containerHeight = this.gridContainer.clientHeight - 80;
        
        let canvasWidth, canvasHeight;
        
        if (this.canvasRatio === 'original') {
            const imgAspect = this.image.width / this.image.height;
            const containerRatio = containerWidth / containerHeight;
            
            if (containerRatio > imgAspect) {
                canvasHeight = containerHeight;
                canvasWidth = canvasHeight * imgAspect;
            } else {
                canvasWidth = containerWidth;
                canvasHeight = canvasWidth / imgAspect;
            }
        } else {
            const [widthRatio, heightRatio] = this.canvasRatio.split(':').map(Number);
            const targetRatio = widthRatio / heightRatio;
            const containerRatio = containerWidth / containerHeight;
            
            if (containerRatio > targetRatio) {
                canvasHeight = containerHeight;
                canvasWidth = canvasHeight * targetRatio;
            } else {
                canvasWidth = containerWidth;
                canvasHeight = canvasWidth / targetRatio;
            }
        }

        canvasContainer.style.width = `${canvasWidth}px`;
        canvasContainer.style.height = `${canvasHeight}px`;
        canvasContainer.style.position = 'relative';
        canvasContainer.style.overflow = 'hidden';
        canvasContainer.style.display = 'flex';
        canvasContainer.style.alignItems = 'center';
        canvasContainer.style.justifyContent = 'center';

        if (this.canvasBackground === 'transparent') {
            canvasContainer.style.background = 'transparent';
            canvasContainer.style.backgroundImage = `
                linear-gradient(45deg, rgba(128, 128, 128, 0.25) 25%, transparent 25%),
                linear-gradient(-45deg, rgba(128, 128, 128, 0.25) 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, rgba(128, 128, 128, 0.25) 75%),
                linear-gradient(-45deg, transparent 75%, rgba(128, 128, 128, 0.25) 75%)
            `;
            canvasContainer.style.backgroundSize = '20px 20px';
            canvasContainer.style.backgroundPosition = '0 0, 0 10px, 10px -10px, -10px 0px';
        } else if (this.canvasBackground === 'color') {
            canvasContainer.style.background = this.canvasColor;
            canvasContainer.style.backgroundImage = 'none';
        } else if (this.canvasBackground === 'original' || this.canvasBackground === 'image') {
            const bgImg = this.backgroundImage || this.image;
            canvasContainer.style.backgroundImage = `url("${bgImg.src}")`;
            canvasContainer.style.backgroundSize = 'cover';
            canvasContainer.style.backgroundPosition = 'center';
        }

        const cw = document.createElement('div');
        cw.className = 'canvas-content-wrapper';
        cw.style.transform = `scale(${this.canvasScale / 100})`;
        cw.style.transformOrigin = 'center center';
        this._canvasContentWrapper = cw;

        if (this.mode === 'grid') {
            const gridContent = this.createGridContent();
            const imgAspect = this.image.width / this.image.height;
            const cAspect = canvasWidth / canvasHeight;
            let fitW, fitH;
            if (cAspect > imgAspect) {
                fitH = canvasHeight;
                fitW = fitH * imgAspect;
            } else {
                fitW = canvasWidth;
                fitH = fitW / imgAspect;
            }
            gridContent.style.width = `${fitW}px`;
            gridContent.style.height = `${fitH}px`;
            cw.appendChild(gridContent);
        } else {
            const freestyleContent = this.createFreestyleContentForCanvas(canvasWidth, canvasHeight);
            cw.appendChild(freestyleContent);
        }

        canvasContainer.appendChild(cw);
        this.gridContainer.appendChild(canvasContainer);

        this.reapplyCellSelection();
    }

    /** Re-apply the .selected class on the active cell after a DOM rebuild. */
    reapplyCellSelection() {
        if (this.selectedCellIndex === null) return;
        const selector = this.mode === 'grid' ? '.grid-cell' : '.freestyle-cell';
        const cells = document.querySelectorAll(selector);
        if (cells[this.selectedCellIndex]) {
            cells[this.selectedCellIndex].classList.add('selected');
        }
    }

    renderGrid() {
        this.gridContainer.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'grid-wrapper';

        const grid = this.createGridContent();
        wrapper.appendChild(grid);
        this.gridContainer.appendChild(wrapper);
    }

    createGridContent() {
        const grid = document.createElement('div');
        grid.className = 'grid';
        
        const containerWidth = this.gridContainer.clientWidth - 40;
        const containerHeight = this.gridContainer.clientHeight - 40;
        const aspectRatio = this.image.width / this.image.height;
        
        let gridWidth, gridHeight;
        if (containerWidth / containerHeight > aspectRatio) {
            gridHeight = containerHeight;
            gridWidth = gridHeight * aspectRatio;
        } else {
            gridWidth = containerWidth;
            gridHeight = gridWidth / aspectRatio;
        }

        grid.style.width = `${gridWidth}px`;
        grid.style.height = `${gridHeight}px`;
        
        const columnTemplate = this.columnWidths.map(w => `${w}fr`).join(' ');
        const rowTemplate = this.rowHeights.map(h => `${h}fr`).join(' ');
        
        grid.style.gridTemplateColumns = columnTemplate;
        grid.style.gridTemplateRows = rowTemplate;

        if (this.contentMode === 'image') {
            const displaySrc = (this.displayImage || this.image).src;
            grid.style.setProperty('--cell-bg', `url("${displaySrc}")`);
            grid.style.setProperty('--cell-bg-size', `${this.gridSize * 100}% ${this.gridSize * 100}%`);
        }

        // Build all cells as a single HTML string — 3-5× faster than N² createElement calls.
        const gs = this.gridSize;
        const parts = new Array(gs * gs);
        const hasRadius = this.cellBorderRadius > 0 && this.image;
        const radiusPx = hasRadius
            ? this.getBorderRadiusPx(this.image.width / gs, this.image.height / gs)
            : 0;
        const hasSpread = this.cellSpread !== 0;
        const spreadFactor = this.cellSpread / 100;
        const hasScale = this.cellSize !== 0;
        const scaleFactor = 1 + (this.cellSize / 100);
        const hasTumble = this.cellTumble > 0;
        const tumbleScale = (this.cellTumble / 100) * 280;
        const isColor = this.contentMode === 'color';
        const isImage = this.contentMode === 'image';

        for (let row = 0; row < gs; row++) {
            for (let col = 0; col < gs; col++) {
                const idx = row * gs + col;
                let s = `z-index:${(Math.random() * 999 | 0) + 1}`;

                if (this.hiddenCells.has(idx)) s += ';opacity:0';

                if (isColor) {
                    const c = (this.gridCellColors && this.gridCellColors[idx]) || 'rgb(128,128,128)';
                    s += `;background-color:${c};background-image:none;box-shadow:0 0 0 .5px ${c}`;
                } else if (isImage) {
                    const px = gs > 1 ? (col / (gs - 1)) * 100 : 0;
                    const py = gs > 1 ? (row / (gs - 1)) * 100 : 0;
                    s += `;background-image:var(--cell-bg);background-size:var(--cell-bg-size);background-position:${px}% ${py}%`;
                }

                if (hasRadius) s += `;border-radius:${radiusPx}px`;

                let t = '';
                if (hasSpread) {
                    const nx = (col + 0.5) / gs - 0.5;
                    const ny = (row + 0.5) / gs - 0.5;
                    t += `translate(${nx * spreadFactor * 100}%,${ny * spreadFactor * 100}%) `;
                }
                if (hasScale) t += `scale(${scaleFactor}) `;
                if (hasTumble) {
                    const rf = this.cellRotations[idx] || 0;
                    t += `rotate(${rf * tumbleScale}deg) `;
                }
                if (t) s += `;transform:${t.trimEnd()}`;

                parts[idx] = `<div class="grid-cell" data-row="${row}" data-col="${col}" style="${s}"></div>`;
            }
        }
        grid.innerHTML = parts.join('');

        // Single event-delegation listener instead of N² per-cell listeners
        grid.addEventListener('mousedown', (e) => {
            const cell = e.target.closest('.grid-cell');
            if (cell) {
                this.startDrag(
                    parseInt(cell.dataset.row),
                    parseInt(cell.dataset.col),
                    e
                );
            }
        });

        this.addGridCrosshairs(grid);

        return grid;
    }

    addGridCrosshairs(grid) {
        const totalColWeight = this.columnWidths.reduce((a, b) => a + b, 0);
        const totalRowWeight = this.rowHeights.reduce((a, b) => a + b, 0);

        // Horizontal crosshair lines (between rows)
        let rowAccum = 0;
        for (let i = 1; i < this.gridSize; i++) {
            rowAccum += this.rowHeights[i - 1];
            const line = document.createElement('div');
            line.className = 'grid-crosshair-h';
            line.style.top = `${(rowAccum / totalRowWeight) * 100}%`;
            grid.appendChild(line);
        }

        // Vertical crosshair lines (between columns)
        let colAccum = 0;
        for (let i = 1; i < this.gridSize; i++) {
            colAccum += this.columnWidths[i - 1];
            const line = document.createElement('div');
            line.className = 'grid-crosshair-v';
            line.style.left = `${(colAccum / totalColWeight) * 100}%`;
            grid.appendChild(line);
        }
    }
    

    renderFreestyle() {
        this.gridContainer.innerHTML = '';
        const container = this.createFreestyleContent();
        this.gridContainer.appendChild(container);
    }

    createFreestyleContent() {
        const container = document.createElement('div');
        container.className = 'freestyle-container';

        if (this.contentMode === 'image' && this.image) {
            const displaySrc = (this.displayImage || this.image).src;
            container.style.setProperty('--cell-bg', `url("${displaySrc}")`);
        }

        this.freestyleCells.forEach((cellData, index) => {
            const cell = this.createFreestyleCell(cellData, index);
            container.appendChild(cell);
        });

        return container;
    }

    renderPalette() {
        this.gridContainer.innerHTML = '';
        const container = this.createPaletteContent();
        this.gridContainer.appendChild(container);
    }

    createPaletteContent() {
        const container = document.createElement('div');
        container.className = 'freestyle-container';

        this.freestyleCells.forEach((cellData, index) => {
            const cell = this.createPaletteCell(cellData, index);
            container.appendChild(cell);
        });

        return container;
    }

    createFreestyleContentForCanvas(canvasWidth, canvasHeight) {
        const container = document.createElement('div');
        container.className = 'freestyle-container';
        container.style.position = 'relative';

        if (this.contentMode === 'image' && this.image) {
            const displaySrc = (this.displayImage || this.image).src;
            container.style.setProperty('--cell-bg', `url("${displaySrc}")`);
        }
        
        // Calculate base grid bounds (from baseX/baseY, ignoring chaos offsets)
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        this.freestyleCells.forEach((cellData) => {
            const bx = cellData.baseX !== undefined ? cellData.baseX : cellData.x;
            const by = cellData.baseY !== undefined ? cellData.baseY : cellData.y;
            minX = Math.min(minX, bx);
            minY = Math.min(minY, by);
            maxX = Math.max(maxX, bx + cellData.width);
            maxY = Math.max(maxY, by + cellData.height);
        });

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        
        // Scale to fill the canvas (matching Stretch mode sizing)
        const scale = Math.min(canvasWidth / contentWidth, canvasHeight / contentHeight);
        
        // Calculate offset to center the base grid in the canvas
        const scaledWidth = contentWidth * scale;
        const scaledHeight = contentHeight * scale;
        const offsetX = (canvasWidth - scaledWidth) / 2 - minX * scale;
        const offsetY = (canvasHeight - scaledHeight) / 2 - minY * scale;

        container.style.width = `${canvasWidth}px`;
        container.style.height = `${canvasHeight}px`;

        // Cache layout geometry for fast-path CSS-only updates
        this._freestyleLayoutGeometry = { scale, offsetX, offsetY, canvasWidth, canvasHeight };

        // Calculate center of canvas for spread using unified cellSpread
        const canvasCenterX = canvasWidth / 2;
        const canvasCenterY = canvasHeight / 2;
        const spreadValue = this.cellSpread !== undefined ? this.cellSpread : this.freestyleCellSpread;
        const spreadFactor = 1 + (spreadValue / 100);

        this.freestyleCells.forEach((cellData, index) => {
            const cell = this.createFreestyleCell(cellData, index);
            const baseX = cellData.x * scale + offsetX;
            const baseY = cellData.y * scale + offsetY;
            const newWidth = cellData.width * scale;
            const newHeight = cellData.height * scale;

            // Base position via left/top (set once, stable across knob drags)
            cell.style.left = `${baseX}px`;
            cell.style.top = `${baseY}px`;
            cell.style.width = `${newWidth}px`;
            cell.style.height = `${newHeight}px`;

            // Dynamic adjustments via transform (compositor-only, no layout)
            const cellCenterX = baseX + newWidth / 2;
            const cellCenterY = baseY + newHeight / 2;
            const sx = (cellCenterX - canvasCenterX) * (spreadFactor - 1);
            const sy = (cellCenterY - canvasCenterY) * (spreadFactor - 1);

            const transforms = [];
            if (sx !== 0 || sy !== 0) transforms.push(`translate(${sx}px, ${sy}px)`);
            if (this.cellSize !== 0) transforms.push(`scale(${1 + this.cellSize / 100})`);
            if (this.cellTumble > 0 && cellData.rotationFactor !== undefined) {
                transforms.push(`rotate(${cellData.rotationFactor * (this.cellTumble / 100) * 280}deg)`);
            }
            cell.style.transform = transforms.length > 0 ? transforms.join(' ') : '';

            container.appendChild(cell);
        });

        return container;
    }

    createPaletteContentForCanvas(canvasWidth, canvasHeight) {
        const container = document.createElement('div');
        container.className = 'freestyle-container';
        container.style.position = 'relative';
        
        // Calculate base grid bounds (from baseX/baseY, ignoring chaos offsets)
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        this.freestyleCells.forEach((cellData) => {
            const bx = cellData.baseX !== undefined ? cellData.baseX : cellData.x;
            const by = cellData.baseY !== undefined ? cellData.baseY : cellData.y;
            minX = Math.min(minX, bx);
            minY = Math.min(minY, by);
            maxX = Math.max(maxX, bx + cellData.width);
            maxY = Math.max(maxY, by + cellData.height);
        });

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        
        // Scale to fill the canvas (matching Stretch mode sizing)
        const scale = Math.min(canvasWidth / contentWidth, canvasHeight / contentHeight);
        
        // Calculate offset to center the base grid in the canvas
        const scaledWidth = contentWidth * scale;
        const scaledHeight = contentHeight * scale;
        const offsetX = (canvasWidth - scaledWidth) / 2 - minX * scale;
        const offsetY = (canvasHeight - scaledHeight) / 2 - minY * scale;

        container.style.width = `${canvasWidth}px`;
        container.style.height = `${canvasHeight}px`;

        // Calculate center of canvas for spread using unified cellSpread
        const canvasCenterX = canvasWidth / 2;
        const canvasCenterY = canvasHeight / 2;
        const spreadValue = this.cellSpread !== undefined ? this.cellSpread : this.paletteCellSpread;
        const spreadFactor = 1 + (spreadValue / 100);

        this.freestyleCells.forEach((cellData, index) => {
            const cell = this.createPaletteCell(cellData, index);
            // Adjust position for canvas centering
            let newX = cellData.x * scale + offsetX;
            let newY = cellData.y * scale + offsetY;
            const newWidth = cellData.width * scale;
            const newHeight = cellData.height * scale;
            
            // Apply spread from center
            const cellCenterX = newX + newWidth / 2;
            const cellCenterY = newY + newHeight / 2;
            const spreadX = (cellCenterX - canvasCenterX) * (spreadFactor - 1);
            const spreadY = (cellCenterY - canvasCenterY) * (spreadFactor - 1);
            newX += spreadX;
            newY += spreadY;
            
            cell.style.left = `${newX}px`;
            cell.style.top = `${newY}px`;
            cell.style.width = `${newWidth}px`;
            cell.style.height = `${newHeight}px`;
            
            container.appendChild(cell);
        });

        return container;
    }

    createFreestyleCell(cellData, index) {
        const cell = document.createElement('div');
        cell.className = 'freestyle-cell';
        cell.dataset.index = index;
        cell.style.left = `${cellData.x}px`;
        cell.style.top = `${cellData.y}px`;
        cell.style.width = `${cellData.width}px`;
        cell.style.height = `${cellData.height}px`;
        cell.style.zIndex = Math.floor(Math.random() * 999) + 1;
        
        // Apply border radius (pill shape: capped at half the shorter side)
        if (this.cellBorderRadius > 0) {
            const radiusPx = this.getBorderRadiusPx(cellData.width, cellData.height);
            cell.style.borderRadius = `${radiusPx}px`;
        } else {
            cell.style.borderRadius = '0px';
        }
        
        if (this.contentMode === 'color') {
            const cellIndex = cellData.imageRow * cellData.imageCols + cellData.imageCol;
            const color = this.gridCellColors && this.gridCellColors[cellIndex]
                ? this.gridCellColors[cellIndex]
                : cellData.color || 'rgb(128, 128, 128)';
            cell.style.backgroundColor = color;
            cell.style.backgroundImage = 'none';
            cell.style.boxShadow = `0 0 0 0.5px ${color}`;
        } else {
            const cols = cellData.imageCols;
            cell.style.backgroundImage = 'var(--cell-bg)';
            cell.style.backgroundSize = `${cols * 100}% ${cols * 100}%`;
            const posX = cols > 1 ? (cellData.imageCol / (cols - 1)) * 100 : 0;
            const posY = cols > 1 ? (cellData.imageRow / (cols - 1)) * 100 : 0;
            cell.style.backgroundPosition = `${posX}% ${posY}%`;
        }
        
        // Build combined transform: scale (from cellSize) + rotation (from cellTumble)
        const transforms = [];
        if (this.cellSize !== 0) {
            const scaleFactor = 1 + (this.cellSize / 100);
            transforms.push(`scale(${scaleFactor})`);
        }
        if (this.cellTumble > 0 && cellData.rotationFactor !== undefined) {
            const rotation = cellData.rotationFactor * (this.cellTumble / 100) * 280;
            transforms.push(`rotate(${rotation}deg)`);
        }
        if (transforms.length > 0) {
            cell.style.transform = transforms.join(' ');
        }
        
        this.makeInteractive(cell, index);
        
        return cell;
    }

    createPaletteCell(cellData, index) {
        const cell = document.createElement('div');
        cell.className = 'freestyle-cell';
        cell.dataset.index = index;
        cell.style.left = `${cellData.x}px`;
        cell.style.top = `${cellData.y}px`;
        cell.style.width = `${cellData.width}px`;
        cell.style.height = `${cellData.height}px`;
        cell.style.zIndex = Math.floor(Math.random() * 999) + 1;
        
        // Apply border radius (pill shape: capped at half the shorter side)
        if (this.cellBorderRadius > 0) {
            const radiusPx = this.getBorderRadiusPx(cellData.width, cellData.height);
            cell.style.borderRadius = `${radiusPx}px`;
        } else {
            cell.style.borderRadius = '0px';
        }
        
        // Set solid color background
        cell.style.background = cellData.color;
        
        // Apply scale adjustment using unified cellSize
        const sizeValue = this.cellSize !== undefined ? this.cellSize : this.paletteCellScale;
        if (sizeValue !== 0) {
            const scaleFactor = 1 + (sizeValue / 100);
            cell.style.transform = `scale(${scaleFactor})`;
        }
        
        this.makeInteractive(cell, index);
        
        return cell;
    }

    makeInteractive(element, index) {
        const self = this;
        
        interact(element)
            .draggable({
                inertia: true,
                modifiers: [
                    interact.modifiers.restrictRect({
                        restriction: 'parent',
                        endOnly: true
                    })
                ],
                listeners: {
                    move: (event) => {
                        const target = event.target;
                        const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                        const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                        target.setAttribute('data-x', x);
                        target.setAttribute('data-y', y);
                        self._updateFreestyleCellStyles();
                    }
                }
            })
            .resizable({
                edges: { left: true, right: true, bottom: true, top: true },
                modifiers: [
                    interact.modifiers.restrictSize({
                        min: { width: 2, height: 2 }
                    })
                ],
                inertia: true,
                listeners: {
                    start: (event) => {
                        event.target.classList.add('resizing');
                    },
                    move: (event) => {
                        const target = event.target;
                        let x = parseFloat(target.getAttribute('data-x')) || 0;
                        let y = parseFloat(target.getAttribute('data-y')) || 0;

                        let newWidth = event.rect.width;
                        let newHeight = event.rect.height;

                        // Snap to square if dimensions are close
                        const diff = Math.abs(newWidth - newHeight);
                        if (diff < self.snapThreshold) {
                            const avg = (newWidth + newHeight) / 2;
                            newWidth = avg;
                            newHeight = avg;
                            target.classList.add('snapped');
                        } else {
                            target.classList.remove('snapped');
                        }

                        if (self.selectedCellIndex === index) {
                            target.style.width = `${newWidth}px`;
                            target.style.height = `${newHeight}px`;

                            x += event.deltaRect.left;
                            y += event.deltaRect.top;
                            target.setAttribute('data-x', x);
                            target.setAttribute('data-y', y);

                            if (self.cellBorderRadius > 0) {
                                target.style.borderRadius = `${self.getBorderRadiusPx(newWidth, newHeight)}px`;
                            }

                            self.freestyleCells[index].width = newWidth;
                            self.freestyleCells[index].height = newHeight;
                            self.freestyleCells[index].individuallyModified = true;

                            self._updateFreestyleCellStyles();
                            self.cellWidthValue = Math.round(newWidth);
                            self.cellHeightValue = Math.round(newHeight);
                            self.scheduleSidebarUpdate('cellDetail');
                        } else {
                            self.resizeAllCellsToSize(newWidth, newHeight, index);
                            self.cellWidthValue = Math.round(newWidth);
                            self.cellHeightValue = Math.round(newHeight);
                            self.scheduleSidebarUpdate('cellDetail');
                        }
                    },
                    end: (event) => {
                        event.target.classList.remove('resizing', 'snapped');
                    }
                }
            })
            .on('tap', (event) => {
                // Select this cell on tap/click
                self.selectCell(index);
            });
    }

    resizeAllCellsToSize(width, height, currentIndex) {
        const cells = document.querySelectorAll('.freestyle-cell');
        
        this.freestyleCells.forEach((cellData, idx) => {
            if (cellData.individuallyModified) return;
            
            const cell = cells[idx];
            if (!cell) return;
            
            const currentWidth = parseFloat(cell.style.width) || cell.offsetWidth;
            const currentHeight = parseFloat(cell.style.height) || cell.offsetHeight;
            const deltaW = width - currentWidth;
            const deltaH = height - currentHeight;

            // Accumulate center compensation in data-x/data-y
            const ox = (parseFloat(cell.getAttribute('data-x')) || 0) - deltaW / 2;
            const oy = (parseFloat(cell.getAttribute('data-y')) || 0) - deltaH / 2;
            cell.setAttribute('data-x', ox);
            cell.setAttribute('data-y', oy);

            cellData.width = width;
            cellData.height = height;

            cell.style.width = `${width}px`;
            cell.style.height = `${height}px`;

            if (this.cellBorderRadius > 0) {
                cell.style.borderRadius = `${this.getBorderRadiusPx(width, height)}px`;
            }
        });

        // Rebuild transforms so spread/scale/rotation + resize offsets are all applied
        this._updateFreestyleCellStyles();
    }

    updateCellShapes() {
        const cells = document.querySelectorAll('.freestyle-cell');
        cells.forEach(cell => {
            if (this.cellBorderRadius > 0) {
                const w = cell.offsetWidth || parseFloat(cell.style.width) || 100;
                const h = cell.offsetHeight || parseFloat(cell.style.height) || 100;
                const radiusPx = this.getBorderRadiusPx(w, h);
                cell.style.borderRadius = `${radiusPx}px`;
            } else {
                cell.style.borderRadius = '0px';
            }
        });
    }

    exportArtwork() {
        if (!this.image) {
            alert('Please upload an image first!');
            return;
        }

        // Always export with canvas
        this.exportCanvasArtwork();
    }

    exportCanvasArtwork() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Get canvas dimensions from ratio (scaled by export multiplier)
        const baseSize = 2000 * (this.exportScale || 1);
        
        if (this.canvasRatio === 'original') {
            // Use original image dimensions
            const imgAspect = this.image.width / this.image.height;
            if (this.image.width > this.image.height) {
                canvas.width = baseSize;
                canvas.height = baseSize / imgAspect;
            } else {
                canvas.height = baseSize;
                canvas.width = baseSize * imgAspect;
            }
        } else {
            const [widthRatio, heightRatio] = this.canvasRatio.split(':').map(Number);
            
            if (widthRatio > heightRatio) {
                canvas.width = baseSize;
                canvas.height = (baseSize / widthRatio) * heightRatio;
            } else {
                canvas.height = baseSize;
                canvas.width = (baseSize / heightRatio) * widthRatio;
            }
        }

        // Draw background
        if (this.canvasBackground === 'transparent') {
            // Transparent background - no fill
        } else if (this.canvasBackground === 'color') {
            ctx.fillStyle = this.canvasColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (this.canvasBackground === 'original' || this.canvasBackground === 'image') {
            // Draw background image (or original image as fallback)
            const bgImg = this.backgroundImage || this.image;
            const imgAspect = bgImg.width / bgImg.height;
            const canvasAspect = canvas.width / canvas.height;
            
            let drawWidth, drawHeight, drawX, drawY;
            if (canvasAspect > imgAspect) {
                drawWidth = canvas.width;
                drawHeight = canvas.width / imgAspect;
                drawX = 0;
                drawY = (canvas.height - drawHeight) / 2;
            } else {
                drawHeight = canvas.height;
                drawWidth = canvas.height * imgAspect;
                drawX = (canvas.width - drawWidth) / 2;
                drawY = 0;
            }
            
            ctx.drawImage(bgImg, drawX, drawY, drawWidth, drawHeight);
        }

        // Create temporary canvas for content at full canvas size
        // This matches the preview where content fills the canvas, then canvasScale is applied
        const contentCanvas = document.createElement('canvas');
        const contentCtx = contentCanvas.getContext('2d');
        contentCanvas.width = canvas.width;
        contentCanvas.height = canvas.height;

        // Calculate content area matching preview layout (image aspect ratio centered in canvas)
        const imgAspect = this.image.width / this.image.height;
        const canvasAspect = canvas.width / canvas.height;
        
        let contentWidth, contentHeight, contentX, contentY;
        if (canvasAspect > imgAspect) {
            contentHeight = canvas.height;
            contentWidth = contentHeight * imgAspect;
        } else {
            contentWidth = canvas.width;
            contentHeight = contentWidth / imgAspect;
        }
        contentX = (canvas.width - contentWidth) / 2;
        contentY = (canvas.height - contentHeight) / 2;

        // Render content based on layout mode
        contentCtx.save();
        contentCtx.translate(contentX, contentY);
        if (this.mode === 'grid') {
            if (this.contentMode === 'color') {
                this.renderColorGridToCanvas(contentCtx, contentWidth, contentHeight);
            } else {
                this.renderGridToCanvas(contentCtx, contentWidth, contentHeight);
            }
        } else {
            this.renderFreestyleToCanvas(contentCtx, contentWidth, contentHeight);
        }
        contentCtx.restore();

        // Apply canvasScale: scale from center of the canvas
        const scale = this.canvasScale / 100;
        const scaledWidth = canvas.width * scale;
        const scaledHeight = canvas.height * scale;
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;
        ctx.drawImage(contentCanvas, x, y, scaledWidth, scaledHeight);

        this.downloadCanvas(canvas, 'canvas-artwork.png');
    }

    exportGridArtwork() {
        const gridElement = document.querySelector('.grid');
        if (!gridElement) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Calculate cell dimensions based on column/row weights
        const totalColWeight = this.columnWidths.reduce((a, b) => a + b, 0);
        const totalRowWeight = this.rowHeights.reduce((a, b) => a + b, 0);

        // Get the actual rendered size of the grid excluding gaps
        const gridRect = gridElement.getBoundingClientRect();
        const gridStyle = window.getComputedStyle(gridElement);
        const gap = parseFloat(gridStyle.gap) || 0;
        
        // Calculate total gap space
        const totalGapWidth = gap * (this.gridSize - 1);
        const totalGapHeight = gap * (this.gridSize - 1);
        
        // Canvas size should be grid size minus gaps
        canvas.width = gridRect.width - totalGapWidth;
        canvas.height = gridRect.height - totalGapHeight;

        // No background fill - transparent background

        let currentY = 0;
        for (let row = 0; row < this.gridSize; row++) {
            let currentX = 0;
            const rowHeight = (this.rowHeights[row] / totalRowWeight) * canvas.height;

            for (let col = 0; col < this.gridSize; col++) {
                const colWidth = (this.columnWidths[col] / totalColWeight) * canvas.width;

                // Draw the cell portion of the image
                const cellWidth = this.image.width / this.gridSize;
                const cellHeight = this.image.height / this.gridSize;
                const sx = col * cellWidth;
                const sy = row * cellHeight;

                ctx.drawImage(
                    this.image,
                    sx, sy, cellWidth, cellHeight,
                    currentX, currentY, colWidth, rowHeight
                );

                currentX += colWidth;
            }
            currentY += rowHeight;
        }

        this.downloadCanvas(canvas, 'grid-artwork.png');
    }

    exportFreestyleArtwork() {
        if (!this.freestyleCells.length) return;

        // Calculate bounds of all cells
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        const cellElements = document.querySelectorAll('.freestyle-cell');
        const cellBounds = [];

        cellElements.forEach((cell, index) => {
            // Get transform values
            const x = parseFloat(cell.getAttribute('data-x')) || 0;
            const y = parseFloat(cell.getAttribute('data-y')) || 0;
            
            // Calculate actual position
            const actualX = parseFloat(cell.style.left) + x;
            const actualY = parseFloat(cell.style.top) + y;
            const width = parseFloat(cell.style.width);
            const height = parseFloat(cell.style.height);

            cellBounds.push({ 
                x: actualX, 
                y: actualY, 
                width, 
                height, 
                cellData: this.freestyleCells[index]
            });

            minX = Math.min(minX, actualX);
            minY = Math.min(minY, actualY);
            maxX = Math.max(maxX, actualX + width);
            maxY = Math.max(maxY, actualY + height);
        });

        const canvasWidth = maxX - minX;
        const canvasHeight = maxY - minY;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // No background fill - transparent background

        // Draw each cell
        cellBounds.forEach((bounds) => {
            const cellData = bounds.cellData;
            const cols = cellData.imageCols;
            const rows = cellData.imageRows;
            
            const cellWidth = this.image.width / cols;
            const cellHeight = this.image.height / rows;
            
            const sx = cellData.imageCol * cellWidth;
            const sy = cellData.imageRow * cellHeight;

            // Save context for clipping
            ctx.save();

            // Apply clipping for rounded shapes
            if (this.cellShape === 'rounded') {
                const x = bounds.x - minX;
                const y = bounds.y - minY;
                const w = bounds.width;
                const h = bounds.height;
                
                // Create rounded rectangle path
                const radius = Math.min(w, h) / 2;
                ctx.beginPath();
                ctx.moveTo(x + radius, y);
                ctx.lineTo(x + w - radius, y);
                ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
                ctx.lineTo(x + w, y + h - radius);
                ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
                ctx.lineTo(x + radius, y + h);
                ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
                ctx.lineTo(x, y + radius);
                ctx.quadraticCurveTo(x, y, x + radius, y);
                ctx.closePath();
                ctx.clip();
            }

            // Draw the image portion
            ctx.drawImage(
                this.image,
                sx, sy, Math.min(cellWidth, this.image.width - sx), Math.min(cellHeight, this.image.height - sy),
                bounds.x - minX, bounds.y - minY, bounds.width, bounds.height
            );

            ctx.restore();
        });

        this.downloadCanvas(canvas, 'freestyle-artwork.png');
    }

    exportPaletteArtwork() {
        if (!this.freestyleCells.length) return;

        // Calculate bounds of all cells
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        const cellElements = document.querySelectorAll('.freestyle-cell');
        const cellBounds = [];

        cellElements.forEach((cell, index) => {
            const x = parseFloat(cell.getAttribute('data-x')) || 0;
            const y = parseFloat(cell.getAttribute('data-y')) || 0;
            
            const actualX = parseFloat(cell.style.left) + x;
            const actualY = parseFloat(cell.style.top) + y;
            const width = parseFloat(cell.style.width);
            const height = parseFloat(cell.style.height);

            cellBounds.push({ 
                x: actualX, 
                y: actualY, 
                width, 
                height, 
                color: this.freestyleCells[index].color
            });

            minX = Math.min(minX, actualX);
            minY = Math.min(minY, actualY);
            maxX = Math.max(maxX, actualX + width);
            maxY = Math.max(maxY, actualY + height);
        });

        const canvasWidth = maxX - minX;
        const canvasHeight = maxY - minY;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Draw each cell with solid color
        cellBounds.forEach((bounds) => {
            ctx.save();

            // Apply clipping for rounded shapes
            if (this.cellShape === 'rounded') {
                const x = bounds.x - minX;
                const y = bounds.y - minY;
                const w = bounds.width;
                const h = bounds.height;
                
                const radius = Math.min(w, h) / 2;
                ctx.beginPath();
                ctx.moveTo(x + radius, y);
                ctx.lineTo(x + w - radius, y);
                ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
                ctx.lineTo(x + w, y + h - radius);
                ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
                ctx.lineTo(x + radius, y + h);
                ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
                ctx.lineTo(x, y + radius);
                ctx.quadraticCurveTo(x, y, x + radius, y);
                ctx.clip();
            }

            // Fill with solid color
            ctx.fillStyle = bounds.color;
            ctx.fillRect(
                bounds.x - minX,
                bounds.y - minY,
                bounds.width,
                bounds.height
            );

            ctx.restore();
        });

        this.downloadCanvas(canvas, 'palette-artwork.png');
    }

    renderGridToCanvas(ctx, width, height) {
        const totalColWeight = this.columnWidths.reduce((a, b) => a + b, 0);
        const totalRowWeight = this.rowHeights.reduce((a, b) => a + b, 0);

        // Pre-calculate all column and row positions to avoid floating point accumulation errors
        const colPositions = [0];
        const rowPositions = [0];
        
        for (let col = 0; col < this.gridSize; col++) {
            const colEnd = colPositions[col] + (this.columnWidths[col] / totalColWeight) * width;
            colPositions.push(col === this.gridSize - 1 ? width : Math.round(colEnd));
        }
        
        for (let row = 0; row < this.gridSize; row++) {
            const rowEnd = rowPositions[row] + (this.rowHeights[row] / totalRowWeight) * height;
            rowPositions.push(row === this.gridSize - 1 ? height : Math.round(rowEnd));
        }

        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                // Skip hidden cells in export
                const cellIndex = row * this.gridSize + col;
                if (this.hiddenCells.has(cellIndex)) continue;

                const cellWidth = this.image.width / this.gridSize;
                const cellHeight = this.image.height / this.gridSize;
                const sx = col * cellWidth;
                const sy = row * cellHeight;

                const destX = colPositions[col];
                const destY = rowPositions[row];
                const destWidth = colPositions[col + 1] - colPositions[col];
                const destHeight = rowPositions[row + 1] - rowPositions[row];

                // Calculate center of cell for transforms
                let centerX = destX + destWidth / 2;
                let centerY = destY + destHeight / 2;

                // Apply spread (translate cells away from or toward center)
                // Use unified cellSpread property
                const spreadValue = this.cellSpread !== undefined ? this.cellSpread : this.gridCellSpread;
                if (spreadValue !== 0) {
                    const normalizedCol = (col + 0.5) / this.gridSize - 0.5;
                    const normalizedRow = (row + 0.5) / this.gridSize - 0.5;
                    const spreadFactor = spreadValue / 100;
                    centerX += normalizedCol * spreadFactor * destWidth;
                    centerY += normalizedRow * spreadFactor * destHeight;
                }

                // Get rotation for this cell
                const randomFactor = this.cellRotations[cellIndex] || 0;
                const rotation = this.cellTumble > 0 
                    ? randomFactor * (this.cellTumble / 100) * 280 * (Math.PI / 180) 
                    : 0;

                // Calculate cell scale factor using unified cellSize
                const sizeValue = this.cellSize !== undefined ? this.cellSize : this.gridCellScale;
                const cellScaleFactor = 1 + (sizeValue / 100);

                // Calculate border radius from percentage
                const scaledWidth_pre = destWidth * cellScaleFactor;
                const scaledHeight_pre = destHeight * cellScaleFactor;
                const scaledRadius = this.getBorderRadiusPx(scaledWidth_pre, scaledHeight_pre);

                // Calculate scaled dimensions
                const scaledWidth = destWidth * cellScaleFactor;
                const scaledHeight = destHeight * cellScaleFactor;
                const scaledX = centerX - scaledWidth / 2;
                const scaledY = centerY - scaledHeight / 2;

                ctx.save();

                // Move to center, apply scale and rotate, then move back
                ctx.translate(centerX, centerY);
                ctx.rotate(rotation);
                ctx.translate(-centerX, -centerY);

                // Apply border radius clipping if needed
                if (scaledRadius > 0) {
                    ctx.beginPath();
                    this.roundedRect(ctx, scaledX, scaledY, scaledWidth, scaledHeight, scaledRadius);
                    ctx.clip();
                }

                ctx.drawImage(
                    this.image,
                    sx, sy, cellWidth, cellHeight,
                    scaledX, scaledY, scaledWidth, scaledHeight
                );

                ctx.restore();
            }
        }
    }

    // Helper function to draw a rounded rectangle path
    roundedRect(ctx, x, y, width, height, radius) {
        const r = Math.min(radius, width / 2, height / 2);
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
    
    renderColorGridToCanvas(ctx, width, height) {
        const totalColWeight = this.columnWidths.reduce((a, b) => a + b, 0);
        const totalRowWeight = this.rowHeights.reduce((a, b) => a + b, 0);

        // Pre-calculate all column and row positions
        const colPositions = [0];
        const rowPositions = [0];
        
        for (let col = 0; col < this.gridSize; col++) {
            const colEnd = colPositions[col] + (this.columnWidths[col] / totalColWeight) * width;
            colPositions.push(col === this.gridSize - 1 ? width : Math.round(colEnd));
        }
        
        for (let row = 0; row < this.gridSize; row++) {
            const rowEnd = rowPositions[row] + (this.rowHeights[row] / totalRowWeight) * height;
            rowPositions.push(row === this.gridSize - 1 ? height : Math.round(rowEnd));
        }

        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cellIndex = row * this.gridSize + col;
                if (this.hiddenCells.has(cellIndex)) continue;

                const color = this.gridCellColors && this.gridCellColors[cellIndex] 
                    ? this.gridCellColors[cellIndex] 
                    : 'rgb(128, 128, 128)';

                const destX = colPositions[col];
                const destY = rowPositions[row];
                const destWidth = colPositions[col + 1] - colPositions[col];
                const destHeight = rowPositions[row + 1] - rowPositions[row];

                // Calculate center of cell for transforms
                let centerX = destX + destWidth / 2;
                let centerY = destY + destHeight / 2;

                // Apply spread
                const spreadValue = this.cellSpread !== undefined ? this.cellSpread : this.gridCellSpread;
                if (spreadValue !== 0) {
                    const normalizedCol = (col + 0.5) / this.gridSize - 0.5;
                    const normalizedRow = (row + 0.5) / this.gridSize - 0.5;
                    const spreadFactor = spreadValue / 100;
                    centerX += normalizedCol * spreadFactor * destWidth;
                    centerY += normalizedRow * spreadFactor * destHeight;
                }

                // Get rotation for this cell
                const randomFactor = this.cellRotations[cellIndex] || 0;
                const rotation = this.cellTumble > 0 
                    ? randomFactor * (this.cellTumble / 100) * 280 * (Math.PI / 180) 
                    : 0;

                // Calculate cell scale factor
                const sizeValue = this.cellSize !== undefined ? this.cellSize : this.gridCellScale;
                const cellScaleFactor = 1 + (sizeValue / 100);

                // Calculate border radius from percentage
                const scaledWidth_pre = destWidth * cellScaleFactor;
                const scaledHeight_pre = destHeight * cellScaleFactor;
                const scaledRadius = this.getBorderRadiusPx(scaledWidth_pre, scaledHeight_pre);

                // Calculate scaled dimensions
                const scaledWidth = destWidth * cellScaleFactor;
                const scaledHeight = destHeight * cellScaleFactor;
                const scaledX = centerX - scaledWidth / 2;
                const scaledY = centerY - scaledHeight / 2;

                ctx.save();

                // Move to center, rotate, then move back
                ctx.translate(centerX, centerY);
                ctx.rotate(rotation);
                ctx.translate(-centerX, -centerY);

                // Apply border radius clipping if needed
                if (scaledRadius > 0) {
                    ctx.beginPath();
                    this.roundedRect(ctx, scaledX, scaledY, scaledWidth, scaledHeight, scaledRadius);
                    ctx.clip();
                }

                // Fill with solid color
                ctx.fillStyle = color;
                ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);

                ctx.restore();
            }
        }
    }

    renderFreestyleToCanvas(ctx, width, height) {
        // Calculate bounds
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        const cellBounds = [];
        this.freestyleCells.forEach((cellData) => {
            const actualX = cellData.x;
            const actualY = cellData.y;
            const cellWidth = cellData.width;
            const cellHeight = cellData.height;

            cellBounds.push({ 
                x: actualX, 
                y: actualY, 
                width: cellWidth, 
                height: cellHeight, 
                cellData
            });

            minX = Math.min(minX, actualX);
            minY = Math.min(minY, actualY);
            maxX = Math.max(maxX, actualX + cellWidth);
            maxY = Math.max(maxY, actualY + cellHeight);
        });

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        
        // Scale to fit canvas
        const scale = Math.min(width / contentWidth, height / contentHeight);
        const offsetX = (width - contentWidth * scale) / 2 - minX * scale;
        const offsetY = (height - contentHeight * scale) / 2 - minY * scale;

        // Cell scale and spread factors using unified properties
        const sizeValue = this.cellSize !== undefined ? this.cellSize : this.freestyleCellScale;
        const spreadValue = this.cellSpread !== undefined ? this.cellSpread : this.freestyleCellSpread;
        const cellScaleFactor = 1 + (sizeValue / 100);
        const spreadFactor = 1 + (spreadValue / 100);
        const canvasCenterX = width / 2;
        const canvasCenterY = height / 2;

        cellBounds.forEach((bounds) => {
            const cellData = bounds.cellData;
            const cols = cellData.imageCols;
            const rows = cellData.imageRows;
            
            const cellWidth = this.image.width / cols;
            const cellHeight = this.image.height / rows;
            
            const sx = cellData.imageCol * cellWidth;
            const sy = cellData.imageRow * cellHeight;

            // Calculate base position and size
            const baseX = bounds.x * scale + offsetX;
            const baseY = bounds.y * scale + offsetY;
            const baseW = bounds.width * scale;
            const baseH = bounds.height * scale;
            
            // Calculate center and apply spread
            let centerX = baseX + baseW / 2;
            let centerY = baseY + baseH / 2;
            centerX = canvasCenterX + (centerX - canvasCenterX) * spreadFactor;
            centerY = canvasCenterY + (centerY - canvasCenterY) * spreadFactor;
            
            // Apply cell scale from center
            const scaledW = baseW * cellScaleFactor;
            const scaledH = baseH * cellScaleFactor;
            const x = centerX - scaledW / 2;
            const y = centerY - scaledH / 2;

            ctx.save();

            // Apply tumble rotation for scatter cells
            if (this.cellTumble > 0 && cellData.rotationFactor !== undefined) {
                const rotation = cellData.rotationFactor * (this.cellTumble / 100) * 280 * (Math.PI / 180);
                ctx.translate(centerX, centerY);
                ctx.rotate(rotation);
                ctx.translate(-centerX, -centerY);
            }

            if (this.cellBorderRadius > 0) {
                const radius = this.getBorderRadiusPx(scaledW, scaledH);
                ctx.beginPath();
                ctx.moveTo(x + radius, y);
                ctx.lineTo(x + scaledW - radius, y);
                ctx.quadraticCurveTo(x + scaledW, y, x + scaledW, y + radius);
                ctx.lineTo(x + scaledW, y + scaledH - radius);
                ctx.quadraticCurveTo(x + scaledW, y + scaledH, x + scaledW - radius, y + scaledH);
                ctx.lineTo(x + radius, y + scaledH);
                ctx.quadraticCurveTo(x, y + scaledH, x, y + scaledH - radius);
                ctx.lineTo(x, y + radius);
                ctx.quadraticCurveTo(x, y, x + radius, y);
                ctx.closePath();
                ctx.clip();
            }

            // Draw cell content based on contentMode
            if (this.contentMode === 'color') {
                const cellIndex = cellData.imageRow * cellData.imageCols + cellData.imageCol;
                const color = this.gridCellColors && this.gridCellColors[cellIndex]
                    ? this.gridCellColors[cellIndex]
                    : cellData.color || 'rgb(128, 128, 128)';
                ctx.fillStyle = color;
                ctx.fillRect(x, y, scaledW, scaledH);
            } else {
                ctx.drawImage(
                    this.image,
                    sx, sy, Math.min(cellWidth, this.image.width - sx), Math.min(cellHeight, this.image.height - sy),
                    x, y, scaledW, scaledH
                );
            }

            ctx.restore();
        });
    }

    renderPaletteToCanvas(ctx, width, height) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        const cellBounds = [];
        this.freestyleCells.forEach((cellData) => {
            const actualX = cellData.x;
            const actualY = cellData.y;
            const cellWidth = cellData.width;
            const cellHeight = cellData.height;

            cellBounds.push({ 
                x: actualX, 
                y: actualY, 
                width: cellWidth, 
                height: cellHeight, 
                color: cellData.color
            });

            minX = Math.min(minX, actualX);
            minY = Math.min(minY, actualY);
            maxX = Math.max(maxX, actualX + cellWidth);
            maxY = Math.max(maxY, actualY + cellHeight);
        });

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        
        const scale = Math.min(width / contentWidth, height / contentHeight);
        const offsetX = (width - contentWidth * scale) / 2 - minX * scale;
        const offsetY = (height - contentHeight * scale) / 2 - minY * scale;

        // Cell scale and spread factors using unified properties
        const sizeValue = this.cellSize !== undefined ? this.cellSize : this.paletteCellScale;
        const spreadValue = this.cellSpread !== undefined ? this.cellSpread : this.paletteCellSpread;
        const cellScaleFactor = 1 + (sizeValue / 100);
        const spreadFactor = 1 + (spreadValue / 100);
        const canvasCenterX = width / 2;
        const canvasCenterY = height / 2;

        cellBounds.forEach((bounds) => {
            // Calculate base position and size
            const baseX = bounds.x * scale + offsetX;
            const baseY = bounds.y * scale + offsetY;
            const baseW = bounds.width * scale;
            const baseH = bounds.height * scale;
            
            // Calculate center and apply spread
            let centerX = baseX + baseW / 2;
            let centerY = baseY + baseH / 2;
            centerX = canvasCenterX + (centerX - canvasCenterX) * spreadFactor;
            centerY = canvasCenterY + (centerY - canvasCenterY) * spreadFactor;
            
            // Apply cell scale from center
            const scaledW = baseW * cellScaleFactor;
            const scaledH = baseH * cellScaleFactor;
            const x = centerX - scaledW / 2;
            const y = centerY - scaledH / 2;

            ctx.save();

            if (this.cellBorderRadius > 0) {
                const radius = this.getBorderRadiusPx(scaledW, scaledH);
                ctx.beginPath();
                ctx.moveTo(x + radius, y);
                ctx.lineTo(x + scaledW - radius, y);
                ctx.quadraticCurveTo(x + scaledW, y, x + scaledW, y + radius);
                ctx.lineTo(x + scaledW, y + scaledH - radius);
                ctx.quadraticCurveTo(x + scaledW, y + scaledH, x + scaledW - radius, y + scaledH);
                ctx.lineTo(x + radius, y + scaledH);
                ctx.quadraticCurveTo(x, y + scaledH, x, y + scaledH - radius);
                ctx.lineTo(x, y + radius);
                ctx.quadraticCurveTo(x, y, x + radius, y);
                ctx.clip();
            }

            ctx.fillStyle = bounds.color;
            ctx.fillRect(x, y, scaledW, scaledH);

            ctx.restore();
        });
    }

    downloadCanvas(canvas, filename) {
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 'image/png');
    }
}

// Initialize app when DOM is ready
let app;

function initApp() {
    console.log('Initializing Osmosis app...');
    console.log('Document ready state:', document.readyState);
    app = new ImageGridSplitter();
    window.appInstance = app; // Make globally accessible for navbar
    
    // Don't show navbar on initial load (no image yet)
    // It will be shown when an image is loaded via updateNavbar()
    
    console.log('App initialized successfully');
    
    // Check for URL parameter to auto-load an example image
    const urlParams = new URLSearchParams(window.location.search);
    const imageParam = urlParams.get('image');
    if (imageParam) {
        console.log('Auto-loading image from URL parameter:', imageParam);
        // Small delay to ensure components are ready
        setTimeout(() => {
            app.loadExampleImage({ target: { dataset: { image: imageParam } } });
        }, 500);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
