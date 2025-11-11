// @jxarco

import { LX } from 'lexgui';

if( !LX )
{
    throw( "lexgui.js missing!" );
}

const CPP_KEY_WORDS = ['int', 'float', 'double', 'bool', 'char', 'wchar_t', 'const', 'static_cast', 'dynamic_cast', 'new', 'delete', 'void', 'true', 'false', 'auto', 'struct', 'typedef', 'nullptr', 'NULL', 'unsigned', 'namespace', 'auto'];
const CLASS_WORDS = ['uint32_t', 'uint64_t', 'uint8_t'];
const STATEMENT_WORDS = ['for', 'if', 'else', 'return', 'continue', 'break', 'case', 'switch', 'while', 'import', 'from', 'await'];

const JS_KEY_WORDS = ['var', 'let', 'const', 'static', 'function', 'null', 'undefined', 'new', 'delete', 'true', 'false', 'NaN', 'this'];
const HTML_ATTRIBUTES = ['html', 'charset', 'rel', 'src', 'href', 'crossorigin', 'type', 'lang'];
const HTML_TAGS = ['html', 'DOCTYPE', 'head', 'meta', 'title', 'link', 'script', 'body', 'style'];

let mainContainer = document.body;

function SET_DOM_TARGET( element )
{
    mainContainer = element;
}

window.SET_DOM_TARGET = SET_DOM_TARGET;

function MAKE_LINE_BREAK()
{
    mainContainer.appendChild( document.createElement('br') );
}

window.MAKE_LINE_BREAK = MAKE_LINE_BREAK;

function MAKE_HEADER( string, type, id )
{
    console.assert(string && type);
    let header = document.createElement(type);
    header.innerHTML = string;
    if(id) header.id = id;
    mainContainer.appendChild( header );
}

window.MAKE_HEADER = MAKE_HEADER;

function MAKE_PARAGRAPH( string, sup )
{
    console.assert(string);
    let paragraph = document.createElement(sup ? 'sup' : 'p');
    paragraph.className = "leading-relaxed";
    paragraph.innerHTML = string;
    mainContainer.appendChild( paragraph );
}

window.MAKE_PARAGRAPH = MAKE_PARAGRAPH;

function MAKE_CODE( text, language = "js" )
{
    console.assert(text);

    text.replaceAll('<', '&lt;');
    text.replaceAll('>', '&gt;');

    let highlight = "";
    let content = "";

    const getHTML = ( h, c ) => {
        return `<span class="${ h }">${ c }</span>`;
    };

    for( let i = 0; i < text.length; ++i )
    {
        const char = text[ i ];
        const string = text.substr( i );

        const endLineIdx = string.indexOf( '\n' );        
        const line = string.substring( 0, endLineIdx > -1 ? endLineIdx : undefined );
        
        if( char == '@' )
        {
            const str = line.substr( 1 );
            
            if ( !( str.indexOf( '@' ) > -1 ) && !( str.indexOf( '[' ) > -1 ) )
            {
                continue;
            }

            let html = null;

            const tagIndex = str.indexOf( '@' );
            const skipTag = ( str[ tagIndex - 1 ] == '|' );

            // Highlight is specified
            if( text[ i + 1 ] == '[' )
            {
                highlight = str.substr( 1, 3 );
                content = str.substring( 5, tagIndex );

                if( skipTag )
                {
                    const newString = str.substring( 6 + content.length );
                    const preContent = content;
                    const postContent = newString.substring( 0, newString.indexOf( '@' ) );
                    const finalContent = preContent.substring( 0, preContent.length - 1 ) + '@' + postContent;
                    html = getHTML( highlight, finalContent );

                    const ogContent = preContent + '@' + postContent;
                    text = text.replace( `@[${ highlight }]${ ogContent }@`, html );
                }
                else
                {
                    html = getHTML( highlight, content );
                    text = text.replace( `@[${ highlight }]${ content }@`, html );
                }
            }
            else
            {
                content = str.substring( 0, tagIndex );
                if( skipTag )
                {
                    const preContent = str.substring( 0, str.indexOf( '@' ) - 1 );
                    content = str.substring( preContent.length + 1 );
                    content = preContent + content.substring( 0, content.substring( 1 ).indexOf( '@' ) + 1 );
                    text = text.substr( 0, i ) + '@' + content + '@' + text.substr( i + content.length + 3 );
                }

                if( language == "cpp" && CPP_KEY_WORDS.includes( content ) )
                {
                    highlight = "kwd";
                }
                else if( language == "js" && JS_KEY_WORDS.includes( content ) )
                {
                    highlight = "kwd";
                }
                else if( CLASS_WORDS.includes( content ) )
                {
                    highlight = "cls";
                }
                else if( STATEMENT_WORDS.includes( content ) )
                {
                    highlight = "lit";    
                }
                else if( HTML_TAGS.includes( content ) )
                {
                    highlight = "tag";    
                }
                else if( HTML_ATTRIBUTES.includes( content ) )
                {
                    highlight = "atn";    
                }
                else if( ( content[ 0 ] == '"' && content[ content.length - 1 ] == '"' ) ||
                        ( content[ 0 ] == "'" && content[ content.length - 1 ] == "'" ) ||
                        ( content[ 0 ] == "`" && content[ content.length - 1 ] == "`" ) )
                {
                    highlight = "str";
                }
                else if( parseFloat( content ) != NaN )
                {
                    highlight = "dec";    
                }
                else
                {
                    console.error( "ERROR[Code Parsing]: Unknown highlight type: " + content );
                    return;
                }

                html = getHTML( highlight, content );
                text = text.replace( `@${ content }@`, html );
            }

            i += ( html.length - 1 );
        }
    }
    
    let container = document.createElement('div');
    container.className = "code-container";
    let pre = document.createElement('pre');
    let code = document.createElement('code');
    code.innerHTML = text;

    let button = document.createElement('button');
    button.title = "Copy code sample";
    button.appendChild(LX.makeIcon( "Copy" ));
    button.addEventListener('click', COPY_SNIPPET.bind(this, button));
    container.appendChild( button );

    pre.appendChild( code );
    container.appendChild( pre );
    mainContainer.appendChild( container );
}

