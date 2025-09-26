export default class DebugConsole {
    constructor(options = {}) {
        this.options = {
            maxLines: options.maxLines || 100, // Maximum number of lines to display
            containerId: options.containerId || 'debug-console-overlay',
            logPrefix: options.logPrefix || '',
            zIndex: options.zIndex || 10001, // Ensure it's above other elements
            position: options.position || { bottom: '10px', left: '10px', right: '10px' },
            height: options.height || '150px',
            backgroundColor: options.backgroundColor || 'rgba(0, 0, 0, 0.7)',
            textColor: options.textColor || '#0f0',
            fontSize: options.fontSize || '12px'
        };
        this.container = null;
        this.toggleButton = null; // Add reference for toggle button
        this.copyButton = null; // Add reference for copy button
        this.originalConsole = {};
        this.lines = [];
        this.isVisible = true; // Start visible by default

        this._createContainer();
        this._overrideConsole();
        this._addControlButtons();
        console.log("DebugConsole Initialized."); // Log initialization
    }

    _createContainer() {
        if (document.getElementById(this.options.containerId)) return;

        this.container = document.createElement('div');
        this.container.id = this.options.containerId;
        Object.assign(this.container.style, {
            position: 'fixed',
            ...this.options.position,
            height: this.options.height,
            backgroundColor: this.options.backgroundColor,
            color: this.options.textColor,
            fontSize: this.options.fontSize,
            fontFamily: 'monospace',
            overflowY: 'scroll',
            padding: '5px',
            zIndex: this.options.zIndex,
            border: '1px solid #555',
            borderRadius: '5px',
            boxSizing: 'border-box',
            whiteSpace: 'pre-wrap', // Allow wrapping
            wordBreak: 'break-all'  // Break long words
        });
        document.body.appendChild(this.container);
    }

    _overrideConsole() {
        const methods = ['log', 'warn', 'error', 'info', 'debug'];
        methods.forEach(method => {
            if (console[method]) {
                this.originalConsole[method] = console[method].bind(console);
                console[method] = (...args) => {
                    // Call original console method
                    this.originalConsole[method](...args);
                    // Add to our on-screen console
                    this._addToOverlay(method.toUpperCase(), args);
                };
            }
        });
    }

    _formatArgs(args) {
        return args.map(arg => {
            if (typeof arg === 'object' && arg !== null) {
                try {
                    return JSON.stringify(arg, null, 2); // Pretty print objects
                } catch (e) {
                    return '[Unserializable Object]';
                }
            } else if (typeof arg === 'undefined') {
                return 'undefined';
            } else if (arg === null) {
                return 'null';
            }
            return String(arg);
        }).join(' ');
    }

    _addToOverlay(level, args) {
        if (!this.container || !this.isVisible) return;

        const timestamp = new Date().toLocaleTimeString();
        const message = this._formatArgs(args);
        const line = `[${timestamp}] [${level}] ${this.options.logPrefix}${message}`;

        this.lines.push(line);
        if (this.lines.length > this.options.maxLines) {
            this.lines.shift(); // Remove the oldest line
        }

        // Use innerText for copying later
        this.container.innerText = this.lines.join('\n');
        // Scroll to the bottom
        this.container.scrollTop = this.container.scrollHeight;
    }

    _addControlButtons() {
        const buttonContainer = document.createElement('div');
        const bottomPos = `calc(${this.options.position.bottom || '10px'} + ${this.options.height || '150px'} + 10px)`;
        Object.assign(buttonContainer.style, {
            position: 'fixed',
            bottom: bottomPos,
            left: this.options.position.left || '10px',
            zIndex: this.options.zIndex + 1,
            display: 'flex', // Use flexbox for layout
            gap: '5px' // Add space between buttons
        });

        // Toggle Button
        const toggleButton = document.createElement('button');
        toggleButton.textContent = this.isVisible ? 'Hide Console' : 'Show Console'; // Initial text based on isVisible
        Object.assign(toggleButton.style, {
            padding: '5px 10px',
            cursor: 'pointer'
        });
        toggleButton.onclick = () => this.toggleVisibility();
        buttonContainer.appendChild(toggleButton);
        this.toggleButton = toggleButton; // Store reference

        // Copy Button
        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy Text';
        Object.assign(copyButton.style, {
            padding: '5px 10px',
            cursor: 'pointer'
        });
        copyButton.onclick = async () => {
            if (!this.container) return;
            try {
                await navigator.clipboard.writeText(this.container.innerText);
                copyButton.textContent = 'Copied!';
                this.originalConsole.log('Console text copied to clipboard.');
                setTimeout(() => { copyButton.textContent = 'Copy Text'; }, 2000); // Reset text after 2s
            } catch (err) {
                this.originalConsole.error('Failed to copy console text: ', err);
                copyButton.textContent = 'Copy Failed';
                 setTimeout(() => { copyButton.textContent = 'Copy Text'; }, 2000);
            }
        };
        buttonContainer.appendChild(copyButton);
        this.copyButton = copyButton; // Store reference

        document.body.appendChild(buttonContainer);
    }

    // --- Public Methods ---
    clear() {
        this.lines = [];
        if (this.container) {
            this.container.innerText = ''; // Use innerText
        }
        this.originalConsole.log("On-screen console cleared.");
    }

     toggleVisibility() {
        this.isVisible = !this.isVisible;
        if (this.container) {
            this.container.style.display = this.isVisible ? 'block' : 'none';
        }
        if (this.toggleButton) {
            // Text is already updated in _addControlButtons based on initial state
            // Update text here on toggle
            this.toggleButton.textContent = this.isVisible ? 'Hide Console' : 'Show Console';
        }
    }

    destroy() {
        // Restore original console methods
        Object.keys(this.originalConsole).forEach(method => {
            console[method] = this.originalConsole[method];
        });

        // Remove elements from DOM
        if (this.container) {
            this.container.remove();
        }
         if (this.toggleButton && this.toggleButton.parentElement) {
             this.toggleButton.parentElement.remove(); // Remove the container div
         }
         // No need to remove copyButton separately as it's in the same container

        this.container = null;
        this.toggleButton = null;
        this.copyButton = null; // Clear reference
        this.lines = [];
        this.originalConsole = {};
        console.log("DebugConsole destroyed."); // Use restored console.log
    }
} 