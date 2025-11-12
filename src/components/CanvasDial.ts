// CanvasDial.ts @jxarco

import { LX } from './../core/Namespace';

/**
 * @class CanvasDial
 * @description A canvas-based dial, used internally by the Dial component.
 */

class CanvasDial {

    element: any;
    canvas: HTMLCanvasElement;

    constructor( value: any[], options: any = {} )
    {
        let element: any = document.createElement( "div" );
        element.className = "dial " + ( options.className ? options.className : "" );
        element.style.width = element.style.height = options.size || "100%";
        element.style.minWidth = element.style.minHeight = "50px";

        element.bgcolor = options.bgColor || LX.getThemeColor( "global-dark-background" );
        element.pointscolor = options.pointsColor || LX.getThemeColor( "global-color-accent-light" );
        element.linecolor = options.lineColor || "#555";
        element.value = value || [];
        element.xrange = options.xrange || [ 0, 1 ]; // min, max
        element.yrange = options.yrange || [ 0, 1 ]; // min, max
        element.defaulty = options.defaulty != null ? options.defaulty : 0.0;
        element.no_overlap = options.noOverlap || false;
        element.show_samples = options.showSamples || 0;
        element.allow_add_values = options.allowAddValues ?? true;
        element.draggable_x = options.draggableX ?? true;
        element.draggable_y = options.draggableY ?? true;
        element.smooth = (options.smooth && typeof( options.smooth ) == 'number' ? options.smooth : 0.3) || false;
        element.move_out = options.moveOutAction ?? LX.CURVE_MOVEOUT_DELETE;

        this.element = element;

        let canvas = document.createElement( "canvas" );
        canvas.width = canvas.height = options.size || 200;
        element.appendChild( canvas );
        this.canvas = canvas;

        element.addEventListener( "mousedown", onmousedown );

        element.getValueAt = function( x: number )
        {
            if( x < element.xrange[ 0 ] || x > element.xrange[ 1 ] )
            {
                return element.defaulty;
            }

            var last = [ element.xrange[ 0 ], element.defaulty ];
            var f = 0;
            for( var i = 0; i < element.value.length; i += 1 )
            {
                var v = element.value[ i ];
                if( x == v[ 0 ] ) return v[ 1 ];
                if( x < v[ 0 ] )
                {
                    f = ( x - last[ 0 ] ) / (v[ 0 ] - last[ 0 ]);
                    return last[ 1 ] * ( 1 - f ) + v[ 1 ] * f;
                }

                last = v;
            }

            v = [ element.xrange[ 1 ], element.defaulty ];
            f = (x - last[ 0 ]) / (v[ 0 ] - last[ 0 ]);
            return last[ 1 ] * ( 1 - f ) + v[ 1 ] * f;
        }

        element.resample = function( samples: number )
        {
            var r = [];
            var dx = (element.xrange[ 1 ] - element.xrange[ 0 ]) / samples;
            for( var i = element.xrange[ 0 ]; i <= element.xrange[ 1 ]; i += dx)
            {
                r.push( element.getValueAt(i) );
            }
            return r;
        }

        element.addValue = function( v: number[] )
        {
            for( var i = 0; i < element.value; i++ )
            {
                var value = element.value[ i ];
                if(value[ 0 ] < v[ 0 ]) continue;
                element.value.splice( i, 0, v );
                this.redraw();
                return;
            }

            element.value.push( v );
            this.redraw();
        }

        // Value to canvas
        function convert( v : number[] )
        {
            return [ canvas.width * ( v[ 0 ] - element.xrange[ 0 ])/ (element.xrange[ 1 ]),
                canvas.height * (v[ 1 ] - element.yrange[ 0 ])/ (element.yrange[ 1 ])];
        }

        // Canvas to value
        function unconvert( v: number[] )
        {
            return [ ( v[ 0 ] * element.xrange[ 1 ] / canvas.width + element.xrange[ 0 ]),
                    ( v[ 1 ] * element.yrange[ 1 ] / canvas.height + element.yrange[ 0 ]) ];
        }

        var selected = -1;

        element.redraw = function( o: any = {} )
        {
            if( o.value ) element.value = o.value;
            if( o.xrange ) element.xrange = o.xrange;
            if( o.yrange ) element.yrange = o.yrange;
            if( o.smooth ) element.smooth = o.smooth;

            var ctx: CanvasRenderingContext2D | null = canvas.getContext( "2d" );
            if( !ctx ) return;

            ctx.setTransform( 1, 0, 0, 1, 0, 0 );
            ctx.translate( 0, canvas.height );
            ctx.scale( 1, -1 );

            ctx.fillStyle = element.bgcolor;
            ctx.fillRect(0,0,canvas.width,canvas.height);

            ctx.strokeStyle = element.linecolor;
            ctx.beginPath();

            //draw line
            var pos = convert([ element.xrange[ 0 ],element.defaulty ]);
            ctx.moveTo( pos[ 0 ], pos[ 1 ] );
            let values = [pos[ 0 ], pos[ 1 ]];

            for( var i in element.value)
            {
                var value: number[] = element.value[ i ];
                pos = convert( value );
                values.push( pos[ 0 ] );
                values.push( pos[ 1 ] );
            }

            pos = convert([ element.xrange[ 1 ], element.defaulty ]);
            values.push( pos[ 0 ] );
            values.push( pos[ 1 ] );

            // Draw points
            const center =  [0,0];
            pos = convert(center)
            ctx.fillStyle = "gray";
            ctx.beginPath();
            ctx.arc( pos[ 0 ], pos[ 1 ], 3, 0, Math.PI * 2);
            ctx.fill();

            for( var idx = 0; idx < element.value.length; idx += 1 )
            {
                var value: number[] = element.value[ idx ];
                pos = convert( value );
                const selectedIndex = ( idx == selected );
                if( selectedIndex )
                {
                    ctx.fillStyle = "white";
                }
                else
                {
                    ctx.fillStyle = element.pointscolor;
                }
                ctx.beginPath();
                ctx.arc( pos[ 0 ], pos[ 1 ], selectedIndex ? 4 : 3, 0, Math.PI * 2);
                ctx.fill();
            }

            if( element.show_samples )
            {
                var samples = element.resample(element.show_samples);
                ctx.fillStyle = "#888";
                for( var idx = 0; idx < samples.length; idx += 1)
                {
                    var value: number[] = [ idx * ((element.xrange[ 1 ] - element.xrange[ 0 ]) / element.show_samples) + element.xrange[ 0 ], samples[ idx ] ];
                    pos = convert(value);
                    ctx.beginPath();
                    ctx.arc( pos[ 0 ], pos[ 1 ], 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        var last_mouse = [ 0, 0 ];

        function onmousedown( e: MouseEvent )
        {
            document.addEventListener( "mousemove", onmousemove );
            document.addEventListener( "mouseup", onmouseup );

            var rect = canvas.getBoundingClientRect();
            var mousex = e.clientX - rect.left;
            var mousey = e.clientY - rect.top;

            selected = computeSelected( mousex, canvas.height - mousey );

            if( e.button == LX.MOUSE_LEFT_CLICK && selected == -1 && element.allow_add_values )
            {
                var v = unconvert([ mousex, canvas.height - mousey ]);
                element.value.push( v );
                sortValues();
                selected = element.value.indexOf( v );
            }

            last_mouse = [ mousex, mousey ];
            element.redraw();
            e.preventDefault();
            e.stopPropagation();
        }

        function onmousemove( e: MouseEvent )
        {
            var rect = canvas.getBoundingClientRect();
            var mousex = e.clientX - rect.left;
            var mousey = e.clientY - rect.top;

            if( mousex < 0 ) mousex = 0;
            else if( mousex > canvas.width ) mousex = canvas.width;
            if( mousey < 0 ) mousey = 0;
            else if( mousey > canvas.height ) mousey = canvas.height;

            // Dragging to remove
            const currentMouseDiff = [ e.clientX - rect.left, e.clientY - rect.top ];
            if( selected != -1 && distance( currentMouseDiff, [ mousex, mousey ] ) > canvas.height * 0.5 )
            {
                if( element.move_out == LX.CURVE_MOVEOUT_DELETE)
                {
                    element.value.splice( selected, 1 );
                }
                else
                {
                    const d = [ currentMouseDiff[ 0 ] - mousex, currentMouseDiff[ 1 ] - mousey ];
                    let value = element.value[ selected ];
                    value[ 0 ] = ( d[ 0 ] == 0.0 ) ? value[ 0 ] : ( d[ 0 ] < 0.0 ? element.xrange[ 0 ] : element.xrange[ 1 ] );
                    value[ 1 ] = ( d[ 1 ] == 0.0 ) ? value[ 1 ] : ( d[ 1 ] < 0.0 ? element.yrange[ 1 ] : element.yrange[ 0 ] );
                }

                onmouseup( e );
                return;
            }

            var dx = element.draggable_x ? last_mouse[ 0 ] - mousex : 0;
            var dy = element.draggable_y ? last_mouse[ 1 ] - mousey : 0;
            var delta = unconvert( [ -dx, dy ] );

            if( selected != -1 )
            {
                var minx = element.xrange[ 0 ];
                var maxx = element.xrange[ 1 ];

                if( element.no_overlap )
                {
                    if( selected > 0) minx = element.value[ selected - 1 ][ 0 ];
                    if( selected < ( element.value.length - 1 ) ) maxx = element.value[ selected + 1 ][ 0 ];
                }

                var v = element.value[selected];
                v[ 0 ] += delta[ 0 ];
                v[ 1 ] += delta[ 1 ];
                if(v[ 0 ] < minx) v[ 0 ] = minx;
                else if(v[ 0 ] > maxx) v[ 0 ] = maxx;
                if(v[ 1 ] < element.yrange[ 0 ]) v[ 1 ] = element.yrange[ 0 ];
                else if(v[ 1 ] > element.yrange[ 1 ]) v[ 1 ] = element.yrange[ 1 ];
            }

            sortValues();
            element.redraw();
            last_mouse[ 0 ] = mousex;
            last_mouse[ 1 ] = mousey;
            onchange( e );

            e.preventDefault();
            e.stopPropagation();
        }

        function onmouseup( e: MouseEvent )
        {
            selected = -1;
            element.redraw();
            document.removeEventListener("mousemove", onmousemove);
            document.removeEventListener("mouseup", onmouseup);
            onchange(e);
            e.preventDefault();
            e.stopPropagation();
        }

        function onchange( e: MouseEvent )
        {
            if( options.callback )
            {
                options.callback.call( element, element.value, e );
            }
        }

        function distance( a: number[], b: number[] ) { return Math.sqrt( Math.pow( b[ 0 ] - a[ 0 ], 2 ) + Math.pow( b[ 1 ] - a[ 1 ], 2 ) ); };

        function computeSelected( x: number, y: number )
        {
            var minDistance = 100000;
            var maxDistance = 8; //pixels
            var selected = -1;
            for( var i = 0; i < element.value.length; i++ )
            {
                var value = element.value[ i ];
                var pos = convert( value );
                var dist = distance( [ x, y ], pos );
                if( dist < minDistance && dist < maxDistance )
                {
                    minDistance = dist;
                    selected = i;
                }
            }
            return selected;
        }

        function sortValues()
        {
            var v = null;
            if( selected != -1 )
            {
                v = element.value[ selected ];
            }
            element.value.sort( function( a: number[], b: number[] ) { return a[ 0 ] - b[ 0 ]; });
            if( v )
            {
                selected = element.value.indexOf( v );
            }
        }

        element.redraw();
        return this;
    }

    redraw( options: any = {} )
    {
        this.element.redraw( options );
    }
}

LX.CanvasDial = CanvasDial;

export { CanvasDial };