window.MAKE_CODE = MAKE_CODE;

function MAKE_LIST( list, type, target )
{
    const validTypes = [ 'bullet', 'numbered' ];
    console.assert( list && list.length > 0 && validTypes.includes(type), "Invalid list type or empty list" + type );
    const typeString = type == 'bullet' ? 'ul' : 'ol';
    let ul = document.createElement( typeString );
    target = target ?? mainContainer;
    target.appendChild( ul );
    for( var el of list ) {
        if( el.constructor === Array ) {
            MAKE_LIST( el, type, ul );
            return;
        }
        let li = document.createElement( 'li' );
        li.className = "leading-loose";
        li.innerHTML = el;
        ul.appendChild( li );
    }
}

function MAKE_BULLET_LIST( list )
{
    MAKE_LIST( list, 'bullet' );
}

window.MAKE_BULLET_LIST = MAKE_BULLET_LIST;

function MAKE_NUMBERED_LIST( list )
{
    MAKE_LIST( list, 'numbered' );
}

window.MAKE_NUMBERED_LIST = MAKE_NUMBERED_LIST;

function ADD_CODE_LIST_ITEM( item, target )
{
    target = target ?? window.listQueued;
    let split = (item.constructor === Array);
    if( split && item[0].constructor === Array ) {
        MAKE_CODE_BULLET_LIST( item, target );
        return;
    }
    let li = document.createElement('li');
    li.className = "leading-loose";
    li.innerHTML = split ? ( item.length == 2 ? INLINE_CODE( item[0] ) + ": " + item[1] : INLINE_CODE( item[0] + " <span class='desc'>(" + item[1] + ")</span>" ) + ": " + item[2] ) : INLINE_CODE( item );
    target.appendChild( li );
}

window.ADD_CODE_LIST_ITEM = ADD_CODE_LIST_ITEM;

function MAKE_CLASS_METHOD( name, desc, params, ret )
{
    START_CODE_BULLET_LIST();
    let paramsHTML = "";    
    for( var p of params ) {
        const name = p[ 0 ];
        const type = p[ 1 ];
        paramsHTML += name + ": <span class='desc'>" + type + "</span>" + ( params.indexOf( p ) != (params.length - 1) ? ', ' : '' );
    }
    let li = document.createElement('li');
    li.innerHTML = INLINE_CODE( "<span class='method'>" + name + " (" + paramsHTML + ")" + ( ret ? (": " + ret) : "" ) + "</span>" );
    window.listQueued.appendChild( li );
    END_CODE_BULLET_LIST();
    MAKE_PARAGRAPH( desc );
}

window.MAKE_CLASS_METHOD = MAKE_CLASS_METHOD;

function MAKE_CLASS_CONSTRUCTOR( name, params, language = "js" )
{
    let paramsHTML = "";    
    for( var p of params ) {
        const str1 = p[ 0 ]; // cpp: param          js: name
        const str2 = p[ 1 ]; // cpp: defaultValue   js: type
        if( language == "cpp" ) {
            paramsHTML += str1 + ( str2 ? " = <span class='desc'>" + str2 + "</span>" : "" ) + ( params.indexOf( p ) != (params.length - 1) ? ', ' : '' );
        } else if( language == "js" ) {
            paramsHTML += str1 + ": <span class='desc'>" + str2 + "</span>" + ( params.indexOf( p ) != (params.length - 1) ? ', ' : '' );
        }
    }
    let pr = document.createElement('p');
    pr.innerHTML = INLINE_CODE( "<span class='constructor'>" + name + "(" + paramsHTML + ")" + "</span>" );
    mainContainer.appendChild( pr );
}

window.MAKE_CLASS_CONSTRUCTOR = MAKE_CLASS_CONSTRUCTOR;

