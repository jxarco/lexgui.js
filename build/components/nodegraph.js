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

        // Nodes and connections

        this.nodes = { };
        this.links = { };

        this.selectedNodes = [ ];

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

        window.ge = this;

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

        this.selectedNodes.length = 0;
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
                input.className = 'lexgraphnodeio ioinput';
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
                output.className = 'lexgraphnodeio iooutput';
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

        LX.makeDraggable( nodeContainer, { onMove: this._onMoveNode.bind( this ) } );

        // Manage links

        nodeIO.querySelectorAll( '.lexgraphnodeio' ).forEach( el => {

            el.addEventListener( 'mousedown', e => {

                // Only for left click..
                if( e.button != LX.MOUSE_LEFT_CLICK )
                    return;
    
                this._generatingLink = {
                    index: parseInt( el.dataset[ 'index' ] ),
                    io: el,
                    ioType: el.classList.contains( 'ioinput' ) ? GraphEditor.NODE_IO_INPUT : GraphEditor.NODE_IO_OUTPUT,
                    domEl: nodeContainer
                };

                e.stopPropagation();
                e.stopImmediatePropagation();
            } );

        } );

        const id = node.name.toLowerCase().replaceAll( /\s/g, '-' ) + '-' + LX.UTILS.uidGenerator();
        this.nodes[ id ] = { data: node, dom: nodeContainer };
        nodeContainer.dataset[ 'id' ] = id;

        this._domNodes.appendChild( nodeContainer );
    }

    _onMoveNode( e ) {
        
        for( let nodeId of this.selectedNodes )
        {
            const el = this._getNodeDOMElement( nodeId );

            const dT = this._deltaMousePosition.div( this._scale );

            this._translateNode( el, dT.x, dT.y );

            this._updateNodeLinks( nodeId );
        }
    }

    _selectNode( dom, multiSelection, forceOrder = true ) {

        if( !multiSelection )
            this.unSelectAll();

        dom.classList.add( 'selected' );

        this.selectedNodes.push( dom.dataset[ 'id' ] );

        if( forceOrder )
        {
            // Reorder nodes to draw on top..
            this._domNodes.appendChild( dom );
        }
    }

    _unSelectNode( dom ) {

        dom.classList.remove( 'selected' );

        // Delete from selected..
        const idx = this.selectedNodes.indexOf( dom.dataset[ 'id' ] );
        this.selectedNodes.splice( idx, 1 );
    }

    _translateNode( dom, x, y ) {

        dom.style.left = ( parseFloat( dom.style.left ) + x ) + "px";
        dom.style.top = ( parseFloat( dom.style.top ) + y ) + "px";
    }

    _deleteNode( nodeId ) {

        const el = this._getNodeDOMElement( nodeId );

        console.assert( el );

        deleteElement( el );

        delete this.nodes[ nodeId ];

        // Delete connected links..
        
        for( let key in this.links )
        {
            if( !key.includes( nodeId ) )
                continue;

            deleteElement( this.links[ key ].path.parentElement );

            delete this.links[ key ];
        }
    }

    // This is in pattern space!
    _getNodePosition( dom ) {

        return new LX.vec2( parseFloat( dom.style.left ), parseFloat( dom.style.top ) );
    }

    _getNodeDOMElement( nodeId ) {

        return this.nodes[ nodeId ] ? this.nodes[ nodeId ].dom : null;
    }

    _getLinkDOMElement( nodeSrcId, nodeDstId ) {

        const str = nodeSrcId + '@' + nodeDstId;
        return this.links[ str ];
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
            this._boxSelectRemoving = e.altKey;
        }
    }

    _processMouseUp( e ) {

        if( this._generatingLink )
        {
            // Check for IO
            if( !e.target.classList.contains( 'io__type' ) || !this._onLink( e ) )
            {
                // Delete entire SVG if not a successful connection..
                deleteElement( this._generatingLink.path ? this._generatingLink.path.parentElement : null );
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
            delete this._boxSelectRemoving;
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
            this._updatePreviewLink( e );

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
        const ioType = e.target.classList.contains( 'input' ) ? GraphEditor.NODE_IO_INPUT : GraphEditor.NODE_IO_OUTPUT;

        // Discard same IO type
        if( linkData.ioType == ioType )
            return;

        // Info about src node
        const src_nodeContainer = linkData.domEl;
        const src_nodeId = src_nodeContainer.dataset[ 'id' ];
        const src_node = this.nodes[ src_nodeId ].data;
        const src_ioIndex = this._generatingLink.index
        
        // Info about dst node
        const dst_nodeContainer = e.target.offsetParent;
        const dst_nodeId = dst_nodeContainer.dataset[ 'id' ];
        const dst_node = this.nodes[ dst_nodeId ].data;
        const dst_ioIndex = parseInt( e.target.parentElement.dataset[ 'index' ] );

        // Discard different types
        const srcIsInput = ( linkData.ioType ==  GraphEditor.NODE_IO_INPUT );
        const src_ios = src_node[ srcIsInput ? 'inputs' : 'outputs' ];
        const src_ioType = src_ios[ src_ioIndex ].type;

        const dst_ios = dst_node[ ioType ==  GraphEditor.NODE_IO_INPUT ? 'inputs' : 'outputs' ];
        const dst_ioType = dst_ios[ dst_ioIndex ].type;

        if( src_ioType != dst_ioType )
            return;

        // Store the end io..

        linkData.io.dataset[ 'target' ] = dst_nodeId;
        e.target.parentElement.dataset[ 'target' ] = src_nodeId;

        // Call this using the io target to set the connection to the center of the input DOM element..
        
        let path = this._updatePreviewLink( null, e.target );

        // Store link

        const pathId = ( srcIsInput ? dst_nodeId : src_nodeId ) + '@' + ( srcIsInput ? src_nodeId : dst_nodeId );

        this.links[ pathId ] = {
            path: path,
            inputNode: srcIsInput ? src_nodeId : dst_nodeId,
            inputIdx: srcIsInput ? src_ioIndex : dst_ioIndex,
            outputNode: srcIsInput ? dst_nodeId : src_nodeId,
            outputIdx: dst_nodeId ? dst_ioIndex : src_ioIndex
        };

        path.dataset[ 'id' ] = pathId;

        // Successful link..
        return true;
    }

    _updatePreviewLink( e, endIO ) {

        var path = this._generatingLink.path;

        if( !path )
        {
            var svg = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
            svg.classList.add( "link-svg" );
            svg.style.width = "100%";
            svg.style.height = "100%";
            this._domLinks.appendChild( svg );

            path = document.createElementNS( 'http://www.w3.org/2000/svg', 'path' );
            path.setAttribute( 'fill', 'none' );
            svg.appendChild( path );
            this._generatingLink.path = path;
        }

        // Generate bezier curve

        const index = this._generatingLink.index;
        const type = this._generatingLink.ioType;
        const domEl = this._generatingLink.domEl;

        const offsetY = this.root.offsetTop;

        const ios = domEl.querySelector( type == GraphEditor.NODE_IO_INPUT ? '.lexgraphnodeinputs' : '.lexgraphnodeoutputs' );
        const startRect = ios.childNodes[ index ].querySelector( '.io__type' ).getBoundingClientRect();
        
        let startScreenPos = new LX.vec2( startRect.x, startRect.y - offsetY );
        let startPos = this._getPatternPosition( startScreenPos );
        startPos.add( new LX.vec2( 7, 7 ), startPos );
        
        let endPos = null;

        if( e )
        {
            endPos = new LX.vec2( e.offsetX, e.offsetY );

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
        }
        else
        {
            const ioRect = endIO.getBoundingClientRect();
            
            endPos = new LX.vec2( ioRect.x, ioRect.y - offsetY );
            endPos = this._getPatternPosition( endPos );
            endPos.add( new LX.vec2( 7, 7 ), endPos );
        }

        const distanceX = LX.UTILS.clamp( Math.abs( startPos.x - endPos.x ), 0.0, 180.0 );
        const cPDistance = 128.0 * Math.pow( distanceX / 180.0, 1.5 ) * ( type == GraphEditor.NODE_IO_INPUT ? -1 : 1 );

        let cPoint1 = startScreenPos.add( new LX.vec2( cPDistance, 0 ) );
        cPoint1 = this._getPatternPosition( cPoint1 );
        cPoint1.add( new LX.vec2( 7, 7 ), cPoint1 );
        let cPoint2 = endPos.sub( new LX.vec2( cPDistance, 0 ) );

        path.setAttribute( 'd', `
            M ${ startPos.x },${ startPos.y }
            C ${ cPoint1.x },${ cPoint1.y } ${ cPoint2.x },${ cPoint2.y } ${ endPos.x },${ endPos.y }
        ` );

        return path;
    }

    _updateNodeLinks( nodeId ) {

        var node = this.nodes[ nodeId ] ? this.nodes[ nodeId ].data : null;

        if( !node ) {
            console.warn( `Can't finde node [${ nodeId }]` );
            return;
        }

        const nodeDOM = this._getNodeDOMElement( nodeId );

        // Update input links

        for( let input of nodeDOM.querySelectorAll( '.ioinput' ) )
        {
            const targetNodeId = input.dataset[ 'target' ];

            if( !targetNodeId )
                continue;

            var link = this._getLinkDOMElement( targetNodeId, nodeId );

            this._generatingLink = {
                index: parseInt( input.dataset[ 'index' ] ),
                io: input,
                ioType: GraphEditor.NODE_IO_INPUT,
                domEl: nodeDOM,
                path: link.path
            };

            // Get end io

            const outputNode = this._getNodeDOMElement( targetNodeId );
            const io = outputNode.querySelector( '.lexgraphnodeoutputs' ).childNodes[ link.outputIdx ]
            
            this._updatePreviewLink( null, io );
        }

        
        // Update output links
        
        for( let output of nodeDOM.querySelectorAll( '.iooutput' ) )
        {
            const targetNodeId = output.dataset[ 'target' ];

            if( !targetNodeId )
                continue;

            var link = this._getLinkDOMElement( nodeId, targetNodeId );

            this._generatingLink = {
                index: parseInt( output.dataset[ 'index' ] ),
                io: output,
                ioType: GraphEditor.NODE_IO_OUTPUT,
                domEl: nodeDOM,
                path: link.path
            };

            // Get end io

            const inputNode = this._getNodeDOMElement( targetNodeId );
            const io = inputNode.querySelector( '.lexgraphnodeinputs' ).childNodes[ link.inputIdx ]
            
            this._updatePreviewLink( null, io );
        }

        delete this._generatingLink;
    }

    _drawBoxSelection( e ) {

        var svg = this._currentBoxSelectionSVG;

        if( !svg )
        {
            var svg = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
            svg.classList.add( "box-selection-svg" );
            if( this._boxSelectRemoving )
                svg.classList.add( "removing" );
            svg.style.width = "100%";
            svg.style.height = "100%";
            this._domLinks.appendChild( svg );
            this._currentBoxSelectionSVG = svg;
        }

        // Generate box

        let startPos = this._getPatternPosition( this._boxSelecting );
        let size = this._getPatternPosition( this._mousePosition ).sub( startPos );

        if( size.x < 0 ) startPos.x += size.x;
        if( size.y < 0 ) startPos.y += size.y;

        size = size.abs();

        svg.innerHTML = `<rect
            x="${ startPos.x }" y="${ startPos.y }"
            rx="${ 6 }" ry="${ 6 }"
            width="${ size.x }" height="${ size.y }"
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

        let size = rb.sub( lt );

        if( size.x < 0 )
        {
            var tmp = lt.x;
            lt.x = rb.x;
            rb.x = tmp;
        }

        if( size.y < 0 )
        {
            var tmp = lt.y;
            lt.y = rb.y;
            rb.y = tmp;
        }

        for( let nodeEl of this._domNodes.children )
        {
            let pos = this._getNodePosition( nodeEl );
            let size = new LX.vec2( nodeEl.offsetWidth, nodeEl.offsetHeight );

            if( ( !( pos.x < lt.x && ( pos.x + size.x ) < lt.x ) && !( pos.x > rb.x && ( pos.x + size.x ) > rb.x ) ) && 
                ( !( pos.y < lt.y && ( pos.y + size.y ) < lt.y ) && !( pos.y > rb.y && ( pos.y + size.y ) > rb.y ) ) )
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

        for( let nodeId of this.selectedNodes )
        {
            this._deleteNode( nodeId );
        }

        this.selectedNodes.length = 0;

        // We delete something, so add undo step..

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
                position: new LX.vec2( 500, 350 ),
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
                position: new LX.vec2( 200, 200 ),
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