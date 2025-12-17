// DocMaker.ts @jxarco

import { LX } from '../core/Namespace';

if ( !LX )
{
    throw ( 'Missing LX namespace!' );
}

LX.extensions.push( 'DocMaker' );

const CPP_KEY_WORDS = [ 'int', 'float', 'double', 'bool', 'char', 'wchar_t', 'const', 'static_cast', 'dynamic_cast',
    'new', 'delete', 'void', 'true', 'false', 'auto', 'struct', 'typedef', 'nullptr', 'NULL', 'unsigned', 'namespace',
    'auto' ];
const CLASS_WORDS = [ 'uint32_t', 'uint64_t', 'uint8_t' ];
const STATEMENT_WORDS = [ 'for', 'if', 'else', 'return', 'continue', 'break', 'case', 'switch', 'while', 'import',
    'from', 'await' ];

const JS_KEY_WORDS = [ 'var', 'let', 'const', 'static', 'function', 'null', 'undefined', 'new', 'delete', 'true',
    'false', 'NaN', 'this' ];
const HTML_ATTRIBUTES = [ 'html', 'charset', 'rel', 'src', 'href', 'crossorigin', 'type', 'lang' ];
const HTML_TAGS = [ 'html', 'DOCTYPE', 'head', 'meta', 'title', 'link', 'script', 'body', 'style' ];

export class DocMaker
{
    root: Element;
    _listQueued: Element | undefined = undefined;

    constructor( element?: Element )
    {
        this.root = element ?? document.body;
    }

    setDomTarget( element: Element )
    {
        this.root = element;
    }

    lineBreak( target?: Element )
    {
        target = target ?? this.root;
        target.appendChild( document.createElement( 'br' ) );
    }

    header( string: string, type: string, id: string )
    {
        console.assert( string !== undefined && type !== undefined );
        let header = document.createElement( type );
        header.innerHTML = string;
        if ( id ) header.id = id;
        this.root.appendChild( header );
    }

    paragraph( string: string, sup: boolean = false, className?: string )
    {
        console.assert( string !== undefined );
        let paragraph = document.createElement( sup ? 'sup' : 'p' );
        paragraph.className = 'leading-relaxed ' + ( className ?? '' );
        paragraph.innerHTML = string;
        this.root.appendChild( paragraph );
    }

    code( text: string, language: string = 'js' )
    {
        console.assert( text !== undefined );

        text.replaceAll( '<', '&lt;' );
        text.replaceAll( '>', '&gt;' );

        let highlight = '';
        let content = '';

        const getHTML = ( h: string, c: string ) => {
            return `<span class="${h}">${c}</span>`;
        };

        for ( let i = 0; i < text.length; ++i )
        {
            const char = text[i];
            const string = text.substr( i );

            const endLineIdx = string.indexOf( '\n' );
            const line = string.substring( 0, endLineIdx > -1 ? endLineIdx : undefined );

            if ( char == '@' )
            {
                const str = line.substr( 1 );

                if ( !( str.indexOf( '@' ) > -1 ) && !( str.indexOf( '[' ) > -1 ) )
                {
                    continue;
                }

                let html = null;

                const tagIndex = str.indexOf( '@' );
                const skipTag = str[tagIndex - 1] == '|';

                // Highlight is specified
                if ( text[i + 1] == '[' )
                {
                    highlight = str.substr( 1, 3 );
                    content = str.substring( 5, tagIndex );

                    if ( skipTag )
                    {
                        const newString = str.substring( 6 + content.length );
                        const preContent = content;
                        const postContent = newString.substring( 0, newString.indexOf( '@' ) );
                        const finalContent = preContent.substring( 0, preContent.length - 1 ) + '@' + postContent;
                        html = getHTML( highlight, finalContent );

                        const ogContent = preContent + '@' + postContent;
                        text = text.replace( `@[${highlight}]${ogContent}@`, html );
                    }
                    else
                    {
                        html = getHTML( highlight, content );
                        text = text.replace( `@[${highlight}]${content}@`, html );
                    }
                }
                else
                {
                    content = str.substring( 0, tagIndex );
                    if ( skipTag )
                    {
                        const preContent = str.substring( 0, str.indexOf( '@' ) - 1 );
                        content = str.substring( preContent.length + 1 );
                        content = preContent + content.substring( 0, content.substring( 1 ).indexOf( '@' ) + 1 );
                        text = text.substr( 0, i ) + '@' + content + '@' + text.substr( i + content.length + 3 );
                    }

                    if ( language == 'cpp' && CPP_KEY_WORDS.includes( content ) )
                    {
                        highlight = 'kwd';
                    }
                    else if ( language == 'js' && JS_KEY_WORDS.includes( content ) )
                    {
                        highlight = 'kwd';
                    }
                    else if ( CLASS_WORDS.includes( content ) )
                    {
                        highlight = 'cls';
                    }
                    else if ( STATEMENT_WORDS.includes( content ) )
                    {
                        highlight = 'lit';
                    }
                    else if ( HTML_TAGS.includes( content ) )
                    {
                        highlight = 'tag';
                    }
                    else if ( HTML_ATTRIBUTES.includes( content ) )
                    {
                        highlight = 'atn';
                    }
                    else if ( ( content[0] == '"' && content[content.length - 1] == '"' )
                        || ( content[0] == "'" && content[content.length - 1] == "'" )
                        || ( content[0] == '`' && content[content.length - 1] == '`' ) )
                    {
                        highlight = 'str';
                    }
                    else if ( !Number.isNaN( parseFloat( content ) ) )
                    {
                        highlight = 'dec';
                    }
                    else
                    {
                        console.error( 'ERROR[Code Parsing]: Unknown highlight type: ' + content );
                        return;
                    }

                    html = getHTML( highlight, content );
                    text = text.replace( `@${content}@`, html );
                }

                i += html.length - 1;
            }
        }

        let container = document.createElement( 'div' );
        container.className = 'code-container';
        let pre = document.createElement( 'pre' );
        let code = document.createElement( 'code' );
        code.innerHTML = text;

        let button = document.createElement( 'button' );
        button.title = 'Copy code sample';
        button.appendChild( LX.makeIcon( 'Copy' ) );
        button.addEventListener( 'click', this._copySnippet.bind( this, button ) );
        container.appendChild( button );

        pre.appendChild( code );
        container.appendChild( pre );
        this.root.appendChild( container );
    }

