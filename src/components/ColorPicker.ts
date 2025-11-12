// ColorPicker.ts @jxarco

import { LX } from './../Namespace';
import { Color } from './Color';
import { TextInput } from './TextInput';
import { Button } from './Button';
import { Select } from './Select';

/**
 * @class ColorPicker
 */

export class ColorPicker {

    static currentPicker = false;

    root: any;

    colorModel: string;
    useAlpha: boolean;
    callback: any;

    markerHalfSize: number;
    markerSize: number;
    currentColor: Color;
    labelComponent: TextInput;

    colorPickerBackground: any;
    intSatMarker: any;
    colorPickerTracker: any;
    alphaTracker: any;
    hueMarker: any;
    alphaMarker: any;

    onPopover: any;

    constructor( hexValue: string, options: any = {} ) {

        this.colorModel = options.colorModel ?? "Hex";
        this.useAlpha = options.useAlpha ?? false;
        this.callback = options.onChange;

        if( !this.callback )
        {
            console.warn( "Define a callback in _options.onChange_ to allow getting new Color values!" );
        }

        this.root = document.createElement( "div" );
        this.root.className = "lexcolorpicker";

        this.markerHalfSize = 8;
        this.markerSize = this.markerHalfSize * 2;
        this.currentColor = new Color( hexValue );

        const hueColor = new Color( { h: this.currentColor.hsv.h, s: 1, v: 1 } );

        // Intensity, Sat
        this.colorPickerBackground = document.createElement( 'div' );
        this.colorPickerBackground.className = "lexcolorpickerbg";
        this.colorPickerBackground.style.backgroundColor = `rgb(${ hueColor.css.r }, ${ hueColor.css.g }, ${ hueColor.css.b })`;
        this.root.appendChild( this.colorPickerBackground );

        this.intSatMarker = document.createElement( 'div' );
        this.intSatMarker.className = "lexcolormarker";
        this.intSatMarker.style.backgroundColor = this.currentColor.hex;
        this.colorPickerBackground.appendChild( this.intSatMarker );

        let pickerRect: any = null;

        let innerMouseDown = ( e: MouseEvent ) => {
            var doc = this.root.ownerDocument;
            doc.addEventListener( 'mousemove', innerMouseMove );
            doc.addEventListener( 'mouseup', innerMouseUp );
            document.body.classList.add( 'noevents' );
            e.stopImmediatePropagation();
            e.stopPropagation();

            const currentLeft = ( e.offsetX - this.markerHalfSize );
            this.intSatMarker.style.left = currentLeft + "px";
            const currentTop = ( e.offsetY - this.markerHalfSize );
            this.intSatMarker.style.top = currentTop + "px";
            this._positionToSv( currentLeft, currentTop );
            this._updateColorValue();

            pickerRect = this.colorPickerBackground.getBoundingClientRect();
        }

        let innerMouseMove = ( e: MouseEvent ) => {
            const dX = e.movementX;
            const dY = e.movementY;
            const mouseX = e.x - pickerRect.x;
            const mouseY = e.y - pickerRect.y;

            if ( dX != 0 && ( mouseX >= 0 || dX < 0 ) && ( mouseX < this.colorPickerBackground.offsetWidth || dX > 0 ) )
            {
                this.intSatMarker.style.left = LX.clamp( parseInt( this.intSatMarker.style.left ) + dX, -this.markerHalfSize, this.colorPickerBackground.offsetWidth - this.markerHalfSize ) + "px";
            }

            if ( dY != 0 && ( mouseY >= 0 || dY < 0 ) && ( mouseY < this.colorPickerBackground.offsetHeight || dY > 0 ) )
            {
                this.intSatMarker.style.top = LX.clamp( parseInt( this.intSatMarker.style.top ) + dY, -this.markerHalfSize, this.colorPickerBackground.offsetHeight - this.markerHalfSize ) + "px";
            }

            this._positionToSv( parseInt( this.intSatMarker.style.left ), parseInt( this.intSatMarker.style.top ) );
            this._updateColorValue();

            e.stopPropagation();
            e.preventDefault();
        }

        let innerMouseUp = ( e: MouseEvent ) => {
            var doc = this.root.ownerDocument;
            doc.removeEventListener( 'mousemove', innerMouseMove );
            doc.removeEventListener( 'mouseup', innerMouseUp );
            document.body.classList.remove( 'noevents' );
        }

        this.colorPickerBackground.addEventListener( "mousedown", innerMouseDown );

        const hueAlphaContainer = LX.makeContainer( ["100%", "auto"], "flex flex-row gap-1 items-center", "", this.root );

        const EyeDropper = ( window as any ).EyeDropper;
        if( EyeDropper )
        {
            hueAlphaContainer.appendChild( new Button(null, "eyedrop",  async () => {
                const eyeDropper = new EyeDropper();
                try {
                    const result = await eyeDropper.open();
                    this.fromHexColor( result.sRGBHex );
                } catch ( err ) {
                    // console.error("EyeDropper cancelled or failed: ", err)
                }
            }, { icon: "Pipette", buttonClass: "bg-none", title: "Sample Color" }).root );
        }

        const innerHueAlpha = LX.makeContainer( ["100%", "100%"], "flex flex-col gap-2", "", hueAlphaContainer );

        // Hue
        this.colorPickerTracker = document.createElement( 'div' );
        this.colorPickerTracker.className = "lexhuetracker";
        innerHueAlpha.appendChild( this.colorPickerTracker );

        this.hueMarker = document.createElement( 'div' );
        this.hueMarker.className = "lexcolormarker";
        this.hueMarker.style.backgroundColor = `rgb(${ hueColor.css.r }, ${ hueColor.css.g }, ${ hueColor.css.b })`;
        this.colorPickerTracker.appendChild( this.hueMarker );

        const _fromHueX = ( hueX: number ) => {
            this.hueMarker.style.left = hueX + "px";
            this.currentColor.hsv.h = LX.remapRange( hueX, 0, this.colorPickerTracker.offsetWidth - this.markerSize, 0, 360 );

            const hueColor = new Color( { h: this.currentColor.hsv.h, s: 1, v: 1 } );
            this.hueMarker.style.backgroundColor = `rgb(${ hueColor.css.r }, ${ hueColor.css.g }, ${ hueColor.css.b })`;
            this.colorPickerBackground.style.backgroundColor = `rgb(${ hueColor.css.r }, ${ hueColor.css.g }, ${ hueColor.css.b })`;
            this._updateColorValue();
        };

        let hueTrackerRect: any = null;

        let innerMouseDownHue = ( e: MouseEvent ) => {
            const doc = this.root.ownerDocument;
            doc.addEventListener( 'mousemove', innerMouseMoveHue );
            doc.addEventListener( 'mouseup', innerMouseUpHue );
            document.body.classList.add( 'noevents' );
            e.stopImmediatePropagation();
            e.stopPropagation();

            const hueX = LX.clamp( e.offsetX - this.markerHalfSize, 0, this.colorPickerTracker.offsetWidth - this.markerSize );
            _fromHueX( hueX );

            hueTrackerRect = this.colorPickerTracker.getBoundingClientRect();
        }

        let innerMouseMoveHue = ( e: MouseEvent ) => {
            const dX = e.movementX;
            const mouseX = e.x - hueTrackerRect.x;

            if ( dX != 0 && ( mouseX >= this.markerHalfSize || dX < 0 ) && ( mouseX < ( this.colorPickerTracker.offsetWidth - this.markerHalfSize ) || dX > 0 ) )
            {
                const hueX = LX.clamp( parseInt( this.hueMarker.style.left ) + dX, 0, this.colorPickerTracker.offsetWidth - this.markerSize );
                _fromHueX( hueX );
            }

            e.stopPropagation();
            e.preventDefault();
        }

        let innerMouseUpHue = ( e: MouseEvent ) => {
            var doc = this.root.ownerDocument;
            doc.removeEventListener( 'mousemove', innerMouseMoveHue );
            doc.removeEventListener( 'mouseup', innerMouseUpHue );
            document.body.classList.remove( 'noevents' );
        }

        this.colorPickerTracker.addEventListener( "mousedown", innerMouseDownHue );

        // Alpha
        if( this.useAlpha )
        {
            this.alphaTracker = document.createElement( 'div' );
            this.alphaTracker.className = "lexalphatracker";
            this.alphaTracker.style.color = `rgb(${ this.currentColor.css.r }, ${ this.currentColor.css.g }, ${ this.currentColor.css.b })`;
            innerHueAlpha.appendChild( this.alphaTracker );

            this.alphaMarker = document.createElement( 'div' );
            this.alphaMarker.className = "lexcolormarker";
            this.alphaMarker.style.backgroundColor = `rgb(${ this.currentColor.css.r }, ${ this.currentColor.css.g }, ${ this.currentColor.css.b },${ this.currentColor.css.a })`;
            this.alphaTracker.appendChild( this.alphaMarker );

            const _fromAlphaX = ( alphaX: number ) => {
                this.alphaMarker.style.left = alphaX + "px";
                this.currentColor.hsv.a = LX.remapRange( alphaX, 0, this.alphaTracker.offsetWidth - this.markerSize, 0, 1 );
                this._updateColorValue();
                // Update alpha marker once the color is updated
                this.alphaMarker.style.backgroundColor = `rgb(${ this.currentColor.css.r }, ${ this.currentColor.css.g }, ${ this.currentColor.css.b },${ this.currentColor.css.a })`;
            };

            let alphaTrackerRect: any = null;

            let innerMouseDownAlpha = ( e: MouseEvent ) => {
                const doc = this.root.ownerDocument;
                doc.addEventListener( 'mousemove', innerMouseMoveAlpha );
                doc.addEventListener( 'mouseup', innerMouseUpAlpha );
                document.body.classList.add( 'noevents' );
                e.stopImmediatePropagation();
                e.stopPropagation();
                const alphaX = LX.clamp( e.offsetX - this.markerHalfSize, 0, this.alphaTracker.offsetWidth - this.markerSize );
                _fromAlphaX( alphaX );
                alphaTrackerRect = this.alphaTracker.getBoundingClientRect();
            }

            let innerMouseMoveAlpha = ( e: MouseEvent ) => {
                const dX = e.movementX;
                const mouseX = e.x - alphaTrackerRect.x;

                if ( dX != 0 && ( mouseX >= this.markerHalfSize || dX < 0 ) && ( mouseX < ( this.alphaTracker.offsetWidth - this.markerHalfSize ) || dX > 0 ) )
                {
                    const alphaX = LX.clamp( parseInt( this.alphaMarker.style.left ) + dX, 0, this.alphaTracker.offsetWidth - this.markerSize );
                    _fromAlphaX( alphaX );
                }

                e.stopPropagation();
                e.preventDefault();
            }

            let innerMouseUpAlpha = ( e: MouseEvent ) => {
                var doc = this.root.ownerDocument;
                doc.removeEventListener( 'mousemove', innerMouseMoveAlpha );
                doc.removeEventListener( 'mouseup', innerMouseUpAlpha );
                document.body.classList.remove( 'noevents' );
            }

            this.alphaTracker.addEventListener( "mousedown", innerMouseDownAlpha );
        }

        // Info display
        const colorLabel = LX.makeContainer( ["100%", "auto"], "flex flex-row gap-1", "", this.root );

        colorLabel.appendChild( new Select( null, [ "CSS", "Hex", "HSV", "RGB" ], this.colorModel, ( v: any ) => {
            this.colorModel = v;
            this._updateColorValue( null, true );
        } ).root );

        this.labelComponent = new TextInput( null, "", null, { inputClass: "bg-none", fit: true, disabled: true } );
        colorLabel.appendChild( this.labelComponent.root );

        // Copy button
        {
            const copyButtonComponent = new Button( null, "copy",  async () => {
                navigator.clipboard.writeText( this.labelComponent.value() );
                copyButtonComponent.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = "none";

                LX.doAsync( () => {
                    if( copyButtonComponent.swap ) copyButtonComponent.swap( true );
                    copyButtonComponent.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = "auto";
                }, 3000 );

            }, { swap: "Check", icon: "Copy", buttonClass: "bg-none", className: "ml-auto", title: "Copy" } );

            copyButtonComponent.root.querySelector( ".swap-on svg" ).classList.add( "fg-success" );

            colorLabel.appendChild( copyButtonComponent.root );
        }

        this._updateColorValue( hexValue, true );

        LX.doAsync( this._placeMarkers.bind( this ) );

        this.onPopover = this._placeMarkers.bind( this );
    }

