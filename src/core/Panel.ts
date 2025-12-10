// Panel.ts @jxarco

import { ArrayInput } from '../components/ArrayInput';
import { BaseComponent, ComponentType } from '../components/BaseComponent';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Checkbox } from '../components/Checkbox';
import { ColorInput } from '../components/ColorInput';
import { ComboButtons } from '../components/ComboButtons';
import { Counter } from '../components/Counter';
import { Curve } from '../components/Curve';
import { DatePicker } from '../components/DatePicker';
import { Dial } from '../components/Dial';
import { FileInput } from '../components/FileInput';
import { Form } from '../components/Form';
import { Layers } from '../components/Layers';
import { List } from '../components/List';
import { Map2D } from '../components/Map2D';
import { Tree } from '../components/NodeTree';
import { NumberInput } from '../components/NumberInput';
import { OTPInput } from '../components/OTPInput';
import { Pad } from '../components/Pad';
import { Progress } from '../components/Progress';
import { RadioGroup } from '../components/RadioGroup';
import { RangeInput } from '../components/RangeInput';
import { Rate } from '../components/Rate';
import { Select } from '../components/Select';
import { SizeInput } from '../components/SizeInput';
import { Table } from '../components/Table';
import { TabSections } from '../components/TabSections';
import { Tags } from '../components/Tags';
import { TextArea } from '../components/TextArea';
import { TextInput } from '../components/TextInput';
import { Title } from '../components/Title';
import { Toggle } from '../components/Toggle';
import { Vector } from '../components/Vector';
import { Branch } from './Branch';
import { LX } from './Namespace';

/**
 * @class Panel
 */

export class Panel
{
    root: any;
    branches: Branch[];
    components: Record<string, any>;
    signals: any[];
    queuedContainer: any;

    _branchOpen: boolean;
    _currentBranch: any;
    _queue: any[]; // Append components in other locations
    _inlineComponentsLeft: number;
    _inlineQueuedContainer: any;
    _inlineExtraClass: string | null;
    _inlineContainer: any;
    _inlineComponents: any[];

    /**
     * @param {Object} options
     * id: Id of the element
     * className: Add class to the element
     * width: Width of the panel element [fit space]
     * height: Height of the panel element [fit space]
     * style: CSS Style object to be applied to the panel
     */

    constructor( options: any = {} )
    {
        var root = document.createElement( 'div' );
        root.className = 'lexpanel';

        if ( options.id )
        {
            root.id = options.id;
        }

        if ( options.className )
        {
            root.className += ' ' + options.className;
        }

        root.style.width = options.width || '100%';
        root.style.height = options.height || '100%';
        Object.assign( root.style, options.style ?? {} );

        this.root = root;
        this.branches = [];
        this.signals = [];
        this.components = {};

        this._branchOpen = false;
        this._currentBranch = null;
        this._queue = []; // Append components in other locations
        this._inlineComponentsLeft = -1;
        this._inlineQueuedContainer = null;
        this._inlineExtraClass = null;
        this._inlineComponents = [];
    }

    get( name: string )
    {
        return this.components[name];
    }

    getValue( name: string )
    {
        let component = this.components[name];

        if ( !component )
        {
            throw ( 'No component called ' + name );
        }

        return component.value();
    }

    setValue( name: string, value: any, skipCallback?: boolean )
    {
        let component = this.components[name];

        if ( !component )
        {
            throw ( 'No component called ' + name );
        }

        return component.set( value, skipCallback );
    }

    /**
     * @method attach
     * @param {Element} content child element to append to panel
     */

    attach( content: any )
    {
        console.assert( content, 'No content to attach!' );
        content.parent = this;
        this.root.appendChild( content.root ? content.root : content );
    }

    /**
     * @method clear
     */

    clear()
    {
        this.branches = [];
        this._branchOpen = false;
        this._currentBranch = null;

        for ( let w in this.components )
        {
            if ( this.components[w].options && this.components[w].options.signal )
            {
                const signal = this.components[w].options.signal;
                for ( let i = 0; i < LX.signals[signal].length; i++ )
                {
                    if ( LX.signals[signal][i] == this.components[w] )
                    {
                        LX.signals[signal] = [ ...LX.signals[signal].slice( 0, i ),
                            ...LX.signals[signal].slice( i + 1 ) ];
                    }
                }
            }
        }

        if ( this.signals )
        {
            for ( let w = 0; w < this.signals.length; w++ )
            {
                let c: any = Object.values( this.signals[w] )[0];
                let signal = c.options.signal;
                for ( let i = 0; i < LX.signals[signal].length; i++ )
                {
                    if ( LX.signals[signal][i] == c )
                    {
                        LX.signals[signal] = [ ...LX.signals[signal].slice( 0, i ),
                            ...LX.signals[signal].slice( i + 1 ) ];
                    }
                }
            }
        }

        this.components = {};
        this.root.innerHTML = '';
    }