    list( list: any[], type: string, target?: Element )
    {
        const validTypes = [ 'bullet', 'numbered' ];
        console.assert( list && list.length > 0 && validTypes.includes( type ),
            'Invalid list type or empty list' + type );
        const typeString = type == 'bullet' ? 'ul' : 'ol';
        let ul = document.createElement( typeString );
        target = target ?? this.root;
        target.appendChild( ul );
        for ( var el of list )
        {
            if ( el.constructor === Array )
            {
                this.list( el, type, ul );
                return;
            }
            let li = document.createElement( 'li' );
            li.className = 'leading-loose';
            li.innerHTML = el;
            ul.appendChild( li );
        }
    }

    bulletList( list: any[] )
    {
        this.list( list, 'bullet' );
    }

    numberedList( list: any[] )
    {
        this.list( list, 'numbered' );
    }

    startCodeBulletList()
    {
        let ul = document.createElement( 'ul' );
        this._listQueued = ul;
    }

    endCodeBulletList()
    {
        if ( this._listQueued === undefined ) return;
        console.assert( this._listQueued !== undefined );
        this.root.appendChild( this._listQueued );
        this._listQueued = undefined;
    }

    codeListItem( item: any, target?: Element )
    {
        target = target ?? this._listQueued;
        let split = item.constructor === Array;
        if ( split && item[0].constructor === Array )
        {
            this.codeBulletList( item, target );
            return;
        }
        let li = document.createElement( 'li' );
        li.className = 'leading-loose';
        li.innerHTML = split
            ? ( item.length == 2
                ? this.iCode( item[0] ) + ': ' + item[1]
                : this.iCode( item[0] + " <span class='desc'>(" + item[1] + ')</span>' ) + ': ' + item[2] )
            : this.iCode( item );
        target?.appendChild( li );
    }

    codeBulletList( list: any[], target?: Element )
    {
        console.assert( list !== undefined && list.length > 0 );
        let ul = document.createElement( 'ul' );
        for ( var el of list )
        {
            this.codeListItem( el, ul );
        }

        if ( target )
        {
            target.appendChild( ul );
        }
        else
        {
            this.root.appendChild( ul );
        }
    }

    image( src: string, caption: string = '', parent?: Element )
    {
        let img = document.createElement( 'img' );
        img.src = src;
        img.alt = caption;
        img.className = 'my-1';
        parent = parent ?? this.root;
        parent.appendChild( img );
    }

