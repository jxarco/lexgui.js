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

function deleteElement( el ) {
    if( el ) el.remove();
}

let ASYNC_ENABLED = true;

function doAsync( fn, ms ) {
    if( ASYNC_ENABLED )
        setTimeout( fn, ms ?? 0 );
    else
        fn();
}

/**
 * @class GraphEditor
 */

class GraphEditor {

    static __instances  = [];

    // Editor

    static MIN_SCALE            = 0.25;
    static MAX_SCALE            = 4.0;

    static EVENT_MOUSEMOVE      = 0;
    static EVENT_MOUSEWHEEL     = 1;

    // Node Drawing

    static NODE_IO_INPUT        = 0;
    static NODE_IO_OUTPUT       = 1;

    static NODE_TITLE_HEIGHT    = 24;
    static NODE_ROW_HEIGHT      = 16;

    static NODE_SHAPE_RADIUS    = 12;
    static NODE_TITLE_RADIUS    = [ GraphEditor.NODE_SHAPE_RADIUS, GraphEditor.NODE_SHAPE_RADIUS, 0, 0 ];
    static NODE_BODY_RADIUS     = [ GraphEditor.NODE_SHAPE_RADIUS, GraphEditor.NODE_SHAPE_RADIUS, GraphEditor.NODE_SHAPE_RADIUS, GraphEditor.NODE_SHAPE_RADIUS ];

    static DEFAULT_NODE_TITLE_COLOR     = "#4a59b0";
    static DEFAULT_NODE_BODY_COLOR      = "#111";

    /**
     * @param {*} options
     * 
     */

    constructor( area, options = {} ) {

        GraphEditor.__instances.push( this );

        this.base_area = area;
        this.area = new LX.Area( { className: "lexgraph" } );

        area.root.classList.add( 'grapharea' );

        this.root = this.area.root;
        this.root.tabIndex = -1;
        area.attach( this.root );

        // Bind resize

        area.onresize = ( bb ) => {
            
        };

        this.root.addEventListener( 'keydown', this._processKey.bind( this ), true );
        this.root.addEventListener( 'mousedown', this._processMouse.bind( this ) );
        this.root.addEventListener( 'mouseup', this._processMouse.bind( this ) );
        this.root.addEventListener( 'mousemove', this._processMouse.bind( this ) );
        this.root.addEventListener( 'mousewheel', this._processMouse.bind(this) );
        this.root.addEventListener( 'mouseleave', this._processMouse.bind(this) );
        this.root.addEventListener( 'click', this._processMouse.bind( this ) );
        this.root.addEventListener( 'contextmenu', this._processMouse.bind( this ) );
        this.root.addEventListener( 'focus', this._processFocus.bind( this, true) );
        this.root.addEventListener( 'focusout', this._processFocus.bind( this, false ) );

        this._lastMousePosition = new LX.vec2( 0, 0 );

        this._undoSteps = [ ];
        this._redoSteps = [ ];

        // Back pattern
        
        const f = 15.0;
        this._patternPosition = new LX.vec2( 0, 0 );
        this._patternSize = new LX.vec2( f );
        this._circlePatternSize = f * 0.04;
        this._circlePatternColor = '#71717a9c';

        this._generatePattern();

        // Renderer state

        this._scale = 1.0;

        // Link container

        this._domLinks = document.createElement( 'div' );
        this._domLinks.classList.add( 'lexgraphlinks' );
        this.root.appendChild( this._domLinks );

        // Node container

        this._domNodes = document.createElement( 'div' );
        this._domNodes.classList.add( 'lexgraphnodes' );
        this.root.appendChild( this._domNodes );

        requestAnimationFrame( this._frame.bind(this) );
    }

    static getInstances()
    {
        return GraphEditor.__instances;
    }

    /**
     * @method setGraph
     * @param {Graph} graph:
     */

    setGraph( graph ) {

        this.graph = graph;

        if( !this.graph.nodes )
        {
            console.warn( 'Graph does not contain any node!' );
            return ;
        }

        this.nodes = { };

        for( let node of this.graph.nodes )
        {
            this._createNode( node );
        }
    }

    /**
     * @method clear
     */

