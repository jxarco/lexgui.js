// CanvasMap2D.js @jxarco

import { LX } from './../core/Namespace';
import { vec2 } from './../core/Vec2';

// Based on LGraphMap2D from @tamats (jagenjo)
// https://github.com/jagenjo/litescene.js
export class CanvasMap2D
{
    static COLORS = [ [ 255, 0, 0 ], [ 0, 255, 0 ], [ 0, 0, 255 ], [ 0, 128, 128 ], [ 128, 0, 128 ], [ 128, 128, 0 ], [
        255,
        128,
        0
    ], [ 255, 0, 128 ], [ 0, 128, 255 ], [ 128, 0, 255 ] ];
    static GRID_SIZE = 64;

    /**
     * @constructor Map2D
     * @param {Array} initialPoints
     * @param {Function} callback
     * @param {Object} options
     * circular
     * showNames
     * size
     */

    canvas: HTMLCanvasElement;
    imageCanvas: HTMLCanvasElement | null = null;
    root: any;
    circular: boolean;
    showNames: boolean;
    size: number[];
    points: any[];
    callback: any;
    weights: number[] = [];
    weightsObj: any = {};
    currentPosition: vec2 = new vec2( 0.0, 0.0 );
    circleCenter: number[] = [ 0, 0 ];
    circleRadius: number = 1;
    margin: number = 8;
    dragging: boolean = false;

    _valuesChanged: boolean = true;
    _selectedPoint: any = null;
    _precomputedWeightsGridSize: number = 0;
    _precomputedWeights: Float32Array | null = null;

    constructor( initialPoints: any, callback: any, options: any = {} )
    {
        this.circular = options.circular ?? false;
        this.showNames = options.showNames ?? true;
        this.size = options.size ?? [ 200, 200 ];

        this.points = initialPoints ?? [];
        this.callback = callback;

        this._valuesChanged = true;
        this._selectedPoint = null;

        this.root = LX.makeContainer( [ 'auto', 'auto' ] );
        this.root.tabIndex = '1';

        this.root.addEventListener( 'mousedown', innerMouseDown );

        const that = this;

        function innerMouseDown( e: MouseEvent )
        {
            var doc = that.root.ownerDocument;
            doc.addEventListener( 'mouseup', innerMouseUp );
            doc.addEventListener( 'mousemove', innerMouseMove );
            e.stopPropagation();
            e.preventDefault();

            that.dragging = true;
            return true;
        }

        function innerMouseMove( e: MouseEvent )
        {
            if ( !that.dragging )
            {
                return;
            }

            const margin = that.margin;
            const rect = that.root.getBoundingClientRect();

            let pos = new vec2();
            pos.set( e.x - rect.x - that.size[0] * 0.5, e.y - rect.y - that.size[1] * 0.5 );
            var cpos = that.currentPosition;
            cpos.set(
                LX.clamp( pos.x / ( that.size[0] * 0.5 - margin ), -1, 1 ),
                LX.clamp( pos.y / ( that.size[1] * 0.5 - margin ), -1, 1 )
            );

            if ( that.circular )
            {
                const center = new vec2( 0, 0 );
                const dist = cpos.dst( center );
                if ( dist > 1 )
                {
                    cpos = cpos.nrm();
                }
            }

            that.renderToCanvas( that.canvas.getContext( '2d', { willReadFrequently: true } ) );

            that.computeWeights( cpos );

            if ( that.callback )
            {
                that.callback( that.weightsObj, that.weights, cpos );
            }

            return true;
        }

        function innerMouseUp( e: MouseEvent )
        {
            that.dragging = false;

            var doc = that.root.ownerDocument;
            doc.removeEventListener( 'mouseup', innerMouseUp );
            doc.removeEventListener( 'mousemove', innerMouseMove );
        }

        this.canvas = document.createElement( 'canvas' );
        this.canvas.width = this.size[0];
        this.canvas.height = this.size[1];
        this.root.appendChild( this.canvas );

        const ctx = this.canvas.getContext( '2d', { willReadFrequently: true } );
        this.renderToCanvas( ctx );
    }

    /**
     * @method computeWeights
     * @param {vec2} p
     * @description Iterate for every cell to see if our point is nearer to the cell than the nearest point of the cell,
     * If that is the case we increase the weight of the nearest point. At the end we normalize the weights of the points by the number of near points
     * and that give us the weight for every point
     */

