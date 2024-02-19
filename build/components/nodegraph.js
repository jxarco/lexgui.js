import { LX } from 'lexgui';

if(!LX) {
    throw("lexgui.js missing!");
}

LX.components.push( 'Graph' );

function flushCss(element) {
    // By reading the offsetHeight property, we are forcing
    // the browser to flush the pending CSS changes (which it
    // does to ensure the value obtained is accurate).
    element.offsetHeight;
}

function swapElements (obj, a, b) {
    [obj[a], obj[b]] = [obj[b], obj[a]];
}

function swapArrayElements (array, id0, id1) {
    [array[id0], array[id1]] = [array[id1], array[id0]];
};

function sliceChar(str, idx) {
    return str.substr(0, idx) + str.substr(idx + 1);
}

function firstNonspaceIndex(str) {
    return str.search(/\S|$/);
}

let ASYNC_ENABLED = true;

function doAsync( fn, ms ) {
    if( ASYNC_ENABLED )
        setTimeout( fn, ms ?? 0 );
    else
        fn();
}

/**
 * @class GraphRenderer
 */

class GraphRenderer {

    static __instances  = [];

    static MIN_SCALE    = 0.25;
    static MAX_SCALE    = 1.5;

    // Node Drawing
    static NODE_TITLE_HEIGHT    = 24;
    static NODE_ROW_HEIGHT      = 16;

    static NODE_SHAPE_RADIUS    = 12;
    static NODE_TITLE_RADIUS    = [ GraphRenderer.NODE_SHAPE_RADIUS, GraphRenderer.NODE_SHAPE_RADIUS, 0, 0 ];
    static NODE_BODY_RADIUS     = [ GraphRenderer.NODE_SHAPE_RADIUS, GraphRenderer.NODE_SHAPE_RADIUS, GraphRenderer.NODE_SHAPE_RADIUS, GraphRenderer.NODE_SHAPE_RADIUS ];

    static DEFAULT_NODE_TITLE_COLOR     = "#4a59b0";
    static DEFAULT_NODE_BODY_COLOR      = "#111";

    /**
     * @param {*} options
     * 
     */

    constructor( area, options = {} ) {

        GraphRenderer.__instances.push( this );

        this.base_area = area;
        this.area = new LX.Area( { className: "lexgraph" } );

        area.root.classList.add( 'grapharea' );

        this.root = this.area.root;
        area.attach( this.root );

        // Bind resize

        area.onresize = ( bb ) => {
            
        };

        this.root.addEventListener( 'keydown', this._processKey.bind( this ), true );
        this.root.addEventListener( 'mousedown', this._processMouse.bind( this ) );
        this.root.addEventListener( 'mouseup', this._processMouse.bind( this ) );
        this.root.addEventListener( 'mousemove', this._processMouse.bind( this ) );
        this.root.addEventListener( 'mousewheel', this._processMouse.bind(this) );
        this.root.addEventListener( 'click', this._processMouse.bind( this ) );
        this.root.addEventListener( 'contextmenu', this._processMouse.bind( this ) );
        this.root.addEventListener( 'focus', this._processFocus.bind( this, true) );
        this.root.addEventListener( 'focusout', this._processFocus.bind( this, false ) );

        this._lastMousePosition = new LX.vec2( 0, 0 );

        // Back pattern
        
        const f = 30.0;
        this._patternPosition = new LX.vec2( 0, 0 );
        this._patternSize = new LX.vec2( f );
        this._circlePatternSize = f * 0.03;
        this._circlePatternColor = '#71717a';

        this._generatePattern();

        // Renderer state

        this._scale = 1.0;

        // requestAnimationFrame( this.frame.bind(this) );
    }

    static getInstances()
    {
        return GraphRenderer.__instances;
    }

    _processFocus( active ) {

        this.isFocused = active;
    }

    _processKey( e ) {

        var key = e.key ?? e.detail.key;
        console.log( key );
    }

