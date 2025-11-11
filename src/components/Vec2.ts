// Vec2.ts @jxarco

import { LX } from './Namespace';

export class vec2 {

    x: number;
    y: number;

    constructor( x?: number, y?: number ) {
        this.x = x ?? 0;
        this.y = y ?? ( x ?? 0 );
    }

    get xy() { return [ this.x, this.y ]; }
    get yx() { return [ this.y, this.x ]; }

    set ( x: number, y: number ) { this.x = x; this.y = y; }
    add ( v: vec2, v0 = new vec2() ) { v0.set( this.x + v.x, this.y + v.y ); return v0; }
    sub ( v: vec2, v0 = new vec2() ) { v0.set( this.x - v.x, this.y - v.y ); return v0; }
    mul ( v: number|vec2, v0 = new vec2() ) { if( v.constructor == Number ) { v = new vec2( v ) } v0.set( this.x * ( v as vec2 ).x, this.y * ( v as vec2 ).y ); return v0; }
    div ( v: vec2, v0 = new vec2() ) { if( v.constructor == Number ) { v = new vec2( v ) } v0.set( this.x / v.x, this.y / v.y ); return v0; }
    abs ( v0 = new vec2() ) { v0.set( Math.abs( this.x ), Math.abs( this.y ) ); return v0; }
    dot ( v: vec2 ) { return this.x * v.x + this.y * v.y; }
    len2 () { return this.dot( this ) }
    len () { return Math.sqrt( this.len2() ); }
    nrm ( v0 = new vec2() ) { v0.set( this.x, this.y ); return v0.mul( 1.0 / this.len(), v0 ); }
    dst ( v: vec2 ) { return v.sub( this ).len(); }
    clp ( min: number, max: number, v0 = new vec2() ) { v0.set( LX.clamp( this.x, min, max ), LX.clamp( this.y, min, max ) ); return v0; }

    fromArray ( array: number[] ) { this.x = array[ 0 ]; this.y = array[ 1 ]; }
    toArray () { return this.xy }
};