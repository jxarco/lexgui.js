// panel.js @jxarco
import { LX } from './core.js';

/**
 * @class Panel
 */

class Panel {

    /**
     * @param {Object} options
     * id: Id of the element
     * className: Add class to the element
     * width: Width of the panel element [fit space]
     * height: Height of the panel element [fit space]
     * style: CSS Style object to be applied to the panel
     */

    constructor( options = {} ) {

        var root = document.createElement('div');
        root.className = "lexpanel";

        if( options.id )
        {
            root.id = options.id;
        }

        if( options.className )
        {
            root.className += " " + options.className;
        }

        root.style.width = options.width || "100%";
        root.style.height = options.height || "100%";
        Object.assign( root.style, options.style ?? {} );

        this.root = root;
        this.branches = [];
        this.widgets = {};

        this._branchOpen = false;
        this._currentBranch = null;
        this._queue = []; // Append widgets in other locations
        this._inlineWidgetsLeft = -1;
        this._inline_queued_container = null;
    }

    get( name ) {

        return this.widgets[ name ];
    }

    getValue( name ) {

        let widget = this.widgets[ name ];

        if( !widget )
        {
            throw( "No widget called " + name );
        }

        return widget.value();
    }

    setValue( name, value, skipCallback ) {

        let widget = this.widgets[ name ];

        if( !widget )
        {
            throw( "No widget called " + name );
        }

        return widget.set( value, skipCallback );
    }

    /**
     * @method attach
     * @param {Element} content child element to append to panel
     */

    attach( content ) {

        console.assert( content, "No content to attach!" );
        content.parent = this;
        this.root.appendChild( content.root ? content.root : content );
    }

    /**
     * @method clear
     */

    clear() {

        this._branchOpen = false;
        this.branches = [];
        this._currentBranch = null;

        for( let w in this.widgets )
        {
            if( this.widgets[ w ].options && this.widgets[ w ].options.signal )
            {
                const signal = this.widgets[ w ].options.signal;
                for( let i = 0; i < LX.signals[signal].length; i++ )
                {
                    if( LX.signals[signal][ i ] == this.widgets[ w ] )
                    {
                        LX.signals[signal] = [...LX.signals[signal].slice(0, i), ...LX.signals[signal].slice(i+1)];
                    }
                }
            }
        }

        if( this.signals )
        {
            for( let w = 0; w < this.signals.length; w++ )
            {
                let widget = Object.values(this.signals[ w ])[ 0 ];
                let signal = widget.options.signal;
                for( let i = 0; i < LX.signals[signal].length; i++ )
                {
                    if( LX.signals[signal][ i ] == widget )
                    {
                        LX.signals[signal] = [...LX.signals[signal].slice(0, i), ...LX.signals[signal].slice(i+1)];
                    }
                }
            }
        }

        this.widgets = {};
        this.root.innerHTML = "";
    }

    /**
     * @method sameLine
     * @param {Number} number Of widgets that will be placed in the same line
     * @param {String} className Extra class to customize inline widgets parent container
     * @description Next N widgets will be in the same line. If no number, it will inline all until calling nextLine()
     */

    sameLine( number, className ) {

        this._inline_queued_container = this.queuedContainer;
        this._inlineWidgetsLeft = ( number ?? Infinity );
        this._inlineExtraClass = className ?? null;
    }

    /**
     * @method endLine
     * @param {String} className Extra class to customize inline widgets parent container
     * @description Stop inlining widgets. Use it only if the number of widgets to be inlined is NOT specified.
     */

    endLine( className ) {

        className = className ?? this._inlineExtraClass;

        if( this._inlineWidgetsLeft == -1 )
        {
            console.warn("No pending widgets to be inlined!");
            return;
        }

        this._inlineWidgetsLeft = -1;

        if( !this._inlineContainer )
        {
            this._inlineContainer = document.createElement('div');
            this._inlineContainer.className = "lexinlinewidgets";

            if( className )
            {
                this._inlineContainer.className += ` ${ className }`;
            }
        }

        // Push all elements single element or Array[element, container]
        for( let item of this._inlineWidgets )
        {
            const isPair = ( item.constructor == Array );

            if( isPair )
            {
                // eg. an array, inline items appended later to
                if( this._inline_queued_container )
                {
                    this._inlineContainer.appendChild( item[ 0 ] );
                }
                // eg. a select, item is appended to parent, not to inline cont.
                else
                {
                    item[ 1 ].appendChild( item[ 0 ] );
                }
            }
            else
            {
                this._inlineContainer.appendChild( item );
            }
        }

        if( !this._inline_queued_container )
        {
            if( this._currentBranch )
            {
                this._currentBranch.content.appendChild( this._inlineContainer );
            }
            else
            {
                this.root.appendChild( this._inlineContainer );
            }
        }
        else
        {
            this._inline_queued_container.appendChild( this._inlineContainer );
        }

        delete this._inlineWidgets;
        delete this._inlineContainer;
        delete this._inlineExtraClass;
    }

