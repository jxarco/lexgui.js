// Color.js @jxarco

import { LX } from './../Namespace';

export class Color {

    private _rgb: any;
    private _hex: string = "#000000";
    private _hsv: any;
    css: any;

    get rgb(): any { return this._rgb; }
    set rgb(v: any) { this._fromRGB( v ); }

    get hex(): string { return this._hex; }
    set hex(v: string) { this._fromHex( v ); }

    get hsv(): any { return this._hsv; }
    set hsv(v: any) { this._fromHSV( v ); }

	constructor( value: any )
    {
		this.set( value );
	}

	set( value: any )
    {
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

    setHSV( hsv: any ) { this._fromHSV( hsv ); }
    setRGB( rgb: any ) { this._fromRGB( rgb ); }
    setHex( hex: string ) { this._fromHex( hex ); }

	_fromHex( hex: string ) {
		this._fromRGB( LX.hexToRgb( hex ) );
	}

	_fromRGB( rgb: any ) {
		this._rgb = rgb;
		this._hsv = LX.rgbToHsv( rgb );
		this._hex = LX.rgbToHex( rgb );
        this.css = LX.rgbToCss( this._rgb );
	}

	_fromHSV( hsv: any ) {
		this._hsv = hsv;
		this._rgb = LX.hsvToRgb( hsv );
		this._hex = LX.rgbToHex( this._rgb );
        this.css = LX.rgbToCss( this._rgb );
	}
}

LX.Color = Color;