    clear() {

        this._domNodes.innerHTML = "";
        this._domLinks.innerHTML = "";
    }

    /**
     * @method unSelectAll
     */

    unSelectAll() {

        this._domNodes.querySelectorAll( '.lexgraphnode' ).forEach( v => v.classList.remove( 'selected' ) );
    }

    _createNode( node ) {

        var nodeContainer = document.createElement( 'div' );
        nodeContainer.classList.add( 'lexgraphnode' );
        nodeContainer.style.left = "0";
        nodeContainer.style.top = "0";
        
        this._translateNode( nodeContainer, node.position.x, node.position.y );

        if( node.color )
        {
            nodeContainer.style.backgroundColor = node.color;
        }

        nodeContainer.addEventListener( 'mousedown', e => {

            // Only for left click..
            if( e.button != LX.MOUSE_LEFT_CLICK )
                return;

            if( !nodeContainer.classList.contains( 'selected' ) )
            {
                this._selectNode( nodeContainer, e.shiftKey );
            }
        } );

        // Title header
        var nodeHeader = document.createElement( 'div' );
        nodeHeader.classList.add( 'lexgraphnodeheader' );
        nodeHeader.innerText = node.name;
        nodeContainer.appendChild( nodeHeader );

        // Inputs and outputs
        var nodeIO = document.createElement( 'div' );
        nodeIO.classList.add( 'lexgraphnodeios' );
        nodeContainer.appendChild( nodeIO );

        const hasInputs = node.inputs && node.inputs.length;
        const hasOutputs = node.outputs && node.outputs.length;

        // Inputs
        {
            var nodeInputs = null;

            if( node.inputs && node.inputs.length )
            {
                nodeInputs = document.createElement( 'div' );
                nodeInputs.classList.add( 'lexgraphnodeinputs' );
                nodeInputs.style.width = hasOutputs ? "50%" : "100%";
                nodeIO.appendChild( nodeInputs );
            }

            for( let i of node.inputs )
            {
                if( !i.type )
                {
                    console.warn( `Missing type for node [${ node.name }], skipping...` );
                    continue;
                }

                var input = document.createElement( 'div' );
                input.className = 'lexgraphnodeio input';
                input.dataset[ 'index' ] = nodeInputs.childElementCount;

                var type = document.createElement( 'span' );
                type.className = 'io__type input ' + i.type;
                type.innerText = i.type[ 0 ].toUpperCase();
                input.appendChild( type );

                if( i.name )
                {
                    var name = document.createElement( 'span' );
                    name.classList.add( 'io__name' );
                    name.innerText = i.name;
                    input.appendChild( name );
                }

                nodeInputs.appendChild( input );
            }
        }

        // Outputs
        {
            var nodeOutputs = null;

            if( node.outputs && node.outputs.length )
            {
                nodeOutputs = document.createElement( 'div' );
                nodeOutputs.classList.add( 'lexgraphnodeoutputs' );
                nodeOutputs.style.width = hasInputs ? "50%" : "100%";
                nodeIO.appendChild( nodeOutputs );
            }

            for( let o of node.outputs )
            {
                if( !o.type  )
                {
                    console.warn( `Missing type for node [${ node.name }], skipping...` );
                }

                var output = document.createElement( 'div' );
                output.className = 'lexgraphnodeio output';
                output.dataset[ 'index' ] = nodeOutputs.childElementCount;

                if( o.name )
                {
                    var name = document.createElement( 'span' );
                    name.classList.add( 'io__name' );
                    name.innerText = o.name;
                    output.appendChild( name );
                }

                var type = document.createElement( 'span' );
                type.className = 'io__type output ' + o.type;
                type.innerText = o.type[ 0 ].toUpperCase();
                output.appendChild( type );

                nodeOutputs.appendChild( output );
            }
        }

        // Move nodes

        LX.makeDraggable( nodeContainer, { onMove: () => {

            const selectedNodes = Array.from( this._domNodes.childNodes ).filter( v => v.classList.contains( 'selected' ) );

            selectedNodes.forEach( el => {
                const dT = this._deltaMousePosition.div( this._scale );
                this._translateNode( el, dT.x, dT.y );
            } );

        } } );

        // Manage links

        nodeIO.querySelectorAll( '.lexgraphnodeio' ).forEach( el => {

            el.addEventListener( 'mousedown', e => {

                // Only for left click..
                if( e.button != LX.MOUSE_LEFT_CLICK )
                    return;
    
                this._generatingLink = {
                    index: parseInt( el.dataset[ 'index' ] ),
                    io: el.classList.contains( 'input' ) ? GraphEditor.NODE_IO_INPUT : GraphEditor.NODE_IO_OUTPUT,
                    domEl: nodeContainer
                };

                e.stopPropagation();
                e.stopImmediatePropagation();
            } );

        } );

        const id = LX.UTILS.uidGenerator();
        this.nodes[ id ] = node;
        nodeContainer.dataset[ 'id' ] = id;

        this._domNodes.appendChild( nodeContainer );
    }