function MAKE_CODE_BULLET_LIST( list, target )
{
    console.assert(list && list.length > 0);
    let ul = document.createElement('ul');
    for( var el of list ) {
        ADD_CODE_LIST_ITEM( el, ul );
    }
    if( target ) {
        target.appendChild( ul );
    } else {
        mainContainer.appendChild( ul );
    }
}

window.MAKE_CODE_BULLET_LIST = MAKE_CODE_BULLET_LIST;

function START_CODE_BULLET_LIST()
{
    let ul = document.createElement('ul');
    window.listQueued = ul;
}

window.START_CODE_BULLET_LIST = START_CODE_BULLET_LIST;

function END_CODE_BULLET_LIST()
{
    console.assert( window.listQueued );
    mainContainer.appendChild( window.listQueued );
    window.listQueued = undefined;
}

window.END_CODE_BULLET_LIST = END_CODE_BULLET_LIST;

function INLINE_LINK( string, href )
{
    console.assert(string && href);
    return `<a href="` + href + `">` + string + `</a>`;
}

window.INLINE_LINK = INLINE_LINK;

function INLINE_PAGE( string, page )
{
    console.assert(string && page);
    const startPage = page.replace(".html", "");
    const tabName = window.setPath( startPage );
    return `<a onclick="loadPage('${ page }', true, '${ tabName }')">${ string }</a>`;
}

window.INLINE_PAGE = INLINE_PAGE;

function INLINE_CODE( string, codeClass )
{
    console.assert(string);
    return `<code class="inline ${ codeClass ?? "" }">` + string + `</code>`;
}

window.INLINE_CODE = INLINE_CODE;

function COPY_SNIPPET( b )
{
    b.innerHTML = "";
    b.appendChild(LX.makeIcon( "Check" ));
    b.classList.add('copied');

    setTimeout( () => {
        b.innerHTML = "";
        b.appendChild(LX.makeIcon( "Copy" ));
        b.classList.remove('copied');
    }, 2000 );

    navigator.clipboard.writeText( b.dataset['snippet'] ?? b.parentElement.innerText );
    console.log("Copied!");
}

function INSERT_IMAGE( src, caption = "", parent )
{
    let img = document.createElement('img');
    img.src = src;
    img.alt = caption;
    img.className = "my-1";
    ( parent ?? mainContainer ).appendChild( img );
}

window.INSERT_IMAGE = INSERT_IMAGE;

function INSERT_IMAGES( sources, captions = [], width, height )
{
    const mobile = navigator && /Android|iPhone/i.test(navigator.userAgent);

    if( !mobile )
    {
        let div = document.createElement('div');
        div.style.width = width ?? "auto";
        div.style.height = height ?? "256px";
        div.className = "flex flex-row justify-center";

        for( let i = 0; i < sources.length; ++i )
        {
            INSERT_IMAGE( sources[ i ], captions[ i ], div );
        }

        mainContainer.appendChild( div );
    }
    else
    {
        for( let i = 0; i < sources.length; ++i )
        {
            INSERT_IMAGE( sources[ i ], captions[ i ] );
        }
    }
}

window.INSERT_IMAGES = INSERT_IMAGES;

function INSERT_VIDEO( src, caption = "", controls = true, autoplay = false )
{
    let video = document.createElement( 'video' );
    video.src = src;
    video.controls = controls;
    video.autoplay = autoplay;
    if( autoplay )
    {
        video.muted = true;
    }
    video.loop = true;
    video.alt = caption;
    mainContainer.appendChild( video  );
}

window.INSERT_VIDEO = INSERT_VIDEO;

function MAKE_NOTE( string, warning, title, icon )
{
    console.assert( string );

    const note = LX.makeContainer( [], "border rounded-lg overflow-hidden text-md fg-secondary my-6", "", mainContainer );

    let header = document.createElement( 'div' );
    header.className = "flex bg-tertiary font-semibold px-3 py-2 gap-2 fg-secondary";
    header.appendChild( LX.makeIcon( icon ?? ( warning ? "MessageSquareWarning" : "NotepadText" ) ) );
    header.innerHTML += ( title ?? ( warning ? "Important" : "Note" ) );
    note.appendChild( header );

    const body = LX.makeContainer( [], "leading-6 p-3", string, note );
}

window.MAKE_NOTE = MAKE_NOTE;

export { SET_DOM_TARGET, MAKE_LINE_BREAK, MAKE_HEADER, MAKE_PARAGRAPH, MAKE_CODE, MAKE_BULLET_LIST,
    MAKE_CLASS_METHOD, MAKE_CLASS_CONSTRUCTOR, MAKE_CODE_BULLET_LIST, START_CODE_BULLET_LIST, ADD_CODE_LIST_ITEM,
    END_CODE_BULLET_LIST, INLINE_LINK, INLINE_PAGE, INLINE_CODE, INSERT_IMAGE, INSERT_IMAGES, INSERT_VIDEO, MAKE_NOTE
}