    _placeMarkers() {

        this._svToPosition( this.currentColor.hsv.s, this.currentColor.hsv.v );

        const hueLeft = LX.remapRange( this.currentColor.hsv.h, 0, 360, 0, this.colorPickerTracker.offsetWidth - this.markerSize );
        this.hueMarker.style.left = hueLeft + "px";

        if( this.useAlpha )
        {
            const alphaLeft = LX.remapRange( this.currentColor.hsv.a, 0, 1, 0, this.alphaTracker.offsetWidth - this.markerSize );
            this.alphaMarker.style.left = alphaLeft + "px";
        }
    }

    _svToPosition( s: number, v: number ) {
        this.intSatMarker.style.left = `${ LX.remapRange( s, 0, 1, -this.markerHalfSize, this.colorPickerBackground.offsetWidth - this.markerHalfSize ) }px`;
        this.intSatMarker.style.top = `${ LX.remapRange( 1 - v, 0, 1, -this.markerHalfSize, this.colorPickerBackground.offsetHeight - this.markerHalfSize ) }px`;
    }

    _positionToSv( left: number, top: number ) {
        this.currentColor.hsv.s = LX.remapRange( left, -this.markerHalfSize, this.colorPickerBackground.offsetWidth - this.markerHalfSize, 0, 1 );
        this.currentColor.hsv.v = 1 - LX.remapRange( top, -this.markerHalfSize, this.colorPickerBackground.offsetHeight - this.markerHalfSize, 0, 1 );
    }