    _processMouse( e ) {

        const rect = this.root.getBoundingClientRect();
        
        this._mousePosition = new LX.vec2( e.clientX - rect.x , e.clientY - rect.y );
        // this._deltaMousePosition = this._mousePosition.sub( this._lastMousePosition );

        if( e.type == 'mousedown' )
        {
            this.lastMouseDown = LX.getTime();
        }
        
        else if( e.type == 'mouseup' )
        {
            if( (LX.getTime() - this.lastMouseDown) < 120 ) {
                this._processClick( e );
            }
        }

        else if( e.type == 'mousemove' )
        {
            this._processMouseMove( e );
        }

        else if ( e.type == 'click' ) // trip
        {
            switch( e.detail )
            {
                case LX.MOUSE_DOUBLE_CLICK:
                    break;
                case LX.MOUSE_TRIPLE_CLICK:
                    break;
            }
        }

        else if ( e.type == 'mousewheel' ) {
            e.preventDefault();
            this._processWheel( e );
        }

        else if ( e.type == 'contextmenu' ) {

            e.preventDefault();
            
            if( (LX.getTime() - this.lastMouseDown) < 120 ) {
                this._processContextMenu( e );
            }
        }

        this._lastMousePosition = this._mousePosition;
    }

    _processClick( e ) {

        
    }

    _processMouseMove( e ) {

        const rightPressed = ( e.which == 3 );
        
        if( rightPressed )
        {
            this._updatePattern();

            e.stopPropagation();
            e.stopImmediatePropagation();
        }
    }

    _processWheel( e ) {

        const delta = e.deltaY;

        if( delta > 0.0 ) this._scale *= 0.95;
        else this._scale *= 1.05;

        this._scale = LX.UTILS.clamp( this._scale, GraphRenderer.MIN_SCALE, GraphRenderer.MAX_SCALE );

        this._updatePattern();
    }

    _processContextMenu( e ) {
        
        LX.addContextMenu( "Test", e, m => {
            m.add( "option 1", () => { } );
            m.add( "option 2", () => { } );
        });
    }

    /**
     * @method setGraph
     * @param {Graph} graph:
     */

    setGraph( graph ) {

        this.graph = graph;
    }

    /**
     * @method clear
     */

    clear(  ) {

    }

    /**
     * @method frame
     */

    frame() {

        this.update();

        this.draw();

        requestAnimationFrame( this.frame.bind(this) );
    }

    /**
     * @method update
     */

    update() {
        
        console.log("Update");
    }

    /**
     * @method draw
     */

    draw() {

        console.log("Draw");

        let nodes = this._getVisibleNodes();

        for( let node of nodes )
        {
            this._drawNode( node );
        }
    }

    _generatePattern() {

        // Generate pattern
        {
            var pattern = document.createElementNS( 'http://www.w3.org/2000/svg', 'pattern' );
            pattern.setAttribute( 'id', 'pattern-0' );
            pattern.setAttribute( 'x', this._patternPosition.x );
            pattern.setAttribute( 'y', this._patternPosition.y );
            pattern.setAttribute( 'width', this._patternSize.x )
            pattern.setAttribute( 'height', this._patternSize.y );
            pattern.setAttribute( 'patternUnits', 'userSpaceOnUse' );

            var circle = document.createElementNS( 'http://www.w3.org/2000/svg', 'circle' );
            circle.setAttribute( 'cx', this._circlePatternSize );
            circle.setAttribute( 'cy', this._circlePatternSize );
            circle.setAttribute( 'r', this._circlePatternSize );
            circle.setAttribute( 'fill', this._circlePatternColor );

            pattern.appendChild( circle );
        }
        
        var svg = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
        svg.classList.add( "background-svg" );
        svg.style.width = "100%";
        svg.style.height = "100%";

        svg.appendChild( pattern );

        var rect = document.createElementNS( 'http://www.w3.org/2000/svg', 'rect' );
        rect.setAttribute( 'x', '0' );
        rect.setAttribute( 'y', '0' );
        rect.setAttribute( 'width', '100%' );
        rect.setAttribute( 'height', '100%' );
        rect.setAttribute( 'fill', 'url(#pattern-0)' );

        svg.appendChild( rect );

        this._background = svg;

        this.root.appendChild( this._background );
    }

