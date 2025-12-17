// Select.ts @jxarco

import { IEvent } from './../core/Event';
import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';
import { Button } from './Button';
import { TextInput } from './TextInput';

/**
 * @class Select
 * @description Select Component
 */

export class Select extends BaseComponent
{
    _lastPlacement: boolean[] = [ false, false ];

    constructor( name: string | null, values: any[], value: any, callback: any, options: any = {} )
    {
        super( ComponentType.SELECT, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            value = newValue;

            let item: any = null;
            const listOptionsNodes = list.childNodes;
            listOptionsNodes.forEach( ( e: any ) => {
                e.classList.remove( 'selected' );
                if ( e.getAttribute( 'value' ) == newValue )
                {
                    item = e;
                }
            } );

            console.assert( item, `Item ${newValue} does not exist in the Select.` );
            item.classList.add( 'selected' );
            selectedOption.refresh( value );

            // Reset filter
            if ( filter )
            {
                filter.root.querySelector( 'input' ).value = '';
                const filteredOptions = this._filterOptions( values, '' );
                list.refresh( filteredOptions );
            }

            // Update suboptions menu
            const suboptions = this.root.querySelector( '.lexcustomcontainer' );
            const suboptionsFunc = options[`on_${value}`];
            suboptions.toggleAttribute( 'hidden', !suboptionsFunc );

            if ( suboptionsFunc )
            {
                suboptions.innerHTML = '';
                const suboptionsPanel = new LX.Panel();
                suboptionsPanel.queue( suboptions );
                suboptionsFunc.call( this, suboptionsPanel );
                suboptionsPanel.clearQueue();
            }

            this.root.dataset['opened'] = !!suboptionsFunc;
            list.style.height = ''; // set auto height by default

            if ( !skipCallback )
            {
                this._trigger( new IEvent( name, value, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = this.root.domName?.style.width ?? '0px';
            container.style.width = options.inputWidth ?? `calc( 100% - ${realNameWidth})`;
        };

        let container = document.createElement( 'div' );
        container.className = 'lexselect';
        this.root.appendChild( container );

        let wValue: any = document.createElement( 'div' );
        wValue.className = 'lexselect lexoption';
        wValue.name = name;
        wValue.iValue = value;

        if ( options.overflowContainer !== undefined )
        {
            options.overflowContainerX = options.overflowContainerY = options.overflowContainer;
        }

        const _placeOptions = ( parent: any, forceLastPlacement?: boolean ) => {
            const selectRoot = selectedOption.root;
            const rect = selectRoot.getBoundingClientRect();
            const nestedDialog = parent.parentElement.closest( 'dialog' )
                ?? parent.parentElement.closest( '.lexcolorpicker' );

            // Manage vertical aspect
            {
                const overflowContainer = options.overflowContainerY !== undefined
                    ? options.overflowContainerY
                    : LX.getParentArea( parent );
                const listHeight = parent.offsetHeight;
                let topPosition = rect.y;

                let maxY = window.innerHeight;

                if ( overflowContainer )
                {
                    const parentRect = overflowContainer.getBoundingClientRect();
                    maxY = parentRect.y + parentRect.height;
                }

                if ( nestedDialog )
                {
                    const rect = nestedDialog.getBoundingClientRect();
                    topPosition -= rect.y;
                    maxY -= rect.y;
                }

                parent.style.top = ( topPosition + selectRoot.offsetHeight ) + 'px';
                list.style.height = ''; // set auto height by default

                const failAbove = forceLastPlacement ? this._lastPlacement[0] : ( topPosition - listHeight ) < 0;
                const failBelow = forceLastPlacement ? this._lastPlacement[1] : ( topPosition + listHeight ) > maxY;
                if ( failBelow && !failAbove )
                {
                    parent.style.top = ( topPosition - listHeight ) + 'px';
                    parent.classList.add( 'place-above' );
                }
                // If does not fit in any direction, put it below but limit height..
                else if ( failBelow && failAbove )
                {
                    list.style.height = `${maxY - topPosition - 32}px`; // 32px margin
                }

                this._lastPlacement = [ failAbove, failBelow ];
            }

            // Manage horizontal aspect
            {
                const overflowContainer = options.overflowContainerX !== undefined
                    ? options.overflowContainerX
                    : LX.getParentArea( parent );
                const listWidth = parent.offsetWidth;
                let leftPosition = rect.x;

                parent.style.minWidth = ( rect.width ) + 'px';

                if ( nestedDialog )
                {
                    const rect = nestedDialog.getBoundingClientRect();
                    leftPosition -= rect.x;
                }

                parent.style.left = leftPosition + 'px';

                let maxX = window.innerWidth;

                if ( overflowContainer )
                {
                    const parentRect = overflowContainer.getBoundingClientRect();
                    maxX = parentRect.x + parentRect.width;
                }

                const showLeft = ( leftPosition + listWidth ) > maxX;
                if ( showLeft )
                {
                    parent.style.left = ( leftPosition - ( listWidth - rect.width ) ) + 'px';
                }
            }
        };

        let selectedOption = new Button( null, value, ( value: any, event: any ) => {
            if ( list.unfocus_event )
            {
                delete list.unfocus_event;
                return;
            }

            listDialog.classList.remove( 'place-above' );
            const opened = listDialog.hasAttribute( 'open' );

            if ( !opened )
            {
                listDialog.show();
                _placeOptions( listDialog );
            }
            else
            {
                listDialog.close();
            }

            if ( filter )
            {
                filter.root.querySelector( 'input' ).focus();
            }
        }, { buttonClass: 'outline [&_a]:ml-auto', skipInlineCount: true, disabled: options.disabled } );

        selectedOption.root.style.width = '100%';
        selectedOption.root.querySelector( 'button' ).appendChild( LX.makeIcon( 'Down', { svgClass: 'sm' } ) );

        container.appendChild( selectedOption.root );

        selectedOption.refresh = ( v?: string ) => {
            const button = selectedOption.root.querySelector( 'button' );
            if ( button.innerText == '' )
            {
                button.innerText = v;
            }
            else
            {
                button.innerHTML = button.innerHTML.replaceAll( button.innerText, v );
            }
        };

        // Add select options container

        const listDialog = document.createElement( 'dialog' );
        listDialog.className = 'lexselectoptions';

        let list: any = document.createElement( 'ul' );
        list.tabIndex = -1;
        list.className = 'lexoptions';
        listDialog.appendChild( list );

        list.addEventListener( 'focusout', function( e: any )
        {
            e.stopPropagation();
            e.stopImmediatePropagation();
            if ( e.relatedTarget === selectedOption.root.querySelector( 'button' ) )
            {
                list.unfocus_event = true;
                setTimeout( () => delete list.unfocus_event, 200 );
            }
            else if ( e.relatedTarget && listDialog.contains( e.relatedTarget ) )
            {
                return;
            }
            else if ( e.target.className == 'lexinput-filter' )
            {
                return;
            }
            listDialog.close();
        } );

        // Add filter options
        let filter: any = null;
        if ( options.filter ?? false )
        {
            const filterOptions = LX.deepCopy( options );
            filterOptions.placeholder = filterOptions.placeholder ?? 'Search...';
            filterOptions.skipComponent = filterOptions.skipComponent ?? true;
            filterOptions.trigger = 'input';
            filterOptions.icon = 'Search';
            filterOptions.className = 'lexfilter';
            filterOptions.inputClass = 'outline';

            filter = new TextInput( null, options.filterValue ?? '', ( v: string ) => {
                const filteredOptions = this._filterOptions( values, v );
                list.refresh( filteredOptions );
                _placeOptions( listDialog, true );
            }, filterOptions );
            filter.root.querySelector( '.lextext' ).style.border = '1px solid transparent';

            const input = filter.root.querySelector( 'input' );

            input.addEventListener( 'focusout', function( e: any )
            {
                if ( e.relatedTarget && e.relatedTarget.tagName == 'UL'
                    && e.relatedTarget.classList.contains( 'lexoptions' ) )
                {
                    return;
                }
                listDialog.close();
            } );

            list.appendChild( filter.root );
        }

        // Add select options list
        list.refresh = ( currentOptions: any ) => {
            // Empty list
            while ( list.childElementCount > ( options.filter ?? false ? 1 : 0 ) )
            {
                list.removeChild( list.lastChild );
            }

            if ( !currentOptions.length )
            {
                let iValue = options.emptyMsg ?? 'No options found.';

                let option = document.createElement( 'div' );
                option.className = 'option';
                option.innerHTML = LX.makeIcon( 'Inbox', { svgClass: 'mr-2' } ).innerHTML + iValue;

                let li = document.createElement( 'li' );
                li.className = 'lexselectitem empty';
                li.appendChild( option );

                list.appendChild( li );
                return;
            }

            for ( let i = 0; i < currentOptions.length; i++ )
            {
                let iValue = currentOptions[i];
                let li = document.createElement( 'li' );
                let option: any = document.createElement( 'div' );
                option.className = 'option';
                li.appendChild( option );

                const onSelect = ( e: any ) => {
                    this.set( e.currentTarget?.getAttribute( 'value' ), false, e );
                    listDialog.close();
                };

                li.addEventListener( 'click', onSelect );

                // Add string option
                if ( iValue.constructor != Object )
                {
                    const asLabel = iValue[0] === '@';

                    if ( !asLabel )
                    {
                        option.innerHTML = `<span class="flex flex-row justify-between">${iValue}</span>`;
                        option.appendChild( LX.makeIcon( 'Check' ) );
                        option.value = iValue;
                        li.setAttribute( 'value', iValue );

                        if ( iValue == value )
                        {
                            li.classList.add( 'selected' );
                            wValue.innerHTML = iValue;
                        }
                    }
                    else
                    {
                        option.innerHTML = '<span>' + iValue.substr( 1 ) + '</span>';
                        li.removeEventListener( 'click', onSelect );
                    }

                    li.classList.add( asLabel ? 'lexselectlabel' : 'lexselectitem' );
                }
                else
                {
                    // Add image option
                    let img = document.createElement( 'img' );
                    img.src = iValue.src;
                    li.setAttribute( 'value', iValue.value );
                    li.className = 'lexlistitem';
                    option.innerText = iValue.value;
                    option.className += ' media';
                    option.prepend( img );

                    option.setAttribute( 'value', iValue.value );
                    option.setAttribute( 'data-index', i );
                    option.setAttribute( 'data-src', iValue.src );
                    option.setAttribute( 'title', iValue.value );

                    if ( value == iValue.value )
                    {
                        li.classList.add( 'selected' );
                    }
                }

                list.appendChild( li );
            }
        };

        list.refresh( values );

        container.appendChild( listDialog );

        // Element suboptions
        let suboptions = document.createElement( 'div' );
        suboptions.className = 'lexcustomcontainer w-full';

        const suboptionsFunc = options[`on_${value}`];
        suboptions.toggleAttribute( 'hidden', !suboptionsFunc );

        if ( suboptionsFunc )
        {
            suboptions.innerHTML = '';
            const suboptionsPanel = new LX.Panel();
            suboptionsPanel.queue( suboptions );
            suboptionsFunc.call( this, suboptionsPanel );
            suboptionsPanel.clearQueue();
        }

        this.root.appendChild( suboptions );
        this.root.dataset['opened'] = !!suboptionsFunc;

        LX.doAsync( this.onResize.bind( this ) );
    }

    _filterOptions( options: any, value: string )
    {
        // Push to right container
        const emptyFilter = !value.length;
        let filteredOptions = [];

        // Add components
        for ( let i = 0; i < options.length; i++ )
        {
            let o = options[i];
            if ( !emptyFilter )
            {
                let toCompare = ( typeof o == 'string' ) ? o : o.value;
                const filterWord = value.toLowerCase();
                const name = toCompare.toLowerCase();
                if ( !name.includes( filterWord ) ) continue;
            }

            filteredOptions.push( o );
        }

        return filteredOptions;
    }
}

LX.Select = Select;
