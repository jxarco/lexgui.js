import { LX } from 'lexgui';

if(!LX) {
    throw("lexgui.js missing!");
}

LX.components.push( 'GraphEditor' );

class BoundingBox {

    constructor( o, s )
    {
        this.origin = o ?? new LX.vec2( 0, 0 );
        this.size = s ?? new LX.vec2( 0, 0 );
    }

    merge( bb ) {

        console.assert( bb.constructor == BoundingBox );

        const min_0 = this.origin;
        const max_0 = this.origin.add( this.size );

        const min_1 = bb.origin;
        const max_1 = bb.origin.add( bb.size );

        const merge_min = new LX.vec2( Math.min( min_0.x, min_1.x ), Math.min( min_0.y, min_1.y ) );
        const merge_max = new LX.vec2( Math.max( max_0.x, max_1.x ), Math.max( max_0.y, max_1.y ) );

        this.origin = merge_min;
        this.size = merge_max.sub( merge_min );
    }

    inside( bb, full = true ) {

        const min_0 = this.origin;
        const max_0 = this.origin.add( this.size );

        const min_1 = bb.origin;
        const max_1 = bb.origin.add( bb.size );

        if( full )
        {
            return min_1.x >= min_0.x && max_1.x <= max_0.x
                    && min_1.y >= min_0.y && max_1.y <= max_0.y;
        }
        else
        {
            return max_1.x >= min_0.x && min_1.x <= max_0.x
                && max_1.y >= min_0.y && min_1.y <= max_0.y;
        }
    }
};

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

    static LAST_GROUP_ID        = 0;
    static LAST_FUNCTION_ID     = 0;

    static STOPPED              = 0;
    static RUNNING              = 1;

    // Node Drawing

    static NODE_IO_INPUT        = 0;
    static NODE_IO_OUTPUT       = 1;

    static NODE_TYPES           = { };

    /**
     * @param {*} options
     * 
     */

    constructor( area, options = {} ) {

        GraphEditor.__instances.push( this );

        const useSidebar = options.sidebar ?? true;

        this._sidebar = area.addSidebar( m => {
            m.add( "Create", { icon: "fa fa-add", bottom: true, callback: (e) => this._onSidebarCreate( e ) } );
        });

        this.base_area = area;
        this.area = new LX.Area( { className: "lexgraph" } );

        area.root.classList.add( 'grapharea' );

        this.root = this.area.root;
        this.root.tabIndex = -1;

        area.attach( this.root );

        this._graphContainer = area.sections[ 1 ].root;
        this._sidebarDom = area.sections[ 0 ].root;
        this._sidebarActive = useSidebar;

        // Set sidebar state depending on options..
        this._toggleSideBar( useSidebar );

        // Bind resize

        area.onresize = ( bb ) => {
            
        };

        area.addOverlayButtons( [
            {
                name: "Toggle Sidebar",
                icon: "fa fa-table-columns",
                callback: () => this._toggleSideBar(),
            },
            [
                {
                    name: "Start Graph",
                    icon: "fa fa-play",
                    callback: (value, event) => this.start(),
                    selectable: true
                },
                {
                    name: "Stop Graph",
                    icon: "fa-solid fa-stop",
                    callback: (value, event) => this.stop(),
                    selectable: true
                }
            ],
            [
                {
                    name: "Enable Snapping",
                    icon: "fa fa-table-cells",
                    callback: () => this._toggleSnapping(),
                    selectable: true
                },
                {
                    name: 1,
                    options: [1, 2, 3],
                    callback: value => this._setSnappingValue( value ),
                }
            ],
            [
                {
                    name: "Import",
                    icon: "fa fa-upload",
                    callback: (value, event) => { this.loadGraph( "../../data/graph_sample.json" ); }
                },
                {
                    name: "Export",
                    icon: "fa fa-diagram-project",
                    callback: (value, event) => this.currentGraph.export()
                }
            ],
            {
                name: "",
                class: "graph-title",
                callback: (value, event) => this._showRenameGraphDialog()
            }
        ], { float: "htc" } );

        this.root.addEventListener( 'keydown', this._processKeyDown.bind( this ), true );
        this.root.addEventListener( 'keyup', this._processKeyUp.bind( this ), true );
        this.root.addEventListener( 'mousedown', this._processMouse.bind( this ) );
        this.root.addEventListener( 'mouseup', this._processMouse.bind( this ) );
        this.root.addEventListener( 'mousemove', this._processMouse.bind( this ) );
        this.root.addEventListener( 'mousewheel', this._processMouse.bind(this) );
        this.root.addEventListener( 'mouseleave', this._processMouse.bind(this) );
        this.root.addEventListener( 'click', this._processMouse.bind( this ) );
        this.root.addEventListener( 'contextmenu', this._processMouse.bind( this ) );
        this.root.addEventListener( 'focus', this._processFocus.bind( this, true) );
        this.root.addEventListener( 'focusout', this._processFocus.bind( this, false ) );

        this.propertiesDialog = new LX.PocketDialog( "Properties", null, {
            size: [ "350px", null ],
            position: [ "8px", "8px" ],
            float: "left",
            class: 'lexgraphpropdialog'
        } );

        // Avoid closing the dialog on click..

        this.propertiesDialog.root.addEventListener( "mousedown", function( e ) {
            e.stopImmediatePropagation();
            e.stopPropagation();
        });

        this.propertiesDialog.root.addEventListener( "mouseup", function( e ) {
            e.stopImmediatePropagation();
            e.stopPropagation();
        });

        // Move to root..
        this.root.appendChild( this.propertiesDialog.root );

        // Editor

        this._mousePosition = new LX.vec2( 0, 0 );
        this._deltaMousePosition = new LX.vec2( 0, 0 );
        this._snappedDeltaMousePosition = new LX.vec2( 0, 0 );
        this._lastMousePosition = new LX.vec2( 0, 0 );
        this._lastSnappedMousePosition = new LX.vec2( 0, 0 );

        this._undoSteps = [ ];
        this._redoSteps = [ ];

        this.keys = { };

        this._snapToGrid = false;
        this._snapValue = 1.0;

        // Graphs, Nodes and connections

        this.currentGraph   = null;

        this.graphs         = { };
        this.nodes          = { };
        this.groups         = { };
        this.variables      = { };

        this.selectedNodes = [ ];

        this.supportedCastTypes = { };

        this.addCastType( 'float', 'vec2', ( v ) => { return [ v, v ]; } );
        this.addCastType( 'float', 'vec3', ( v ) => { return [ v, v, v ]; } );
        this.addCastType( 'float', 'vec4', ( v ) => { return [ v, v, v, v ]; } );
        this.addCastType( 'float', 'bool', ( v ) => { return !!v; } );

        this.addCastType( 'vec4', 'vec3', ( v ) => { v.slice( 0, 3 ); return v; } );
        this.addCastType( 'vec4', 'vec2', ( v ) => { v.slice( 0, 2 ); return v; } );
        this.addCastType( 'vec3', 'vec2', ( v ) => { v.slice( 0, 2 ); return v; } );

        this.addCastType( 'vec3', 'vec4', ( v ) => { v.push( 1 ); return v; } );
        this.addCastType( 'vec2', 'vec3', ( v ) => { v.push( 1 ); return v; } );
        this.addCastType( 'vec2', 'vec4', ( v ) => { v.push( 0, 1 ); return v; } );

        this._nodeBackgroundOpacity = options.disableNodeOpacity ? 1.0 : 0.8;

        this.main = null;

        // Back pattern
        
        const f = 15.0;
        this._patternSize = new LX.vec2( f );
        this._circlePatternSize = f * 0.04;
        this._circlePatternColor = '#71717a9c';

        this._generatePattern();

        // Links

        this._domLinks = document.createElement( 'div' );
        this._domLinks.classList.add( 'lexgraphlinks' );
        this.root.appendChild( this._domLinks );

        // Nodes

        this._domNodes = document.createElement( 'div' );
        this._domNodes.classList.add( 'lexgraphnodes' );
        this.root.appendChild( this._domNodes );

        window.ge = this;
    }

    static getInstances() {

        return GraphEditor.__instances;
    }

    /**
     * Register a node class so it can be listed when the user wants to create a new one
     * @method registerCustomNode
     * @param {String} type: name of the node and path
     * @param {Class} baseClass class containing the structure of the custom node
     */

    static registerCustomNode( type, baseClass ) {
        
        if ( !baseClass.prototype ) {
            throw "Cannot register a simple object, it must be a class with a prototype!";
        }
        
        // Get info from path
        const pos = type.lastIndexOf( "/" );

        baseClass.category = type.substring( 0, pos );
        baseClass.title = baseClass.title ?? type.substring( pos + 1 );
        baseClass.type = type;

        if( !baseClass.prototype.onExecute )
        {
            console.warn( `GraphNode [${ this.title }] does not have a callback attached.` );
        }

        const prev = GraphEditor.NODE_TYPES[ type ];
        if(prev) {
            console.warn( `Replacing node type [${ type }]` );
        }

        GraphEditor.NODE_TYPES[ type ] = baseClass;

        // Some callbacks..

        if ( this.onNodeTypeRegistered ) {
            this.onCustomNodeRegistered( type, baseClass);
        }

        if ( prev && this.onNodeTypeReplaced ) {
            this.onNodeTypeReplaced( type, baseClass, prev );
        }
    }

    /**
     * Create a node of a given type with a name. The node is not attached to any graph yet.
     * @method createNode
     * @param {String} type full name of the node class. p.e. "math/sin"
     * @param {String} title a name to distinguish from other nodes
     * @param {Object} options Store node options
     */

    static addNode( type, title, options ) {

        var baseClass = GraphEditor.NODE_TYPES[ type ];

        if (!baseClass) {
            console.warn( `GraphNode type [${ type }] not registered.` );
            return null;
        }

        title = title ?? baseClass.title;

        const node = new baseClass( title );

        if( node.onCreate )
            node.onCreate();

        node.type = type;
        node.title = title;
        node.position = new LX.vec2( 0, 0 );
        node.color = null;

        // Extra options
        if ( options ) {
            for (var i in options) {
                node[ i ] = options[ i ];
            }
        }

        if ( node.onNodeCreated ) {
            node.onNodeCreated();
        }
        
        return node;
    }

    /**
     * @method setGraph
     * @param {Graph} graph
     */

    setGraph( graph ) {

        // Nothing to do, already there...
        if( this.currentGraph && graph.id == this.currentGraph.id )
            return;

        this.clear();

        graph.id = graph.id ?? graph.constructor.name  + '-' + LX.UTILS.uidGenerator();

        this.graphs[ graph.id ] = graph;

        if( !graph.nodes )
        {
            console.warn( 'Graph does not contain any node!' );
            return;
        }

        this.currentGraph = graph;

        this._updatePattern();

        for( let node of graph.nodes )
        {
            this._createNodeDOM( node );
        }

        for( let group of graph.groups )
        {
            const groupDom = this._createGroup( group );
            groupDom.querySelector( '.lexgraphgrouptitle' ).value = group.name;
            this._domNodes.prepend( groupDom );
        }

        for( let linkId in graph.links )
        {
            const links = graph.links[ linkId ];

            for( let link of links )
            {
                this._createLink( link );
            }
        }

        this._updateGraphName( graph.name );
        this._togglePropertiesDialog( false );
    }

    /**
     * @method loadGraph
     * @param {String} url
     * @param {Function} callback Function to call once the graph is loaded
     */

    loadGraph( url, callback ) {

        const onComplete = ( json ) => {

            let graph = ( json.type == 'Graph' ) ? this.addGraph( json ) : this.addGraphFunction( json );

            if( callback )
                callback( graph );
        }

        const onError = (v) => console.error(v);

        LX.requestJSON( url, onComplete, onError );
    }

    /**
     * @method addGraph
     * @param {Object} o Options to configure the graph
     */

    addGraph( o ) {

        let graph = new Graph();
        graph.editor = this;

        if( o ) graph.configure( o );

        this.setGraph( graph );

        this._sidebar.add( graph.name, { icon: "fa fa-diagram-project", className: graph.id, callback: (e) => { this.setGraph( graph ) } } );

        this._sidebar.select( graph.name );

        return graph;
    }

    /**
     * @method addGraphFunction
     * @param {Object} o Options to configure the graph
     */

    addGraphFunction( o ) {

        let func = new GraphFunction();
        func.editor = this;

        if( o ) func.configure( o );

        this.setGraph( func );

        // Add a new node to use this function..

        class NodeFunction extends GraphNode
        {
            onCreate() {
                this.addInput( null, "float" );
                this.addOutput( null, "any" );
            }

            onExecute() {
                const func = NodeFunction.func;
                const value = func.getOutputData( this.getInput( 0 ) );
                this.setOutput( 0, value );
            }
        }

        NodeFunction.func = func;
        GraphEditor.registerCustomNode( "function/" + func.name, NodeFunction );

        this._sidebar.add( func.name, { icon: "fa fa-florin-sign", className: func.id, callback: (e) => { this.setGraph( func ) } } );

        this._sidebar.select( func.name );
    }

    /**
     * @method clear
     */

    clear() {

        this._domNodes.innerHTML = "";
        this._domLinks.innerHTML = "";

        this.nodes = { };
    }

    setVariable( name, value ) {

        this.variables[ name ] = value;
    }

    getVariable( name ) {

        return this.variables[ name ];
    }

    propagateEventToAllNodes( eventName, params ) {

        if( !this.currentGraph )
            return;

        for ( let node of this.currentGraph.nodes )
        {
            if( !node[ eventName ] )
                continue;

            node[ eventName ].apply( this, params );
        }
    };

    /**
     * @method addCastType
     * @param {String} type: Type to cast
     * @param {String} targetType: Types to be casted from original type
     * @param {Function} fn: Function to know how to cast
     */

    addCastType( type, targetType, fn ) {

        this.supportedCastTypes[ type + '@' + targetType ] = fn;
    }

    /**
     * @method unSelectAll
     */

    unSelectAll( keepPropDialog ) {

        this._domNodes.querySelectorAll( '.lexgraphnode' ).forEach( v => v.classList.remove( 'selected' ) );

        this.selectedNodes.length = 0;

        if( !keepPropDialog )
            this._togglePropertiesDialog( false );
    }

    _createNodeDOM( node ) {

        node.editor = this;
        node.graphID = this.currentGraph.id;

        var nodeContainer = document.createElement( 'div' );
        nodeContainer.classList.add( 'lexgraphnode' );
        nodeContainer.style.left = "0";
        nodeContainer.style.top = "0";
        
        this._translateNode( nodeContainer, node.position );

        var color;

        // Get color from type if color if not manually specified
        if( node.type && GraphEditor.NODE_TYPES[ node.type ] )
        {
            const category = node.constructor.category;
            nodeContainer.classList.add( category );
        }
        else
        {
            const pos = node.type.lastIndexOf( "/" );
            const category = node.type.substring( 0, pos );
            nodeContainer.classList.add( category );
        }

        // Update with manual color

        color = node.color ?? color;

        if( color )
        {
            // RGB
            if( color.constructor == Array )
            {
                color = color.join( ',' );
            }
            // Hex color..
            else
            {
                color = LX.hexToRgb( color );
                color.forEach( ( v, i ) => color[ i ] = v * 255 );
            }

            nodeContainer.style.backgroundColor = "rgba(" + color + ", " + this._nodeBackgroundOpacity + ")";
        }

        nodeContainer.addEventListener( 'mousedown', e => {

            // Only for left click..
            if( e.button != LX.MOUSE_LEFT_CLICK )
                return;

            if( e.altKey )
            {
                this._unSelectNode( nodeContainer );
            }
            else
            {
                if( this.selectedNodes.length > 1 && ( !e.ctrlKey && !e.shiftKey ) )
                {
                    this.unSelectAll( true );
                }

                if( !nodeContainer.classList.contains( 'selected' ) )
                {
                    this._selectNode( nodeContainer, ( e.ctrlKey || e.shiftKey ) );
                }
            }
        } );

        nodeContainer.addEventListener( 'contextmenu', e => {

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            LX.addContextMenu(null, e, m => {

                m.add( "Copy", () => {
                    this._clipboardData = {
                        id: node.id,
                        gid: this.currentGraph.id
                    };
                } );

                // TODO
                // m.add( "Paste", () => {

                // } );

                m.add( "" );

                m.add( "Delete", () => {
                    this._deleteNode( nodeContainer.dataset[ 'id' ] );
                } );
            });
        } );

        nodeContainer.addEventListener( 'dblclick', e => {

            // Only for left click..
            if( e.button != LX.MOUSE_LEFT_CLICK )
                return;

            // Open graph function..
            if( node.constructor.func )
            {
                this._sidebar.select( node.constructor.func.name )
            }

        } );

        // Title header
        var nodeHeader = document.createElement( 'div' );
        nodeHeader.classList.add( 'lexgraphnodeheader' );
        nodeHeader.innerText = node.title;
        nodeContainer.appendChild( nodeHeader );

        // Properties
        // if( node.properties.length  )
        // {
        //     var nodeProperties = document.createElement( 'div' );
        //     nodeProperties.classList.add( 'lexgraphnodeproperties' );
            
        //     for( let p of node.properties )
        //     {
        //         var panel = new LX.Panel();
    
        //         p.signal = "@" + LX.UTILS.uidGenerator() + node.title;

        //         switch( p.type )
        //         {
        //         case 'float':
        //         case 'int':
        //             panel.addNumber( p.name, p.value, (v) => p.value = v, { signal: p.signal } );
        //             break;
        //         case 'string':
        //             panel.addText( p.name, p.value, (v) => p.value = v, { signal: p.signal } );
        //         break;
        //         }

        //         // var prop = document.createElement( 'div' );
        //         // prop.innerText = p.type;
        //         // prop.classList.add( 'lexgraphnodeproperty' );
        //         nodeProperties.appendChild( panel.root );
        //     }
    
        //     nodeContainer.appendChild( nodeProperties );
        // }

        // Inputs and outputs
        var nodeIO = document.createElement( 'div' );
        nodeIO.classList.add( 'lexgraphnodeios' );
        nodeContainer.appendChild( nodeIO );

        const hasInputs = node.inputs && node.inputs.length;
        const hasOutputs = node.outputs && node.outputs.length;

        // Inputs
        {
            var nodeInputs = null;

            if( hasInputs )
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
                    console.warn( `Missing type for node [${ node.title }], skipping...` );
                    continue;
                }

                var input = document.createElement( 'div' );
                input.className = 'lexgraphnodeio ioinput';
                input.dataset[ 'index' ] = nodeInputs.childElementCount;

                var type = document.createElement( 'span' );
                type.className = 'io__type input ' + i.type;
                type.dataset[ 'type' ] = i.type;
                type.innerHTML = '<span>' + i.type[ 0 ].toUpperCase() + '</span>';
                input.appendChild( type );

                var typeDesc = document.createElement( 'span' );
                typeDesc.className = 'io__typedesc input ' + i.type;
                typeDesc.innerHTML = i.type;
                input.appendChild( typeDesc );

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

            if( hasOutputs )
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
                    console.warn( `Missing type for node [${ node.title }], skipping...` );
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
                type.dataset[ 'type' ] = o.type;
                type.innerHTML = '<span>' + o.type[ 0 ].toUpperCase() + '</span>';
                output.appendChild( type );

                var typeDesc = document.createElement( 'span' );
                typeDesc.className = 'io__typedesc output ' + o.type;
                typeDesc.innerHTML = o.type;
                output.appendChild( typeDesc );

                nodeOutputs.appendChild( output );
            }
        }

        // Move nodes

        LX.makeDraggable( nodeContainer, {
            onMove: this._onMoveNodes.bind( this ),
            onDragStart: this._onDragNode.bind( this )
        } );

        this._addNodeIOEvents( nodeContainer );

        const id = node.id ?? node.title.toLowerCase().replaceAll( /\s/g, '-' ) + '-' + LX.UTILS.uidGenerator();
        this.nodes[ id ] = { data: node, dom: nodeContainer };

        node.id = id;
        nodeContainer.dataset[ 'id' ] = id;

        this._domNodes.appendChild( nodeContainer );

        // Only 1 main per graph!
        if( node.title == 'Main' )
        {
            this.main = id;
        }

        node.size = new LX.vec2( nodeContainer.offsetWidth, nodeContainer.offsetHeight );

        node.resizeObserver = new ResizeObserver( entries => {

            for( const entry of entries ) {
                const bb = entry.contentRect;
                if( !bb.width || !bb.height )
                    continue;
                node.size = new LX.vec2( nodeContainer.offsetWidth, nodeContainer.offsetHeight );
            }
        });

        node.resizeObserver.observe( nodeContainer );

        return nodeContainer;
    }

    _updateNodeDOMIOs( dom, node ) {

        // Inputs and outputs
        var nodeIO = dom.querySelector( '.lexgraphnodeios' );

        const hasInputs = node.inputs && node.inputs.length;
        const hasOutputs = node.outputs && node.outputs.length;

        // Inputs
        {
            var nodeInputs = null;

            if( hasInputs )
            {
                nodeInputs = nodeIO.querySelector( '.lexgraphnodeinputs' );
                nodeInputs.innerHTML = "";
            }

            for( let i of node.inputs )
            {
                if( !i.type )
                {
                    console.warn( `Missing type for node [${ node.title }], skipping...` );
                    continue;
                }

                var input = document.createElement( 'div' );
                input.className = 'lexgraphnodeio ioinput';
                input.dataset[ 'index' ] = nodeInputs.childElementCount;

                var type = document.createElement( 'span' );
                type.className = 'io__type input ' + i.type;
                type.innerHTML = '<span>' + i.type[ 0 ].toUpperCase() + '</span>';
                input.appendChild( type );

                var typeDesc = document.createElement( 'span' );
                typeDesc.className = 'io__typedesc input ' + i.type;
                typeDesc.innerHTML = i.type;
                input.appendChild( typeDesc );

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

            if( hasOutputs )
            {
                nodeOutputs = nodeIO.querySelector( '.lexgraphnodeoutputs' );
                nodeOutputs.innerHTML = "";
            }

            for( let o of node.outputs )
            {
                if( !o.type  )
                {
                    console.warn( `Missing type for node [${ node.title }], skipping...` );
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
                type.innerHTML = '<span>' + o.type[ 0 ].toUpperCase() + '</span>';
                output.appendChild( type );

                var typeDesc = document.createElement( 'span' );
                typeDesc.className = 'io__typedesc output ' + o.type;
                typeDesc.innerHTML = o.type;
                output.appendChild( typeDesc );

                nodeOutputs.appendChild( output );
            }
        }

        this._addNodeIOEvents( dom );
    }

    _addNodeIOEvents( nodeContainer ) {

        const nodeIO = nodeContainer.querySelector( '.lexgraphnodeios' );

        // Manage links

        nodeIO.querySelectorAll( '.lexgraphnodeio' ).forEach( el => {

            el.addEventListener( 'mousedown', e => {

                // Only for left click..
                if( e.button != LX.MOUSE_LEFT_CLICK )
                    return;

                this.lastMouseDown = LX.getTime();
    
                this._generatingLink = {
                    index: parseInt( el.dataset[ 'index' ] ),
                    io: el,
                    ioType: el.classList.contains( 'ioinput' ) ? GraphEditor.NODE_IO_INPUT : GraphEditor.NODE_IO_OUTPUT,
                    domEl: nodeContainer
                };

                e.stopPropagation();
                e.stopImmediatePropagation();
            } );

            el.addEventListener( 'mouseup', e => {

                e.stopPropagation();
                e.stopImmediatePropagation();

                // Single click..
                if( ( LX.getTime() - this.lastMouseDown ) < 200 ) {
                    delete this._generatingLink;
                    return;
                }

                if( this._generatingLink )
                {
                    // Check for IO
                    if( !this._onLink( e ) )
                    {
                        // Delete entire SVG if not a successful connection..
                        LX.UTILS.deleteElement( this._generatingLink.path ? this._generatingLink.path.parentElement : null );
                    }

                    delete this._generatingLink;
                }
            } );

            el.addEventListener( 'click', e => {

                if( !el.links )
                    return;

                const nodeId = nodeContainer.dataset[ 'id' ];

                this._deleteLinks( nodeId, el );
            } );

        } );
    }

    _getAllDOMNodes( includeGroups, exclude ) {
        
        var elements = null;

        if( includeGroups )
            elements = Array.from( this._domNodes.childNodes );
        else
            elements = Array.from( this._domNodes.childNodes ).filter( v => v.classList.contains( 'lexgraphnode' ) );

        if( exclude )
        {
            elements = elements.filter( v => v != exclude );
        }

        return elements;
    }

    _onMoveNodes( target ) {

        let dT = this._snapToGrid ? this._snappedDeltaMousePosition : this._deltaMousePosition;
        dT.div( this.currentGraph.scale, dT);

        for( let nodeId of this.selectedNodes )
        {
            const el = this._getNodeDOMElement( nodeId );

            this._translateNode( el, dT );

            this._updateNodeLinks( nodeId );
        }
    }

    _onDragNode( target, e ) {

        if( !e.shiftKey )
            return;

        this._cloneNodes();
    }

    _onMoveGroup( target ) {

        // Move nodes inside the group

        const groupNodeIds = target.nodes;

        if( !groupNodeIds )
            return;

        let dT = this._snapToGrid ? this._snappedDeltaMousePosition : this._deltaMousePosition;
        dT.div( this.currentGraph.scale, dT);

        this._translateNode( target, dT );

        for( let nodeId of groupNodeIds )
        {
            const isGroup = nodeId.constructor !== String;

            const el = isGroup ? nodeId : this._getNodeDOMElement( nodeId );

            this._translateNode( el, dT, !isGroup );

            if( !isGroup )
                this._updateNodeLinks( nodeId );
        }
    }

    _onDragGroup( target ) {

        // Get nodes inside the group to be moved

        const group_bb = this._getBoundingFromGroup( target );

        const groupNodeIds = [ ];

        for( let dom of this._getAllDOMNodes( true, target ) )
        {
            const x = parseFloat( dom.style.left );
            const y = parseFloat( dom.style.top );
            const node_bb = new BoundingBox( new LX.vec2( x, y ), new LX.vec2( dom.offsetWidth - 6, dom.offsetHeight - 6 ) );

            if( !group_bb.inside( node_bb ) )
                continue;

            groupNodeIds.push( dom.dataset[ 'id' ] ?? dom );
        }

        target.nodes = groupNodeIds;
    }

    _selectNode( dom, multiSelection, forceOrder = true ) {

        if( !multiSelection )
            this.unSelectAll( true );

        dom.classList.add( 'selected' );

        const id = dom.dataset[ 'id' ];

        this.selectedNodes.push( id );

        if( forceOrder )
        {
            // Reorder nodes to draw on top..
            this._domNodes.appendChild( dom );
        }

        const node = this.nodes[ id ].data;

        this.propertiesDialog.setTitle( node.title );

        var panel = this.propertiesDialog.panel;
        panel.clear();

        // Add description
        if( node.constructor.description )
        {
            panel.addText( null, node.constructor.description, null, { disabled: true } );
        }

        // Allow change name if input
        if( node.constructor.category == 'inputs' )
        {
            panel.addText( 'Name', node.title, (v) => { 
                node.title = v;
                dom.querySelector( '.lexgraphnodeheader' ).innerText = v;
            } );
        }

        for( let p of node.properties )
        {
            switch( p.type )
            {
            case 'float':
            case 'int':
                panel.addNumber( p.name, p.value, (v) => { p.value = v } );
                break;
            case 'string':
                panel.addText( p.name, p.value, (v) => { p.value = v } );
                break;
            case 'vec2':
                panel.addVector2( p.name, p.value, (v) => { p.value = v } );
                break;
            case 'vec3':
                panel.addVector3( p.name, p.value, (v) => { p.value = v } );
                break;
            case 'vec4':
                panel.addVector4( p.name, p.value, (v) => { p.value = v } );
                break;
            case 'select':
                panel.addDropdown( p.name, p.options, p.value, (v) => { p.value = v } );
                break;
            case 'array':
                panel.addArray( p.name, p.value, (v) => {
                    p.value = v;
                    if( node.type == "function/Input" )
                    {
                        node.setOutputs( v );
                        this._updateNodeDOMIOs( dom, node );
                    }
                }, { innerValues: p.options } );
                break;
            }
        }

        this._togglePropertiesDialog( true );
    }

    _unSelectNode( dom ) {

        dom.classList.remove( 'selected' );

        // Delete from selected..
        const idx = this.selectedNodes.indexOf( dom.dataset[ 'id' ] );
        this.selectedNodes.splice( idx, 1 );

        if( !this.selectedNodes.length )
            this._togglePropertiesDialog( false );
    }

    _translateNode( dom, deltaTranslation, updateBasePosition = true ) {

        const translation = deltaTranslation.add( new LX.vec2( parseFloat( dom.style.left ), parseFloat( dom.style.top ) ) );

        if( this._snapToGrid && dom.mustSnap )
        {
            const snapSize = this._patternSize.x * this._snapValue * this._snapValue;
            translation.x = Math.floor( translation.x / snapSize ) * snapSize;
            translation.y = Math.floor( translation.y / snapSize ) * snapSize;
            dom.mustSnap = false;
        }

        dom.style.left = ( translation.x ) + "px";
        dom.style.top = ( translation.y ) + "px";

        // Update base node position..
        if( updateBasePosition && dom.dataset[ 'id' ] )
        {
            let baseNode = this.nodes[ dom.dataset[ 'id' ] ];
            baseNode.data.position = translation;
        }
    }

    _deleteNode( nodeId ) {

        const nodeInfo = this.nodes[ nodeId ];
        const node = nodeInfo.data;
        const el = nodeInfo.dom;

        console.assert( el );

        if( node.constructor.blockDelete )
        {
            console.warn( `Can't delete node!` );
            return;
        }

        LX.UTILS.deleteElement( el );

        // Delete from the editor

        delete this.nodes[ nodeId ];

        // Delete from the graph data

        const idx = this.currentGraph.nodes.findIndex( v => v.id === nodeId );
        console.assert( idx >= 0 );
        this.currentGraph.nodes.splice( idx, 1 );

        // Delete connected links..
        
        for( let key in this.currentGraph.links )
        {
            if( !key.includes( nodeId ) )
                continue;

            const aIdx = key.indexOf( '@' );
            const targetIsInput = key.substring( aIdx + 1 ) != nodeId;

            // Remove the connection from the other before deleting..

            const numLinks = this.currentGraph.links[ key ].length;

            for( var i = 0; i < numLinks; ++i )
            {
                var link = this.currentGraph.links[ key ][ i ];

                LX.UTILS.deleteElement( link.path.parentElement );

                const targetNodeId = targetIsInput ? link.inputNode : link.outputNode;

                const targetNodeDOM = this._getNodeDOMElement( targetNodeId );
                const ios = targetNodeDOM.querySelector( targetIsInput ? '.lexgraphnodeinputs' : '.lexgraphnodeoutputs' );
                const io = ios.childNodes[ targetIsInput ? link.inputIdx : link.outputIdx ];

                const ioIndex = targetIsInput ? link.outputIdx : link.inputIdx;
                const nodelinkidx = io.links[ ioIndex ].indexOf( nodeId );
                io.links[ ioIndex ].splice( nodelinkidx, 1 );

                // Unique link, so it's done..
                if( targetIsInput )
                {
                    delete io.dataset[ 'active' ];
                }

                // Check if any link left in case of output
                else
                {
                    var active = false;
                    for( var links of  io.links )
                    {
                        if( !links )
                            continue;
                        for( var j of links ) {
                            active |= ( !!j );
                        }
                    }
                    if( !active )
                        delete io.dataset[ 'active' ];
                }
            }

            delete this.currentGraph.links[ key ];
        }
    }

    _deleteGroup( groupId ) {

        const dom = this.groups[ groupId ];
        LX.UTILS.deleteElement( dom );

        // Delete from the editor

        delete this.groups[ groupId ];

        // Delete from the graph data

        const idx = this.currentGraph.groups.findIndex( v => v.id === groupId );
        console.assert( idx >= 0 );
        this.currentGraph.groups.splice( idx, 1 );
    }

    _cloneNode( nodeId, graphId, position ) {

        const graph = this.graphs[ graphId ?? this.currentGraph.id ];

        const nodeData = graph.getNodeById( nodeId );

        if( !nodeData )
            return;

        const el = this._getNodeDOMElement( nodeId );
        const newNode = GraphEditor.addNode( nodeData.type );
        newNode.properties = LX.deepCopy( nodeData.properties );

        const newDom = this._createNodeDOM( newNode );

        this._translateNode( newDom, position ?? this._getNodePosition( el ) );

        this._selectNode( newDom, true );

        this.currentGraph.nodes.push( newNode );
    }

    _cloneNodes() {

        // Clone all selected nodes
        const selectedIds = LX.deepCopy( this.selectedNodes );

        this.unSelectAll();

        for( let nodeId of selectedIds )
        {
            this._cloneNode( nodeId );
        }
    }

    // This is in pattern space!
    _getNodePosition( dom ) {

        return new LX.vec2( parseFloat( dom.style.left ), parseFloat( dom.style.top ) );
    }

    _getNodeDOMElement( nodeId ) {

        return this.nodes[ nodeId ] ? this.nodes[ nodeId ].dom : null;
    }

    _getLinks( nodeSrcId, nodeDstId ) {

        const str = nodeSrcId + '@' + nodeDstId;
        return this.currentGraph.links[ str ];
    }

    _deleteLinks( nodeId, io ) {

        const isInput = io.classList.contains( 'ioinput' );
        const srcIndex = parseInt( io.dataset[ 'index' ] );

        if( isInput ) // Only one "link to output" to delete
        {
            let targetIndex;

            const targets = io.links.filter( (v, i) => { targetIndex = i; return v !== undefined; } )[ 0 ];
            const targetId = targets[ 0 ];

            // It has been deleted..
            if( !targetId )
                return;

            var links = this._getLinks( targetId, nodeId );

            var linkIdx = links.findIndex( i => ( i.inputIdx == srcIndex && i.outputIdx == targetIndex ) );
            LX.UTILS.deleteElement( links[ linkIdx ].path.parentElement );
            links.splice( linkIdx, 1 );

            // Input has no longer any connected link

            delete io.links;
            delete io.dataset[ 'active' ];

            // Remove a connection from the target connections

            const targetDOM = this._getNodeDOMElement( targetId );
            const ios = targetDOM.querySelector( '.lexgraphnodeoutputs' );
            const targetIO = ios.childNodes[ targetIndex ];

            const idx = targetIO.links[ srcIndex ].findIndex( v => v == nodeId );
            targetIO.links[ srcIndex ].splice( idx, 1 );

            let active = false;

            for( var ls of targetIO.links )
            {
                if( !ls ) continue;
                // Check links left per io
                active |= ls.reduce( c => c !== undefined, 0 );
            }

            if( !active )
            {
                delete targetIO.links;
                delete targetIO.dataset[ 'active' ];
            }
        }
        else // Delete ALL "to input links"
        {

            const numLinks = io.links.length;

            for( let targetIndex = 0; targetIndex < numLinks; ++targetIndex )
            {
                const targets = io.links[ targetIndex ];

                if( !targets )
                    continue;

                for( let it = ( targets.length - 1 ); it >= 0 ; --it )
                {
                    const targetId = targets[ it ];
                    var links = this._getLinks( nodeId, targetId );

                    var linkIdx = links.findIndex( i => ( i.inputIdx == targetIndex && i.outputIdx == srcIndex ) );
                    LX.UTILS.deleteElement( links[ linkIdx ].path.parentElement );
                    links.splice( linkIdx, 1 );

                    // Remove a connection from the output connections

                    io.links[ targetIndex ].splice( it, 1 );

                    // Input has no longer any connected link

                    const targetDOM = this._getNodeDOMElement( targetId );
                    const ios = targetDOM.querySelector( '.lexgraphnodeinputs' );
                    const targetIO = ios.childNodes[ targetIndex ];

                    delete targetIO.links;
                    delete targetIO.dataset[ 'active' ];
                }
            }

            delete io.links;
            delete io.dataset[ 'active' ];
        }
    }

    _processFocus( active ) {

        this.isFocused = active;
    }

    _processKeyDown( e ) {

        // Prevent processing keys on inputs and others
        if( document.activeElement != this.root )
            return;

        var key = e.key ?? e.detail.key;
        
        switch( key ) {
            case 'Escape':
                this.unSelectAll();
                break;
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                this._deleteSelection( e );
                break;
            case 'g':
                if( e.ctrlKey )
                {
                    e.preventDefault();
                    this._createGroup();
                }
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

        this.keys[ key ] = true;
    }

    _processKeyUp( e ) {

        // Prevent processing keys on inputs and others
        if( document.activeElement != this.root )
            return;

        var key = e.key ?? e.detail.key;

        delete this.keys[ key ];
    }

    _processMouse( e ) {

        const rect = this.root.getBoundingClientRect();
        
        this._mousePosition = new LX.vec2( e.clientX - rect.x , e.clientY - rect.y );

        const snapPosition = new LX.vec2( this._mousePosition.x, this._mousePosition.y );

        if( this._snapToGrid )
        {
            const snapSize = this._patternSize.x * this._snapValue * this.currentGraph.scale;
            snapPosition.x = Math.floor( snapPosition.x / snapSize ) * snapSize;
            snapPosition.y = Math.floor( snapPosition.y / snapSize ) * snapSize;
            this._snappedDeltaMousePosition = snapPosition.sub( this._lastSnappedMousePosition );
        }

        this._deltaMousePosition = this._mousePosition.sub( this._lastMousePosition );

        if( e.type == 'mousedown' )
        {
            this.lastMouseDown = LX.getTime();

            this._processMouseDown( e );
        }
        
        else if( e.type == 'mouseup' )
        {
            if( ( LX.getTime() - this.lastMouseDown ) < 200 ) {

                this._processClick( e );
            }

            this._processMouseUp( e );
        }

        else if( e.type == 'mousemove' )
        {
            this._processMouseMove( e );
        }

        else if ( e.type == 'click' ) // trick
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
            
            if( ( LX.getTime() - this.lastMouseDown ) < 300 ) {
                this._processContextMenu( e );
            }
        }

        else if ( e.type == 'mouseleave' ) {

            if( this._generatingLink )
            {
                this._processMouseUp( e );
            }
        }

        if( this._snapToGrid )
        {
            this._lastSnappedMousePosition = snapPosition;
        }

        this._lastMousePosition = this._mousePosition;
    }

    _processClick( e ) {

        if( e.target.classList.contains( 'lexgraphnodes' ) || e.target.classList.contains( 'lexgraphgroup' ) )
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
        if( !e.target.classList.contains( 'lexgraphnode' ) && !e.target.classList.contains( 'lexgraphgroup' )
            && e.button == LX.MOUSE_LEFT_CLICK )
        {
            this._boxSelecting = this._mousePosition;
            this._boxSelectRemoving = e.altKey;
        }
    }

    _processMouseUp( e ) {

        // It the event reaches this, the link isn't valid..
        if( this._generatingLink )
        {
            const linkInfo = Object.assign( { }, this._generatingLink );

            // Delete old link
            LX.UTILS.deleteElement( this._generatingLink.path ? this._generatingLink.path.parentElement : null );
            delete this._generatingLink;

            // Open contextmenu to auto-connect something..
            this._processContextMenu( e, linkInfo );
        }

        else if( this._boxSelecting )
        {
            if( !e.ctrlKey && !e.altKey )
                this.unSelectAll();

            this._selectNodesInBox( this._boxSelecting, this._mousePosition, e.altKey );

            LX.UTILS.deleteElement( this._currentBoxSelectionSVG );

            delete this._currentBoxSelectionSVG;
            delete this._boxSelecting;
            delete this._boxSelectRemoving;
        }
    }

    _processMouseMove( e ) {

        const rightPressed = ( e.which == 3 );

        if( rightPressed )
        {
            this.currentGraph.translation.add( this._deltaMousePosition.div( this.currentGraph.scale ), this.currentGraph.translation );

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

        if( delta > 0.0 ) this.currentGraph.scale *= 0.9;
        else this.currentGraph.scale *= ( 1.0 / 0.9 );

        this.currentGraph.scale = LX.UTILS.clamp( this.currentGraph.scale, GraphEditor.MIN_SCALE, GraphEditor.MAX_SCALE );

        // Compute zoom center in pattern space using new scale
        // and get delta..

        const newCenter = this._getPatternPosition( zoomCenter );

        const deltaCenter = newCenter.sub( center );

        this.currentGraph.translation.add( deltaCenter, this.currentGraph.translation );

        this._updatePattern();
    }

    _processContextMenu( e, autoConnect ) {
        
        LX.addContextMenu( null, e, m => {

            var eventPosition = null;

            if( e )
            {
                const rect = this.root.getBoundingClientRect();

                const localPosition = new LX.vec2( e.clientX - rect.x, e.clientY - rect.y );

                eventPosition = this._getPatternPosition( localPosition );
            }

            if( this._clipboardData )
            {
                m.add( "Paste", () => {

                    const nodeId = this._clipboardData.id;
                    const graphId = this._clipboardData.gid;

                    this._cloneNode( nodeId, graphId, eventPosition );

                } );
                m.add( "" );
            }

            for( let type in GraphEditor.NODE_TYPES )
            {
                const baseClass = GraphEditor.NODE_TYPES[ type ];

                if( baseClass.blockAdd )
                    continue;

                m.add( type, () => {

                    const newNode = GraphEditor.addNode( type );

                    const dom = this._createNodeDOM( newNode );

                    if( this._snapToGrid )
                    {
                        dom.mustSnap = true;
                    }

                    if( eventPosition )
                    {
                        this._translateNode( dom, eventPosition );
                    }

                    this.currentGraph.nodes.push( newNode );

                    if( autoConnect && newNode.inputs.length )
                    {
                        const srcId = autoConnect.domEl.dataset[ 'id' ];
                        const srcType = autoConnect.io.childNodes[ autoConnect.index ].dataset[ 'type' ];
                        const srcIsInput = autoConnect.ioType == GraphEditor.NODE_IO_INPUT;

                        const newLink = {
                            inputNode: srcIsInput ? srcId : newNode.id,
                            inputIdx: srcIsInput ? autoConnect.index : 0,
                            inputType: srcIsInput ? srcType : newNode.inputs[ 0 ].type,
                            outputNode: srcIsInput ? newNode.id : srcId,
                            outputIdx: srcIsInput ? 0 : autoConnect.index,
                            outputType: srcIsInput ? newNode.inputs[ 0 ].type : srcType,
                        }

                        // Store link

                        const pathId = newLink.outputNode + '@' + newLink.inputNode;

                        if( !this.currentGraph.links[ pathId ] ) this.currentGraph.links[ pathId ] = [];

                        this.currentGraph.links[ pathId ].push( newLink );

                        this._createLink( newLink );
                    }

                } );
            }
        });
    }

    /**
     * @method start
     */

    start() {

        this.mustStop = false;
        this.state = GraphEditor.RUNNING;

        this.propagateEventToAllNodes( 'onStart' );

        requestAnimationFrame( this._frame.bind(this) );
    }

    /**
     * @method stop
     */

    stop() {

        this.mustStop = true;
        this.state = GraphEditor.STOPPED;

        this.propagateEventToAllNodes( 'onStop' );
    }

    /**
     * @method _frame
     */

    _frame() {

        if( this.mustStop )
        {
            return;
        }

        requestAnimationFrame( this._frame.bind(this) );

        // Only run here main graph!
        this.currentGraph._runStep( this.main );
    }

    _generatePattern() {

        // Generate pattern
        {
            var pattern = document.createElementNS( 'http://www.w3.org/2000/svg', 'pattern' );
            pattern.setAttribute( 'id', 'pattern-0' );
            pattern.setAttribute( 'x', 0.0 );
            pattern.setAttribute( 'y', 0.0 );
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

        const patternSize = this._patternSize.mul( this.currentGraph.scale );
        const circlePatternSize = this._circlePatternSize * this.currentGraph.scale;
        const patternPosition = this.currentGraph.translation.mul( this.currentGraph.scale );
        
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

        const dw = w - w * this.currentGraph.scale;
        const dh = h - h * this.currentGraph.scale;

        this._domNodes.style.transform = `
            translate(` + ( patternPosition.x - dw ) + `px, ` + ( patternPosition.y - dh ) + `px) 
            scale(` + this.currentGraph.scale + `)
        `;
        this._domLinks.style.transform = this._domNodes.style.transform;

        // Hide nodes outside the viewport

        const nodesOutsideViewport = this._getNonVisibleNodes();

        for( let node of nodesOutsideViewport )
        {
            let dom = this._getNodeDOMElement( node.id );
            dom.classList.toggle( 'hiddenOpacity', true );
        }
    }

    _getPatternPosition( renderPosition ) {

        return renderPosition.div( this.currentGraph.scale ).sub( this.currentGraph.translation );
    }

    _getRenderPosition( patternPosition ) {

        return patternPosition.add( this.currentGraph.translation ).mul( this.currentGraph.scale );
    }

    _onLink( e ) {

        const linkData = this._generatingLink;
        const ioType = e.target.classList.contains( 'input' ) ? GraphEditor.NODE_IO_INPUT : GraphEditor.NODE_IO_OUTPUT;

        // Discard same IO type
        if( linkData.ioType == ioType )
        {
            console.warn( `Can't link same type of data` );
            return;
        }

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

        if( src_ioType != dst_ioType && src_ioType != "any" && dst_ioType != "any"  )
        {
            // Different types, but it might be possible to cast types

            const inputType = srcIsInput ? src_ioType : dst_ioType;
            const outputType = srcIsInput ? dst_ioType : src_ioType;

            if( !this.supportedCastTypes[ outputType + '@' + inputType ] )
            {
                console.warn( `Can't link ${ src_ioType } to ${ dst_ioType }.` );
                return;
            }
        }

        // Check if target it's an active input and remove the old link

        if( ioType == GraphEditor.NODE_IO_INPUT && e.target.parentElement.dataset[ 'active' ] )
        {
            this._deleteLinks( dst_nodeId, e.target.parentElement );
        }

        // Check if source it's an active input and remove the old link

        else if( linkData.ioType == GraphEditor.NODE_IO_INPUT && linkData.io.dataset[ 'active' ] )
        {
            this._deleteLinks( src_nodeId, linkData.io );
        }

        // Store the end io..

        var srcDom = linkData.io;
        srcDom.links = srcDom.links ?? [ ];
        srcDom.links[ dst_ioIndex ] = srcDom.links[ dst_ioIndex ] ?? [ ];
        srcDom.links[ dst_ioIndex ].push( dst_nodeId );
        
        var dstDom = e.target.parentElement;
        dstDom.links = dstDom.links ?? [ ];
        dstDom.links[ src_ioIndex ] = dstDom.links[ src_ioIndex ] ?? [ ];
        dstDom.links[ src_ioIndex ].push( src_nodeId );

        // Call this using the io target to set the connection to the center of the input DOM element..
        
        let path = this._updatePreviewLink( null, e.target.parentElement );

        // Store link

        const pathId = ( srcIsInput ? dst_nodeId : src_nodeId ) + '@' + ( srcIsInput ? src_nodeId : dst_nodeId );

        if( !this.currentGraph.links[ pathId ] ) this.currentGraph.links[ pathId ] = [];

        this.currentGraph.links[ pathId ].push( {
            path: path,
            inputNode: srcIsInput ? src_nodeId : dst_nodeId,
            inputIdx: srcIsInput ? src_ioIndex : dst_ioIndex,
            inputType: srcIsInput ? src_ioType : dst_ioType,
            outputNode: srcIsInput ? dst_nodeId : src_nodeId,
            outputIdx: srcIsInput ? dst_ioIndex : src_ioIndex,
            outputType: srcIsInput ? dst_ioType : src_ioType,
        } );

        path.dataset[ 'id' ] = pathId;

        // Mark as active links...

        linkData.io.dataset[ 'active' ] = true;
        e.target.parentElement.dataset[ 'active' ] = true;

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

        const offsetX = this.root.getBoundingClientRect().x;
        const offsetY = this.root.getBoundingClientRect().y;

        const ios = domEl.querySelector( type == GraphEditor.NODE_IO_INPUT ? '.lexgraphnodeinputs' : '.lexgraphnodeoutputs' );
        const ioEl = ios.childNodes[ index ].querySelector( '.io__type' );
        const startRect = ioEl.getBoundingClientRect();

        let startPos = new LX.vec2( startRect.x - offsetX, startRect.y - offsetY );
        let endPos = null;
        let endioEl = null;

        if( e )
        {
            endPos = new LX.vec2( e.offsetX, e.offsetY );

            // Add node position, since I can't get the correct position directly from the event..
            if( e.target.hasClass( [ 'lexgraphnode', 'lexgraphgroup' ] ) )
            {
                endPos.add( this._getNodePosition( e.target ), endPos );
                endPos.add( new LX.vec2( 3, 3 ), endPos );
            }
            else if( e.target.hasClass( [ 'io__type', 'lexgraphgroupresizer' ] ) )
            {
                var parent = e.target.offsetParent;
                // Add parent offset
                endPos.add( this._getNodePosition( parent ), endPos );
                // Add own offset
                endPos.add( new LX.vec2( e.target.offsetLeft, e.target.offsetTop ), endPos );
                endPos.add( new LX.vec2( 3, 3 ), endPos );
            }

            endPos = this._getRenderPosition( endPos );
        }
        else
        {
            endioEl = endIO.querySelector( '.io__type' );
            const ioRect = endioEl.getBoundingClientRect();
            endPos = new LX.vec2( ioRect.x - offsetX, ioRect.y - offsetY );
        }

        if( type == GraphEditor.NODE_IO_INPUT )
        {
            var tmp = endPos;
            endPos = startPos;
            startPos = tmp;
        }

        let color = getComputedStyle( ioEl ).backgroundColor;

        if( type == GraphEditor.NODE_IO_OUTPUT && endioEl )
            color = getComputedStyle( endioEl ).backgroundColor;

        this._createLinkPath( path, startPos, endPos, color, !!e );

        return path;
    }

    _createLink( link ) {

        var svg = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
        svg.classList.add( "link-svg" );
        svg.style.width = "100%";
        svg.style.height = "100%";
        this._domLinks.appendChild( svg );

        var path = document.createElementNS( 'http://www.w3.org/2000/svg', 'path' );
        path.setAttribute( 'fill', 'none' );
        svg.appendChild( path );

        const inputNodeDom = this._getNodeDOMElement( link.inputNode );
        const outputNodeDom = this._getNodeDOMElement( link.outputNode );

        // Start pos

        const offsetX = this.root.getBoundingClientRect().x;
        const offsetY = this.root.getBoundingClientRect().y;

        const outputs = outputNodeDom.querySelector( '.lexgraphnodeoutputs' );
        const io0 = outputs.childNodes[ link.outputIdx ];
        const startRect = io0.querySelector( '.io__type' ).getBoundingClientRect();

        let startPos = new LX.vec2( startRect.x - offsetX, startRect.y - offsetY + 6 );

        // End pos

        const inputs = inputNodeDom.querySelector( '.lexgraphnodeinputs' );
        const io1 = inputs.childNodes[ link.inputIdx ];
        const endRect = io1.querySelector( '.io__type' ).getBoundingClientRect();

        let endPos = new LX.vec2( endRect.x - offsetX, endRect.y - offsetY + 6 );

        // Generate bezier curve

        const color = getComputedStyle( io1.querySelector( '.io__type' ) ).backgroundColor;
        this._createLinkPath( path, startPos, endPos, color );

        link.path = path;

        // Store data in each IO

        io0.links = [ ];
        io0.links[ link.inputIdx ] = io0.links[ link.inputIdx ] ?? [ ];
        io0.links[ link.inputIdx ].push( link.inputNode );

        io1.links = [ ];
        io1.links[ link.outputIdx ] = io1.links[ link.outputIdx ] ?? [ ];
        io1.links[ link.outputIdx ].push( link.outputNode );

        io0.dataset[ 'active' ] = true;
        io1.dataset[ 'active' ] = true;
    }

    _createLinkPath( path, startPos, endPos, color, exactEnd ) {

        const dist = 6 * this.currentGraph.scale;
        startPos.add( new LX.vec2( dist, dist ), startPos );

        if( !exactEnd )
        {
            endPos.add( new LX.vec2( dist, dist ), endPos );
        }

        startPos = this._getPatternPosition( startPos );
        endPos = this._getPatternPosition( endPos );

        const distanceX = LX.UTILS.clamp( Math.abs( startPos.x - endPos.x ), 0.0, 256.0 );
        const cPDistance = 128.0 * Math.pow( distanceX / 256.0, 0.5 );

        let cPoint1 = startPos.add( new LX.vec2( cPDistance, 0 ) );
        let cPoint2 = endPos.sub( new LX.vec2( cPDistance, 0 ) );

        path.setAttribute( 'd', `
            M ${ startPos.x },${ startPos.y }
            C ${ cPoint1.x },${ cPoint1.y } ${ cPoint2.x },${ cPoint2.y } ${ endPos.x },${ endPos.y }
        ` );

        path.setAttribute( 'stroke', color );
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
            if( !input.links )
                continue;

            // Get first and only target output..
            const targets = input.links.filter( v => v !== undefined )[ 0 ];
            const targetNodeId = targets[ 0 ];

            // It has been deleted..
            if( !targetNodeId )
                continue;

            const ioIndex = parseInt( input.dataset[ 'index' ] );

            var links = this._getLinks( targetNodeId, nodeId );

            // Inputs only have 1 possible output connected
            var link = links.find( i => ( i.inputIdx == ioIndex ) );

            this._generatingLink = {
                index: ioIndex,
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
            if( !output.links )
            continue;

            const srcIndex = parseInt( output.dataset[ 'index' ] );

            for( let targetIndex = 0; targetIndex < output.links.length; ++targetIndex )
            {
                const targets = output.links[ targetIndex ];

                if( !targets )
                continue;

                for( let targetId of targets )
                {
                    var links = this._getLinks( nodeId, targetId );
                    var link = links.find( i => ( i.inputIdx == targetIndex && i.outputIdx == srcIndex ) );

                    // Outputs can have different inputs connected
                    this._generatingLink = {
                        index: link.outputIdx,
                        io: output,
                        ioType: GraphEditor.NODE_IO_OUTPUT,
                        domEl: nodeDOM,
                        path: link.path
                    };

                    // Get end io

                    const inputNode = this._getNodeDOMElement( targetId );
                    const io = inputNode.querySelector( '.lexgraphnodeinputs' ).childNodes[ link.inputIdx ]

                    this._updatePreviewLink( null, io );
                }
            }
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

    _getNonVisibleNodes() {

        const nonVisibleNodes = [ ];

        if( !this.currentGraph )
        {
            console.warn( "No graph set" );
            return [];
        }

        const graph_bb = new BoundingBox( new LX.vec2( 0, 0 ), new LX.vec2( this.root.offsetWidth, this.root.offsetHeight ) );

        for( let node of this.currentGraph.nodes )
        {
            let pos = this._getRenderPosition( node.position );

            let dom = this._getNodeDOMElement( node.id );

            if( !dom )
                continue;

            const node_bb = new BoundingBox( pos, node.size.mul( this.currentGraph.scale ) );

            if( graph_bb.inside( node_bb, false ) )
            {
                // Show if node in viewport..
                dom.classList.toggle( 'hiddenOpacity', false );

                // And hide content if scale is very small..
                dom.childNodes[ 1 ].classList.toggle( 'hiddenOpacity', this.currentGraph.scale < 0.5 );

                continue;
            }

            nonVisibleNodes.push( node );
        }

        return nonVisibleNodes;
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

        for( let nodeEl of this._getAllDOMNodes() )
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

    _getBoundingFromGroup( groupDOM ) {

        const x = parseFloat( groupDOM.style.left );
        const y = parseFloat( groupDOM.style.top );

        return new BoundingBox( new LX.vec2( x, y ), new LX.vec2( groupDOM.offsetWidth - 2, groupDOM.offsetHeight - 2 ) );
    }

    _getBoundingFromNodes( nodeIds ) {

        let group_bb = null;

        for( let nodeId of nodeIds )
        {
            const node = this.nodes[ nodeId ].data;
            const node_bb = new BoundingBox( node.position, node.size );

            if( group_bb )
            {
                group_bb.merge( node_bb );
            }
            else
            {
                group_bb = node_bb;
            }
        }

        // Add padding

        const groupContentPadding = 8;

        group_bb.origin.sub( new LX.vec2( groupContentPadding ), group_bb.origin );
        group_bb.origin.sub( new LX.vec2( groupContentPadding ), group_bb.origin );

        group_bb.size.add( new LX.vec2( groupContentPadding * 2.0 ), group_bb.size );
        group_bb.size.add( new LX.vec2( groupContentPadding * 2.0 ), group_bb.size );

        return group_bb;
    }

    /**
     * @method _createGroup
     * @description Creates a node group from the bounding box of the selected nodes
     * @returns JSON data from the serialized graph
     */

    _createGroup( bb ) {

        const group_bb = bb ?? this._getBoundingFromNodes( this.selectedNodes );
        const group_id = bb ? bb.id : "group-" + LX.UTILS.uidGenerator();

        let groupDOM = document.createElement( 'div' );
        groupDOM.id = group_id;
        groupDOM.classList.add( 'lexgraphgroup' );
        groupDOM.style.left = group_bb.origin.x + "px";
        groupDOM.style.top = group_bb.origin.y + "px";
        groupDOM.style.width = group_bb.size.x + "px";
        groupDOM.style.height = group_bb.size.y + "px";

        let groupResizer = document.createElement( 'div' );
        groupResizer.classList.add( 'lexgraphgroupresizer' );

        groupResizer.addEventListener( 'mousedown', inner_mousedown );

        this.groups[ group_id ] = groupDOM;

        var that = this;
        var lastPos = [0,0];

        function inner_mousedown( e )
        {
            var doc = that.root.ownerDocument;
            doc.addEventListener( 'mousemove', inner_mousemove );
            doc.addEventListener( 'mouseup', inner_mouseup );
            lastPos[0] = e.x;
            lastPos[1] = e.y;
            e.stopPropagation();
            e.preventDefault();
            document.body.classList.add( 'nocursor' );
            groupResizer.classList.add( 'nocursor' );
        }

        function inner_mousemove( e )
        {
            let dt = new LX.vec2( lastPos[0] - e.x, lastPos[1] - e.y );
            dt.div( that.currentGraph.scale, dt);

            groupDOM.style.width = ( parseFloat( groupDOM.style.width ) - dt.x ) + "px";
            groupDOM.style.height = ( parseFloat( groupDOM.style.height ) - dt.y ) + "px";

            lastPos[0] = e.x;
            lastPos[1] = e.y;

            e.stopPropagation();
            e.preventDefault();
        }

        function inner_mouseup( e )
        {
            var doc = that.root.ownerDocument;
            doc.removeEventListener( 'mousemove', inner_mousemove );
            doc.removeEventListener( 'mouseup', inner_mouseup );
            document.body.classList.remove( 'nocursor' );
            groupResizer.classList.remove( 'nocursor' );
        }

        let groupTitle = document.createElement( 'input' );
        let defaultName = `Group ${ GraphEditor.LAST_GROUP_ID }`;
        groupTitle.value = defaultName;
        groupTitle.classList.add( 'lexgraphgrouptitle' );
        groupTitle.disabled = true;

        // Dbl click to rename

        groupTitle.addEventListener( 'mousedown', e => {
            e.stopPropagation();
            e.stopImmediatePropagation();
        } );

        groupTitle.addEventListener( 'focusout', e => {
            groupTitle.disabled = true;
            if( !groupTitle.value.length )
                groupTitle.value = defaultName;
        } );

        groupTitle.addEventListener( 'keyup', e => {
            if( e.key == 'Enter' ) {
                groupTitle.blur();
            }
            else if( e.key == 'Escape' ) {
                groupTitle.value = "";
                groupTitle.blur();
            }
        });

        groupDOM.addEventListener( 'dblclick', e => {
            // Only for left click..
            if( e.button != LX.MOUSE_LEFT_CLICK )
                return;
            groupTitle.disabled = false;
            groupTitle.focus();
        } );

        groupDOM.addEventListener( 'contextmenu', e => {

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            LX.addContextMenu(null, e, m => {
                m.add( "Delete", () => {
                    this._deleteGroup( group_id );
                } );
            });
        } );

        groupDOM.appendChild( groupResizer );
        groupDOM.appendChild( groupTitle );

        this._domNodes.prepend( groupDOM );

        // Move group!!

        LX.makeDraggable( groupDOM, {
            onMove: this._onMoveGroup.bind( this ),
            onDragStart: this._onDragGroup.bind( this )
        } );

        GraphEditor.LAST_GROUP_ID++;

        return groupDOM;
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

    _togglePropertiesDialog( force ) {

        this.propertiesDialog.root.classList.toggle( 'opened', force );

        if( !force )
        {
            this.propertiesDialog.panel.clear();
        }
    }

    _setSnappingValue( value ) {

        this._snapValue = value;
    }

    _toggleSnapping() {

        this._snapToGrid = !this._snapToGrid;

        // Trigger position snapping for each node if needed

        if( this._snapToGrid )
        {
            for( let nodeDom of this._getAllDOMNodes( true ) )
            {
                nodeDom.mustSnap = true;
            }
        }
    }

    _toggleSideBar( force ) {

        this._sidebarActive = force ?? !this._sidebarActive;
        this._sidebarDom.classList.toggle( 'hidden', !this._sidebarActive );
        this._graphContainer.style.width = this._sidebarActive ? "calc( 100% - 64px )" : "100%";
    }

    _onSidebarCreate( e ) {

        LX.addContextMenu(null, e, m => {
            m.add( "Graph", () => this.addGraph() );
            m.add( "Function", () => this.addGraphFunction() );
        });
    }

    _showRenameGraphDialog() {

        const dialog = new LX.Dialog( this.currentGraph.constructor.name, p => {
            p.addText( "Name", this.currentGraph.name, v => {
                this._updateGraphName( v );
                dialog.close();
            } );
        }, { modal: true, size: [ "350px", null ] } );
    }

    _updateGraphName( name ) {

        const newNameKey = name.replace( /\s/g, '' ).replaceAll( '.', '' );

        // Change graph name button
        const nameDom = LX.root.querySelector( '.graph-title button' );
        console.assert( nameDom );
        nameDom.innerText = name;

        // Change name in sidebar
        const graphNameKey = this.currentGraph.name.replace( /\s/g, '' ).replaceAll( '.', '' );
        const sidebarItem = this._sidebar.items.find( v => v.name === graphNameKey );
        if( sidebarItem )
        {
            sidebarItem.name = newNameKey;
            sidebarItem.domEl.id = newNameKey;
            sidebarItem.domEl.querySelector(".lexsidebarentrydesc").innerText = name;
        }

        this.currentGraph.name = name;
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

    constructor( name, options = {} ) {

        this.name = name ?? "Unnamed Graph";
        this.type = 'Graph';

        this.nodes  = [ ];
        this.groups = [ ];
        this.links  = { };
        
        this.scale = 1.0;
        this.translation = new LX.vec2( 0, 0 );
    }

    configure( o ) {

        this.id = o.id;
        this.name = o.name;

        this.nodes.length = 0;

        for( let node of o.nodes )
        {
            const newNode = GraphEditor.addNode( node.type );

            newNode.id = node.id;
            newNode.title = node.title;
            newNode.color = node.color;
            newNode.position = new LX.vec2( node.position.x, node.position.y );
            newNode.type = node.type;
            newNode.properties = node.properties;

            this.nodes.push( newNode );
        }

        this.groups = o.groups;
        this.links = o.links;

        // editor options?

        // zoom/translation ??
    }

    /**
     * @method getNodeById
     */

    getNodeById( id ) {

        for( let node of this.nodes )
        {
            if( node.id == id ) return node;
        }
    }

    /**
     * @method _runStep
     */

    _runStep( mainId ) {

        if( !mainId )
            return;

        const nodes = this.nodes.reduce( ( ac, a ) => ( {...ac, [ a.id ] : a } ), {} );

        // Not main graph..
        if( !nodes[ mainId ] )
            return;

        const visitedNodes = {  };

        this._executionNodes = [ ];

        // Reser variables each step?
        this.variables = { };

        const addNode = ( id ) => {

            if( visitedNodes[ id ] )
                return;

            visitedNodes[ id ] = true;

            for( let linkId in this.links )
            {
                const idx = linkId.indexOf( '@' + id );

                if( idx < 0 )
                    continue;

                const preNodeId = linkId.substring( 0, idx );

                this._executionNodes.push( preNodeId );

                addNode( preNodeId );
            }
        };

        // TODO: Search "no output" nodes and add to the executable list (same as main)..
        // ...

        this._executionNodes.push( mainId );

        addNode( mainId );

        for( var i = this._executionNodes.length - 1; i >= 0; --i )
        {
            const node = nodes[ this._executionNodes[ i ] ];

            if( node.onBeforeStep )
                node.onBeforeStep();

            node.execute();

            if( node.onBeforeStep )
                node.onAfterStep();
        }
    }

    /**
     * @method export
     * @param {Boolean} prettify
     * @returns JSON data from the serialized graph
     */

    export( prettify = true ) {
        
        var o = { };

        o.id = this.id;
        o.name = this.name;
        o.type = this.type;

        o.nodes = [ ];
        o.groups = [ ];
        o.links = { };

        for( let node of this.nodes )
        {
            o.nodes.push( node.serialize() );
        }

        for( let linkId in this.links )
        {
            const ioLinks = LX.deepCopy( this.links[ linkId ] );
            ioLinks.forEach( v => delete v.path );
            o.links[ linkId ] = ioLinks;
        }

        for( let group of this.groups )
        {
            const groupDom = this.editor.groups[ group.id ];
            const group_bb = this.editor._getBoundingFromGroup( groupDom );
            group_bb.id = group.id;
            group_bb.name = group.name
            o.groups.push( group_bb );
        }

        // editor options?

        // zoom/translation ??

        try
        {
            o = JSON.stringify( o, null, prettify ? 2 : null );
        }
        catch( e )
        {
            o = null;
            console.error( `Can't export GraphNode [${ this.title }] of type [${ this.type }].` );
        }

        LX.downloadFile( this.name + ".json", o );

        return o;
    }
}

LX.Graph = Graph;

/**
 * @class GraphNode
 */

class GraphNode {

    constructor() { 

        this.inputs     = [ ];
        this.outputs    = [ ];
        this.properties = [ ];
    }

    _hasOutputsConnected() {

        return true;
    }

    execute() {

        if( !this._hasOutputsConnected() )
            return;

        if( this.onExecute )
        {
            this.onExecute();
        }
    }

    addInput( name, type ) {

        this.inputs.push( { name: name, type: type } );
    }

    addOutput( name, type ) {

        this.outputs.push( { name: name, type: type } );
    }

    addProperty( name, type, value, selectOptions ) {

        this.properties.push( { name: name, type: type, value: value, options: selectOptions } );
    }

    getInput( index ) {

        if( !this.inputs || !this.inputs.length || !this.inputs[ index ] )
            return;

        const graph = this.editor.graphs[ this.graphID ];

        // Get data from link

        for( let linkId in graph.links )
        {
            const idx = linkId.indexOf( '@' + this.id );

            if( idx < 0 )
                continue;

            const nodeLinks = graph.links[ linkId ];

            for ( var link of nodeLinks )
            {
                if( link.inputIdx != index )
                    continue;

                // This is the value!!
                return link.data;
            }
        }
    }

    setOutput( index, data ) {

        if( !this.outputs || !this.outputs.length || !this.outputs[ index ] )
            return;

        const graph = this.editor.graphs[ this.graphID ];

        // Set data in link

        for( let linkId in graph.links )
        {
            const idx = linkId.indexOf( this.id + '@' );

            if( idx < 0 )
                continue;

            const nodeLinks = graph.links[ linkId ];

            for ( var link of nodeLinks )
            {
                if( link.outputIdx != index )
                    continue;

                let innerData = data;

                if( innerData != undefined && link.inputType != link.outputType && link.inputType != "any" && link.outputType != "any"  )
                {
                    // In case of supported casting, use function to cast..

                    var fn = this.editor.supportedCastTypes[ link.outputType + '@' + link.inputType ];

                    // Use function if it's possible to cast!

                    innerData = fn ? fn( LX.deepCopy( innerData ) ) : null;
                }

                link.data = innerData;
            }
        }
    }

    serialize() {

        var o = { };

        o.id = this.id;
        o.title = this.title;
        o.color = this.color;
        o.position = this.position;
        o.type = this.type;
        o.inputs = this.inputs;
        o.outputs = this.outputs;
        o.properties = this.properties;

        return o;
    }
}

LX.GraphNode = GraphNode;

/**
 * @class GraphFunction
 */

class GraphFunction extends Graph {

    constructor( name, options = { } ) {

        super();

        this.name = name ?? ( "GraphFunction" + GraphEditor.LAST_FUNCTION_ID );
        this.type = 'GraphFunction';

        GraphEditor.LAST_FUNCTION_ID++

        const nodeInput = GraphEditor.addNode( "function/Input" );
        nodeInput.position = new LX.vec2( 150, 250 );

        const nodeOutput = GraphEditor.addNode( "function/Output" );
        nodeOutput.position = new LX.vec2( 650, 350 );

        this.nodes.push( nodeInput, nodeOutput );
    }

    getOutputData( inputValue ) {

        const inputNode = this.nodes[ 0 ];
        inputNode.setOutput( 0, inputValue );

        const outputNode = this.nodes[ 1 ];

        this._runStep( outputNode.id );

        return outputNode.getInput( 0 );
    }
}

LX.GraphFunction = GraphFunction;

/* 
    ************ PREDEFINED NODES ************

    Nodes can override the following methods:

        - onCreate: Add inputs, outputs and properties
        - onStart: Callback on graph starts
        - onStop: Callback on graph stops
        - onExecute: Callback for node execution
*/

/*
    Function nodes
*/

class NodeFuncInput extends GraphNode
{
    onCreate() {
        this.addOutput( null, "float" );
        this.addProperty( "Outputs", "array", [ "float" ], [ 'float', 'int', 'bool', 'vec2', 'vec3', 'vec4', 'mat44' ] );
    }

    onExecute() {
        // var a = this.getInput( 0 ) ?? this.properties[ 0 ].value;
        // var b = this.getInput( 1 ) ?? this.properties[ 1 ].value;
        // this.setOutput( 0, a + b );
    }

    setOutputs( v ) {

        this.outputs.length = 0;

        for( var i of v )
        {
            this.outputs.push( { name: null, type: i } );
        }
    }
}

NodeFuncInput.blockDelete = true;
NodeFuncInput.blockAdd = true;
GraphEditor.registerCustomNode( "function/Input", NodeFuncInput );

class NodeFuncOutput extends GraphNode
{
    onCreate() {
        this.addInput( null, "any" );
    }

    onExecute() {
        // var a = this.getInput( 0 ) ?? this.properties[ 0 ].value;
        // var b = this.getInput( 1 ) ?? this.properties[ 1 ].value;
        // this.setOutput( 0, a + b );
    }
}

NodeFuncOutput.blockDelete = true;
NodeFuncOutput.blockAdd = true;
GraphEditor.registerCustomNode( "function/Output", NodeFuncOutput );

/*
    Math nodes
*/

class NodeAdd extends GraphNode
{
    onCreate() {
        this.addInput( null, "float" );
        this.addInput( null, "float" );
        this.addOutput( null, "float" );
        this.addProperty( "A", "float", 0 );
        this.addProperty( "B", "float", 0 );
    }
    
    onExecute() {
        var a = this.getInput( 0 ) ?? this.properties[ 0 ].value;
        var b = this.getInput( 1 ) ?? this.properties[ 1 ].value;
        this.setOutput( 0, a + b );
    }
}

NodeAdd.description = "Addition of 2 values (A+B)."
GraphEditor.registerCustomNode( "math/Add", NodeAdd );

class NodeSubstract extends GraphNode
{
    onCreate() {
        this.addInput( null, "float" );
        this.addInput( null, "float" );
        this.addOutput( null, "float" );
        this.addProperty( "A", "float", 0 );
        this.addProperty( "B", "float", 0 );
    }
    
    onExecute() {
        var a = this.getInput( 0 ) ?? this.properties[ 0 ].value;
        var b = this.getInput( 1 ) ?? this.properties[ 1 ].value;
        this.setOutput( 0, a - b );
    }
}

NodeSubstract.description = "Substraction of 2 values (A-B)."
GraphEditor.registerCustomNode( "math/Substract", NodeSubstract );

class NodeMultiply extends GraphNode
{
    onCreate() {
        this.addInput( null, "float" );
        this.addInput( null, "float" );
        this.addOutput( null, "float" );
        this.addProperty( "A", "float", 0 );
        this.addProperty( "B", "float", 0 );
    }
    
    onExecute() {
        var a = this.getInput( 0 ) ?? this.properties[ 0 ].value;
        var b = this.getInput( 1 ) ?? this.properties[ 1 ].value;
        this.setOutput( 0, a * b );
    }
}

NodeMultiply.description = "Multiplication of 2 values (A*B)."
GraphEditor.registerCustomNode( "math/Multiply", NodeMultiply );

class NodeDivide extends GraphNode
{
    onCreate() {
        this.addInput( null, "float" );
        this.addInput( null, "float" );
        this.addOutput( null, "float" );
        this.addProperty( "A", "float", 0 );
        this.addProperty( "B", "float", 0 );
    }
    
    onExecute() {
        var a = this.getInput( 0 ) ?? this.properties[ 0 ].value;
        var b = this.getInput( 1 ) ?? this.properties[ 1 ].value;
        this.setOutput( 0, a / b );
    }
}

NodeDivide.description = "Division of 2 values (A/B)."
GraphEditor.registerCustomNode( "math/Divide", NodeDivide );

class NodeSqrt extends GraphNode
{
    onCreate() {
        this.addInput( null, "float" );
        this.addOutput( null, "float" );
        this.addProperty( "Value", "float", 0 );
    }
    
    onExecute() {
        var a = this.getInput( 0 ) ?? this.properties[ 0 ].value;
        this.setOutput( 0, Math.sqrt( a ) );
    }
}

NodeSqrt.description = "Square root of a scalar."
GraphEditor.registerCustomNode( "math/SQRT", NodeSqrt );

/*
Math Missing:
- abs
- ceil
- clamp
- floor
- fract
- lerp
- log
- max
- min
- negate
- pow
- remainder
- round
- remap range
- saturate
- step
*/


/*
    Logical operator nodes
*/

class NodeAnd extends GraphNode
{
    onCreate() {
        this.addInput( null, "bool" );
        this.addInput( null, "bool" );
        this.addOutput( null, "bool" );
    }
    
    onExecute() {
        var a = this.getInput( 0 ), b = this.getInput( 1 );
        if( a == undefined || b == undefined )
            return;
        this.setOutput( 0, !!( a ) && !!( b ) );
    }
}

GraphEditor.registerCustomNode( "logic/And", NodeAnd );

class NodeOr extends GraphNode
{
    onCreate() {
        this.addInput( null, "bool" );
        this.addInput( null, "bool" );
        this.addOutput( null, "bool" );
    }
    
    onExecute() {
        var a = this.getInput( 0 ), b = this.getInput( 1 );
        if( a == undefined || b == undefined )
            return;
        this.setOutput( 0, !!( a ) || !!( b ) );
    }
}

GraphEditor.registerCustomNode( "logic/Or", NodeOr );

class NodeEqual extends GraphNode
{
    onCreate() {
        this.addInput( null, "float" );
        this.addInput( null, "float" );
        this.addOutput( null, "bool" );
    }
    
    logicOp( a, b ) {
        return a == b;
    }

    onExecute() {
        var a = this.getInput( 0 ), b = this.getInput( 1 );
        if( a == undefined || b == undefined )
            return;
        this.setOutput( 0, this.logicOp( a, b ) );
    }
}

GraphEditor.registerCustomNode( "logic/Equal", NodeEqual );

class NodeNotEqual extends NodeEqual
{
    logicOp( a, b ) {
        return a != b;
    }
}

GraphEditor.registerCustomNode( "logic/NotEqual", NodeNotEqual );

class NodeLess extends NodeEqual
{
    logicOp( a, b ) {
        return a < b;
    }
}

GraphEditor.registerCustomNode( "logic/Less", NodeLess );

class NodeLessEqual extends NodeEqual
{
    logicOp( a, b ) {
        return a <= b;
    }
}

GraphEditor.registerCustomNode( "logic/LessEqual", NodeLessEqual );

class NodeGreater extends NodeEqual
{
    logicOp( a, b ) {
        return a > b;
    }
}

GraphEditor.registerCustomNode( "logic/Greater", NodeGreater );

class NodeGreaterEqual extends NodeEqual
{
    logicOp( a, b ) {
        return a >= b;
    }
}

GraphEditor.registerCustomNode( "logic/GreaterEqual", NodeGreaterEqual );

class NodeSelect extends GraphNode
{
    onCreate() {
        this.addInput( "True", "any" );
        this.addInput( "False", "any" );
        this.addInput( "Condition", "bool" );
        this.addOutput( null, "any" );
    }
    
    onExecute() {
        var a = this.getInput( 0 ), b = this.getInput( 1 ), cond = this.getInput( 2 );
        if( a == undefined || b == undefined || cond == undefined )
            return;
        this.setOutput( 0, cond ? a : b );
    }
}

GraphEditor.registerCustomNode( "logic/Select", NodeSelect );

class NodeCompare extends GraphNode
{
    onCreate() {
        this.addInput( "A", "any" );
        this.addInput( "B", "any" );
        this.addInput( "True", "any" );
        this.addInput( "False", "any" );
        this.addProperty( "Condition", "select", 'Equal', [ 'Equal', 'Not Equal', 'Less', 'Less Equal', 'Greater', 'Greater Equal' ] );
        this.addOutput( null, "any" );
    }
    
    onExecute() {
        var a = this.getInput( 0 ), b = this.getInput( 1 ), TrueVal = this.getInput( 2 ), FalseVal = this.getInput( 3 );;
        var cond = this.properties[ 0 ].value;
        if( a == undefined || b == undefined || TrueVal == undefined || FalseVal == undefined )
            return;
        var output;
        switch( cond ) {
            case 'Equal': output = ( a == b ? TrueVal : FalseVal ); break;
            case 'Not Equal': output = ( a != b ? TrueVal : FalseVal ); break;
            case 'Less': output = ( a < b ? TrueVal : FalseVal ); break;
            case 'Less Equal': output = ( a <= b ? TrueVal : FalseVal ); break;
            case 'Greater': output = ( a > b ? TrueVal : FalseVal ); break;
            case 'Greater Equal': output = ( a >= b ? TrueVal : FalseVal ); break;
        }
        this.setOutput( 0, output );
    }
}
NodeCompare.description = "Compare A to B given the selected operator. If true, return value of True else return value of False."
GraphEditor.registerCustomNode( "logic/Compare", NodeCompare );

/*
    Event nodes
*/

class NodeKeyDown extends GraphNode
{
    onCreate() {
        this.addOutput( null, "bool" );
        this.addProperty( "Key", "string", " " );
    }
    
    onExecute() {
        this.setOutput( 0, !!this.editor.keys[ this.properties[ 0 ].value ] );
    }
}

GraphEditor.registerCustomNode( "events/KeyDown", NodeKeyDown );

/*
    Input nodes
*/

class NodeString extends GraphNode
{
    onCreate() {
        this.addOutput( null, "string" );
        this.addProperty( null, "string", "text" );
    }
    
    onExecute() {
        this.setOutput( 0, this.properties[ 0 ].value );
    }
}

GraphEditor.registerCustomNode( "inputs/String", NodeString );

class NodeFloat extends GraphNode
{
    onCreate() {
        this.addOutput( null, "float" );
        this.addProperty( null, "float", 0.0 );
    }
    
    onExecute() {
        this.setOutput( 0, this.properties[ 0 ].value );
    }
}

GraphEditor.registerCustomNode( "inputs/Float", NodeFloat );

class NodeVector2 extends GraphNode
{
    onCreate() {
        this.addOutput( "Value", "vec2" );
        this.addProperty( "Value", "vec2", [ 0, 0 ] );
    }
    
    onExecute() {
        this.setOutput( 0, this.properties[ 0 ].value );
    }
}

GraphEditor.registerCustomNode( "inputs/Vector2", NodeVector2 );

class NodeVector3 extends GraphNode
{
    onCreate() {
        this.addOutput( "Value", "vec3" );
        this.addProperty( "Value", "vec3", [ 0, 0, 0 ] );
    }
    
    onExecute() {
        this.setOutput( 0, this.properties[ 0 ].value );
    }
}

GraphEditor.registerCustomNode( "inputs/Vector3", NodeVector3 );

class NodeVector4 extends GraphNode
{
    onCreate() {
        this.addOutput( "Value", "vec4" );
        this.addProperty( "Value", "vec4", [ 0, 0, 0, 0 ] );
    }
    
    onExecute() {
        this.setOutput( 0, this.properties[ 0 ].value );
    }
}

GraphEditor.registerCustomNode( "inputs/Vector4", NodeVector4 );

/*
    Variable nodes
*/

class NodeSetVariable extends GraphNode
{
    onCreate() {
        this.addInput( "Value", "any" );
        this.addOutput( null, "any" );
        this.addProperty( "Name", "string", "" );
    }
    
    onExecute() {
        var varName = this.getInput( 0 );
        if( varName == undefined )
            return;
        var varValue = this.getInput( 1 );
        if( varValue == undefined )
            return;
        this.editor.setVariable( varName, varValue );
        this.setOutput( 0, varValue );
    }
}

NodeSetVariable.title = "Set Variable";
GraphEditor.registerCustomNode( "variables/SetVariable", NodeSetVariable );

class NodeGetVariable extends GraphNode
{
    onCreate() {
        this.addOutput( null, "any" );
        this.addProperty( "Name", "string", "" );
    }

    onExecute() {
        var varName = this.getInput( 0 );
        if( varName == undefined )
            return;
        var data = this.editor.getVariable( varName );
        if( data != undefined )
            this.setOutput( 0, data );
    }
}

NodeGetVariable.title = "Get Variable";
GraphEditor.registerCustomNode( "variables/GetVariable", NodeGetVariable );

/*
    System nodes
*/

class NodeConsoleLog extends GraphNode
{
    onCreate() {
        this.addInput( null, "any" );
    }

    onExecute() {
        var data = this.getInput( 0 );
        if( data == undefined )
            return;
        console.log( data );
    }
}

NodeConsoleLog.title = "Console Log";
GraphEditor.registerCustomNode( "system/ConsoleLog", NodeConsoleLog );

class NodeMain extends GraphNode
{
    onCreate() {
        this.addInput( "a", "float" );
        this.addInput( "b", "bool" );
        this.addInput( "Color", "vec4" );
    }

    onExecute() {
        var data = this.getInput( 2 );
        if( data == undefined )
            return;
        console.log( data );
    };
}

NodeMain.blockDelete = true;
GraphEditor.registerCustomNode( "system/Main", NodeMain );

export { GraphEditor, Graph, GraphNode };