    /**
     * @method branch
     * @param {String} name Name of the branch/section
     * @param {Object} options
     * id: Id of the branch
     * className: Add class to the branch
     * closed: Set branch collapsed/opened [false]
     * icon: Set branch icon (LX.ICONS)
     * filter: Allow filter widgets in branch by name [false]
     */

    branch( name, options = {} ) {

        if( this._branchOpen )
        {
            this.merge();
        }

        // Create new branch
        var branch = new LX.Branch( name, options );
        branch.panel = this;

        // Declare new open
        this._branchOpen = true;
        this._currentBranch = branch;

        this.branches.push( branch );
        this.root.appendChild( branch.root );

        // Add widget filter
        if( options.filter )
        {
            this._addFilter( options.filter, { callback: this._searchWidgets.bind( this, branch.name ) } );
        }

        return branch;
    }

    merge() {
        this._branchOpen = false;
        this._currentBranch = null;
    }

    _pick( arg, def ) {
        return (typeof arg == 'undefined' ? def : arg);
    }

    /*
        Panel Widgets
    */

    _attachWidget( widget, options = {} ) {

        if( widget.name != undefined )
        {
            this.widgets[ widget.name ] = widget;
        }

        if( widget.options.signal && !widget.name )
        {
            if( !this.signals )
            {
                this.signals = [];
            }

            this.signals.push( { [ widget.options.signal ]: widget } )
        }

        const _insertWidget = el => {
            if( options.container )
            {
                options.container.appendChild( el );
            }
            else if( !this.queuedContainer )
            {
                if( this._currentBranch )
                {
                    if( !options.skipWidget )
                    {
                        this._currentBranch.widgets.push( widget );
                    }
                    this._currentBranch.content.appendChild( el );
                }
                else
                {
                    el.className += " nobranch w-full";
                    this.root.appendChild( el );
                }
            }
            // Append content to queued tab container
            else
            {
                this.queuedContainer.appendChild( el );
            }
        };

        const _storeWidget = el => {

            if( !this.queuedContainer )
            {
                this._inlineWidgets.push( el );
            }
            // Append content to queued tab container
            else
            {
                this._inlineWidgets.push( [ el, this.queuedContainer ] );
            }
        };

        // Process inline widgets
        if( this._inlineWidgetsLeft > 0 && !options.skipInlineCount )
        {
            if( !this._inlineWidgets )
            {
                this._inlineWidgets = [];
            }

            // Store widget and its container
            _storeWidget( widget.root );

            this._inlineWidgetsLeft--;

            // Last widget
            if( !this._inlineWidgetsLeft )
            {
                this.endLine();
            }
        }
        else
        {
            _insertWidget( widget.root );
        }

        return widget;
    }

    _addFilter( placeholder, options = {} ) {

        options.placeholder = placeholder.constructor == String ? placeholder : "Filter properties..";
        options.skipWidget = options.skipWidget ?? true;
        options.skipInlineCount = true;

        let widget = new LX.TextInput( null, null, null, options )
        const element = widget.root;
        element.className += " lexfilter";

        let input = document.createElement('input');
        input.className = 'lexinput-filter';
        input.setAttribute( "placeholder", options.placeholder );
        input.style.width =  "100%";
        input.value = options.filterValue || "";

        let searchIcon = LX.makeIcon( "Search" );
        element.appendChild( searchIcon );
        element.appendChild( input );

        input.addEventListener("input", e => {
            if( options.callback )
            {
                options.callback( input.value, e );
            }
        });

        return element;
    }