    _updateColorValue( newHexValue?: string|null, skipCallback: boolean = false ) {

        this.currentColor.set( newHexValue ?? this.currentColor.hsv );

        if( this.callback && !skipCallback )
        {
            this.callback( this.currentColor );
        }

        this.intSatMarker.style.backgroundColor = this.currentColor.hex;

        if( this.useAlpha )
        {
            this.alphaTracker.style.color = `rgb(${ this.currentColor.css.r }, ${ this.currentColor.css.g }, ${ this.currentColor.css.b })`;
        }

        const toFixed = ( s: number, n: number = 2) => { return s.toFixed( n ).replace( /([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, '$1' ) };

        if( this.colorModel == "CSS" )
        {
            const { r, g, b, a } = this.currentColor.css;
            this.labelComponent.set( `rgb${ this.useAlpha ? 'a' : '' }(${ r },${ g },${ b }${ this.useAlpha ? ',' + toFixed( a ) : '' })` );
        }
        else if( this.colorModel == "Hex" )
        {
            this.labelComponent.set( ( this.useAlpha ? this.currentColor.hex : this.currentColor.hex.substr( 0, 7 ) ).toUpperCase() );
        }
        else if( this.colorModel == "HSV" )
        {
            const { h, s, v, a } = this.currentColor.hsv;
            const components = [ Math.floor( h ) + 'º', Math.floor( s * 100 ) + '%', Math.floor( v * 100 ) + '%' ];
            if( this.useAlpha ) components.push( toFixed( a ) );
            this.labelComponent.set( components.join( ' ' ) );
        }
        else // RGB
        {
            const { r, g, b, a } = this.currentColor.rgb;
            const components = [ toFixed( r ), toFixed( g ), toFixed( b ) ];
            if( this.useAlpha ) components.push( toFixed( a ) );
            this.labelComponent.set( components.join( ' ' ) );
        }
    }

    fromHexColor( hexColor: string ) {

        this.currentColor.setHex( hexColor );

        // Decompose into HSV
        const { h, s, v } = this.currentColor.hsv;
        this._svToPosition( s, v );

        const hueColor = new Color( { h, s: 1, v: 1 } );
        this.hueMarker.style.backgroundColor = this.colorPickerBackground.style.backgroundColor = `rgb(${ hueColor.css.r }, ${ hueColor.css.g }, ${ hueColor.css.b })`;
        this.hueMarker.style.left = LX.remapRange( h, 0, 360, -this.markerHalfSize, this.colorPickerTracker.offsetWidth - this.markerHalfSize ) + "px";

        this._updateColorValue( hexColor );
    }
};

LX.ColorPicker = ColorPicker;