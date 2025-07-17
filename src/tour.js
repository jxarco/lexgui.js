// tour.js @jxarco
import { LX } from './core.js';

class Tour {

    /**
     * @constructor Tour
     * @param {Array} steps
     * @param {Object} options
     * useModal: Use a modal to highlight the tour step [true]
     * offset: Horizontal and vertical margin offset [0]
     * horizontalOffset: Horizontal offset [0]
     * verticalOffset: Vertical offset [0]
     * radius: Radius for the tour step highlight [8]
     */

    constructor( steps, options = {} ) {

        this.steps = steps || [];
        this.currentStep = 0;

        this.useModal = options.useModal ?? true;
        this.offset = options.offset ?? 8;
        this.horizontalOffset = options.horizontalOffset;
        this.verticalOffset = options.verticalOffset;
        this.radius = options.radius ?? 12;

        this.tourContainer = LX.makeContainer( ["100%", "100%"], "tour-container" );
        this.tourContainer.style.display = "none";
        document.body.appendChild( this.tourContainer );

        this.tourMask = LX.makeContainer( ["100%", "100%"], "tour-mask" );
    }

    /**
     * @method begin
     */

    begin() {

        this.currentStep = 0;

        if ( this.useModal )
        {
            this.tourMask.style.display = "block";
            this.tourContainer.appendChild( this.tourMask );
        }

        this.tourContainer.style.display = "block";

        this._showStep( 0 );
    }

    /**
     * @method stop
     */

    stop() {

        if( this.useModal )
        {
            this.tourMask.style.display = "none";
            this.tourContainer.removeChild( this.tourMask );
        }

        this._popover?.destroy();

        this.tourContainer.style.display = "none";
    }

    // Show the current step of the tour
    _showStep( stepOffset = 1 ) {

        this.currentStep += stepOffset;

        const step = this.steps[ this.currentStep ];
        if ( !step ) {
            this.stop();
            return;
        }

        const prevStep = this.steps[ this.currentStep - 1 ];
        const nextStep = this.steps[ this.currentStep + 1 ];

        this._generateMask( step.reference );
        this._createHighlight( step, prevStep, nextStep );
    }

    // Generate mask for the specific step reference
    // using a fullscreen SVG with "rect" elements
    _generateMask( reference ) {

        this.tourMask.innerHTML = ""; // Clear previous content

        const svg = document.createElementNS( "http://www.w3.org/2000/svg", "svg" );
        svg.style.width = "100%";
        svg.style.height = "100%";
        this.tourMask.appendChild( svg );

        const clipPath = document.createElementNS( "http://www.w3.org/2000/svg", "clipPath" );
        clipPath.setAttribute( "id", "svgTourClipPath" );
        svg.appendChild( clipPath );

        function ceilAndShiftRect( p, s ) {
            const cp = Math.ceil( p );
            const delta = cp - p;
            const ds = s - delta;
            return [  cp, ds ];
        }

        const refBounding = reference.getBoundingClientRect();
        const [ boundingX, boundingWidth ] = ceilAndShiftRect( refBounding.x, refBounding.width );
        const [ boundingY, boundingHeight ] = ceilAndShiftRect( refBounding.y, refBounding.height );

        const vOffset = this.verticalOffset ?? this.offset;
        const hOffset = this.horizontalOffset ?? this.offset;

        // Left
        {
            const rect = document.createElementNS( "http://www.w3.org/2000/svg", "rect" );
            rect.setAttribute( "x", 0 );
            rect.setAttribute( "y", 0 );
            rect.setAttribute( "width", boundingX - hOffset );
            rect.setAttribute( "height", window.innerHeight );
            rect.setAttribute( "stroke", "none" );
            clipPath.appendChild( rect );
        }

        // Top
        {
            const rect = document.createElementNS( "http://www.w3.org/2000/svg", "rect" );
            rect.setAttribute( "x", boundingX - hOffset );
            rect.setAttribute( "y", 0 );
            rect.setAttribute( "width", boundingWidth + hOffset * 2 );
            rect.setAttribute( "height", boundingY - vOffset );
            rect.setAttribute( "stroke", "none" );
            clipPath.appendChild( rect );
        }

        // Bottom
        {
            const rect = document.createElementNS( "http://www.w3.org/2000/svg", "rect" );
            rect.setAttribute( "x", boundingX - hOffset );
            rect.setAttribute( "y", boundingY + boundingHeight + vOffset );
            rect.setAttribute( "width", boundingWidth + hOffset * 2 );
            rect.setAttribute( "height", window.innerHeight - boundingY - boundingHeight - vOffset );
            rect.setAttribute( "stroke", "none" );
            clipPath.appendChild( rect );
        }

        // Right
        {
            const rect = document.createElementNS( "http://www.w3.org/2000/svg", "rect" );
            rect.setAttribute( "x", boundingX + boundingWidth + hOffset );
            rect.setAttribute( "y", 0 );
            rect.setAttribute( "width", window.innerWidth - boundingX - boundingWidth );
            rect.setAttribute( "height", window.innerHeight );
            rect.setAttribute( "stroke", "none" );
            clipPath.appendChild( rect );
        }

        // Reference Highlight
        const refContainer = LX.makeContainer( ["0", "0"], "tour-ref-mask" );
        refContainer.style.left = `${ boundingX - hOffset - 1 }px`;
        refContainer.style.top = `${ boundingY - vOffset - 1 }px`;
        refContainer.style.width = `${ boundingWidth + hOffset * 2 + 2 }px`;
        refContainer.style.height = `${ boundingHeight + vOffset * 2 + 2}px`;
        this.tourContainer.appendChild( refContainer );

        const referenceMask = document.createElementNS( "http://www.w3.org/2000/svg", "mask" );
        referenceMask.setAttribute( "id", "svgTourReferenceMask" );
        svg.appendChild( referenceMask );

        // Reference Mask
        {
            const rectWhite = document.createElementNS( "http://www.w3.org/2000/svg", "rect" );
            rectWhite.setAttribute( "width", boundingWidth + hOffset * 2 + 2 );
            rectWhite.setAttribute( "height", boundingHeight + vOffset * 2 + 2);
            rectWhite.setAttribute( "stroke", "none" );
            rectWhite.setAttribute( "fill", "white" );
            referenceMask.appendChild( rectWhite );

            const rectBlack = document.createElementNS( "http://www.w3.org/2000/svg", "rect" );
            rectBlack.setAttribute( "rx", this.radius );
            rectBlack.setAttribute( "width", boundingWidth + hOffset * 2 + 2);
            rectBlack.setAttribute( "height", boundingHeight + vOffset * 2 + 2);
            rectBlack.setAttribute( "stroke", "none" );
            rectBlack.setAttribute( "fill", "black" );
            referenceMask.appendChild( rectBlack );
        }
    }