    _searchWidgets( branchName, value ) {

        for( let b of this.branches )
        {
            if( b.name !== branchName )
            {
                continue;
            }

            // remove all widgets
            for( let w of b.widgets )
            {
                if( w.domEl.classList.contains('lexfilter') )
                {
                    continue;
                }
                w.domEl.remove();
            }

            // push to right container
            this.queue( b.content );

            const emptyFilter = !value.length;

            // add widgets
            for( let w of b.widgets )
            {
                if( !emptyFilter )
                {
                    if(!w.name) continue;
                    const filterWord = value.toLowerCase();
                    const name = w.name.toLowerCase();
                    if(!name.includes(value)) continue;
                }

                // insert filtered widget
                this.queuedContainer.appendChild( w.domEl );
            }

            // push again to current branch
            this.clearQueue();

            // no more branches to check!
            return;
        }
    }

    /**
     * @method getBranch
     * @param {String} name if null, return current branch
     */

    getBranch( name ) {

        if( name )
        {
            return this.branches.find( b => b.name == name );
        }

        return this._currentBranch;
    }

    /**
     * @method queue
     * @param {HTMLElement} domEl container to append elements to
     */

    queue( domEl ) {

        if( !domEl && this._currentBranch)
        {
            domEl = this._currentBranch.root;
        }

        if( this.queuedContainer )
        {
            this._queue.push( this.queuedContainer );
        }

        this.queuedContainer = domEl;
    }

    /**
     * @method clearQueue
     */

    clearQueue() {

        if( this._queue && this._queue.length)
        {
            this.queuedContainer = this._queue.pop();
            return;
        }

        delete this.queuedContainer;
    }

    /**
     * @method addSeparator
     */

    addSeparator() {

        var element = document.createElement('div');
        element.className = "lexseparator";

        let widget = new LX.Widget( LX.Widget.SEPARATOR );
        widget.root = element;

        if( this._currentBranch )
        {
            this._currentBranch.content.appendChild( element );
            this._currentBranch.widgets.push( widget );
        }
        else
        {
            this.root.appendChild( element );
        }
    }

    /**
     * @method addBlank
     * @param {Number} width
     * @param {Number} height
     */

    addBlank( width, height ) {
        const widget = new LX.Blank( width, height );
        return this._attachWidget( widget );
    }

    /**
     * @method addTitle
     * @param {String} name Title name
     * @param {Object} options:
     * link: Href in case title is an hyperlink
     * target: Target name of the iframe (if any)
     * icon: Name of the icon (if any)
     * iconColor: Color of title icon (if any)
     * style: CSS to override
     */