    /**
     * @method sameLine
     * @param {Number} numberOfComponents Of components that will be placed in the same line
     * @param {String} className Extra class to customize inline components parent container
     * @description Next N components will be in the same line. If no number, it will inline all until calling nextLine()
     */

    sameLine( numberOfComponents: number, className?: string )
    {
        this._inlineQueuedContainer = this.queuedContainer;
        this._inlineComponentsLeft = numberOfComponents ?? Infinity;
        this._inlineExtraClass = className ?? null;
    }

    /**
     * @method endLine
     * @param {String} className Extra class to customize inline components parent container
     * @description Stop inlining components. Use it only if the number of components to be inlined is NOT specified.
     */

    endLine( className?: string | null )
    {
        className = className ?? this._inlineExtraClass;

        if ( this._inlineComponentsLeft == -1 )
        {
            console.warn( 'No pending components to be inlined!' );
            return;
        }

        this._inlineComponentsLeft = -1;

        if ( !this._inlineContainer )
        {
            this._inlineContainer = document.createElement( 'div' );
            this._inlineContainer.className = 'lexinlinecomponents';

            if ( className )
            {
                this._inlineContainer.className += ` ${className}`;
            }
        }

        // Push all elements single element or Array[element, container]
        for ( let item of this._inlineComponents )
        {
            const isPair = item.constructor == Array;

            if ( isPair )
            {
                // eg. an array, inline items appended later to
                if ( this._inlineQueuedContainer )
                {
                    this._inlineContainer.appendChild( item[0] );
                }
                // eg. a select, item is appended to parent, not to inline cont.
                else
                {
                    item[1].appendChild( item[0] );
                }
            }
            else
            {
                this._inlineContainer.appendChild( item );
            }
        }

        if ( !this._inlineQueuedContainer )
        {
            if ( this._currentBranch )
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
            this._inlineQueuedContainer.appendChild( this._inlineContainer );
        }

        this._inlineComponents = [];
        this._inlineContainer = null;
        this._inlineExtraClass = null;
    }

    /**
     * @method branch
     * @param {String} name Name of the branch/section
     * @param {Object} options
     * id: Id of the branch
     * className: Add class to the branch
     * closed: Set branch collapsed/opened [false]
     * icon: Set branch icon (LX.ICONS)
     * filter: Allow filter components in branch by name [false]
     */

    branch( name: string, options: any = {} )
    {
        if ( this._branchOpen )
        {
            this.merge();
        }

        // Create new branch
        var branch = new Branch( name, options );
        branch.panel = this;

        // Declare new open
        this._branchOpen = true;
        this._currentBranch = branch;

        this.branches.push( branch );
        this.root.appendChild( branch.root );

        // Add component filter
        if ( options.filter )
        {
            this._addFilter( options.filter, { callback: this._searchComponents.bind( this, branch.name ) } );
        }

        return branch;
    }

    merge()
    {
        this._branchOpen = false;
        this._currentBranch = null;
    }

    _pick( arg: any, def: any )
    {
        return ( typeof arg == 'undefined' ? def : arg );
    }

    /*
        Panel Components
    */

    _attachComponent( component: any, options: any = {} )
    {
        if ( component.name != undefined )
        {
            this.components[component.name] = component;
        }

        if ( component.options.signal && !component.name )
        {
            if ( !this.signals )
            {
                this.signals = [];
            }

            this.signals.push( { [component.options.signal]: component } );
        }

        const _insertComponent = ( el: HTMLElement ) => {
            if ( options.container )
            {
                options.container.appendChild( el );
            }
            else if ( !this.queuedContainer )
            {
                if ( this._currentBranch )
                {
                    if ( !options.skipComponent )
                    {
                        this._currentBranch.components.push( component );
                    }
                    this._currentBranch.content.appendChild( el );
                }
                else
                {
                    el.className += ' nobranch w-full';
                    this.root.appendChild( el );
                }
            }
            // Append content to queued tab container
            else
            {
                this.queuedContainer.appendChild( el );
            }
        };

        const _storeComponent = ( el: HTMLElement ) => {
            if ( !this.queuedContainer )
            {
                this._inlineComponents.push( el );
            }
            // Append content to queued tab container
            else
            {
                this._inlineComponents.push( [ el, this.queuedContainer ] );
            }
        };

        // Process inline components
        if ( this._inlineComponentsLeft > 0 && !options.skipInlineCount )
        {
            // Store component and its container
            _storeComponent( component.root );

            this._inlineComponentsLeft--;

            // Last component
            if ( !this._inlineComponentsLeft )
            {
                this.endLine();
            }
        }
        else
        {
            _insertComponent( component.root );
        }

        return component;
    }