    _updatePattern() {

        if( !this._background )
            return;

        const patternSize = this._patternSize.mul( this._scale );
        const circlePatternSize = this._circlePatternSize * this._scale;
        
        const deltaPosition = this._patternPosition.sub( this._mousePosition );
        this._patternPosition = this._patternPosition.sub( deltaPosition );

        let pattern = this._background.querySelector( 'pattern' );
        pattern.setAttribute( 'x', this._patternPosition.x );
        pattern.setAttribute( 'y', this._patternPosition.y );
        pattern.setAttribute( 'width', patternSize.x )
        pattern.setAttribute( 'height', patternSize.y );

        var circle = this._background.querySelector( 'circle' );
        circle.setAttribute( 'cx', circlePatternSize );
        circle.setAttribute( 'cy', circlePatternSize );
        circle.setAttribute( 'r', circlePatternSize );
    }

    _computeNodeSize( node ) {

        const ctx = this.dom.getContext("2d");
        var textMetrics = ctx.measureText( node.name );

        let sX = 32 + textMetrics.width * 1.475;

        const rows = Math.max(1,  Math.max(node.inputs.length, node.outputs.length));
        let sY = rows * GraphRenderer.NODE_ROW_HEIGHT + GraphRenderer.NODE_TITLE_HEIGHT;

        return [sX, sY];
    }

    _drawConnections() {

        console.log( "_drawConnections" );

        const ctx = this.dom.getContext("2d");

        let nodes = this._getVisibleNodes();

        let start = { x: 50, y: 20 };
        let cp1 = { x: 230, y: 30 };
        let cp2 = { x: 150, y: 80 };
        let end = { x: 250, y: 100 };

        // Cubic Bézier curve
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
        ctx.stroke();

        // for( let node of nodes )
        // {
        //     // Discard nodes without inputs...
        //     if (!node.inputs || !node.inputs.length) {
        //         continue;
        //     }

        //     for (let input of node.inputs) {


        //     }
        // }
    }

    _drawNode( node ) {

        
    }

    _getVisibleNodes() {

        if( !this.graph )
        {
            console.warn( "No graph set" );
            return [];
        }

        // TODO: Return the ones in the viewport
        return this.graph.nodes;
    }

}

LX.GraphRenderer = GraphRenderer;

/**
 * @class Graph
 */

class Graph {

    /**
     * @param {*} options
     * 
     */

    constructor( options = {} ) {

        // Nodes

        this.nodes = [
            new GraphNode({
                name: "Node 1",
                position: [200, 200],
                inputs: [
                    {
                        name: "Speed",
                        type: "number"
                    },
                    {
                        name: "Offset",
                        type: "number"
                    }
                ],
                outputs: [
                    {
                        name: "Speed",
                        type: "number"
                    },
                    {
                        name: "Offset",
                        type: "number"
                    },
                    {
                        name: "Loop",
                        type: "bool"
                    }
                ]
            }),
            new GraphNode({
                name: "Node 2",
                size: [120, 100],
                position: [500, 350],
                inputs: [],
                outputs: []
            })
        ];
    }
}

LX.Graph = Graph;

/**
 * @class GraphNode
 */

class GraphNode {

    /**
     * @param {*} options
     * 
     */

    constructor( options = {} ) {

        this.name = options.name ?? "Unnamed";
        this.size = options.size;
        this.position = options.position ?? [0, 0];
        
        this.inputs = options.inputs ?? [];
        this.outputs = options.outputs ?? [];
    }

    computeSize() {

        let sX = 16 + this.name.length * 10;

        const rows = Math.max(1, Math.max(this.inputs.length, this.outputs.length));
        let sY = rows * GraphRenderer.NODE_ROW_HEIGHT + GraphRenderer.NODE_TITLE_HEIGHT;

        return [sX, sY];
    }
}

LX.GraphNode = GraphNode;

export { GraphRenderer, Graph, GraphNode };