    _selectNode( dom, multiSelection, forceOrder = true ) {

        if( !multiSelection )
            this.unSelectAll();

        dom.classList.add( 'selected' );

        if( forceOrder )
        {
            // Reorder nodes to draw on top..
            this._domNodes.appendChild( dom );
        }
    }

    _unSelectNode( dom ) {

        dom.classList.remove( 'selected' );
    }

    _translateNode( dom, x, y ) {

        dom.style.left = ( parseFloat( dom.style.left ) + x ) + "px";
        dom.style.top = ( parseFloat( dom.style.top ) + y ) + "px";
    }

    // This is in pattern space!
    _getNodePosition( dom ) {

        return new LX.vec2( parseFloat( dom.style.left ), parseFloat( dom.style.top ) );
    }

    _processFocus( active ) {

        this.isFocused = active;
    }

    _processKey( e ) {

        var key = e.key ?? e.detail.key;
        
        switch( key ) {
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                this._deleteSelection( e );
                break;
            case 'y':
                if( e.ctrlKey )
                {
                    e.preventDefault();
                    this._doRedo();
                }
                break;
            case 'z':
                if( e.ctrlKey )
                {
                    e.preventDefault();
                    this._doUndo();
                }
                break;
        }
    }

    _processMouse( e ) {

        const rect = this.root.getBoundingClientRect();
        
        this._mousePosition = new LX.vec2( e.clientX - rect.x , e.clientY - rect.y );
        this._deltaMousePosition = this._mousePosition.sub( this._lastMousePosition );

        if( e.type == 'mousedown' )
        {
            this.lastMouseDown = LX.getTime();

            this._processMouseDown( e );
        }
        
        else if( e.type == 'mouseup' )
        {
            if( (LX.getTime() - this.lastMouseDown) < 120 ) {
                this._processClick( e );
            }

            this._processMouseUp( e );
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
            
            if( (LX.getTime() - this.lastMouseDown) < 200 ) {
                this._processContextMenu( e );
            }
        }

        else if ( e.type == 'mouseleave' ) {

            if( this._generatingLink )
            {
                this._processMouseUp( e );
            }
        }

        this._lastMousePosition = this._mousePosition;
    }

    _processClick( e ) {

        if( e.target.classList.contains( 'lexgraphnodes' ) )
        {
            this._processBackgroundClick( e );
            return;
        }
    }

    _processBackgroundClick( e ) {

        this.unSelectAll();
    }

    _processMouseDown( e ) {

        // Don't box select over a node..
        if( !e.target.classList.contains( 'lexgraphnode' ) && e.button == LX.MOUSE_LEFT_CLICK )
        {
            this._boxSelecting = this._mousePosition;
        }
    }

    _processMouseUp( e ) {

        if( this._generatingLink )
        {
            // Check for IO
            if( !e.target.classList.contains( 'io__type' ) || !this._onLink( e ) )
            {
                deleteElement( this._generatingLink.svg );
            }

            delete this._generatingLink;
        }

        else if( this._boxSelecting )
        {
            if( !e.shiftKey && !e.altKey )
                this.unSelectAll();

            this._selectNodesInBox( this._boxSelecting, this._mousePosition, e.altKey );

            deleteElement( this._currentBoxSelectionSVG );

            delete this._currentBoxSelectionSVG;
            delete this._boxSelecting;
        }
    }