    _addFilter( placeholder: string, options: any = {} )
    {
        options.placeholder = placeholder.constructor == String ? placeholder : 'Filter properties..';
        options.skipComponent = options.skipComponent ?? true;
        options.skipInlineCount = true;

        let component = new TextInput( null, undefined, null, options );
        const element = component.root;
        element.className += ' lexfilter';

        let input = document.createElement( 'input' );
        input.className = 'lexinput-filter';
        input.setAttribute( 'placeholder', options.placeholder );
        input.style.width = '100%';
        input.value = options.filterValue || '';

        let searchIcon = LX.makeIcon( 'Search' );
        element.appendChild( searchIcon );
        element.appendChild( input );

        input.addEventListener( 'input', ( e ) => {
            if ( options.callback )
            {
                options.callback( input.value, e );
            }
        } );

        return element;
    }

    _searchComponents( branchName: string, value: string )
    {
        for ( let b of this.branches )
        {
            if ( b.name !== branchName )
            {
                continue;
            }

            // remove all components
            for ( let w of b.components )
            {
                if ( w.domEl.classList.contains( 'lexfilter' ) )
                {
                    continue;
                }
                w.domEl.remove();
            }

            // push to right container
            this.queue( b.content );

            const emptyFilter = !value.length;

            // add components
            for ( let w of b.components )
            {
                if ( !emptyFilter )
                {
                    if ( !w.name ) continue;
                    // const filterWord = value.toLowerCase();
                    const name = w.name.toLowerCase();
                    if ( !name.includes( value ) ) continue;
                }

                // insert filtered component
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

    getBranch( name: string )
    {
        if ( name )
        {
            return this.branches.find( ( b ) => b.name == name );
        }

        return this._currentBranch;
    }

    /**
     * @method queue
     * @param {HTMLElement} domEl container to append elements to
     */

    queue( domEl: any )
    {
        if ( !domEl && this._currentBranch )
        {
            domEl = this._currentBranch.root;
        }

        if ( this.queuedContainer )
        {
            this._queue.push( this.queuedContainer );
        }

        this.queuedContainer = domEl;
    }

    /**
     * @method clearQueue
     */

    clearQueue()
    {
        if ( this._queue && this._queue.length )
        {
            this.queuedContainer = this._queue.pop();
            return;
        }

        delete this.queuedContainer;
    }

    /**
     * @method addSeparator
     */

    addSeparator()
    {
        var element = document.createElement( 'div' );
        element.className = 'lexseparator';

        let component = new BaseComponent( ComponentType.SEPARATOR );
        component.root = element;

        if ( this._currentBranch )
        {
            this._currentBranch.content.appendChild( element );
            this._currentBranch.components.push( component );
        }
        else
        {
            this.root.appendChild( element );
        }
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

    addTitle( name: string, options: any = {} )
    {
        const component = new Title( name, options );
        return this._attachComponent( component );
    }

    /**
     * @method addText
     * @param {String} name Component name
     * @param {String} value Text value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * disabled: Make the component disabled [false]
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

    addText( name: string | null, value: string, callback: any, options: any = {} )
    {
        const component = new TextInput( name, value, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addTextArea
     * @param {String} name Component name
     * @param {String} value Text Area value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * disabled: Make the component disabled [false]
     * placeholder: Add input placeholder
     * resize: Allow resize [true]
     * trigger: Choose onchange trigger (default, input) [default]
     * inputWidth: Width of the text input
     * float: Justify input text content
     * justifyName: Justify name content
     * fitHeight: Height adapts to text
     */

    addTextArea( name: string | null, value: string, callback: any, options: any = {} )
    {
        const component = new TextArea( name, value, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addLabel
     * @param {String} value Information string
     * @param {Object} options Text options
     */

    addLabel( value: string, options: any = {} )
    {
        options.disabled = true;
        options.inputClass = ( options.inputClass ?? '' ) + ' bg-none';
        const component = this.addText( null, value, null, options );
        component.type = ComponentType.LABEL;
        return component;
    }

    /**
     * @method addButton
     * @param {String} name Component name
     * @param {String} value Button name
     * @param {Function} callback Callback function on click
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * disabled: Make the component disabled [false]
     * icon: Icon class to show as button value
     * iconPosition: Icon position (cover|start|end)
     * fileInput: Button click requests a file
     * fileInputType: Type of the requested file
     * img: Path to image to show as button value
     * title: Text to show in native Element title
     * buttonClass: Class to add to the native button element
     * mustConfirm: User must confirm trigger in a popover
     */

    addButton( name: string | null, value: string, callback: any, options: any = {} )
    {
        const component = new Button( name, value, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addComboButtons
     * @param {String} name Component name
     * @param {Array} values Each of the {value, callback, selected, disabled} items
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * float: Justify content (left, center, right) [center]
     * selected: Selected button by default (String|Array)
     * noSelection: Buttons can be clicked, but they are not selectable
     * toggle: Buttons can be toggled insted of selecting only one
     */

    addComboButtons( name: string, values: any[], options: any = {} )
    {
        const component = new ComboButtons( name, values, options );
        return this._attachComponent( component );
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

    addCard( name: string, options: any = {} )
    {
        const component = new Card( name, options );
        return this._attachComponent( component );
    }

    /**
     * @method addForm
     * @param {String} name Component name
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

    addForm( name: string, data: any, callback: any, options: any = {} )
    {
        const component = new Form( name, data, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addContent
     * @param {String} name Component name
     * @param {HTMLElement/String} element
     * @param {Object} options
     */

    addContent( name: string, element: any, options: any = {} )
    {
        console.assert( element, 'Empty content!' );

        if ( element.constructor == String )
        {
            const tmp: any = document.createElement( 'div' );
            tmp.innerHTML = element;

            if ( tmp.childElementCount > 1 )
            {
                element = tmp;
            }
            else
            {
                element = tmp.firstElementChild;
            }
        }

        options.hideName = true;

        let component = new BaseComponent( ComponentType.CONTENT, name, null, options );
        component.root.appendChild( element );

        return this._attachComponent( component );
    }

    /**
     * @method addImage
     * @param {String} name Component name
     * @param {String} url Image Url
     * @param {Object} options
     * hideName: Don't use name as label [false]
     */

    async addImage( name: string, url: string, options: any = {} )
    {
        console.assert( url.length !== 0, 'Empty src/url for Image!' );

        let container = document.createElement( 'div' );
        container.className = 'leximage';
        container.style.width = '100%';

        let img = document.createElement( 'img' );
        img.src = url;
        Object.assign( img.style, options.style ?? {} );
        container.appendChild( img );

        let component = new BaseComponent( ComponentType.IMAGE, name, null, options );
        component.root.appendChild( container );

        // await img.decode();
        img.decode();

        return this._attachComponent( component );
    }

    /**
     * @method addSelect
     * @param {String} name Component name
     * @param {Array} values Posible options of the select component -> String (for default select) or Object = {value, url} (for images, gifs..)
     * @param {String} value Select by default option
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * filter: Add a search bar to the component [false]
     * disabled: Make the component disabled [false]
     * skipReset: Don't add the reset value button when value changes
     * placeholder: Placeholder for the filter input
     * emptyMsg: Custom message to show when no filtered results
     */

    addSelect( name: string | null, values: any[], value: string, callback: any, options: any = {} )
    {
        const component = new Select( name, values, value, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addCurve
     * @param {String} name Component name
     * @param {Array of Array} values Array of 2N Arrays of each value of the curve
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * skipReset: Don't add the reset value button when value changes
     * bgColor: Component background color
     * pointsColor: Curve points color
     * lineColor: Curve line color
     * noOverlap: Points do not overlap, replacing themselves if necessary
     * allowAddValues: Support adding values on click
     * smooth: Curve smoothness
     * moveOutAction: Clamp or delete points moved out of the curve (LX.CURVE_MOVEOUT_CLAMP, LX.CURVE_MOVEOUT_DELETE)
     */

    addCurve( name: string, values: any[], callback: any, options: any = {} )
    {
        const component = new Curve( name, values, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addDial
     * @param {String} name Component name
     * @param {Array of Array} values Array of 2N Arrays of each value of the dial
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * skipReset: Don't add the reset value button when value changes
     * bgColor: Component background color
     * pointsColor: Curve points color
     * lineColor: Curve line color
     * noOverlap: Points do not overlap, replacing themselves if necessary
     * allowAddValues: Support adding values on click
     * smooth: Curve smoothness
     * moveOutAction: Clamp or delete points moved out of the curve (LX.CURVE_MOVEOUT_CLAMP, LX.CURVE_MOVEOUT_DELETE)
     */

    addDial( name: string, values: any[], callback: any, options: any = {} )
    {
        const component = new Dial( name, values, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addLayers
     * @param {String} name Component name
     * @param {Number} value Flag value by default option
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     */

    addLayers( name: string, value: number, callback: any, options: any = {} )
    {
        const component = new Layers( name, value, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addArray
     * @param {String} name Component name
     * @param {Array} values By default values in the array
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * innerValues (Array): Use select mode and use values as options
     */

    addArray( name: string, values: any[] = [], callback: any, options: any = {} )
    {
        const component = new ArrayInput( name, values, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addList
     * @param {String} name Component name
     * @param {Array} values List values
     * @param {String} value Selected list value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     */

    addList( name: string, values: any[], value: any, callback: any, options: any = {} )
    {
        const component = new List( name, values, value, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addTags
     * @param {String} name Component name
     * @param {String} value Comma separated tags
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     */

    addTags( name: string, value: string, callback: any, options: any = {} )
    {
        const component = new Tags( name, value, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addCheckbox
     * @param {String} name Component name
     * @param {Boolean} value Value of the checkbox
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the component disabled [false]
     * label: Checkbox label
     * suboptions: Callback to add components in case of TRUE value
     * className: Extra classes to customize style
     */

    addCheckbox( name: string | null, value: boolean, callback: any, options: any = {} )
    {
        const component = new Checkbox( name, value, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addToggle
     * @param {String} name Component name
     * @param {Boolean} value Value of the checkbox
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the component disabled [false]
     * label: Toggle label
     * suboptions: Callback to add components in case of TRUE value
     * className: Customize colors
     */

    addToggle( name: string, value: boolean, callback: any, options: any = {} )
    {
        const component = new Toggle( name, value, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addRadioGroup
     * @param {String} name Component name
     * @param {String} label Radio label
     * @param {Array} values Radio options
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the component disabled [false]
     * className: Customize colors
     * selected: Index of the default selected option
     */

    addRadioGroup( name: string, label: string, values: any[], callback: any, options: any = {} )
    {
        const component = new RadioGroup( name, label, values, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addColor
     * @param {String} name Component name
     * @param {String} value Default color (hex)
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the component disabled [false]
     * useRGB: The callback returns color as Array (r, g, b) and not hex [false]
     */

    addColor( name: string, value: any, callback: any, options: any = {} )
    {
        const component = new ColorInput( name, value, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addRange
     * @param {String} name Component name
     * @param {Number} value Default number value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * className: Extra classes to customize style
     * disabled: Make the component disabled [false]
     * left: The slider goes to the left instead of the right
     * fill: Fill slider progress [true]
     * step: Step of the input
     * min, max: Min and Max values for the input
     */

    addRange( name: string, value: number, callback: any, options: any = {} )
    {
        const component = new RangeInput( name, value, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addNumber
     * @param {String} name Component name
     * @param {Number} value Default number value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * disabled: Make the component disabled [false]
     * step: Step of the input
     * precision: The number of digits to appear after the decimal point
     * min, max: Min and Max values for the input
     * skipSlider: If there are min and max values, skip the slider
     * units: Unit as string added to the end of the value
     * onPress: Callback function on mouse down
     * onRelease: Callback function on mouse up
     */

    addNumber( name: string | null, value: number, callback: any, options: any = {} )
    {
        const component = new NumberInput( name, value, callback, options );
        return this._attachComponent( component );
    }

    static VECTOR_COMPONENTS = { 0: 'x', 1: 'y', 2: 'z', 3: 'w' };

    _addVector( numComponents: number, name: string, value: any[], callback: any, options: any = {} )
    {
        const component = new Vector( numComponents, name, value, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addVector N (2, 3, 4)
     * @param {String} name Component name
     * @param {Array} value Array of N components
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the component disabled [false]
     * step: Step of the inputs
     * min, max: Min and Max values for the inputs
     * onPress: Callback function on mouse down
     * onRelease: Callback function on mouse is released
     */

    addVector2( name: string, value: any[], callback: any, options: any )
    {
        return this._addVector( 2, name, value, callback, options );
    }

    addVector3( name: string, value: any[], callback: any, options: any )
    {
        return this._addVector( 3, name, value, callback, options );
    }

    addVector4( name: string, value: any[], callback: any, options: any )
    {
        return this._addVector( 4, name, value, callback, options );
    }

    /**
     * @method addSize
     * @param {String} name Component name
     * @param {Number} value Default number value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * disabled: Make the component disabled [false]
     * units: Unit as string added to the end of the value
     */

    addSize( name: string, value: any, callback: any, options: any = {} )
    {
        const component = new SizeInput( name, value, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addOTP
     * @param {String} name Component name
     * @param {String} value Default numeric value in string format
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * disabled: Make the component disabled [false]
     * pattern: OTP numeric pattern
     */

    addOTP( name: string, value: string, callback: any, options: any = {} )
    {
        const component = new OTPInput( name, value, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addPad
     * @param {String} name Component name
     * @param {Array} value Pad value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the component disabled [false]
     * min, max: Min and Max values
     * padSize: Size of the pad (css)
     * onPress: Callback function on mouse down
     * onRelease: Callback function on mouse up
     */

    addPad( name: string, value: any[], callback: any, options: any = {} )
    {
        const component = new Pad( name, value, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addProgress
     * @param {String} name Component name
     * @param {Number} value Progress value
     * @param {Object} options:
     * min, max: Min and Max values
     * low, optimum, high: Low and High boundary values, Optimum point in the range
     * showValue: Show current value
     * editable: Allow edit value
     * callback: Function called on change value
     */

    addProgress( name: string, value: number, options: any = {} )
    {
        const component = new Progress( name, value, options );
        return this._attachComponent( component );
    }

    /**
     * @method addFile
     * @param {String} name Component name
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * local: Ask for local file
     * disabled: Make the component disabled [false]
     * read: Return the file itself (False) or the contents (True)
     * type: type to read as [text (Default), buffer, bin, url]
     */

    addFile( name: string, callback: any, options: any = {} )
    {
        const component = new FileInput( name, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addTree
     * @param {String} name Component name
     * @param {Object} data Data of the tree
     * @param {Object} options:
     * icons: Array of objects with icon button information {name, icon, callback}
     * filter: Add nodes filter [true]
     * rename: Boolean to allow rename [true]
     * onevent(tree_event): Called when node is selected, dbl clicked, contextmenu opened, changed visibility, parent or name
     */

    addTree( name: string, data: any, options: any = {} )
    {
        const component = new Tree( name, data, options );
        return this._attachComponent( component );
    }

    /**
     * @method addTabSections
     * @param {String} name Component name
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

    addTabSections( name: string, tabs: any[], options: any = {} )
    {
        const component = new TabSections( name, tabs, options );
        return this._attachComponent( component );
    }

    /**
     * @method addCounter
     * @param {String} name Component name
     * @param {Number} value Counter value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the component disabled [false]
     * min, max: Min and Max values
     * step: Step for adding/substracting
     * label: Text to show below the counter
     */

    addCounter( name: string, value: number, callback: any, options: any = {} )
    {
        const component = new Counter( name, value, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addTable
     * @param {String} name Component name
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

    addTable( name: string, data: any, options: any = {} )
    {
        const component = new Table( name, data, options );
        return this._attachComponent( component );
    }

    /**
     * @method addDate
     * @param {String} name Component name
     * @param {String} dateValue
     * @param {Function} callback
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * today: Set current day as selected by default
     * untilToday: Allow dates only until current day
     * fromToday: Allow dates only from current day
     */

    addDate( name: string, dateValue: string, callback: any, options: any = {} )
    {
        const component = new DatePicker( name, dateValue, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addMap2D
     * @param {String} name Component name
     * @param {Array} points
     * @param {Function} callback
     * @param {Object} options:
     */

    addMap2D( name: string, points: any[], callback: any, options: any = {} )
    {
        const component = new Map2D( name, points, callback, options );
        return this._attachComponent( component );
    }

    /**
     * @method addRate
     * @param {String} name Component name
     * @param {Number} value
     * @param {Function} callback
     * @param {Object} options:
     */

    addRate( name: string, value: number, callback: any, options: any = {} )
    {
        const component = new Rate( name, value, callback, options );
        return this._attachComponent( component );
    }
}

LX.Panel = Panel;