    computeWeights( p: vec2 )
    {
        if ( !this.points.length )
        {
            return;
        }

        let values = this._precomputedWeights;
        if ( !values || this._valuesChanged )
        {
            values = this.precomputeWeights();
        }

        let weights = this.weights;
        weights.length = this.points.length;
        for ( var i = 0; i < weights.length; ++i )
        {
            weights[i] = 0;
        }

        const gridSize = CanvasMap2D.GRID_SIZE;

        let totalInside = 0;
        let pos2 = new vec2();

        for ( var y = 0; y < gridSize; ++y )
        {
            for ( var x = 0; x < gridSize; ++x )
            {
                pos2.set( ( x / gridSize ) * 2 - 1, ( y / gridSize ) * 2 - 1 );

                var dataPos = x * 2 + y * gridSize * 2;
                var pointIdx = values[dataPos];

                var isInside = p.dst( pos2 ) < ( values[dataPos + 1] + 0.001 ); // epsilon
                if ( isInside )
                {
                    weights[pointIdx] += 1;
                    totalInside++;
                }
            }
        }

        for ( var i = 0; i < weights.length; ++i )
        {
            weights[i] /= totalInside;
            this.weightsObj[this.points[i].name] = weights[i];
        }

        return weights;
    }

    /**
     * @method precomputeWeights
     * @description Precompute for every cell, which is the closest point of the points set and how far it is from the center of the cell
     * We store point index and distance in this._precomputedWeights. This is done only when the points set change
     */

    precomputeWeights()
    {
        this._valuesChanged = false;

        const numPoints = this.points.length;
        const gridSize = CanvasMap2D.GRID_SIZE;
        const totalNums = 2 * gridSize * gridSize;

        let position = new vec2();

        if ( !this._precomputedWeights || this._precomputedWeights.length != totalNums )
        {
            this._precomputedWeights = new Float32Array( totalNums );
        }

        let values = this._precomputedWeights;
        this._precomputedWeightsGridSize = gridSize;

        for ( let y = 0; y < gridSize; ++y )
        {
            for ( let x = 0; x < gridSize; ++x )
            {
                let nearest = -1;
                let minDistance = 100000;

                for ( let i = 0; i < numPoints; ++i )
                {
                    position.set( ( x / gridSize ) * 2 - 1, ( y / gridSize ) * 2 - 1 );

                    let pointPosition = new vec2();
                    pointPosition.fromArray( this.points[i].pos );
                    let dist = position.dst( pointPosition );
                    if ( dist > minDistance )
                    {
                        continue;
                    }

                    nearest = i;
                    minDistance = dist;
                }

                values[x * 2 + y * 2 * gridSize] = nearest;
                values[x * 2 + y * 2 * gridSize + 1] = minDistance;
            }
        }

        return values;
    }

    /**
     * @method precomputeWeightsToImage
     * @param {vec2} p
     */

    precomputeWeightsToImage( p: vec2 )
    {
        if ( !this.points.length )
        {
            return null;
        }

        const gridSize = CanvasMap2D.GRID_SIZE;
        var values = this._precomputedWeights;
        if ( !values || this._valuesChanged || this._precomputedWeightsGridSize != gridSize )
        {
            values = this.precomputeWeights();
        }

        var canvas = this.imageCanvas;
        if ( !canvas )
        {
            canvas = this.imageCanvas = document.createElement( 'canvas' );
        }

        canvas.width = canvas.height = gridSize;
        var ctx = canvas.getContext( '2d', { willReadFrequently: true } );
        if ( !ctx )
        {
            return;
        }

        var weights = this.weights;
        weights.length = this.points.length;
        for ( var i = 0; i < weights.length; ++i )
        {
            weights[i] = 0;
        }

        let totalInside = 0;
        let pixels = ctx.getImageData( 0, 0, gridSize, gridSize );
        let pos2 = new vec2();

        for ( var y = 0; y < gridSize; ++y )
        {
            for ( var x = 0; x < gridSize; ++x )
            {
                pos2.set( ( x / gridSize ) * 2 - 1, ( y / gridSize ) * 2 - 1 );

                const pixelPos = x * 4 + y * gridSize * 4;
                const dataPos = x * 2 + y * gridSize * 2;
                const pointIdx = values[dataPos];
                const c = CanvasMap2D.COLORS[pointIdx % CanvasMap2D.COLORS.length];

                var isInside = p.dst( pos2 ) < ( values[dataPos + 1] + 0.001 );
                if ( isInside )
                {
                    weights[pointIdx] += 1;
                    totalInside++;
                }

                pixels.data[pixelPos] = c[0] + ( isInside ? 128 : 0 );
                pixels.data[pixelPos + 1] = c[1] + ( isInside ? 128 : 0 );
                pixels.data[pixelPos + 2] = c[2] + ( isInside ? 128 : 0 );
                pixels.data[pixelPos + 3] = 255;
            }
        }

        for ( let i = 0; i < weights.length; ++i )
        {
            weights[i] /= totalInside;
        }

        ctx.putImageData( pixels, 0, 0 );
        return canvas;
    }

