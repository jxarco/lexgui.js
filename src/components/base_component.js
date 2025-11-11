// base_component.js @jxarco
import { LX } from './core.js';

function ADD_CUSTOM_COMPONENT( customComponentName, options = {} )
{
    let customIdx = LX.guidGenerator();

    LX.Panel.prototype[ 'add' + customComponentName ] = function( name, instance, callback )
    {
        const userParams = Array.from( arguments ).slice( 3 );

        let component = new BaseComponent( BaseComponent.CUSTOM, name, null, options );
        this._attachComponent( component );

        component.customName = customComponentName;
        component.customIdx = customIdx;

        component.onGetValue = () => {
            return instance;
        };

        component.onSetValue = ( newValue, skipCallback, event ) => {
            instance = newValue;
            _refreshComponent();
            element.querySelector( ".lexcustomitems" ).toggleAttribute( 'hidden', false );
            if( !skipCallback )
            {
                component._trigger( new LX.IEvent( name, instance, event ), callback );
            }
        };

        component.onResize = ( rect ) => {
            const realNameWidth = ( component.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        const element = component.root;

        let container, customComponentsDom;
        let defaultInstance = options.default ?? {};

        // Add instance button

        const _refreshComponent = () => {

            if( container ) container.remove();
            if( customComponentsDom ) customComponentsDom.remove();

            container = document.createElement('div');
            container.className = "lexcustomcontainer w-full";
            element.appendChild( container );
            element.dataset["opened"] = false;

            const customIcon = LX.makeIcon( options.icon ?? "Box" );
            const menuIcon = LX.makeIcon( "Menu" );

            let buttonName = customComponentName + (!instance ? " [empty]" : "");
            let buttonEl = this.addButton(null, buttonName, (value, event) => {
                if( instance )
                {
                    element.querySelector(".lexcustomitems").toggleAttribute('hidden');
                    element.dataset["opened"] = !element.querySelector(".lexcustomitems").hasAttribute("hidden");
                }
                else
                {
                    LX.addContextMenu(null, event, c => {
                        c.add("New " + customComponentName, () => {
                            instance = {};
                            _refreshComponent();
                            element.querySelector(".lexcustomitems").toggleAttribute('hidden', false);
                            element.dataset["opened"] = !element.querySelector(".lexcustomitems").hasAttribute("hidden");
                        });
                    });
                }

            }, { buttonClass: 'custom' });

            const buttonSpan = buttonEl.root.querySelector( "span" );
            buttonSpan.prepend( customIcon );
            buttonSpan.appendChild( menuIcon );
            container.appendChild( buttonEl.root );

            if( instance )
            {
                menuIcon.addEventListener( "click", e => {
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                    LX.addContextMenu(null, e, c => {
                        c.add("Clear", () => {
                            instance = null;
                            _refreshComponent();
                        });
                    });
                });
            }

            // Show elements

            customComponentsDom = document.createElement('div');
            customComponentsDom.className = "lexcustomitems";
            customComponentsDom.toggleAttribute('hidden', true);
            element.appendChild( customComponentsDom );

            if( instance )
            {
                this.queue( customComponentsDom );

                const on_instance_changed = ( key, value, event ) => {
                    const setter = options[ `_set_${ key }` ];
                    if( setter )
                    {
                        setter.call( instance, value );
                    }
                    else
                    {
                        instance[ key ] = value;
                    }
                    component._trigger( new LX.IEvent( name, instance, event ), callback );
                };

                for( let key in defaultInstance )
                {
                    let value = null;

                    const getter = options[ `_get_${ key }` ];
                    if( getter )
                    {
                        value = instance[ key ] ? getter.call( instance ) : getter.call( defaultInstance );
                    }
                    else
                    {
                        value = instance[ key ] ?? defaultInstance[ key ];
                    }

                    if( !value )
                    {
                        continue;
                    }

                    switch( value.constructor )
                    {
                        case String:
                            if( value[ 0 ] === '#' )
                            {
                                this.addColor( key, value, on_instance_changed.bind( this, key ) );
                            }
                            else
                            {
                                this.addText( key, value, on_instance_changed.bind( this, key ) );
                            }
                            break;
                        case Number:
                            this.addNumber( key, value, on_instance_changed.bind( this, key ) );
                            break;
                        case Boolean:
                            this.addCheckbox( key, value, on_instance_changed.bind( this, key ) );
                            break;
                        case Array:
                            if( value.length > 4 )
                            {
                                this.addArray( key, value, on_instance_changed.bind( this, key ) );
                            }
                            else
                            {
                                this._addVector( value.length, key, value, on_instance_changed.bind( this, key ) );
                            }
                            break;
                        default:
                            console.warn( `Unsupported property type: ${ value.constructor.name }` )
                            break;
                    }
                }

                if( options.onCreate )
                {
                    options.onCreate.call( this, this, ...userParams );
                }

                this.clearQueue();
            }
        };

        _refreshComponent();
    };
}

LX.ADD_CUSTOM_COMPONENT = ADD_CUSTOM_COMPONENT;

/**
 * @class Blank
 * @description Blank Component
 */

class Blank extends BaseComponent
{
    constructor( width, height )
    {
        super( BaseComponent.BLANK );

        this.root.style.width = width ?? "auto";
        this.root.style.height = height ?? "8px";
    }
}

LX.Blank = Blank;

/**
 * @class ComboButtons
 * @description ComboButtons Component
 */

class ComboButtons extends BaseComponent
{
    constructor( name, values, options = {} )
    {
        const shouldSelect = !( options.noSelection ?? false );
        let shouldToggle = shouldSelect && ( options.toggle ?? false );

        let container = document.createElement('div');
        container.className = "lexcombobuttons ";

        options.skipReset = true;

        if( options.float )
        {
            container.className += options.float;
        }

        let currentValue = [];
        let buttonsBox = document.createElement('div');
        buttonsBox.className = "lexcombobuttonsbox ";
        container.appendChild( buttonsBox );

        for( let b of values )
        {
            if( !b.value )
            {
                throw( "Set 'value' for each button!" );
            }

            let buttonEl = document.createElement('button');
            buttonEl.className = "lexbutton combo";
            buttonEl.title = b.icon ? b.value : "";
            buttonEl.id = b.id ?? "";
            buttonEl.dataset["value"] = b.value;

            if( options.buttonClass )
            {
                buttonEl.classList.add( options.buttonClass );
            }

            if( shouldSelect && ( b.selected || options.selected?.includes( b.value ) ) )
            {
                buttonEl.classList.add("selected");
                currentValue = ( currentValue ).concat( [ b.value ] );
            }

            if( b.icon )
            {
                const icon = LX.makeIcon( b.icon );
                buttonEl.appendChild( icon );
            }
            else
            {
                buttonEl.innerHTML = `<span>${ b.value }</span>`;
            }

            if( b.disabled )
            {
                buttonEl.setAttribute( "disabled", true );
            }

            buttonEl.addEventListener("click", e => {

                currentValue = [];

                if( shouldSelect )
                {
                    if( shouldToggle )
                    {
                        buttonEl.classList.toggle( "selected" );
                    }
                    else
                    {
                        container.querySelectorAll( "button" ).forEach( s => s.classList.remove( "selected" ));
                        buttonEl.classList.add( "selected" );
                    }
                }

                container.querySelectorAll( "button" ).forEach( s => {

                    if( s.classList.contains( "selected" ) )
                    {
                        currentValue.push( s.dataset[ "value" ] );
                    }

                } );

                if( !shouldToggle && currentValue.length > 1 )
                {
                    console.error( `Enable _options.toggle_ to allow selecting multiple options in ComboButtons.` );
                    return;
                }

                currentValue = currentValue[ 0 ];

                this.set( b.value, false, buttonEl.classList.contains( "selected" ) );
            });

            buttonsBox.appendChild( buttonEl );
        }

        if( currentValue.length > 1 )
        {
            if( !shouldToggle )
            {
                options.toggle = true;
                shouldToggle = shouldSelect;
                console.warn( `Multiple options selected in '${ name }' ComboButtons. Enabling _toggle_ mode.` );
            }
        }
        else
        {
            currentValue = currentValue[ 0 ];
        }

        super( BaseComponent.BUTTONS, name, null, options );

        this.onGetValue = () => {
            return currentValue;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            if( shouldSelect && ( event == undefined ) )
            {
                container.querySelectorAll( "button" ).forEach( s => s.classList.remove( "selected" ));

                container.querySelectorAll( "button" ).forEach( s => {
                    if( currentValue && currentValue.indexOf( s.dataset[ "value" ] ) > -1 )
                    {
                        s.classList.add( "selected" );
                    }
                } );
            }

            if( !skipCallback && newValue.constructor != Array )
            {
                const enabled = event;
                const fn = values.filter( v => v.value == newValue )[ 0 ]?.callback;
                this._trigger( new LX.IEvent( name, shouldToggle ? [ newValue, enabled ] : newValue, null ), fn );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        this.root.appendChild( container );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.ComboButtons = ComboButtons;

/**
 * @class Card
 * @description Card Component
 */

class Card extends BaseComponent
{
    constructor( name, options = {} )
    {
        options.hideName = true;

        super( BaseComponent.CARD, name, null, options );

        let container = document.createElement('div');
        container.className = "lexcard";
        container.style.width = "100%";
        this.root.appendChild( container );

        if( options.img )
        {
            let img = document.createElement('img');
            img.src = options.img;
            container.appendChild( img );

            if( options.link != undefined )
            {
                img.style.cursor = "pointer";
                img.addEventListener('click', function() {
                    const hLink = container.querySelector('a');
                    if( hLink )
                    {
                        hLink.click();
                    }
                });
            }
        }

        let cardNameDom = document.createElement('span');
        cardNameDom.innerText = name;
        container.appendChild( cardNameDom );

        if( options.link != undefined )
        {
            let cardLinkDom = document.createElement( 'a' );
            cardLinkDom.innerText = name;
            cardLinkDom.href = options.link;
            cardLinkDom.target = options.target ?? "";
            cardNameDom.innerText = "";
            cardNameDom.appendChild( cardLinkDom );
        }

        if( options.callback )
        {
            container.style.cursor = "pointer";
            container.addEventListener("click", ( e ) => {
                this._trigger( new LX.IEvent( name, null, e ), options.callback );
            });
        }
    }
}

LX.Card = Card;

/**
 * @class Form
 * @description Form Component
 */

class Form extends BaseComponent
{
    constructor( name, data, callback, options = {} )
    {
        if( data.constructor != Object )
        {
            console.error( "Form data must be an Object" );
            return;
        }

        // Always hide name for this one
        options.hideName = true;

        super( BaseComponent.FORM, name, null, options );

        this.onGetValue = () => {
            return container.formData;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            container.formData = newValue;
            const entries = container.querySelectorAll( ".lexcomponent" );
            for( let i = 0; i < entries.length; ++i )
            {
                const entry = entries[ i ];
                if( entry.jsInstance.type != BaseComponent.TEXT )
                {
                    continue;
                }
                let entryName = entries[ i ].querySelector( ".lexcomponentname" ).innerText;
                let entryInput = entries[ i ].querySelector( ".lextext input" );
                entryInput.value = newValue[ entryName ] ?? "";
                BaseComponent._dispatchEvent( entryInput, "focusout", skipCallback );
            }
        };

        let container = document.createElement( 'div' );
        container.className = "lexformdata";
        container.style.width = "100%";
        container.formData = {};
        this.root.appendChild( container );

        for( let entry in data )
        {
            let entryData = data[ entry ];

            if( entryData.constructor != Object )
            {
                const oldValue = JSON.parse( JSON.stringify( entryData ) );
                entryData = { value: oldValue };
                data[ entry ] = entryData;
            }

            entryData.placeholder = entryData.placeholder ?? ( entryData.label ?? `Enter ${ entry }` );
            entryData.width = "100%";

            if( !( options.skipLabels ?? false ) )
            {
                const label = new LX.TextInput( null, entryData.label ?? entry, null, { disabled: true, inputClass: "formlabel nobg" } );
                container.appendChild( label.root );
            }

            entryData.textComponent = new LX.TextInput( null, entryData.constructor == Object ? entryData.value : entryData, ( value ) => {
                container.formData[ entry ] = value;
            }, entryData );
            container.appendChild( entryData.textComponent.root );

            container.formData[ entry ] = entryData.constructor == Object ? entryData.value : entryData;
        }

        const buttonContainer = LX.makeContainer( ["100%", "auto"], "flex flex-row", "", container );

        if( options.secondaryActionName || options.secondaryActionCallback )
        {
            const secondaryButton = new LX.Button( null, options.secondaryActionName ?? "Cancel", ( value, event ) => {
                if( callback )
                {
                    callback( container.formData, event );
                }
            }, { width: "100%", minWidth: "0", buttonClass: options.secondaryButtonClass ?? "primary" } );

            buttonContainer.appendChild( secondaryButton.root );
        }

        const primaryButton = new LX.Button( null, options.primaryActionName ?? "Submit", ( value, event ) => {

            const errors = [];

            for( let entry in data )
            {
                let entryData = data[ entry ];

                if( !entryData.textComponent.valid() )
                {
                    errors.push( { type: "input_not_valid", entry } )
                }
            }

            if( callback )
            {
                callback( container.formData, errors, event );
            }
        }, { width: "100%", minWidth: "0", buttonClass: options.primaryButtonClass ?? "contrast" } );

        buttonContainer.appendChild( primaryButton.root );
    }
}

LX.Form = Form;

/**
 * @class Curve
 * @description Curve Component
 */

class Curve extends BaseComponent
{
    constructor( name, values, callback, options = {} )
    {
        let defaultValues = JSON.parse( JSON.stringify( values ) );

        super( BaseComponent.CURVE, name, defaultValues, options );

        this.onGetValue = () => {
            return JSON.parse(JSON.stringify( curveInstance.element.value ));
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            curveInstance.element.value = JSON.parse( JSON.stringify( newValue ) );
            curveInstance.redraw();
            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, curveInstance.element.value, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        var container = document.createElement( "div" );
        container.className = "lexcurve";
        this.root.appendChild( container );

        options.callback = (v, e) => {
            this._trigger( new LX.IEvent( name, v, e ), callback );
        };

        options.name = name;

        let curveInstance = new LX.CanvasCurve( values, options );
        container.appendChild( curveInstance.element );
        this.curveInstance = curveInstance;

        const observer = new ResizeObserver( entries => {
            for ( const entry of entries )
            {
                curveInstance.canvas.width = entry.contentRect.width;
                curveInstance.redraw();
            }
        });

        observer.observe( container );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Curve = Curve;

/**
 * @class Dial
 * @description Dial Component
 */

class Dial extends BaseComponent
{
    constructor( name, values, callback, options = {} )
    {
        let defaultValues = JSON.parse( JSON.stringify( values ) );

        super( BaseComponent.DIAL, name, defaultValues, options );

        this.onGetValue = () => {
            return JSON.parse( JSON.stringify( dialInstance.element.value ) );
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            dialInstance.element.value = JSON.parse( JSON.stringify( newValue ) );
            dialInstance.redraw();
            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, dialInstance.element.value, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
            LX.flushCss( container );
            dialInstance.element.style.height = dialInstance.element.offsetWidth + "px";
            dialInstance.canvas.width = dialInstance.element.offsetWidth;
            container.style.width = dialInstance.element.offsetWidth + "px";
            dialInstance.canvas.height = dialInstance.canvas.width;
            dialInstance.redraw();
        };

        var container = document.createElement( "div" );
        container.className = "lexcurve";
        this.root.appendChild( container );

        options.callback = ( v, e ) => {
            this._trigger( new LX.IEvent( name, v, e ), callback );
        };

        options.name = name;

        let dialInstance = new LX.CanvasDial( this, values, options );
        container.appendChild( dialInstance.element );
        this.dialInstance = dialInstance;

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Dial = Dial;

/**
 * @class ItemArray
 * @description ItemArray Component
 */

class ItemArray extends BaseComponent
{
    constructor( name, values = [], callback, options = {} )
    {
        options.nameWidth = "100%";

        super( BaseComponent.ARRAY, name, null, options );

        this.onGetValue = () => {
            return values;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            values = newValue;
            this._updateItems();
            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, values, event ), callback );
            }
        };

        // Add open array button

        let container = document.createElement( "div" );
        container.className = "lexarray";
        container.style.width = "100%";
        this.root.appendChild( container );
        this.root.dataset["opened"] = false;

        let buttonName = `Array (size ${ values.length })`;

        const toggleButton = new LX.Button(null, buttonName, () => {
            this.root.dataset["opened"] = this.root.dataset["opened"] == "true" ? false : true;
            this.root.querySelector(".lexarrayitems").toggleAttribute( "hidden" );
        }, { buttonClass: "array" });
        toggleButton.root.querySelector( "span" ).appendChild( LX.makeIcon( "Down", { svgClass: "sm" } ) );
        container.appendChild( toggleButton.root );

        // Show elements

        let arrayItems = document.createElement( "div" );
        arrayItems.className = "lexarrayitems";
        arrayItems.toggleAttribute( "hidden",  true );
        this.root.appendChild( arrayItems );

        this._updateItems = () => {

            // Update num items
            let buttonSpan = this.root.querySelector(".lexbutton.array span");
            for( let node of buttonSpan.childNodes )
            {
                if ( node.nodeType === Node.TEXT_NODE ) { node.textContent = `Array (size ${ values.length })`; break; }
            }

            // Update inputs
            arrayItems.innerHTML = "";

            for( let i = 0; i < values.length; ++i )
            {
                const value = values[ i ];
                let baseclass = options.innerValues ? 'select' : value.constructor;
                let component = null;

                switch( baseclass  )
                {
                    case String:
                        component = new LX.TextInput(i + "", value, function(value, event) {
                            values[ i ] = value;
                            callback( values );
                        }, { nameWidth: "12px", className: "p-0", skipReset: true });
                        break;
                    case Number:
                        component = new NumberInput(i + "", value, function(value, event) {
                            values[ i ] = value;
                            callback( values );
                        }, { nameWidth: "12px", className: "p-0", skipReset: true });
                        break;
                    case 'select':
                        component = new Select(i + "", options.innerValues, value, function(value, event) {
                            values[ i ] = value;
                            callback( values );
                        }, { nameWidth: "12px", className: "p-0", skipReset: true });
                        break;
                }

                console.assert( component, `Value of type ${ baseclass } cannot be modified in ItemArray` );

                arrayItems.appendChild( component.root );

                const removeComponent = new LX.Button( null, "", ( v, event) => {
                    values.splice( values.indexOf( value ), 1 );
                    this._updateItems();
                    this._trigger( new LX.IEvent(name, values, event), callback );
                }, { title: "Remove item", icon: "Trash3"} );

                component.root.appendChild( removeComponent.root );
            }

            const addButton = new LX.Button(null, LX.makeIcon( "Plus", { svgClass: "sm" } ).innerHTML + "Add item", (v, event) => {
                values.push( options.innerValues ? options.innerValues[ 0 ] : "" );
                this._updateItems();
                this._trigger( new LX.IEvent(name, values, event), callback );
            }, { buttonClass: 'array' });

            arrayItems.appendChild( addButton.root );
        };

        this._updateItems();
    }
}

LX.ItemArray = ItemArray;

/**
 * @class List
 * @description List Component
 */

class List extends BaseComponent
{
    constructor( name, values, value, callback, options = {} )
    {
        super( BaseComponent.LIST, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            listContainer.querySelectorAll( '.lexlistitem' ).forEach( e => e.classList.remove( 'selected' ) );

            let idx = null;
            for( let i = 0; i < values.length; ++i )
            {
                const v = values[ i ];
                if( v == newValue || ( ( v.constructor == Array ) && ( v[ 0 ] == newValue ) ) )
                {
                    idx = i;
                    break;
                }
            }

            if( !idx )
            {
                console.error( `Cannot find item ${ newValue } in List.` );
                return;
            }

            listContainer.children[ idx ].classList.toggle( 'selected' );
            value = newValue;

            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            listContainer.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        this._updateValues = ( newValues ) => {

            values = newValues;
            listContainer.innerHTML = "";

            for( let i = 0; i < values.length; ++i )
            {
                let icon = null;
                let itemValue = values[ i ];

                if( itemValue.constructor === Array )
                {
                    icon = itemValue[ 1 ];
                    itemValue = itemValue[ 0 ];
                }

                let listElement = document.createElement( 'div' );
                listElement.className = "lexlistitem" + ( value == itemValue ? " selected" : "" );

                if( icon )
                {
                    listElement.appendChild( LX.makeIcon( icon ) );
                }

                listElement.innerHTML += `<span>${ itemValue }</span>`;

                listElement.addEventListener( 'click', e => {
                    listContainer.querySelectorAll( '.lexlistitem' ).forEach( e => e.classList.remove( 'selected' ) );
                    listElement.classList.toggle( 'selected' );
                    value = itemValue;
                    this._trigger( new LX.IEvent( name, itemValue, e ), callback );
                });

                listContainer.appendChild( listElement );
            }
        };

        // Show list

        let listContainer = document.createElement( 'div' );
        listContainer.className = "lexlist";
        this.root.appendChild( listContainer );

        this._updateValues( values );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.List = List;

/**
 * @class RadioGroup
 * @description RadioGroup Component
 */

class RadioGroup extends BaseComponent
{
    constructor( name, label, values, callback, options = {} )
    {
        super( BaseComponent.RADIO, name, null, options );

        let currentIndex = null;

        this.onGetValue = () => {
            const items = container.querySelectorAll( 'button' );
            return currentIndex ? [ currentIndex, items[ currentIndex ] ] : undefined;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            newValue = newValue[ 0 ] ?? newValue; // Allow getting index of { index, value } tupple

            console.assert( newValue.constructor == Number, "RadioGroup _value_ must be an Array index!" );

            const items = container.querySelectorAll( 'button' );
            items.forEach( b => { b.checked = false; b.classList.remove( "checked" ) } );

            const optionItem = items[ newValue ];
            optionItem.checked = !optionItem.checked;
            optionItem.classList.toggle( "checked" );

            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( null, [ newValue, values[ newValue ] ], event ), callback );
            }
        };

        var container = document.createElement( 'div' );
        container.className = "lexradiogroup " + ( options.className ?? "" );
        this.root.appendChild( container );

        let labelSpan = document.createElement( 'span' );
        labelSpan.innerHTML = label;
        container.appendChild( labelSpan );

        for( let i = 0; i < values.length; ++i )
        {
            const optionItem = document.createElement( 'div' );
            optionItem.className = "lexradiogroupitem";
            container.appendChild( optionItem );

            const optionButton = document.createElement( 'button' );
            optionButton.className = "flex p-0 rounded-lg cursor-pointer";
            optionButton.disabled = options.disabled ?? false;
            optionItem.appendChild( optionButton );

            optionButton.addEventListener( "click", ( e ) => {
                this.set( i, false, e );
            } );

            const checkedSpan = document.createElement( 'span' );
            optionButton.appendChild( checkedSpan );

            const optionLabel = document.createElement( 'span' );
            optionLabel.innerHTML = values[ i ];
            optionItem.appendChild( optionLabel );
        }

        if( options.selected )
        {
            console.assert( options.selected.constructor == Number, "RadioGroup _selected_ must be an Array index!" );
            currentIndex = options.selected;
            this.set( currentIndex, true );
        }
    }
}

LX.RadioGroup = RadioGroup;

/**
 * @class Pad
 * @description Pad Component
 */

class Pad extends BaseComponent
{
    constructor( name, value, callback, options = {} )
    {
        super( BaseComponent.PAD, name, null, options );

        this.onGetValue = () => {
            return thumb.value.xy;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            thumb.value.set( newValue[ 0 ], newValue[ 1 ] );
            _updateValue( thumb.value );
            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, thumb.value.xy ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        var container = document.createElement( 'div' );
        container.className = "lexpad";
        this.root.appendChild( container );

        let pad = document.createElement('div');
        pad.id = "lexpad-" + name;
        pad.className = "lexinnerpad";
        pad.style.width = options.padSize ?? '96px';
        pad.style.height = options.padSize ?? '96px';
        container.appendChild( pad );

        let thumb = document.createElement('div');
        thumb.className = "lexpadthumb";
        thumb.value = new LX.vec2( value[ 0 ], value[ 1 ] );
        thumb.min = options.min ?? 0;
        thumb.max = options.max ?? 1;
        pad.appendChild( thumb );

        let _updateValue = v => {
            const [ w, h ] = [ pad.offsetWidth, pad.offsetHeight ];
            const value0to1 = new LX.vec2( LX.remapRange( v.x, thumb.min, thumb.max, 0.0, 1.0 ), LX.remapRange( v.y, thumb.min, thumb.max, 0.0, 1.0 ) );
            thumb.style.transform = `translate(calc( ${ w * value0to1.x }px - 50% ), calc( ${ h * value0to1.y }px - 50%)`;
        }

        pad.addEventListener( "mousedown", innerMouseDown );

        let that = this;

        function innerMouseDown( e )
        {
            if( document.activeElement == thumb )
            {
                return;
            }

            var doc = that.root.ownerDocument;
            doc.addEventListener( 'mousemove', innerMouseMove );
            doc.addEventListener( 'mouseup', innerMouseUp );
            document.body.classList.add( 'nocursor' );
            document.body.classList.add( 'noevents' );
            e.stopImmediatePropagation();
            e.stopPropagation();
            thumb.classList.add( "active" );

            if( options.onPress )
            {
                options.onPress.bind( thumb )( e, thumb );
            }
        }

        function innerMouseMove( e )
        {
            const rect = pad.getBoundingClientRect();
            const relativePosition = new LX.vec2( e.x - rect.x, e.y - rect.y );
            relativePosition.clp( 0.0, pad.offsetWidth, relativePosition);
            const [ w, h ] = [ pad.offsetWidth, pad.offsetHeight ];
            const value0to1 = relativePosition.div( new LX.vec2( pad.offsetWidth, pad.offsetHeight ) );

            thumb.style.transform = `translate(calc( ${ w * value0to1.x }px - 50% ), calc( ${ h * value0to1.y }px - 50%)`;
            thumb.value = new LX.vec2( LX.remapRange( value0to1.x, 0.0, 1.0, thumb.min, thumb.max ), LX.remapRange( value0to1.y, 0.0, 1.0, thumb.min, thumb.max ) );

            that._trigger( new LX.IEvent( name, thumb.value.xy, e ), callback );

            e.stopPropagation();
            e.preventDefault();
        }

        function innerMouseUp( e )
        {
            var doc = that.root.ownerDocument;
            doc.removeEventListener( 'mousemove', innerMouseMove );
            doc.removeEventListener( 'mouseup', innerMouseUp );
            document.body.classList.remove( 'nocursor' );
            document.body.classList.remove( 'noevents' );
            thumb.classList.remove( "active" );

            if( options.onRelease )
            {
                options.onRelease.bind( thumb )( e, thumb );
            }
        }

        LX.doAsync( () => {
            this.onResize();
            _updateValue( thumb.value )
        } );
    }
}

LX.Pad = Pad;

/**
 * @class Progress
 * @description Progress Component
 */

class Progress extends BaseComponent
{
    constructor( name, value, options = {} )
    {
        super( BaseComponent.PROGRESS, name, value, options );

        this.onGetValue = () => {
            return progress.value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
			newValue = LX.clamp( newValue, progress.min, progress.max );
            this.root.querySelector("meter").value = newValue;
            _updateColor();
            if( this.root.querySelector("span") )
            {
                this.root.querySelector("span").innerText = newValue;
            }

            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, newValue, event ), options.callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        const container = document.createElement('div');
        container.className = "lexprogress";
        this.root.appendChild( container );

        // add slider (0-1 if not specified different )

        let progress = document.createElement('meter');
        progress.id = "lexprogressbar-" + name;
        progress.className = "lexprogressbar";
        progress.step = "any";
        progress.min = options.min ?? 0;
        progress.max = options.max ?? 1;
        progress.low = options.low ?? progress.low;
        progress.high = options.high ?? progress.high;
        progress.optimum = options.optimum ?? progress.optimum;
        progress.value = value;
        container.appendChild( progress );

        const _updateColor = () => {

            let backgroundColor = LX.getThemeColor( "global-selected" );

            if( progress.low != undefined && progress.value < progress.low )
            {
                backgroundColor = LX.getThemeColor( "global-color-error" );
            }
            else if( progress.high != undefined && progress.value < progress.high )
            {
                backgroundColor = LX.getThemeColor( "global-color-warning" );
            }

            progress.style.background = `color-mix(in srgb, ${backgroundColor} 20%, transparent)`;
        };

        if( options.showValue )
        {
            if( document.getElementById('progressvalue-' + name ) )
            {
                document.getElementById('progressvalue-' + name ).remove();
            }

            let span = document.createElement("span");
            span.id = "progressvalue-" + name;
            span.style.padding = "0px 5px";
            span.innerText = value;
            container.appendChild( span );
        }

        if( options.editable ?? false )
        {
            progress.classList.add( "editable" );

            let innerMouseDown = e => {

                var doc = this.root.ownerDocument;
                doc.addEventListener( 'mousemove', innerMouseMove );
                doc.addEventListener( 'mouseup', innerMouseUp );
                document.body.classList.add( 'noevents' );
                progress.classList.add( "grabbing" );
                e.stopImmediatePropagation();
                e.stopPropagation();

                const rect = progress.getBoundingClientRect();
                const newValue = LX.round( LX.remapRange( e.offsetX, 0, rect.width, progress.min, progress.max ) );
                this.set( newValue, false, e );
            }

            let innerMouseMove = e => {

                let dt = e.movementX;

                if ( dt != 0 )
                {
                    const rect = progress.getBoundingClientRect();
                    const newValue = LX.round( LX.remapRange( e.offsetX - rect.x, 0, rect.width, progress.min, progress.max ) );
                    this.set( newValue, false, e );
                }

                e.stopPropagation();
                e.preventDefault();
            }

            let innerMouseUp = e => {

                var doc = this.root.ownerDocument;
                doc.removeEventListener( 'mousemove', innerMouseMove );
                doc.removeEventListener( 'mouseup', innerMouseUp );
                document.body.classList.remove( 'noevents' );
                progress.classList.remove( "grabbing" );
            }

            progress.addEventListener( "mousedown", innerMouseDown );
        }

        _updateColor();

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Progress = Progress;

/**
 * @class FileInput
 * @description FileInput Component
 */

class FileInput extends BaseComponent
{
    constructor( name, callback, options = { } )
    {
        super( BaseComponent.FILE, name, null, options );

        let local = options.local ?? true;
        let type = options.type ?? 'text';
        let read = options.read ?? true;

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            input.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        // Create hidden input
        let input = document.createElement( 'input' );
        input.className = "lexfileinput";
        input.type = 'file';
        input.disabled = options.disabled ?? false;
        this.root.appendChild( input );

        if( options.placeholder )
        {
            input.placeholder = options.placeholder;
        }

        input.addEventListener( 'change', function( e ) {

            const files = e.target.files;
            if( !files.length ) return;
            if( read )
            {
                if( options.onBeforeRead )
                    options.onBeforeRead();

                const reader = new FileReader();

                if( type === 'text' ) reader.readAsText( files[ 0 ] );
                else if( type === 'buffer' ) reader.readAsArrayBuffer( files[ 0 ] );
                else if( type === 'bin' ) reader.readAsBinaryString( files[ 0 ] );
                else if( type === 'url' ) reader.readAsDataURL( files[ 0 ] );

                reader.onload = e => { callback.call( this, e.target.result, files[ 0 ] ) } ;
            }
            else
                callback( files[ 0 ] );
        });

        input.addEventListener( 'cancel', function( e ) {
            callback( null );
        });

        if( local )
        {
            let settingsDialog = null;

            const settingButton = new LX.Button(null, "", () => {

                if( settingsDialog )
                {
                    return;
                }

                settingsDialog = new LX.Dialog( "Load Settings", p => {
                    p.addSelect( "Type", [ 'text', 'buffer', 'bin', 'url' ], type, v => { type = v } );
                    p.addButton( null, "Reload", v => { input.dispatchEvent( new Event( 'change' ) ) } );
                }, { onclose: ( root ) => { root.remove(); settingsDialog = null; } } );

            }, { skipInlineCount: true, title: "Settings", disabled: options.disabled, icon: "Settings" });

            this.root.appendChild( settingButton.root );
        }

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.FileInput = FileInput;

/**
 * @class TabSections
 * @description TabSections Component
 */

class TabSections extends BaseComponent
{
    constructor( name, tabs, options = {} )
    {
        options.hideName = true;

        super( BaseComponent.TABS, name, null, options );

        if( tabs.constructor != Array )
        {
            throw( "Param @tabs must be an Array!" );
        }

        if( !tabs.length )
        {
            throw( "Tab list cannot be empty!" );
        }

        const vertical = options.vertical ?? true;
        const showNames = !vertical && ( options.showNames ?? false );

        this.tabDOMs = {};

        let container = document.createElement( 'div' );
        container.className = "lextabscontainer";
        if( !vertical )
        {
            container.className += " horizontal";
        }

        let tabContainer = document.createElement( "div" );
        tabContainer.className = "tabs";
        container.appendChild( tabContainer );
        this.root.appendChild( container );

        // Check at least 1 is selected
        if( tabs.findIndex( e => e.selected === true ) < 0 )
        {
            tabs[ 0 ].selected = true;
        }

        for( let tab of tabs )
        {
            console.assert( tab.name );
            let tabEl = document.createElement( "div" );
            tabEl.className = "lextab " + ( ( tab.selected ?? false ) ? "selected" : "" );
            tabEl.innerHTML = ( showNames ? tab.name : "" );
            tabEl.appendChild( LX.makeIcon( tab.icon ?? "Hash", { title: tab.name, iconClass: tab.iconClass, svgClass: tab.svgClass } ) );
            this.tabDOMs[ tab.name ] = tabEl;

            let infoContainer = document.createElement( "div" );
            infoContainer.id = tab.name.replace( /\s/g, '' );
            infoContainer.className = "components";
            infoContainer.toggleAttribute( "hidden", !( tab.selected ?? false ) );
            container.appendChild( infoContainer );

            tabEl.addEventListener( "click", e => {
                // Change selected tab
                tabContainer.querySelectorAll( ".lextab" ).forEach( e => { e.classList.remove( "selected" ); } );
                tabEl.classList.add( "selected" );
                // Hide all tabs content
                container.querySelectorAll(".components").forEach( e => { e.toggleAttribute( "hidden", true ); } );
                // Show tab content
                const el = container.querySelector( '#' + infoContainer.id );
                el.toggleAttribute( "hidden" );

                if( tab.onSelect )
                {
                    tab.onSelect( this, infoContainer );
                }
            });

            tabContainer.appendChild( tabEl );

            if( tab.onCreate )
            {
                // Push to tab space
                const creationPanel = new LX.Panel();
                creationPanel.queue( infoContainer );
                tab.onCreate.call( this, creationPanel, infoContainer );
                creationPanel.clearQueue();
            }
        }

        this.tabs = tabs;
    }

    select( name ) {

        const tabEl = this.tabDOMs[ name ];

        if( !tabEl )
        {
            return;
        }

        tabEl.click();
    }
}

LX.TabSections = TabSections;

/**
 * @class Counter
 * @description Counter Component
 */

class Counter extends BaseComponent
{
    constructor( name, value, callback, options = { } )
    {
        super( BaseComponent.COUNTER, name, value, options );

        this.onGetValue = () => {
            return counterText.count;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            newValue = LX.clamp( newValue, min, max );
            counterText.count = newValue;
            counterText.innerHTML = newValue;
            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, newValue, event ), callback );
            }
        };

        const min = options.min ?? 0;
        const max = options.max ?? 100;
        const step = options.step ?? 1;

        const container = document.createElement( 'div' );
        container.className = "lexcounter";
        this.root.appendChild( container );

        const substrButton = new LX.Button(null, "", ( value, e ) => {
            let mult = step ?? 1;
            if( e.shiftKey ) mult *= 10;
            this.set( counterText.count - mult, false, e );
        }, { skipInlineCount: true, title: "Minus", icon: "Minus" });

        container.appendChild( substrButton.root );

        const containerBox = document.createElement( 'div' );
        containerBox.className = "lexcounterbox";
        container.appendChild( containerBox );

        const counterText = document.createElement( 'span' );
        counterText.className = "lexcountervalue";
        counterText.innerHTML = value;
        counterText.count = value;
        containerBox.appendChild( counterText );

        if( options.label )
        {
            const counterLabel = document.createElement( 'span' );
            counterLabel.className = "lexcounterlabel";
            counterLabel.innerHTML = options.label;
            containerBox.appendChild( counterLabel );
        }

        const addButton = new LX.Button(null, "", ( value, e ) => {
            let mult = step ?? 1;
            if( e.shiftKey ) mult *= 10;
            this.set( counterText.count + mult, false, e );
        }, { skipInlineCount: true, title: "Plus", icon: "Plus" });
        container.appendChild( addButton.root );
    }
}

LX.Counter = Counter;

/**
 * @class Table
 * @description Table Component
 */

class Table extends BaseComponent
{
    constructor( name, data, options = { } )
    {
        if( !data )
        {
            throw( "Data is needed to create a table!" );
        }

        super( BaseComponent.TABLE, name, null, options );

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        const container = document.createElement('div');
        container.className = "lextable";
        this.root.appendChild( container );

        this._centered = options.centered ?? false;
        if( this._centered === true )
        {
            container.classList.add( "centered" );
        }

        this.activeCustomFilters = {};
        this.filter = options.filter ?? false;
        this.customFilters = options.customFilters ?? false;
        this._toggleColumns = options.toggleColumns ?? false;
        this._sortColumns = options.sortColumns ?? true;
        this._currentFilter = options.filterValue;

        data.head = data.head ?? [];
        data.body = data.body ?? [];
        data.checkMap = { };
        data.colVisibilityMap = { };
        data.head.forEach( ( col, index ) => { data.colVisibilityMap[ index ] = true; })
        this.data = data;

        const compareFn = ( idx, order, a, b ) => {
            if( a[ idx ] < b[ idx ] ) return -order;
            else if( a[ idx ] > b[ idx ] ) return order;
            return 0;
        }

        const sortFn = ( idx, sign ) => {
            data.body = data.body.sort( compareFn.bind( this, idx, sign ) );
            this.refresh();
        }

        // Append header
        if( this.filter || this.customFilters || this._toggleColumns )
        {
            const headerContainer = LX.makeContainer( [ "100%", "auto" ], "flex flex-row" );

            if( this.filter )
            {
                const filterOptions = LX.deepCopy( options );
                filterOptions.placeholder = `Filter ${ this.filter }...`;
                filterOptions.skipComponent = true;
                filterOptions.trigger = "input";
                filterOptions.inputClass = "outline";

                let filter = new LX.TextInput(null, this._currentFilter ?? "", ( v ) => {
                    this._currentFilter = v;
                    this.refresh();
                }, filterOptions );

                headerContainer.appendChild( filter.root );
            }

            if( this.customFilters )
            {
                const icon = LX.makeIcon( "CirclePlus", { svgClass: "sm" } );
                const separatorHtml = `<div class="lexcontainer border-right self-center mx-1" style="width: 1px; height: 70%;"></div>`;

                for( let f of this.customFilters )
                {
                    f.component = new LX.Button(null, icon.innerHTML + f.name, ( v ) => {

                        const spanName = f.component.root.querySelector( "span" );

                        if( f.options )
                        {
                            const menuOptions = f.options.map( ( colName, idx ) => {
                                const item = {
                                    name: colName,
                                    checked:  !!this.activeCustomFilters[ colName ],
                                    callback: (key, v, dom) => {
                                        if( v ) { this.activeCustomFilters[ key ] = f.name; }
                                        else {
                                            delete this.activeCustomFilters[ key ];
                                        }
                                        const activeFilters = Object.keys( this.activeCustomFilters ).filter(  k => this.activeCustomFilters[ k ] == f.name );
                                        const filterBadgesHtml = activeFilters.reduce( ( acc, key ) => acc += LX.badge( key, "bg-tertiary fg-secondary text-sm border-0" ), "" );
                                        spanName.innerHTML = icon.innerHTML + f.name + ( activeFilters.length ? separatorHtml : "" ) + filterBadgesHtml;
                                        this.refresh();
                                    }
                                }
                                return item;
                            } );
                            new LX.DropdownMenu( f.component.root, menuOptions, { side: "bottom", align: "start" });
                        }
                        else if( f.type == "range" )
                        {
                            console.assert( f.min != undefined && f.max != undefined, "Range filter needs min and max values!" );
                            const container = LX.makeContainer( ["240px", "auto"], "text-md" );
                            const panel = new LX.Panel();
                            LX.makeContainer( ["100%", "auto"], "px-3 p-2 pb-0 text-md font-medium", f.name, container );

                            f.start = f.start ?? f.min;
                            f.end = f.end ?? f.max;

                            panel.refresh = () => {
                                panel.clear();
                                panel.sameLine( 2, "justify-center" );
                                panel.addNumber( null, f.start, (v) => {
                                    f.start = v;
                                    const inUse = ( f.start != f.min || f.end != f.max );
                                    spanName.innerHTML = icon.innerHTML + f.name + ( inUse ? separatorHtml + LX.badge( `${ f.start } - ${ f.end } ${ f.units ?? "" }`, "bg-tertiary fg-secondary text-sm border-0" ) : "" );
                                    if( inUse ) this._resetCustomFiltersBtn.root.classList.remove( "hidden" );
                                    this.refresh();
                                }, { skipSlider: true, min: f.min, max: f.max, step: f.step, units: f.units } );
                                panel.addNumber( null, f.end, (v) => {
                                    f.end = v;
                                    const inUse = ( f.start != f.min || f.end != f.max );
                                    spanName.innerHTML = icon.innerHTML + f.name + ( inUse ? separatorHtml + LX.badge( `${ f.start } - ${ f.end } ${ f.units ?? "" }`, "bg-tertiary fg-secondary text-sm border-0" ) : "" );
                                    if( inUse ) this._resetCustomFiltersBtn.root.classList.remove( "hidden" );
                                    this.refresh();
                                }, { skipSlider: true, min: f.min, max: f.max, step: f.step, units: f.units } );
                                panel.addButton( null, "Reset", () => {
                                    f.start = f.min;
                                    f.end = f.max;
                                    spanName.innerHTML = icon.innerHTML + f.name;
                                    panel.refresh();
                                    this.refresh();
                                }, { buttonClass: "contrast" } );
                            }
                            panel.refresh();
                            container.appendChild( panel.root );
                            new LX.Popover( f.component.root, [ container ], { side: "bottom" } );
                        }
                        else if( f.type == "date" )
                        {
                            const container = LX.makeContainer( ["auto", "auto"], "text-md" );
                            const panel = new LX.Panel();
                            LX.makeContainer( ["100%", "auto"], "px-3 p-2 pb-0 text-md font-medium", f.name, container );

                            panel.refresh = () => {
                                panel.clear();

                                // Generate default value once the filter is used
                                if( !f.default )
                                {
                                    const date = new Date();
                                    const todayStringDate = `${ date.getDate() }/${ date.getMonth() + 1 }/${ date.getFullYear() }`;
                                    f.default = [ todayStringDate, todayStringDate ];
                                }

                                const calendar = new LX.CalendarRange( f.value, {
                                    onChange: ( dateRange ) => {
                                        f.value = dateRange;
                                        spanName.innerHTML = icon.innerHTML + f.name + ( separatorHtml + LX.badge( `${ calendar.getFullDate() }`, "bg-tertiary fg-secondary text-sm border-0" ) );
                                        this._resetCustomFiltersBtn.root.classList.remove( "hidden" );
                                        this.refresh();
                                    }
                                });

                                panel.attach( calendar );
                            }
                            panel.refresh();
                            container.appendChild( panel.root );
                            new LX.Popover( f.component.root, [ container ], { side: "bottom" } );
                        }

                    }, { buttonClass: "px-2 primary dashed" } );
                    headerContainer.appendChild( f.component.root );
                }

                this._resetCustomFiltersBtn = new LX.Button(null, "resetButton", ( v ) => {
                    this.activeCustomFilters = {};
                    this._resetCustomFiltersBtn.root.classList.add( "hidden" );
                    for( let f of this.customFilters )
                    {
                        f.component.root.querySelector( "span" ).innerHTML = ( icon.innerHTML + f.name );
                        if( f.type == "range" )
                        {
                            f.start = f.min;
                            f.end = f.max;
                        }
                        else if( f.type == "date" )
                        {
                            delete f.default;
                        }
                    }
                    this.refresh();
                }, { title: "Reset filters", tooltip: true, icon: "X" } );
                headerContainer.appendChild( this._resetCustomFiltersBtn.root );
                this._resetCustomFiltersBtn.root.classList.add( "hidden" );
            }

            if( this._toggleColumns )
            {
                const icon = LX.makeIcon( "Settings2" );
                const toggleColumnsBtn = new LX.Button( "toggleColumnsBtn", icon.innerHTML + "View", (value, e) => {
                    const menuOptions = data.head.map( ( colName, idx ) => {
                        const item = {
                            name: colName,
                            icon: "Check",
                            callback: () => {
                                data.colVisibilityMap[ idx ] = !data.colVisibilityMap[ idx ];
                                const cells = table.querySelectorAll( `tr > *:nth-child(${idx + this.rowOffsetCount + 1})` );
                                cells.forEach( cell => {
                                    cell.style.display = ( cell.style.display === "none" ) ? "" : "none";
                                } );
                            }
                        }
                        if( !data.colVisibilityMap[ idx ] ) delete item.icon;
                        return item;
                    } );
                    new LX.DropdownMenu( e.target, menuOptions, { side: "bottom", align: "end" });
                }, { hideName: true } );
                headerContainer.appendChild( toggleColumnsBtn.root );
                toggleColumnsBtn.root.style.marginLeft = "auto";
            }

            container.appendChild( headerContainer );
        }

        const table = document.createElement( 'table' );
        container.appendChild( table );

        this.refresh = () => {

            this._currentFilter = this._currentFilter ?? "";

            table.innerHTML = "";

            this.rowOffsetCount = 0;

            // Head
            {
                const head = document.createElement( 'thead' );
                head.className = "lextablehead";
                table.appendChild( head );

                const hrow = document.createElement( 'tr' );

                if( options.sortable ?? false )
                {
                    const th = document.createElement( 'th' );
                    th.style.width = "0px";
                    hrow.appendChild( th );
                    this.rowOffsetCount++;
                }

                if( options.selectable ?? false )
                {
                    const th = document.createElement( 'th' );
                    th.style.width = "0px";
                    const input = document.createElement( 'input' );
                    input.type = "checkbox";
                    input.className = "lexcheckbox accent";
                    input.checked = data.checkMap[ ":root" ] ?? false;
                    th.appendChild( input );

                    input.addEventListener( 'change', function() {

                        data.checkMap[ ":root" ] = this.checked;

                        const body = table.querySelector( "tbody" );
                        for( const el of body.childNodes )
                        {
                            const rowId = el.getAttribute( "rowId" );
                            if( !rowId ) continue;
                            data.checkMap[ rowId ] = this.checked;
                            el.querySelector( "input[type='checkbox']" ).checked = this.checked;
                        }
                    });

                    this.rowOffsetCount++;
                    hrow.appendChild( th );
                }

                for( const headData of data.head )
                {
                    const th = document.createElement( 'th' );
                    th.innerHTML = `<span>${ headData }</span>`;
                    th.querySelector( "span" ).appendChild( LX.makeIcon( "MenuArrows", { svgClass: "sm" } ) );

                    const idx = data.head.indexOf( headData );
                    if( this._centered?.indexOf && this._centered.indexOf( idx ) > -1 )
                    {
                        th.classList.add( "centered" );
                    }

                    const menuOptions = [];

                    if( options.columnActions )
                    {
                        for( let action of options.columnActions )
                        {
                            if( !action.name )
                            {
                                console.warn( "Invalid column action (missing name):", action );
                                continue;
                            }

                            menuOptions.push( { name: action.name, icon: action.icon, className: action.className, callback: () => {
                                const colRows = this.data.body.map( row => [ row[ idx ] ] );
                                const mustRefresh = action.callback( colRows, table );
                                if( mustRefresh )
                                {
                                    this.refresh();
                                }
                            } } );
                        }
                    }

                    if( this._sortColumns )
                    {
                        if(  menuOptions.length > 0 )
                        {
                            menuOptions.push( null );
                        }

                        menuOptions.push(
                            { name: "Asc", icon: "ArrowUpAZ", callback: sortFn.bind( this, idx, 1 ) },
                            { name: "Desc", icon: "ArrowDownAZ", callback: sortFn.bind( this, idx, -1 ) }
                        );
                    }

                    if( this._toggleColumns )
                    {
                        if(  menuOptions.length > 0 )
                        {
                            menuOptions.push( null );
                        }

                        menuOptions.push( {
                            name: "Hide", icon: "EyeOff", callback: () => {
                                data.colVisibilityMap[ idx ] = false;
                                const cells = table.querySelectorAll(`tr > *:nth-child(${idx + this.rowOffsetCount + 1})`);
                                cells.forEach( cell => {
                                    cell.style.display = ( cell.style.display === "none" ) ? "" : "none";
                                } );
                            }
                        } );
                    }

                    th.addEventListener( 'click', event => {
                        if( menuOptions.length === 0 ) return;
                        new LX.DropdownMenu( event.target, menuOptions, { side: "bottom", align: "start" });
                    });

                    hrow.appendChild( th );
                }

                // Add empty header column
                if( options.rowActions )
                {
                    const th = document.createElement( 'th' );
                    th.className = "sm";
                    hrow.appendChild( th );
                }

                head.appendChild( hrow );
            }

            // Body
            {
                const body = document.createElement( 'tbody' );
                body.className = "lextablebody";
                table.appendChild( body );

                let rIdx = null;
                let eventCatched = false;
                let movePending = null;

                document.addEventListener( 'mouseup', (e) => {
                    if( rIdx === null ) return;
                    document.removeEventListener( "mousemove", onMove );
                    const fromRow = table.rows[ rIdx ];
                    fromRow.dY = 0;
                    fromRow.classList.remove( "dragging" );
                    Array.from( table.rows ).forEach( v => {
                        v.style.transform = ``;
                        v.style.transition = `none`;
                    } );
                    LX.flushCss( fromRow );

                    if( movePending )
                    {
                        // Modify inner data first
                        // Origin row should go to the target row, and the rest should be moved up/down
                        const fromIdx = rIdx - 1;
                        const targetIdx = movePending[ 1 ] - 1;

                        LX.emitSignal( "@on_table_sort", { instance: this, fromIdx, targetIdx } );

                        const b = data.body[ fromIdx ];
                        let targetOffset = 0;

                        if( fromIdx == targetIdx ) return;
                        if( fromIdx > targetIdx ) // Move up
                        {
                            for( let i = fromIdx; i > targetIdx; --i )
                            {
                                data.body[ i ] = data.body[ i - 1 ];
                            }
                        }
                        else // Move down
                        {
                            targetOffset = 1;
                            for( let i = fromIdx; i < targetIdx; ++i )
                            {
                                data.body[ i ] = data.body[ i + 1 ];
                            }
                        }

                        data.body[targetIdx] = b;

                        const parent = movePending[ 0 ].parentNode;
                        parent.insertChildAtIndex(  movePending[ 0 ], targetIdx + targetOffset );
                        movePending = null;
                    }

                    rIdx = null;

                    LX.doAsync( () => {
                        Array.from( table.rows ).forEach( v => {
                            v.style.transition = `transform 0.2s ease-in`;
                        } );
                    } )
                } );

                let onMove = ( e ) => {
                    if( !rIdx ) return;
                    const fromRow = table.rows[ rIdx ];
                    fromRow.dY = fromRow.dY ?? 0;
                    fromRow.dY += e.movementY;
                    fromRow.style.transform = `translateY(${fromRow.dY}px)`;
                };

                for( let r = 0; r < data.body.length; ++r )
                {
                    const bodyData = data.body[ r ];

                    if( this.filter )
                    {
                        const filterColIndex = data.head.indexOf( this.filter );
                        if( filterColIndex > -1 )
                        {
                            const validRowValue = LX.stripHTML( bodyData[ filterColIndex ] ).toLowerCase();
                            if( !validRowValue.includes( this._currentFilter.toLowerCase() ) )
                            {
                                continue;
                            }
                        }
                    }

                    if( Object.keys( this.activeCustomFilters ).length )
                    {
                        let acfMap = {};

                        this._resetCustomFiltersBtn.root.classList.remove( "hidden" );

                        for( let acfValue in this.activeCustomFilters )
                        {
                            const acfName = this.activeCustomFilters[ acfValue ];
                            acfMap[ acfName ] = acfMap[ acfName ] ?? false;

                            const filterColIndex = data.head.indexOf( acfName );
                            if( filterColIndex > -1 )
                            {
                                acfMap[ acfName ] |= ( bodyData[ filterColIndex ] === acfValue );
                            }
                        }

                        const show = Object.values( acfMap ).reduce( ( e, acc ) => acc *= e, true );
                        if( !show )
                        {
                            continue;
                        }
                    }

                    // Check range/date filters
                    if( this.customFilters )
                    {
                        let acfMap = {};

                        for( let f of this.customFilters )
                        {
                            const acfName = f.name;

                            if( f.type == "range" )
                            {
                                acfMap[ acfName ] = acfMap[ acfName ] ?? false;

                                const filterColIndex = data.head.indexOf( acfName );
                                if( filterColIndex > -1 )
                                {
                                    const validRowValue = parseFloat( bodyData[ filterColIndex ] );
                                    const min = f.start ?? f.min;
                                    const max = f.end ?? f.max;
                                    acfMap[ acfName ] |= ( validRowValue >= min ) && ( validRowValue <= max );
                                }
                            }
                            else if( f.type == "date" )
                            {
                                acfMap[ acfName ] = acfMap[ acfName ] ?? false;

                                const filterColIndex = data.head.indexOf( acfName );
                                if( filterColIndex > -1 )
                                {
                                    if( !f.default )
                                    {
                                        const date = new Date();
                                        const todayStringDate = `${ date.getDate() }/${ date.getMonth() + 1 }/${ date.getFullYear() }`;
                                        f.value = [ todayStringDate, todayStringDate ];
                                        acfMap[ acfName ] |= true;
                                        continue;
                                    }

                                    f.value = f.value ?? f.default;

                                    const dateString = bodyData[ filterColIndex ];
                                    const date = LX.dateFromDateString( dateString );
                                    const minDate = LX.dateFromDateString( f.value[ 0 ] );
                                    const maxDate = LX.dateFromDateString( f.value[ 1 ] );
                                    acfMap[ acfName ] |= ( date >= minDate ) && ( date <= maxDate );
                                }
                            }
                        }

                        const show = Object.values( acfMap ).reduce( ( e, acc ) => acc *= e, true );
                        if( !show )
                        {
                            continue;
                        }
                    }

                    const row = document.createElement( 'tr' );
                    const rowId = LX.getSupportedDOMName( bodyData.join( '-' ) ).substr(0, 32);
                    row.setAttribute( "rowId", rowId );

                    if( options.sortable ?? false )
                    {
                        const td = document.createElement( 'td' );
                        td.style.width = "0px";
                        const icon = LX.makeIcon( "GripVertical" );
                        td.appendChild( icon );

                        icon.draggable = true;

                        icon.addEventListener("dragstart", (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();

                            rIdx = row.rowIndex;
                            row.classList.add( "dragging" );

                            document.addEventListener( "mousemove", onMove );
                        }, false );

                        row.addEventListener("mouseenter", function(e) {
                            e.preventDefault();

                            if( rIdx != null && ( this.rowIndex != rIdx ) && ( eventCatched != this.rowIndex ) )
                            {
                                eventCatched = this.rowIndex;
                                const fromRow = table.rows[ rIdx ];
                                const undo = ( this.style.transform != `` );
                                if (this.rowIndex > rIdx) {
                                    movePending = [ fromRow, undo ? (this.rowIndex-1) : this.rowIndex ];
                                    this.style.transform = undo ? `` : `translateY(-${this.offsetHeight}px)`;
                                } else {
                                    movePending = [ fromRow, undo ? (this.rowIndex+1) : (this.rowIndex) ];
                                    this.style.transform = undo ? `` : `translateY(${this.offsetHeight}px)`;
                                }
                                LX.doAsync( () => {
                                    eventCatched = false;
                                } )
                            }
                        });

                        row.appendChild( td );
                    }

                    if( options.selectable ?? false )
                    {
                        const td = document.createElement( 'td' );
                        const input = document.createElement( 'input' );
                        input.type = "checkbox";
                        input.className = "lexcheckbox accent";
                        input.checked = data.checkMap[ rowId ];
                        td.appendChild( input );

                        input.addEventListener( 'change', function() {
                            data.checkMap[ rowId ] = this.checked;

                            const headInput = table.querySelector( "thead input[type='checkbox']" );

                            if( !this.checked )
                            {
                                headInput.checked = data.checkMap[ ":root" ] = false;
                            }
                            else
                            {
                                const rowInputs = Array.from( table.querySelectorAll( "tbody input[type='checkbox']" ) );
                                const uncheckedRowInputs = rowInputs.filter( i => { return !i.checked; } );
                                if( !uncheckedRowInputs.length )
                                {
                                    headInput.checked = data.checkMap[ ":root" ] = true;
                                }
                            }
                        });

                        row.appendChild( td );
                    }

                    for( const rowData of bodyData )
                    {
                        const td = document.createElement( 'td' );
                        td.innerHTML = `${ rowData }`;

                        const idx = bodyData.indexOf( rowData );
                        if( this._centered?.indexOf && this._centered.indexOf( idx ) > -1 )
                        {
                            td.classList.add( "centered" );
                        }

                        row.appendChild( td );
                    }

                    if( options.rowActions )
                    {
                        const td = document.createElement( 'td' );
                        td.style.width = "0px";

                        const buttons = document.createElement( 'div' );
                        buttons.className = "lextablebuttons";
                        td.appendChild( buttons );

                        for( const action of options.rowActions )
                        {
                            let button = null;

                            if( action == "delete" )
                            {
                                button = LX.makeIcon( "Trash3", { title: "Delete Row" } );
                                button.addEventListener( 'click', function() {
                                    // Don't need to refresh table..
                                    data.body.splice( r, 1 );
                                    row.remove();
                                });
                            }
                            else if( action == "menu" )
                            {
                                button = LX.makeIcon( "EllipsisVertical", { title: "Menu" } );
                                button.addEventListener( 'click', function( event ) {
                                    if( !options.onMenuAction )
                                    {
                                        return;
                                    }

                                    const menuOptions = options.onMenuAction( r, data );
                                    console.assert( menuOptions.length, "Add items to the Menu Action Dropdown!" );

                                    new LX.DropdownMenu( event.target, menuOptions, { side: "bottom", align: "end" });
                                });
                            }
                            else // custom actions
                            {
                                console.assert( action.constructor == Object );
                                button = LX.makeIcon( action.icon, { title: action.title } );

                                if( action.callback )
                                {
                                    button.addEventListener( 'click', e => {
                                        const mustRefresh = action.callback( bodyData, table, e );
                                        if( mustRefresh )
                                        {
                                            this.refresh();
                                        }
                                    });
                                }
                            }

                            console.assert( button );
                            buttons.appendChild( button );
                        }

                        row.appendChild( td );
                    }

                    body.appendChild( row );
                }

                if( body.childNodes.length == 0 )
                {
                    const row = document.createElement( 'tr' );
                    const td = document.createElement( 'td' );
                    td.setAttribute( "colspan", data.head.length + this.rowOffsetCount + 1 ); // +1 for rowActions
                    td.className = "empty-row";
                    td.innerHTML = "No results.";
                    row.appendChild( td );
                    body.appendChild( row );
                }
            }

            for( const v in data.colVisibilityMap )
            {
                const idx = parseInt( v );
                if( !data.colVisibilityMap[ idx ] )
                {
                    const cells = table.querySelectorAll( `tr > *:nth-child(${idx + this.rowOffsetCount + 1})` );
                    cells.forEach( cell => {
                        cell.style.display = ( cell.style.display === "none" ) ? "" : "none";
                    } );
                }
            }
        }

        this.refresh();

        LX.doAsync( this.onResize.bind( this ) );
    }

    getSelectedRows()
    {
        const selectedRows = [];

        for( const row of this.data.body )
        {
            const rowId = LX.getSupportedDOMName( row.join( '-' ) ).substr( 0, 32 );
            if( this.data.checkMap[ rowId ] === true )
            {
                selectedRows.push( row );
            }
        }

        return selectedRows;
    }

    _setCentered( v )
    {
        if( v.constructor == Boolean )
        {
            const container = this.root.querySelector( ".lextable" );
            container.classList.toggle( "centered", v );
        }
        else
        {
            // Make sure this is an array containing which columns have
            // to be centered
            v = [].concat( v );
        }

        this._centered = v;

        this.refresh();
    }
}

Object.defineProperty( Table.prototype, "centered", {
    get: function() { return this._centered; },
    set: function( v ) { this._setCentered( v ); },
    enumerable: true,
    configurable: true
});

LX.Table = Table;

/**
 * @class DatePicker
 * @description DatePicker Component
 */

class DatePicker extends BaseComponent
{
    constructor( name, dateValue, callback, options = { } )
    {
        super( BaseComponent.DATE, name, null, options );

        const dateAsRange = ( dateValue?.constructor === Array );

        if( !dateAsRange && options.today )
        {
            const date = new Date();
            dateValue = `${ date.getDate() }/${ date.getMonth() + 1 }/${ date.getFullYear() }`;
        }

        this.onGetValue = () => {
            return dateValue;
        }

        this.onSetValue = ( newValue, skipCallback, event ) => {

            if( !dateAsRange )
            {
                this.calendar.fromDateString( newValue );
            }

            dateValue = newValue;

            refresh( this.calendar.getFullDate() );

            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, newValue, event ), callback );
            }
        }

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        const container = LX.makeContainer( [ "auto", "auto" ], "lexdate flex flex-row" );
        this.root.appendChild( container );

        if( !dateAsRange )
        {
            this.calendar = new LX.Calendar( dateValue, {
                onChange: ( date ) => {
                    const newDateString = `${ date.day }/${ date.month }/${ date.year }`;
                    this.set( newDateString );
                },
                ...options
            });
        }
        else
        {
            this.calendar = new LX.CalendarRange( dateValue, {
                onChange: ( dateRange ) => {
                    this.set( dateRange );
                },
                ...options
            });
        }

        const refresh = ( currentDate ) => {

            const emptyDate = !!currentDate;

            container.innerHTML = "";

            currentDate = currentDate ?? "Pick a date";

            const dts = currentDate.split( " to " );
            const d0 = dateAsRange ? dts[ 0 ] : currentDate;

            const calendarIcon = LX.makeIcon( "Calendar" );
            const calendarButton = new LX.Button( null, d0, () => {
                this._popover = new LX.Popover( calendarButton.root, [ this.calendar ] );
            }, { buttonClass: `flex flex-row px-3 ${ emptyDate ? "" : "fg-tertiary" } justify-between` } );
            calendarButton.root.querySelector( "button" ).appendChild( calendarIcon );
            calendarButton.root.style.width = "100%";
            container.appendChild( calendarButton.root );

            if( dateAsRange )
            {
                const arrowRightIcon = LX.makeIcon( "ArrowRight" );
                LX.makeContainer( ["32px", "auto"], "content-center", arrowRightIcon.innerHTML, container );

                const d1 = dts[ 1 ];
                const calendarIcon = LX.makeIcon( "Calendar" );
                const calendarButton = new LX.Button( null, d1, () => {
                    this._popover = new LX.Popover( calendarButton.root, [ this.calendar ] );
                }, { buttonClass: `flex flex-row px-3 ${ emptyDate ? "" : "fg-tertiary" } justify-between` } );
                calendarButton.root.querySelector( "button" ).appendChild( calendarIcon );
                calendarButton.root.style.width = "100%";
                container.appendChild( calendarButton.root );
            }
        };

        if( dateValue )
        {
            refresh( this.calendar.getFullDate() );
        }
        else
        {
            refresh();
        }

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.DatePicker = DatePicker;

/**
 * @class Rate
 * @description Rate Component
 */

class Rate extends BaseComponent
{
    constructor( name, value, callback, options = {} )
    {
        const allowHalf = options.allowHalf ?? false;

        if( !allowHalf )
        {
            value = Math.floor( value );
        }

        super( BaseComponent.RATE, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            value = newValue;

            _updateStars( value );

            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        const container = document.createElement('div');
        container.className = "lexrate relative";
        this.root.appendChild( container );

        const starsContainer = LX.makeContainer( ["fit-content", "auto"], "flex flex-row gap-1", "", container );
        const filledStarsContainer = LX.makeContainer( ["fit-content", "auto"], "absolute top-0 flex flex-row gap-1 pointer-events-none", "", container );
        const halfStarsContainer = LX.makeContainer( ["fit-content", "auto"], "absolute top-0 flex flex-row gap-1 pointer-events-none", "", container );

        starsContainer.addEventListener("mousemove", e => {
            const star = e.target;
            const idx = star.dataset["idx"];

            if( idx !== undefined )
            {
                const rect = star.getBoundingClientRect();
                const half = allowHalf && e.offsetX < ( rect.width * 0.5 );
                _updateStars( idx - ( half ? 0.5 : 0.0 ) );
            }
        }, false );

        starsContainer.addEventListener("mouseleave", e => {
            _updateStars( value );
        }, false );

        // Create all layers of stars

        for( let i = 0; i < 5; ++i )
        {
            const starIcon = LX.makeIcon( "Star", { svgClass: `lg fill-current fg-secondary` } );
            starIcon.dataset["idx"] = ( i + 1 );
            starsContainer.appendChild( starIcon );

            starIcon.addEventListener("click", e => {
                const rect = e.target.getBoundingClientRect();
                const half = allowHalf && e.offsetX < ( rect.width * 0.5 );
                this.set( parseFloat( e.target.dataset["idx"] ) - ( half ? 0.5 : 0.0 ) );
            }, false );

            const filledStarIcon = LX.makeIcon( "Star", { svgClass: `lg fill-current metallicyellow` } );
            filledStarsContainer.appendChild( filledStarIcon );

            const halfStarIcon = LX.makeIcon( "StarHalf", { svgClass: `lg fill-current metallicyellow` } );
            halfStarsContainer.appendChild( halfStarIcon );
        }

        const _updateStars = ( v ) => {

            for( let i = 0; i < 5; ++i )
            {
                const filled = ( v > ( i + 0.5 ) );
                const starIcon = filledStarsContainer.childNodes[ i ];
                const halfStarIcon = halfStarsContainer.childNodes[ i ];
                if( filled )
                {
                    starIcon.style.opacity = 1;
                }
                else
                {
                    starIcon.style.opacity = 0;

                    const halfFilled = allowHalf && ( v > i );
                    if( halfFilled )
                    {
                        halfStarIcon.style.opacity = 1;
                    }
                    else
                    {
                        halfStarIcon.style.opacity = 0;
                    }

                }
            }
        }

        _updateStars( value );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Rate = Rate;

export { BaseComponent, ADD_CUSTOM_COMPONENT };