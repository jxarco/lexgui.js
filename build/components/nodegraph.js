(function(global){

    if(!global.LX) {
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
     * @class GraphCanvas
     */

    class GraphCanvas {

        static __instances  = [];

        static BACK_IMAGE_SRC = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAplJREFUeF7tm8FqwzAQRG2DDynEvaT//5fNKXFRCqZQkjLSyEzxC/Qmb5eZN9pYasfL5WMd+MQoMBZDxnEc5nl+2tS6rkP5mabpZeNlzf1+f6wrNZ99jrau6HC73f7UpazbDDmfFwsl1+vncDq9WWqVIkerhyGN6LiBwRAM0RRwE5hej4RofPxa7TYYQzBEU8BNYHo9EqLxsc+WVX7Lsrw3tvb9eDqB6f2RkEYM3QZjCIZoCrgJTK9HQjQ+9hnq5WSWw8U6Z9yJIyF1PmxPYUiYgBiCIZoCbmKOVu8xQ4rkr65wNUtY3aIAQ71FvQ5HRRiCIZoCh5whvBhqkPxc7QaGLaveiy7XDRiCIZoC7i0hvR4J0fjgtDedaHd/25s6d+p1UeliCF9768zo8UcdzJB6L/ja26hdFwHZshpdcQvorseWFWYwhmCIpoB7S0ivR0I0PnhTTyfa3R936o0JcT/OltWoaJeEcHRS7wqG1GvHm3qjdv9CQBLS6LJbQHc9hnqYwRiCIZoC7i0hvR4J0fjY5+ik/Bbu1OuccSeOhNT5sD2FIWECYgiGaAq4iTlaPWaIxts+37I47a13xZ1gElLvRZfDTwzBEE0B95aQXo87dY2P7qvZsholdicOQzBEU8BNYHo9EqLxwYthOtHu/kgICdEUcBOYXo+EaHwwQ9KJdvfH/6mTEE0BN4Hp9ZghGh/MkHSi3f2REBKiKeAmML0eCdH4YIakE+3uj4SQEE0BN4Hp9bhT1/jovpotq1Fid+IwBEM0BdwEptcjIRofvIekE+3uj4SQEE0BN4Hp9UiIxgczJJ1od38khIRoCrgJTK9HQjQ+mCHpRLv7IyEkRFPATWB6PRKi8cEMSSfa3R8JISGaAm4C0+t9AfQNJzgm7/oIAAAAAElFTkSuQmCC";

        // Node Drawing
        static NODE_TITLE_HEIGHT    = 24;
        static NODE_ROW_HEIGHT      = 16;

        static NODE_SHAPE_RADIUS    = 4;
        static NODE_TITLE_RADIUS    = [GraphCanvas.NODE_SHAPE_RADIUS, GraphCanvas.NODE_SHAPE_RADIUS, 0, 0];
        static NODE_BODY_RADIUS     = [GraphCanvas.NODE_SHAPE_RADIUS, GraphCanvas.NODE_SHAPE_RADIUS, GraphCanvas.NODE_SHAPE_RADIUS, GraphCanvas.NODE_SHAPE_RADIUS];

        static DEFAULT_NODE_TITLE_COLOR     = "#4a59b0";
        static DEFAULT_NODE_BODY_COLOR      = "#111";

        /**
         * @param {*} options
         * 
         */

        constructor( area, options = {} ) {

            GraphCanvas.__instances.push( this );

            this.base_area = area;
            this.area = new LX.Area( { className: "lexGraph" } );

            area.root.classList.add('grapharea');

            this.root = this.area.root;
            area.attach( this.root );

            // Bind resize
            area.onresize = ( bb ) => {
                this.dom.width = bb.width;
                this.dom.height = bb.height;
                this._backDirty = true;
                this._frontDirty = true;
            };

            this.root.addEventListener( 'keydown', this._processKey.bind(this), true);
            this.root.addEventListener( 'mousedown', this._processMouse.bind(this) );
            this.root.addEventListener( 'mouseup', this._processMouse.bind(this) );
            this.root.addEventListener( 'mousemove', this._processMouse.bind(this) );
            this.root.addEventListener( 'click', this._processMouse.bind(this) );
            this.root.addEventListener( 'contextmenu', this._processMouse.bind(this) );
            this.root.addEventListener( 'focus', this._processFocus.bind(this, true) );
            this.root.addEventListener( 'focusout', this._processFocus.bind(this, false) );

            // State

            this.drawAllFrames      = false;
            this.isFocused          = false;
            this._backDirty         = true;
            this._frontDirty        = true;

            // Canvas

            this.dom = document.createElement('canvas');
            this.dom.width = area.size[0];
            this.dom.height = area.size[1];
            this.dom.tabIndex = -1;
            this.area.attach( this.dom );

            this.frames         = 0;
            this.fps            = 0;
            this._lastDrawTime  = 0;
            this._drawTime      = 0;

            this.font = new FontFace("Ubuntu", "url(../data/Ubuntu-Bold.ttf)");
            this.font.load().then(
                ( font ) => {
                    document.fonts.add( font );
                    requestAnimationFrame( this.frame.bind(this) );
                },
                (err) => {
                    console.error(err);
                },
            );
        }

        static getInstances()
        {
            return GraphCanvas.__instances;
        }

        _processFocus( active ) {

            this.isFocused = active;
        }

        _processKey(e) {

            var key = e.key ?? e.detail.key;
            console.log( key );
        }

        _processMouse(e) {

            if( e.type == 'mousedown' )
            {
                this.lastMouseDown = LX.getTime();
            }
            
            else if( e.type == 'mouseup' )
            {
                if( (LX.getTime() - this.lastMouseDown) < 300 ) {
                    this._processClick(e);
                }
            }

            else if( e.type == 'mousemove' )
            {
                
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

            else if ( e.type == 'contextmenu' ) {
                e.preventDefault()
                this._processContextMenu( e );
            }
        }

        _processClick( e ) {

            
        }

        _processContextMenu( e ) {
            
            LX.addContextMenu( "Test", e, m => {
                m.add( "option 1", () => { } );
                m.add( "option 2", () => { } );
            });
        }

        _forceDraw() {

            this._backDirty = true;
            this._frontDirty = true;
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

            // this.update();
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

            if (!this.dom || !this.dom.width || !this.dom.height)
                return;

            // Count Fps
            var now = LX.getTime();
            this._drawTime = (now - this._lastDrawTime) * 0.001;
            this._lastDrawTime = now;

            // if (this.graph) {
            //     this.ds.computeVisibleArea(this.viewport);
            // }

            const forceDraw = this.drawAllFrames || (this._backDirty || this._frontDirty);

            if ( forceDraw )
            {
                if( this._backDirty ) 
                    this._drawBack();
                if ( this._frontDirty )
                    this._drawFront();
            }

            this.fps = this._drawTime ? (1.0 / this._drawTime) : 0;
            this.frames += 1;
        }

        _drawBack() {

            console.log( "_drawBack" );

            var ctx = this.dom.getContext("2d");

            if ( !GraphCanvas.BACK_IMAGE_SRC )
                return;

            ctx.imageSmoothingEnabled = false;

            if ( !this._backImage ) {
                this._backImage = new Image();
                this._backImage.src = GraphCanvas.BACK_IMAGE_SRC;
                this._backImage.onload = this._forceDraw.bind(this);
            }

            if ( !this._pattern && this._backImage.width > 0) {
                this._pattern = ctx.createPattern(this._backImage, "repeat");
            }

            // Draw background

            if (this._pattern) {
                ctx.fillStyle = this._pattern;
                ctx.fillRect(0, 0, this.dom.width, this.dom.height);
                ctx.fillStyle = "transparent";
            }
            
            ctx.globalAlpha = 1.0;
            ctx.imageSmoothingEnabled = true;

            // Draw node connections

            this._drawConnections();

            this._backDirty = false;
        }

        _drawFront() {

            console.log( "_drawFront" );

            let nodes = this._getVisibleNodes();

            for( let node of nodes )
            {
                this._drawNode( node );
            }

            this._frontDirty = false;
        }

        _resetCanvasShadows( ctx ) {

            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = 0;
            ctx.shadowColor = "rgba(0,0,0,0)";
        }

        _computeNodeSize( node ) {

            const ctx = this.dom.getContext("2d");
            var textMetrics = ctx.measureText( node.name );

            let sX = 32 + textMetrics.width * 1.475;

            const rows = Math.max(1,  Math.max(node.inputs.length, node.outputs.length));
            let sY = rows * GraphCanvas.NODE_ROW_HEIGHT + GraphCanvas.NODE_TITLE_HEIGHT;

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

            console.log( node.name );

            // Process some attributes
            node.size = node.size ?? this._computeNodeSize( node );
            node.color = node.color ?? GraphCanvas.DEFAULT_NODE_BODY_COLOR;
            node.titleColor = node.titleColor ?? GraphCanvas.DEFAULT_NODE_TITLE_COLOR;

            let [pX, pY] = node.position;
            let [sX, sY] = node.size;

            const ctx = this.dom.getContext("2d");
            const offsetY = GraphCanvas.NODE_TITLE_HEIGHT;

            // Body

            ctx.shadowBlur = 8;
            ctx.shadowColor = "#000";

            ctx.beginPath();
            ctx.fillStyle = node.color;
            ctx.roundRect( pX, pY, sX, sY, GraphCanvas.NODE_BODY_RADIUS );
            ctx.fill();

            this._resetCanvasShadows( ctx );

            // Draw border
            ctx.beginPath();
            ctx.strokeStyle = "#555";
            ctx.roundRect( pX, pY, sX, sY, GraphCanvas.NODE_BODY_RADIUS );
            ctx.stroke();

            // Title

            ctx.beginPath();
            var titleGrd = ctx.createLinearGradient(pX, pY, pX + sX, pY + offsetY);
            titleGrd.addColorStop(0, node.color);
            titleGrd.addColorStop(1, node.titleColor);

            ctx.fillStyle = titleGrd;
            ctx.roundRect( pX + 1, pY, sX - 2, offsetY, GraphCanvas.NODE_TITLE_RADIUS );
            ctx.fill();

            ctx.font = "14px Ubuntu";
            ctx.fillStyle = "#ddd";
            ctx.fillText( node.name, pX + 16, pY + offsetY * 0.75);
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

    LX.GraphCanvas = GraphCanvas;

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
                    xsize: [120, 100],
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
            let sY = rows * GraphCanvas.NODE_ROW_HEIGHT + GraphCanvas.NODE_TITLE_HEIGHT;

            return [sX, sY];
        }
    }

    LX.GraphNode = GraphNode;

})( typeof(window) != "undefined" ? window : (typeof(self) != "undefined" ? self : global ) );