    _processMouseMove( e ) {

        const rightPressed = ( e.which == 3 );

        if( rightPressed )
        {
            this._patternPosition.add( this._deltaMousePosition.div( this._scale ), this._patternPosition );

            this._updatePattern();

            return;
        }

        else if( this._generatingLink )
        {
            this._drawPreviewLink( e );

            return;
        }

        else if( this._boxSelecting )
        {
            this._drawBoxSelection( e );

            return;
        }
    }

    _processWheel( e ) {

        if( this._boxSelecting )
            return;

        // Compute zoom center in pattern space using current scale

        const rect = this.root.getBoundingClientRect();
        const zoomCenter = this._mousePosition ?? new LX.vec2( rect.width * 0.5, rect.height * 0.5 );

        const center = this._getPatternPosition( zoomCenter );

        const delta = e.deltaY;

        if( delta > 0.0 ) this._scale *= 0.9;
        else this._scale *= ( 1.0 / 0.9 );

        this._scale = LX.UTILS.clamp( this._scale, GraphEditor.MIN_SCALE, GraphEditor.MAX_SCALE );

        // Compute zoom center in pattern space using new scale
        // and get delta..

        const newCenter = this._getPatternPosition( zoomCenter );

        const deltaCenter = newCenter.sub( center );

        this._patternPosition = this._patternPosition.add( deltaCenter );

        this._updatePattern( GraphEditor.EVENT_MOUSEWHEEL );
    }

    _processContextMenu( e ) {
        
        LX.addContextMenu( "Test", e, m => {
            m.add( "option 1", () => { } );
            m.add( "option 2", () => { } );
        });
    }

    /**
     * @method frame
     */

    _frame() {

        this._update();

        requestAnimationFrame( this._frame.bind(this) );
    }

    /**
     * @method update
     */

    _update() {
        
        
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
        const patternPosition = this._patternPosition.mul( this._scale );
        
        let pattern = this._background.querySelector( 'pattern' );
        pattern.setAttribute( 'x', patternPosition.x );
        pattern.setAttribute( 'y', patternPosition.y );
        pattern.setAttribute( 'width', patternSize.x )
        pattern.setAttribute( 'height', patternSize.y );

        var circle = this._background.querySelector( 'circle' );
        circle.setAttribute( 'cx', circlePatternSize );
        circle.setAttribute( 'cy', circlePatternSize );
        circle.setAttribute( 'r', circlePatternSize );

        // Nodes

        const w = this._domNodes.offsetWidth * 0.5;
        const h = this._domNodes.offsetHeight * 0.5;

        const dw = w - w * this._scale;
        const dh = h - h * this._scale;

        this._domNodes.style.transform = `
            translate(` + ( patternPosition.x - dw ) + `px, ` + ( patternPosition.y - dh ) + `px) 
            scale(` + this._scale + `)
        `;
        this._domLinks.style.transform = this._domNodes.style.transform;
    }

    _getPatternPosition( renderPosition ) {

        return renderPosition.div( this._scale ).sub( this._patternPosition );
    }

    _computeNodeSize( node ) {

        const ctx = this.dom.getContext("2d");
        var textMetrics = ctx.measureText( node.name );

        let sX = 32 + textMetrics.width * 1.475;

        const rows = Math.max(1,  Math.max(node.inputs.length, node.outputs.length));
        let sY = rows * GraphEditor.NODE_ROW_HEIGHT + GraphEditor.NODE_TITLE_HEIGHT;

        return [sX, sY];
    }

    _onLink( e ) {

        const linkData = this._generatingLink;
        const io = e.target.classList.contains( 'input' ) ? GraphEditor.NODE_IO_INPUT : GraphEditor.NODE_IO_OUTPUT;

        // Discard same IO type
        if( linkData.io == io )
            return;

        // Info about src node
        const src_nodeContainer = linkData.domEl;
        const src_nodeId = src_nodeContainer.dataset[ 'id' ];
        const src_node = this.nodes[ src_nodeId ];
        const src_ioIndex = this._generatingLink.index
        
        // Info about dst node
        const dst_nodeContainer = e.target.offsetParent;
        const dst_nodeId = dst_nodeContainer.dataset[ 'id' ];
        const dst_node = this.nodes[ dst_nodeId ];
        const dst_ioIndex = parseInt( e.target.parentElement.dataset[ 'index' ] );

        // Discard different types
        const src_ios = src_node[ linkData.io ==  GraphEditor.NODE_IO_INPUT ? 'inputs' : 'outputs' ];
        const src_ioType = src_ios[ src_ioIndex ].type;

        const dst_ios = dst_node[ io ==  GraphEditor.NODE_IO_INPUT ? 'inputs' : 'outputs' ];
        const dst_ioType = dst_ios[ dst_ioIndex ].type;

        if( src_ioType != dst_ioType )
            return;

        // Successful link..
        return true;
    }