    addPoint( name: string, pos: number[] | null = null )
    {
        if ( this.findPoint( name ) )
        {
            console.warn( 'CanvasMap2D.addPoint: There is already a point with that name' );
            return;
        }

        if ( !pos )
        {
            pos = [ this.currentPosition.x, this.currentPosition.y ];
        }

        pos[0] = LX.clamp( pos[0], -1, 1 );
        pos[1] = LX.clamp( pos[1], -1, 1 );

        const point = { name, pos };
        this.points.push( point );
        this._valuesChanged = true;
        return point;
    }

    removePoint( name: string )
    {
        const removeIdx = this.points.findIndex( ( p ) => p.name == name );
        if ( removeIdx > -1 )
        {
            this.points.splice( removeIdx, 1 );
            this._valuesChanged = true;
        }
    }

    findPoint( name: string )
    {
        return this.points.find( ( p ) => p.name == name );
    }

    clear()
    {
        this.points.length = 0;
        this._precomputedWeights = null;
        this._selectedPoint = null;
    }

    renderToCanvas( ctx: CanvasRenderingContext2D | null )
    {
        if ( !ctx )
        {
            return;
        }

        const margin = this.margin;
        const w = this.size[0];
        const h = this.size[1];

        ctx.fillStyle = 'black';
        ctx.strokeStyle = '#BBB';

        ctx.clearRect( 0, 0, w, h );

        if ( this.circular )
        {
            this.circleCenter[0] = w * 0.5;
            this.circleCenter[1] = h * 0.5;
            this.circleRadius = h * 0.5 - margin;

            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc( this.circleCenter[0], this.circleCenter[1], this.circleRadius, 0, Math.PI * 2 );
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo( this.circleCenter[0] + 0.5, this.circleCenter[1] - this.circleRadius );
            ctx.lineTo( this.circleCenter[0] + 0.5, this.circleCenter[1] + this.circleRadius );
            ctx.moveTo( this.circleCenter[0] - this.circleRadius, this.circleCenter[1] );
            ctx.lineTo( this.circleCenter[0] + this.circleRadius, this.circleCenter[1] );
            ctx.stroke();
        }
        else
        {
            ctx.fillRect( margin, margin, w - margin * 2, h - margin * 2 );
            ctx.strokeRect( margin, margin, w - margin * 2, h - margin * 2 );
        }

        var image = this.precomputeWeightsToImage( this.currentPosition );
        if ( image )
        {
            ctx.globalAlpha = 0.5;
            ctx.imageSmoothingEnabled = false;
            if ( this.circular )
            {
                ctx.save();
                ctx.beginPath();
                ctx.arc( this.circleCenter[0], this.circleCenter[1], this.circleRadius, 0, Math.PI * 2 );
                ctx.clip();
                ctx.drawImage( image, this.circleCenter[0] - this.circleRadius,
                    this.circleCenter[1] - this.circleRadius, this.circleRadius * 2, this.circleRadius * 2 );
                ctx.restore();
            }
            else
            {
                ctx.drawImage( image, margin, margin, w - margin * 2, h - margin * 2 );
            }
            ctx.imageSmoothingEnabled = true;
            ctx.globalAlpha = 1;
        }

        for ( let i = 0; i < this.points.length; ++i )
        {
            const point = this.points[i];
            let x = point.pos[0] * 0.5 + 0.5;
            let y = point.pos[1] * 0.5 + 0.5;
            x = x * ( w - margin * 2 ) + margin;
            y = y * ( h - margin * 2 ) + margin;
            x = LX.clamp( x, margin, w - margin );
            y = LX.clamp( y, margin, h - margin );
            ctx.fillStyle = ( point == this._selectedPoint ) ? '#CDF' : '#BCD';
            ctx.beginPath();
            ctx.arc( x, y, 3, 0, Math.PI * 2 );
            ctx.fill();
            if ( this.showNames )
            {
                ctx.fillText( point.name, x + 5, y + 5 );
            }
        }

        ctx.fillStyle = 'white';
        ctx.beginPath();
        var x = this.currentPosition.x * 0.5 + 0.5;
        var y = this.currentPosition.y * 0.5 + 0.5;
        x = x * ( w - margin * 2 ) + margin;
        y = y * ( h - margin * 2 ) + margin;
        x = LX.clamp( x, margin, w - margin );
        y = LX.clamp( y, margin, h - margin );
        ctx.arc( x, y, 4, 0, Math.PI * 2 );
        ctx.fill();
    }
}

LX.CanvasMap2D = CanvasMap2D;