    images( sources: string[], captions: string[] = [], width?: string, height?: string )
    {
        const mobile = navigator && /Android|iPhone/i.test( navigator.userAgent );

        if ( !mobile )
        {
            let div: HTMLElement = document.createElement( 'div' );
            div.style.width = width ?? 'auto';
            div.style.height = height ?? '256px';
            div.className = 'flex flex-row justify-center';

            for ( let i = 0; i < sources.length; ++i )
            {
                this.image( sources[i], captions[i], div );
            }

            this.root.appendChild( div );
        }
        else
        {
            for ( let i = 0; i < sources.length; ++i )
            {
                this.image( sources[i], captions[i] );
            }
        }
    }

    video( src: string, caption: string = '', controls: boolean = true, autoplay: boolean = false )
    {
        let video: any = document.createElement( 'video' );
        video.src = src;
        video.controls = controls;
        video.autoplay = autoplay;
        if ( autoplay )
        {
            video.muted = true;
        }
        video.loop = true;
        video.alt = caption;
        this.root.appendChild( video );
    }

    note( text: string, warning: boolean = false, title?: string, icon?: string )
    {
        console.assert( text !== undefined );

        const note = LX.makeContainer( [], 'border-color rounded-lg overflow-hidden text-sm text-primary my-6', '',
            this.root );

        let header = document.createElement( 'div' );
        header.className = 'flex bg-muted font-semibold px-3 py-2 gap-2 text-primary';
        header.appendChild( LX.makeIcon( icon ?? ( warning ? 'MessageSquareWarning' : 'NotepadText' ) ) );
        header.innerHTML += title ?? ( warning ? 'Important' : 'Note' );
        note.appendChild( header );

        // Node body
        LX.makeContainer( [], 'leading-6 p-3', text, note );
    }

    classCtor( name: string, params: any[], language: string = 'js' )
    {
        let paramsHTML = '';
        for ( var p of params )
        {
            const str1 = p[0]; // cpp: param          js: name
            const str2 = p[1]; // cpp: defaultValue   js: type
            if ( language == 'cpp' )
            {
                paramsHTML += str1 + ( str2 ? " = <span class='desc'>" + str2 + '</span>' : '' )
                    + ( params.indexOf( p ) != ( params.length - 1 ) ? ', ' : '' );
            }
            else if ( language == 'js' )
            {
                paramsHTML += str1 + ": <span class='desc'>" + str2 + '</span>'
                    + ( params.indexOf( p ) != ( params.length - 1 ) ? ', ' : '' );
            }
        }
        let pr = document.createElement( 'p' );
        pr.innerHTML = this.iCode( "<span class='constructor'>" + name + '(' + paramsHTML + ')' + '</span>' );
        this.root.appendChild( pr );
    }

    classMethod( name: string, desc: string, params: any[], ret?: string ): HTMLElement | null
    {
        this.startCodeBulletList();

        let paramsHTML = '';
        for ( var p of params )
        {
            const name = p[0];
            const type = p[1];
            paramsHTML += name + ": <span class='desc'>" + type + '</span>'
                + ( params.indexOf( p ) != ( params.length - 1 ) ? ', ' : '' );
        }
        let li = document.createElement( 'li' );
        li.innerHTML = this.iCode(
            "<span class='method'>" + name + ' (' + paramsHTML + ')' + ( ret ? ( ': ' + ret ) : '' ) + '</span>'
        );
        this._listQueued?.appendChild( li );

        this.endCodeBulletList();

        this.paragraph( desc );

        return li.parentElement;
    }

    iLink( text: string, href: string )
    {
        console.assert( text !== undefined && href !== undefined );
        return `<a href="${href}">${text}</a>`;
    }

    iPage( text: string, page: string )
    {
        console.assert( text !== undefined && page !== undefined );
        const startPage = page.replace( '.html', '' );
        const g = globalThis as any;
        if ( g.setPath && g.loadPage )
        {
            const tabName = g.setPath( startPage );
            return `<a onclick="loadPage('${page}', true, '${tabName}')">${text}</a>`;
        }
        else
        {
            console.warn( '[DocMaker] Create globalThis.setPath and globalThis.loadPage to use inline pages!' );
        }
    }

    iCode( text: string, codeClass?: string )
    {
        console.assert( text !== undefined );
        return `<code class="inline ${codeClass ?? ''}">${text}</code>`;
    }

    _copySnippet( b: any )
    {
        b.innerHTML = '';
        b.appendChild( LX.makeIcon( 'Check' ) );
        b.classList.add( 'copied' );

        setTimeout( () => {
            b.innerHTML = '';
            b.appendChild( LX.makeIcon( 'Copy' ) );
            b.classList.remove( 'copied' );
        }, 2000 );

        navigator.clipboard.writeText( b.dataset['snippet'] ?? b.parentElement.innerText );
        console.log( 'Copied!' );
    }
}