    _drawPreviewLink( e ) {

        var svg = this._generatingLink.svg;

        if( !svg )
        {
            var svg = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
            svg.classList.add( "link-svg" );
            svg.style.width = "100%";
            svg.style.height = "100%";
            this._domLinks.appendChild( svg );
            this._generatingLink.svg = svg;
        }

        // Generate bezier curve

        const index = this._generatingLink.index;
        const type = this._generatingLink.io;
        const domEl = this._generatingLink.domEl;

        const offsetY = this.root.offsetTop;

        const ios = domEl.querySelector( type == GraphEditor.NODE_IO_INPUT ? '.lexgraphnodeinputs' : '.lexgraphnodeoutputs' );
        const startRect = ios.childNodes[ index ].querySelector( '.io__type' ).getBoundingClientRect();
        
        let startScreenPos = new LX.vec2( startRect.x, startRect.y - offsetY );
        let startPos = this._getPatternPosition( startScreenPos );
        startPos.add( new LX.vec2( 7, 7 ), startPos );
        let endPos = new LX.vec2( e.offsetX, e.offsetY );

        // Add node position, since I can't get the correct position directly from the event..
        if( e.target.classList.contains( 'lexgraphnode' ) )
        {
            endPos.add( new LX.vec2( parseFloat( e.target.style.left ), parseFloat( e.target.style.top ) ), endPos );
        }
        else if( e.target.classList.contains( 'io__type' ) )
        {
            var parent = e.target.offsetParent;
            // Add parent offset
            endPos.add( new LX.vec2( parseFloat( parent.style.left ), parseFloat( parent.style.top ) ), endPos );
            // Add own offset
            endPos.add( new LX.vec2( e.target.offsetLeft, e.target.offsetTop ), endPos );
        }

        const distanceX = LX.UTILS.clamp( Math.abs( startPos.x - endPos.x ), 0.0, 180.0 );
        const cPDistance = 128.0 * Math.pow( distanceX / 180.0, 1.5 );

        let cPoint1 = startScreenPos.add( new LX.vec2( cPDistance, 0 ) );
        cPoint1 = this._getPatternPosition( cPoint1 );
        cPoint1.add( new LX.vec2( 7, 7 ), cPoint1 );
        let cPoint2 = endPos.sub( new LX.vec2( cPDistance, 0 ) );

        svg.innerHTML = `<path fill="none" d="
            M ${ startPos.x },${ startPos.y }
            C ${ cPoint1.x },${ cPoint1.y } ${ cPoint2.x },${ cPoint2.y } ${ endPos.x },${ endPos.y }
        "/>`;
    }

    _drawBoxSelection( e ) {

        var svg = this._currentBoxSelectionSVG;

        if( !svg )
        {
            var svg = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
            svg.classList.add( "box-selection-svg" );
            svg.style.width = "100%";
            svg.style.height = "100%";
            this._domLinks.appendChild( svg );
            this._currentBoxSelectionSVG = svg;
        }

        // Generate box

        const startPos = this._getPatternPosition( this._boxSelecting );
        const size = startPos.sub( this._getPatternPosition( this._mousePosition ) );

        svg.innerHTML = `<rect
            x="${ startPos.x }" y="${ startPos.y }"
            rx="${ 6 }" ry="${ 6 }"
            width="${ Math.abs( size.x ) }" height="${ Math.abs( size.y ) }"
        "/>`;
    }