    // Create the container with the user hints
    _createHighlight( step, previousStep, nextStep ) {

        const popoverContainer = LX.makeContainer( ["auto", "auto"], "tour-step-container" );

        {
            const header = LX.makeContainer( ["100%", "auto"], "flex flex-row", "", popoverContainer );
            const title = LX.makeContainer( ["70%", "auto"], "p-2 font-medium", step.title, header );
            const closer = LX.makeContainer( ["30%", "auto"], "flex flex-row p-2 justify-end", "", header );
            const closeIcon = LX.makeIcon( "X" );
            closer.appendChild( closeIcon );

            closeIcon.listen( "click", () => {
                this.stop();
            } );
        }

        const content = LX.makeContainer( ["100%", "auto"], "p-2 text-md", step.content, popoverContainer, { maxWidth: "400px" } );
        const footer = LX.makeContainer( ["100%", "auto"], "flex flex-row text-md", "", popoverContainer );

        {
            const footerSteps = LX.makeContainer( ["50%", "auto"], "p-2 gap-1 self-center flex flex-row text-md", "", footer );
            for(  let i = 0; i < this.steps.length; i++ )
            {
                const stepIndicator = document.createElement( "span" );
                stepIndicator.className = "tour-step-indicator";
                if( i === this.currentStep )
                {
                    stepIndicator.classList.add( "active" );
                }
                footerSteps.appendChild( stepIndicator );
            }
        }

        const footerButtons = LX.makeContainer( ["50%", "auto"], "text-md", "", footer );
        const footerPanel = new LX.Panel();

        let numButtons = 1;

        if( previousStep )
        {
            numButtons++;
        }

        if( numButtons > 1 )
        {
            footerPanel.sameLine( 2, "justify-end" );
        }

        if( previousStep )
        {
            footerPanel.addButton( null, "Previous", () => {
                this._showStep( -1 );
            }, { buttonClass: "contrast" } );
        }

        if( nextStep )
        {
            footerPanel.addButton( null, "Next", () => {
                this._showStep( 1 );
            }, { buttonClass: "accent" } );
        }
        else
        {
            footerPanel.addButton( null, "Finish", () => {
                this.stop();
            } );
        }

        footerButtons.appendChild( footerPanel.root );

        const sideOffset = ( step.side === "left" || step.side === "right" ? this.horizontalOffset : this.verticalOffset ) ?? this.offset;
        const alignOffset = ( step.align === "start" || step.align === "end" ? sideOffset : 0 );

        this._popover?.destroy();
        this._popover = new LX.Popover( null, [ popoverContainer ], {
            reference: step.reference,
            side: step.side,
            align: step.align,
            sideOffset,
            alignOffset: step.align === "start" ? -alignOffset : alignOffset,
        } );
    }
};

LX.Tour = Tour;

export { Tour };