    addTitle( name, options = {} ) {
        const widget = new LX.Title( name, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addText
     * @param {String} name Widget name
     * @param {String} value Text value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * disabled: Make the widget disabled [false]
     * required: Make the input required
     * placeholder: Add input placeholder
     * icon: Icon (if any) to append at the input start
     * pattern: Regular expression that value must match
     * trigger: Choose onchange trigger (default, input) [default]
     * inputWidth: Width of the text input
     * fit: Input widts fits content [false]
     * inputClass: Class to add to the native input element
     * skipReset: Don't add the reset value button when value changes
     * float: Justify input text content
     * justifyName: Justify name content
     */

    addText( name, value, callback, options = {} ) {
        const widget = new LX.TextInput( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addTextArea
     * @param {String} name Widget name
     * @param {String} value Text Area value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * disabled: Make the widget disabled [false]
     * placeholder: Add input placeholder
     * resize: Allow resize [true]
     * trigger: Choose onchange trigger (default, input) [default]
     * inputWidth: Width of the text input
     * float: Justify input text content
     * justifyName: Justify name content
     * fitHeight: Height adapts to text
     */

    addTextArea( name, value, callback, options = {} ) {
        const widget = new LX.TextArea( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addLabel
     * @param {String} value Information string
     * @param {Object} options Text options
     */

    addLabel( value, options = {} ) {
        options.disabled = true;
        options.inputClass = ( options.inputClass ?? "" ) + " nobg";
        const widget = this.addText( null, value, null, options );
        widget.type = LX.Widget.LABEL;
        return widget;
    }

    /**
     * @method addButton
     * @param {String} name Widget name
     * @param {String} value Button name
     * @param {Function} callback Callback function on click
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * disabled: Make the widget disabled [false]
     * icon: Icon class to show as button value
     * iconPosition: Icon position (cover|start|end)
     * fileInput: Button click requests a file
     * fileInputType: Type of the requested file
     * img: Path to image to show as button value
     * title: Text to show in native Element title
     * buttonClass: Class to add to the native button element
     * mustConfirm: User must confirm trigger in a popover
     */

    addButton( name, value, callback, options = {} ) {
        const widget = new LX.Button( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addComboButtons
     * @param {String} name Widget name
     * @param {Array} values Each of the {value, callback, selected, disabled} items
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * float: Justify content (left, center, right) [center]
     * selected: Selected button by default (String|Array)
     * noSelection: Buttons can be clicked, but they are not selectable
     * toggle: Buttons can be toggled insted of selecting only one
     */

    addComboButtons( name, values, options = {} ) {
        const widget = new LX.ComboButtons( name, values, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addCard
     * @param {String} name Card Name
     * @param {Object} options:
     * text: Card text
     * link: Card link
     * title: Card dom title
     * src: url of the image
     * callback (Function): function to call on click
     */

    addCard( name, options = {} ) {
        const widget = new LX.Card( name, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addForm
     * @param {String} name Widget name
     * @param {Object} data Form data
     * @param {Function} callback Callback function on submit form
     * @param {Object} options:
     * primaryActionName: Text to be shown in the primary action button ['Submit']
     * primaryButtonClass: Button class for primary action button ['contrast']
     * secondaryActionName: Text to be shown in the secondary action button ['Cancel']
     * secondaryActionCallback: Callback function on press secondary button
     * secondaryButtonClass: Button class for secondary action button ['primary']
     * skipLabels: Do not show input field labels [false]
     */

    addForm( name, data, callback, options = {} ) {
        const widget = new LX.Form( name, data, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addContent
     * @param {String} name Widget name
     * @param {HTMLElement/String} element
     * @param {Object} options
     */

    addContent( name, element, options = {} ) {

        console.assert( element, "Empty content!" );

        if( element.constructor == String )
        {
            const tmp = document.createElement( "div" );
            tmp.innerHTML = element;

            if( tmp.childElementCount > 1 )
            {
                element = tmp;
            }
            else
            {
                element = tmp.firstElementChild;
            }
        }

        options.hideName = true;

        let widget = new LX.Widget( LX.Widget.CONTENT, name, null, options );
        widget.root.appendChild( element );

        return this._attachWidget( widget );
    }

    /**
     * @method addImage
     * @param {String} name Widget name
     * @param {String} url Image Url
     * @param {Object} options
     * hideName: Don't use name as label [false]
     */

    async addImage( name, url, options = {} ) {

        console.assert( url, "Empty src/url for Image!" );

        let container = document.createElement( 'div' );
        container.className = "leximage";
        container.style.width = "100%";

        let img = document.createElement( 'img' );
        img.src = url;
        Object.assign( img.style, options.style ?? {} );
        container.appendChild( img );

        let widget = new LX.Widget( LX.Widget.IMAGE, name, null, options );
        widget.root.appendChild( container );

        // await img.decode();
        img.decode();

        return this._attachWidget( widget );
    }

    /**
     * @method addSelect
     * @param {String} name Widget name
     * @param {Array} values Posible options of the select widget -> String (for default select) or Object = {value, url} (for images, gifs..)
     * @param {String} value Select by default option
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * filter: Add a search bar to the widget [false]
     * disabled: Make the widget disabled [false]
     * skipReset: Don't add the reset value button when value changes
     * placeholder: Placeholder for the filter input
     * emptyMsg: Custom message to show when no filtered results
     */

    addSelect( name, values, value, callback, options = {} ) {
        const widget = new LX.Select( name, values, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addCurve
     * @param {String} name Widget name
     * @param {Array of Array} values Array of 2N Arrays of each value of the curve
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * skipReset: Don't add the reset value button when value changes
     * bgColor: Widget background color
     * pointsColor: Curve points color
     * lineColor: Curve line color
     * noOverlap: Points do not overlap, replacing themselves if necessary
     * allowAddValues: Support adding values on click
     * smooth: Curve smoothness
     * moveOutAction: Clamp or delete points moved out of the curve (LX.CURVE_MOVEOUT_CLAMP, LX.CURVE_MOVEOUT_DELETE)
    */

    addCurve( name, values, callback, options = {} ) {
        const widget = new LX.Curve( name, values, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addDial
     * @param {String} name Widget name
     * @param {Array of Array} values Array of 2N Arrays of each value of the dial
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * skipReset: Don't add the reset value button when value changes
     * bgColor: Widget background color
     * pointsColor: Curve points color
     * lineColor: Curve line color
     * noOverlap: Points do not overlap, replacing themselves if necessary
     * allowAddValues: Support adding values on click
     * smooth: Curve smoothness
     * moveOutAction: Clamp or delete points moved out of the curve (LX.CURVE_MOVEOUT_CLAMP, LX.CURVE_MOVEOUT_DELETE)
    */

    addDial( name, values, callback, options = {} ) {
        const widget = new LX.Dial( name, values, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addLayers
     * @param {String} name Widget name
     * @param {Number} value Flag value by default option
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     */

    addLayers( name, value, callback, options = {} ) {
        const widget = new LX.Layers( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addArray
     * @param {String} name Widget name
     * @param {Array} values By default values in the array
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * innerValues (Array): Use select mode and use values as options
     */

    addArray( name, values = [], callback, options = {} ) {
        const widget = new LX.ItemArray( name, values, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addList
     * @param {String} name Widget name
     * @param {Array} values List values
     * @param {String} value Selected list value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     */

    addList( name, values, value, callback, options = {} ) {
        const widget = new LX.List( name, values, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addTags
     * @param {String} name Widget name
     * @param {String} value Comma separated tags
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     */

    addTags( name, value, callback, options = {} ) {
        const widget = new LX.Tags( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addCheckbox
     * @param {String} name Widget name
     * @param {Boolean} value Value of the checkbox
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the widget disabled [false]
     * label: Checkbox label
     * suboptions: Callback to add widgets in case of TRUE value
     * className: Extra classes to customize style
     */

    addCheckbox( name, value, callback, options = {} ) {
        const widget = new LX.Checkbox( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addToggle
     * @param {String} name Widget name
     * @param {Boolean} value Value of the checkbox
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the widget disabled [false]
     * label: Toggle label
     * suboptions: Callback to add widgets in case of TRUE value
     * className: Customize colors
     */

    addToggle( name, value, callback, options = {} ) {
        const widget = new LX.Toggle( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addRadioGroup
     * @param {String} name Widget name
     * @param {String} label Radio label
     * @param {Array} values Radio options
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the widget disabled [false]
     * className: Customize colors
     * selected: Index of the default selected option
     */

    addRadioGroup( name, label, values, callback, options = {} ) {
        const widget = new LX.RadioGroup( name, label, values, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addColor
     * @param {String} name Widget name
     * @param {String} value Default color (hex)
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the widget disabled [false]
     * useRGB: The callback returns color as Array (r, g, b) and not hex [false]
     */

    addColor( name, value, callback, options = {} ) {
        const widget = new LX.ColorInput( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addRange
     * @param {String} name Widget name
     * @param {Number} value Default number value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * className: Extra classes to customize style
     * disabled: Make the widget disabled [false]
     * left: The slider goes to the left instead of the right
     * fill: Fill slider progress [true]
     * step: Step of the input
     * min, max: Min and Max values for the input
     */

    addRange( name, value, callback, options = {} ) {
        const widget = new LX.RangeInput( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addNumber
     * @param {String} name Widget name
     * @param {Number} value Default number value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * disabled: Make the widget disabled [false]
     * step: Step of the input
     * precision: The number of digits to appear after the decimal point
     * min, max: Min and Max values for the input
     * skipSlider: If there are min and max values, skip the slider
     * units: Unit as string added to the end of the value
     * onPress: Callback function on mouse down
     * onRelease: Callback function on mouse up
     */

    addNumber( name, value, callback, options = {} ) {
        const widget = new LX.NumberInput( name, value, callback, options );
        return this._attachWidget( widget );
    }

    static VECTOR_COMPONENTS = { 0: 'x', 1: 'y', 2: 'z', 3: 'w' };

    _addVector( numComponents, name, value, callback, options = {} ) {
        const widget = new LX.Vector( numComponents, name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addVector N (2, 3, 4)
     * @param {String} name Widget name
     * @param {Array} value Array of N components
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the widget disabled [false]
     * step: Step of the inputs
     * min, max: Min and Max values for the inputs
     * onPress: Callback function on mouse down
     * onRelease: Callback function on mouse is released
     */

    addVector2( name, value, callback, options ) {
        return this._addVector( 2, name, value, callback, options );
    }

    addVector3( name, value, callback, options ) {
        return this._addVector( 3, name, value, callback, options );
    }

    addVector4( name, value, callback, options ) {
        return this._addVector( 4, name, value, callback, options );
    }

    /**
     * @method addSize
     * @param {String} name Widget name
     * @param {Number} value Default number value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * disabled: Make the widget disabled [false]
     * units: Unit as string added to the end of the value
     */

    addSize( name, value, callback, options = {} ) {
        const widget = new LX.SizeInput( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addOTP
     * @param {String} name Widget name
     * @param {String} value Default numeric value in string format
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * disabled: Make the widget disabled [false]
     * pattern: OTP numeric pattern
     */

    addOTP( name, value, callback, options = {} ) {
        const widget = new LX.OTPInput( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addPad
     * @param {String} name Widget name
     * @param {Array} value Pad value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the widget disabled [false]
     * min, max: Min and Max values
     * padSize: Size of the pad (css)
     * onPress: Callback function on mouse down
     * onRelease: Callback function on mouse up
     */

    addPad( name, value, callback, options = {} ) {
        const widget = new LX.Pad( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addProgress
     * @param {String} name Widget name
     * @param {Number} value Progress value
     * @param {Object} options:
     * min, max: Min and Max values
     * low, optimum, high: Low and High boundary values, Optimum point in the range
     * showValue: Show current value
     * editable: Allow edit value
     * callback: Function called on change value
     */

    addProgress( name, value, options = {} ) {
        const widget = new LX.Progress( name, value, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addFile
     * @param {String} name Widget name
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * local: Ask for local file
     * disabled: Make the widget disabled [false]
     * read: Return the file itself (False) or the contents (True)
     * type: type to read as [text (Default), buffer, bin, url]
     */

    addFile( name, callback, options = { } ) {
        const widget = new LX.FileInput( name, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addTree
     * @param {String} name Widget name
     * @param {Object} data Data of the tree
     * @param {Object} options:
     * icons: Array of objects with icon button information {name, icon, callback}
     * filter: Add nodes filter [true]
     * rename: Boolean to allow rename [true]
     * onevent(tree_event): Called when node is selected, dbl clicked, contextmenu opened, changed visibility, parent or name
     */

    addTree( name, data, options = {} ) {
        const widget = new LX.Tree( name, data, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addTabSections
     * @param {String} name Widget name
     * @param {Array} tabs Contains objects with {
     *      name: Name of the tab (if icon, use as title)
     *      icon: Icon to be used as the tab icon (optional)
     *      iconClass: Class to be added to the icon (optional)
     *      svgClass: Class to be added to the inner SVG of the icon (optional)
     *      onCreate: Func to be called at tab creation
     *      onSelect: Func to be called on select tab (optional)
     * }
     * @param {Object} options
     * vertical: Use vertical or horizontal tabs (vertical by default)
     * showNames: Show tab name only in horizontal tabs
     */

    addTabSections( name, tabs, options = {} ) {
        const widget = new LX.TabSections( name, tabs, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addCounter
     * @param {String} name Widget name
     * @param {Number} value Counter value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the widget disabled [false]
     * min, max: Min and Max values
     * step: Step for adding/substracting
     * label: Text to show below the counter
     */

    addCounter( name, value, callback, options = { } ) {
        const widget = new LX.Counter( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addTable
     * @param {String} name Widget name
     * @param {Number} data Table data
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * head: Table headers (each of the headers per column)
     * body: Table body (data per row for each column)
     * rowActions: Allow to add actions per row
     * onMenuAction: Function callback to fill the "menu" context
     * selectable: Each row can be selected
     * sortable: Rows can be sorted by the user manually
     * centered: Center text within columns. true for all, Array for center selected cols
     * toggleColumns: Columns visibility can be toggled
     * filter: Name of the column to filter by text input (if any)
     * filterValue: Initial filter value
     * customFilters: Add selectors to filter by specific option values
     */

    addTable( name, data, options = { } ) {
        const widget = new LX.Table( name, data, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addDate
     * @param {String} name Widget name
     * @param {String} dateString
     * @param {Function} callback
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * today: Set current day as selected by default
     * untilToday: Allow dates only until current day
     * fromToday: Allow dates only from current day
     */

    addDate( name, dateString, callback, options = { } ) {
        const widget = new LX.DatePicker( name, dateString, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addMap2D
     * @param {String} name Widget name
     * @param {Array} points
     * @param {Function} callback
     * @param {Object} options:
     */

    addMap2D( name, points, callback, options = { } ) {
        const widget = new LX.Map2D( name, points, callback, options );
        return this._attachWidget( widget );
    }
}

LX.Panel = Panel;

export { Panel };