    // TODO: Return the ones in the viewport
    _getVisibleNodes() {

        if( !this.graph )
        {
            console.warn( "No graph set" );
            return [];
        }

        return this.graph.nodes;
    }

    _selectNodesInBox( lt, rb, remove ) {

        lt = this._getPatternPosition( lt );
        rb = this._getPatternPosition( rb );

        for( let nodeEl of this._domNodes.children )
        {
            let pos = this._getNodePosition( nodeEl );

            if( pos.x >= lt.x && pos.y >= lt.y 
                && pos.x <= rb.x && pos.y <= rb.y)
            {
                if( remove )
                    this._unSelectNode( nodeEl );
                else
                    this._selectNode( nodeEl, true, false );
            }
        }
    }

    _deleteSelection( e ) {

        const lastNodeCount = this._domNodes.childElementCount;

        const selectedNodes = Array.from( this._domNodes.childNodes ).filter( v => v.classList.contains( 'selected' ) );

        while( selectedNodes[ 0 ] )
        {
            const el = selectedNodes.pop();

            delete this.nodes[ el.dataset[ 'id' ] ];

            deleteElement( el );
        }

        if( this._domNodes.childElementCount != lastNodeCount )
        {
            this._addUndoStep();
        }

    }

    _addUndoStep( deleteRedo = true )  {

        if( deleteRedo ) 
        {
            // Remove all redo steps
            this._redoSteps.length = 0;
        }

        this._undoSteps.push( {
            // TODO: Add graph state
        } );
    }

    _doUndo() {

        if( !this._undoSteps.length )
            return;

        this._addRedoStep();

        // Extract info from the last state
        const step = this._undoSteps.pop();

        // Set old state
        // TODO

        console.log( "Undo!!" );
    }

    _addRedoStep()  {

        this._redoSteps.push( {
            // TODO: Add graph state
        } );
    }

    _doRedo() {

        if( !this._redoSteps.length )
            return;

        this._addUndoStep( false );

        // Extract info from the next saved code state
        const step = this._redoSteps.pop();

        // Set old state
        // TODO

        console.log( "Redo!!" );
    }

    _addGlobalActions() {

        
    }
}

LX.GraphEditor = GraphEditor;

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
                position: new LX.vec2( 200, 200 ),
                inputs: [
                    {
                        name: "Speed",
                        type: "float"
                    },
                    {
                        name: "Offset",
                        type: "vec2"
                    }
                ]
            }),
            new GraphNode({
                name: "Node 2",
                size: new LX.vec2( 120, 100 ),
                position: new LX.vec2( 500, 350 ),
                color: "#c7284c",
                inputs: [],
                outputs: [
                    {
                        name: "Speed",
                        type: "float"
                    },
                    {
                        name: "Offset",
                        type: "vec2"
                    },
                    {
                        name: "Loop",
                        type: "bool"
                    }
                ]
            }),
            new GraphNode({
                name: "Node 3",
                position: new LX.vec2( 200, 400 ),
                inputs: [
                    {
                        name: "Speed",
                        type: "float"
                    },
                    {
                        name: "Offset",
                        type: "vec2"
                    }
                ],
                outputs: [
                    {
                        name: "Speed",
                        type: "float"
                    },
                    {
                        name: "Offset",
                        type: "vec3"
                    },
                    {
                        name: "Loop",
                        type: "bool"
                    }
                ]
            }),
            new GraphNode({
                name: "Add",
                position: new LX.vec2( 300, 300 ),
                inputs: [
                    {
                        type: "float"
                    },
                    {
                        type: "float"
                    }
                ],
                outputs: [
                    {
                        type: "float"
                    }
                ]
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
        this.position = options.position ?? new LX.vec2( 0, 0 );
        this.color = options.color;
        
        this.inputs = options.inputs ?? [];
        this.outputs = options.outputs ?? [];
    }

    computeSize() {

        let sX = 16 + this.name.length * 10;

        const rows = Math.max(1, Math.max(this.inputs.length, this.outputs.length));
        let sY = rows * GraphEditor.NODE_ROW_HEIGHT + GraphEditor.NODE_TITLE_HEIGHT;

        return [sX, sY];
    }
}

LX.GraphNode = GraphNode;

export { GraphEditor, Graph, GraphNode };