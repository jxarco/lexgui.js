// Color.js @jxarco
import { LX } from './core.js';

class Color {

	constructor( value: any ) {

        Object.defineProperty( Color.prototype, "rgb", {
            get: function() { return this._rgb; },
            set: function( v ) { this._fromRGB( v ) }, enumerable: true, configurable: true
        });

        Object.defineProperty( Color.prototype, "hex", {
            get: function() { return this._hex; },
            set: function( v ) { this._fromHex( v ) }, enumerable: true, configurable: true
        });

        Object.defineProperty( Color.prototype, "hsv", {
            get: function() { return this._hsv; },
            set: function( v ) { this._fromHSV( v ) }, enumerable: true, configurable: true
        });

		this.set( value );
	}

	set( value: any ) {

		if ( typeof value === 'string' && value.startsWith( '#' ) )
        {
			this._fromHex( value );
		}
        else if( 'r' in value && 'g' in value && 'b' in value)
        {
            value.a = value.a ?? 1.0;
			this._fromRGB( value );
		}
        else if( 'h' in value && 's' in value && 'v' in value )
        {
            value.a = value.a ?? 1.0;
			this._fromHSV( value );
		}
        else
        {
            throw( "Bad color model!" );
        }
	}

    setHSV( hsv ) { this._fromHSV( hsv ); }
    setRGB( rgb ) { this._fromRGB( rgb ); }
    setHex( hex ) { this._fromHex( hex ); }

	_fromHex( hex ) {
		this._fromRGB( LX.hexToRgb( hex ) );
	}

	_fromRGB( rgb ) {
		this._rgb = rgb;
		this._hsv = LX.rgbToHsv( rgb );
		this._hex = LX.rgbToHex( rgb );
        this.css = LX.rgbToCss( this._rgb );
	}

	_fromHSV( hsv ) {
		this._hsv = hsv;
		this._rgb = LX.hsvToRgb( hsv );
		this._hex = LX.rgbToHex( this._rgb );
        this.css = LX.rgbToCss( this._rgb );
	}
}

LX.Color = Color;

export { Color };