import { LX } from 'lexgui';
import { CodeEditor } from 'lexgui/extensions/CodeEditor.js';

window.LX = LX;

const area = await LX.init( { layoutMode: "document", rootClass: "wrapper" } );
const starterTheme = LX.getMode();
const mobile = navigator && /Android|iPhone/i.test( navigator.userAgent );
const localHost = window.location.protocol !== "https:";
const themes = [
    'Amber', 'Blue', 'Green', 'Neutral', 'Orange', 'Purple', 'Red', 'Rose', 'Teal', 'Violet', 'Yellow'
]
const menubarButtons = [
    { name: "Docs", callback: () => { window.open("./docs/") } },
    { name: "Examples", callback: () => { window.open("./examples/") } },
    { name: "Components", callback: () => { window.open("./docs/?p=components") } },
    { name: "Colors", callback: () => { window.open("./colors/", "_self") } },
    { name: "Icons", callback: () => { window.open("./icons/", "_self") } },
];
let menubar = null, sheetArea = null;

if( mobile )
{
    menubar = area.addMenubar();

    sheetArea = new LX.Area({ skipAppend: true });
    sheetArea.addSidebar( ( m ) => {

        m.group( "Menu" );

        for( let b of menubarButtons )
        {
            m.add( b.name, { callback: b.callback } );
        }

    }, {
        headerTitle: `lexgui.js`,
        headerSubtitle: `v${ LX.version }`,
        headerIcon: "UserRound",
        footerTitle: "jxarco",
        footerSubtitle: "alexroco.30@gmail.com",
        footerImage: "https://avatars.githubusercontent.com/u/25059187?v=4",
        collapsed: false,
        collapsable: false,
        displaySelected: false
    } );
}
else
{
    menubar = area.addMenubar( menubarButtons );

    const commandButton = new LX.Button(null, `Search command...`, () => { LX.setCommandbarState( true ) }, {
        width: "256px", className: "right", buttonClass: "p-4 border-input bg-card text-muted-foreground" }
    );
    commandButton.root.querySelector( 'button' ).appendChild( LX.makeKbd( ["Ctrl", "Space"], false, "ml-auto" ) );
    menubar.root.appendChild( commandButton.root );
}

menubar.setButtonImage("lexgui.js", `images/icon_${ starterTheme }.png`, () => {  window.location.href = window.origin + window.location.pathname }, { float: "left"} );
LX.addSignal( "@on_new_color_scheme", ( el, value ) => {
    menubar.setButtonImage("lexgui.js", `images/icon_${ value }.png` );
} );

menubar.siblingArea.root.style.overflowY = "scroll";

menubar.addButtons( [
    {
        title: "Github",
        icon: "Github@solid",
        callback:  (event) => window.open( "https://github.com/jxarco/lexgui.js/", "_blank" )
    },
    {
        title: "Switch Theme",
        icon: starterTheme == "dark" ? "Moon" : "Sun",
        swap: starterTheme == "dark" ? "Sun" : "Moon",
        callback:  (value, event) => { LX.switchMode() }
    },
    {
        title: "Switch Spacing",
        icon: "AlignVerticalSpaceAround",
        callback:  (value, event) => { LX.switchSpacing() }
    }
], { float: "right" });

if( mobile )
{
    menubar.root.querySelector( ".lexmenubuttons" ).style.marginLeft = "auto";

    const menuButton = new LX.Button(null, "MenuButton", () => {
        window.__currentSheet = new LX.Sheet("256px", [ sheetArea ] );
    }, { icon: "Menu", buttonClass: "p-4 bg-none" } );
    menubar.root.prepend( menuButton.root );
}

LX._registerIconsAndColors( "./" );

// Header
{
    const header = LX.makeContainer( [ null, "auto" ], "flex flex-col gap-4 p-8 pb-4 items-center", `
        <a href="docs?p=changelog" class="flex flex-row gap-1 items-center text-sm p-1 px-4 rounded-full text-secondary-foreground decoration-none hover:bg-secondary cursor-pointer"><span class="flex bg-info w-2 h-2 rounded-full"></span>
            New Components: Avatar, Spinner, Pagination and more${ LX.makeIcon( "ArrowRight", { svgClass: "sm" } ).innerHTML }</a>
        <p class="fg text-secondary-foreground font-medium tracking-tight leading-none text-center text-balance sm:text-5xl text-4xl">Build your Application Interface</p>
        <p class="text-secondary-foreground font-light text-xl xs:text-lg text-center text-balance leading-normal max-w-3xl">A modern-style UI kit, inspired by shadcn, built for the web. Pure HTML, JavaScript, and Tailwind CSS. Fully Open Source.</p>
    `, area );

    const headerButtons = LX.makeContainer( [ "auto", "auto" ], "flex flex-row mt-2", ``, header );
    const getStartedButton = new LX.Button( null, `Get Started <span class="text-base">${ LX.version }</span>`, () => window.open( "./docs/", "_blank" ), { buttonClass: "primary" } );
    const componentsButton = new LX.Button( null, "View Components", () => window.open( "./docs/?p=components", "_blank" ), { buttonClass: "ghost" } );
    headerButtons.appendChild( getStartedButton.root );
    headerButtons.appendChild( componentsButton.root );
}

// Content
{
    let tabs = null;

    // Editor
    if( !mobile )
    {
        tabs = area.addTabs( { parentClass: "p-4", sizes: [ "auto", "auto" ], contentClass: "p-6 pt-0" } );

        const tabsParent = tabs.root.parentElement;
        tabsParent.className = LX.mergeClass( tabsParent.className, 'flex flex-row justify-between' );

        const themeSelect = new LX.Select( null, themes, 'Neutral', (v) => LX.setThemeColor( v.toLowerCase() ), { overflowContainerY: null, align: "end" } );
        tabsParent.appendChild( themeSelect.root );

        const editorContainer = LX.makeContainer( [ null, "800px" ], "flex flex-col border-color rounded-lg overflow-hidden" );
        tabs.add( "Editor", editorContainer, { selected: true } );

        const editorArea = new LX.Area({ className: "rounded-lg" });
        editorContainer.appendChild( editorArea.root );

        const menubar = editorArea.addMenubar( [
            { name: "Scene", submenu: [
                { name: "New Scene" },
                { name: "Open Scene", icon: "FolderOpen", kbd: "S" },
                { name: "Open Recent", icon: "File",  submenu: [
                    { name: "hello.scene" },
                    { name: "goodbye.scene" }
                ] }
            ] },
            { name: "Project", submenu: [
                { name: "Project Settings", disabled: true },
                null,
                { name: "Export", submenu: [
                    { name: "DAE", icon: "Frame", kbd: "D" },
                    { name: "GLTF", kbd:  "G" }
                ] },
                { name: "Export", icon: "Download" }
            ] },
            { name: "Editor", submenu: [
                { name: "Autosave", checked: true, icon: "Save" },
                { name: "Settings",  icon: "Settings2" },
            ] },
            { name: "Account", submenu: [
                { name: "Login", icon: "User" },
            ] },
            { name: "Help", submenu: [
                { name: "Search Help", icon: "Search", kbd:  "F1" },
                { name: "Start Tour", icon: "CircleHelp", callback: () => {
                    const exampleTour = new LX.Tour([
                        {
                            title: "Welcome to LexGUI.js",
                            content: "This is the main canvas where you can draw your application.",
                            reference: canvas,
                            side: "top",
                            align: "center"
                        },
                        {
                            title: "Menubar",
                            content: "This menubar contains all the main actions and settings for your application.",
                            reference: menubar.root,
                            side: "bottom",
                            align: "center"
                        },
                        {
                            title: "Side Panel",
                            content: "This panel contains various components and settings for your application.",
                            reference: sidePanel.root,
                            side: "left",
                            align: "start"
                        }
                    ], { xoffset: 8, xradius: 12, xhorizontalOffset: 46, xverticalOffset: 46, xuseModal: false });

                    exampleTour.begin();
                } },
                { name: "Support LexGUI", icon: "Heart" },
            ] },
        ], { sticky: false });

        menubar.addButtons( [
            {
                title: "Play",
                icon: "Play@solid",
                swap: "Stop@solid"
            },
            {
                title: "Pause",
                icon: "Pause@solid",
                disabled: true
            }
        ]);

        // split main area
        const [ left, right ] = editorArea.split({ sizes:["70%","30%"], minimizable: true });

        // add canvas to left upper part
        const canvas = document.createElement('canvas');
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.width = left.root.offsetWidth;
        canvas.height = left.root.offsetHeight

        const resizeCanvas = ( bounding ) => {
            canvas.width = bounding.width;
            canvas.height = bounding.height;
        };

        left.attach( canvas );
        left.onresize = resizeCanvas;
        left.addOverlayButtons( [
            [
                { name: "Select", icon: "MousePointer", selectable: true, selected: true },
                { name: "Move", icon: "Move", selectable: true },
                { name: "Rotate", icon: "RotateRight", selectable: true }
            ],
            { name: "Lit", options: ["Lit", "Unlit", "Wireframe"] },
            [
                { name: "Enable Snap", icon: "Frame", selectable: true },
                { name: 10, options: [10, 100, 1000] }
            ]
        ], { float: "htc" } );

        // add panels
        var sidePanel = right.addPanel();
        fillPanel( sidePanel );

        function loop(dt) {

            var ctx = canvas.getContext("2d");
            ctx.fillStyle = sidePanel.getValue('Background');
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = `${ sidePanel.getValue('Font Size') }px ${ sidePanel.getValue('Font Family') }`;
            ctx.fillStyle = sidePanel.getValue('Font Color');
            const pos2D = sidePanel.getValue('2D Position');
            ctx.fillText( sidePanel.getValue('Text'), pos2D[0], pos2D[1]);
            requestAnimationFrame(loop);
        }

        requestAnimationFrame(loop);

        // **** **** **** **** **** **** **** **** **** **** **** ****

        function fillPanel( panel ) {

            // Add data tree

            let sceneData = {
                'id': 'root',
                'children': [
                    {
                        'id': 'node_1',
                        'children': [
                            {
                                'id': 'node_1_1',
                                'icon': 'Box',
                                'children': [],
                                'actions': [
                                    {
                                        'name': 'Open script',
                                        'icon': 'Scroll'
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        'id': 'node_2',
                        'icon': 'CirclePlay',
                        'children': []
                    }
                ]
            };

            // This is optional!
            const treeIcons = [
                {
                    'name':'Add node',
                    'icon': 'Plus'
                },
                {
                    'name':'Instantiate scene',
                    'icon': 'Link'
                }
            ];

            window.tree = panel.addTree("Scene Tree", sceneData, {
                icons: treeIcons,
                addDefault: true
            });

            // Tree events
            {
                window.tree.on( 'contextMenu', ( event ) => {
                    return [
                        { name: "Components/Transform" },
                        { name: "Components/MeshRenderer" }
                    ]
                } );
    
                // Click events
                {
                    window.tree.on( "select", ( event, resolve ) => {
                        console.log(`${ event.items[ 0 ].id } selected` );
                    } );

                    window.tree.on( "dblClick", ( event ) => {
                        console.log(`${ event.items[ 0 ].id } dbl clicked` );
                    } );
                }

                // Rename events
                {
                    window.tree.on( "beforeRename", ( event, resolve ) => {
                        LX.prompt("Perform Rename Action?", "Server Message", () => {
                            resolve();
                        })
                    } );
        
                    window.tree.on( "rename", ( event ) => {
                        console.log(`${ event.oldName } renamed to ${ event.newName }`);
                    } );
                }

                // Delete events
                {
                    window.tree.on( "beforeDelete", ( event, resolve ) => {
                        LX.prompt("Perform Delete Action?", "Server Message", () => {
                            resolve();
                        })
                    } );

                    window.tree.on( "delete", ( event ) => {
                        console.log(event.items[ 0 ].id + " deleted");
                    } );
                }

                // Move events
                {
                    window.tree.on( "beforeMove", ( event, resolve ) => {
                        LX.prompt("Perform Move Action?", "Server Message", () => {
                            resolve();
                        })
                    } );

                    window.tree.on( "move", ( event ) => {
                        console.log(`${ event.items[ 0 ].id } moved to ${ event.to.id }` );
                    } );
                }
            }

            // add components to panel branch
            panel.branch("Canvas", { icon: "Palette", filter: true });
            panel.addColor("Background", "#b7a9b1", null);
            panel.addText("Text", "LexGUI.js @jxarco", null, {placeholder: "e.g. ColorPicker", icon: "Type"});
            panel.addColor("Font Color", "#303b8d", null);
            panel.addNumber("Font Size", 36, null, { min: 1, max: 48, step: 1, units: "px"});
            panel.addSelect("Font Family", ["Arial", "GeistSans", "Inter", "Monospace", "CascadiaCode"], "GeistSans");
            panel.addSeparator();
            panel.addRange("Threshold Range", [2, 7], (v) => console.log(v), { min: 0, max: 10, step: 1, className: "accent" });
            panel.addVector2("2D Position", [300, 350], null, { min: 0, max: 1024 });
            const opacityValues = [
                [0.2, 0.3146875],
                [0.417313915857606, 0.8946875000000003],
                [0.5495145631067961, 0.6746875],
                [1, 1]
            ];
            panel.addCurve("Opacity", opacityValues);
            panel.addSize("Resolution", [1280, 720], null, { units: "p", precision: 0 });
            panel.merge();

            panel.branch("Node", { icon: "Box" });
            panel.addText("Name", "node_1");
            panel.addCheckbox("Visibility", true, null);
            panel.addLayers("Layers", 10, null);

            const map2Dpoints = [
                { "name": "angry", "pos": [-0.29348334680286725,-0.8813498603327697] },
                { "name": "happy", "pos": [0.5728906393051147,-0.2508566975593567] },
                { "name": "sad", "pos": [-0.542498156289837,0.3795300176749039] },
                { "name": "calm", "pos": [0.46099435955317536,0.6203009288162395] },
                { "name": "bored", "pos": [-0.349232931016368,0.8103832270857154] },
                { "name": "frustrated", "pos": [-0.49046521102390306,-0.5708814736724744] },
                { "name": "smile", "pos": [0.5762101669277435,0.20211987262339348] },
                { "name": "upset", "pos": [-0.5796645457655041,-0.1907168771335228] }
            ];
            panel.addMap2D("Map2D", map2Dpoints, null, { size: [ 300, 300 ] });

            panel.addTitle( "Transform" );
            panel.addVector3( "Position", [0.0, 0.0, 0.0] );
            panel.addVector4( "Rotation", [0.0, 0.0, 0.0, 1.0] );
            panel.addVector3( "Scale", [1.0, 1.0, 1.0] );
            panel.addButton(null, "Export", () =>  { console.log("Exported!") }, { buttonClass: "primary", xmustConfirm: true,
                // confirmSide: "left",
                // confirmAlign: "start",
                // confirmText: "Yeah",
                // confirmCancelText: "Nope",
                // confirmTitle: "Confirm action",
                // confirmContent: "Are your sure??"
             });
            panel.merge();
        }
    }

    // Examples
    {
        const examplesContainer = LX.makeContainer( [ null, "auto" ], `${ mobile ? "flex flex-col" : "grid grid-cols-4" } gap-3 bg-background rounded-lg p-6 overflow-hidden` );

        if( tabs )
        {
            tabs.add( "Examples", examplesContainer, { xselected: true } );
        }
        else
        {
            area.attach( examplesContainer );
        }

        {
            const panel = new LX.Panel( { className: "rounded-lg border-color p-4 flex flex-col gap-4" } );
            panel.addColor("Background", "#b7a9b1", null);
            panel.addText("Text", "LexGUI.js @jxarco", null, {placeholder: "e.g. ColorPicker", icon: "Type"});
            panel.addColor("Font Color", "#303b8d", null);
            panel.addNumber("Font Size", 36, null, { min: 1, max: 48, step: 1, units: "px"});
            panel.addSelect("Font Family", ["Arial", "GeistSans", "Monospace", "CascadiaCode"], "GeistSans");
            panel.addRange("Threshold Range", [2, 7], (v) => console.log(v), { min: 0, max: 10, step: 1, className: "accent" });
            panel.addVector2("2D Position", [300, 350], null, { min: 0, max: 1024 });

            examplesContainer.appendChild( panel.root );
        }

        {
            const panel = new LX.Panel( { className: "p-4 flex flex-col gap-4" } );
            panel.addColor("Background", "#b7a9b1", null);
            panel.addText("Text", "LexGUI.js @jxarco", null, {placeholder: "e.g. ColorPicker", icon: "Type"});
            panel.addColor("Font Color", "#303b8d", null);
            panel.addNumber("Font Size", 36, null, { min: 1, max: 48, step: 1, units: "px"});
            panel.addSelect("Font Family", ["Arial", "GeistSans", "Monospace", "CascadiaCode"], "GeistSans");
            panel.addRange("Threshold Range", [2, 7], (v) => console.log(v), { min: 0, max: 10, step: 1, className: "accent" });
            panel.addVector2("2D Position", [300, 350], null, { min: 0, max: 1024 });

            examplesContainer.appendChild( panel.root );
        }

        {
            const panel = new LX.Panel( { className: "p-4 flex flex-col gap-4" } );
            panel.addColor("Background", "#b7a9b1", null);
            panel.addText("Text", "LexGUI.js @jxarco", null, {placeholder: "e.g. ColorPicker", icon: "Type"});
            panel.addColor("Font Color", "#303b8d", null);
            panel.addNumber("Font Size", 36, null, { min: 1, max: 48, step: 1, units: "px"});
            panel.addSelect("Font Family", ["Arial", "GeistSans", "Monospace", "CascadiaCode"], "GeistSans");
            panel.addRange("Threshold Range", [2, 7], (v) => console.log(v), { min: 0, max: 10, step: 1, className: "accent" });
            panel.addVector2("2D Position", [300, 350], null, { min: 0, max: 1024 });

            examplesContainer.appendChild( panel.root );
        }

        {
            const panel = new LX.Panel( { className: "p-4 flex flex-col gap-4" } );
            panel.addColor("Background", "#b7a9b1", null);
            panel.addText("Text", "LexGUI.js @jxarco", null, {placeholder: "e.g. ColorPicker", icon: "Type"});
            panel.addColor("Font Color", "#303b8d", null);
            panel.addNumber("Font Size", 36, null, { min: 1, max: 48, step: 1, units: "px"});
            panel.addSelect("Font Family", ["Arial", "GeistSans", "Monospace", "CascadiaCode"], "GeistSans");
            panel.addRange("Threshold Range", [2, 7], (v) => console.log(v), { min: 0, max: 10, step: 1, className: "accent" });
            panel.addVector2("2D Position", [300, 350], null, { min: 0, max: 1024 });

            examplesContainer.appendChild( panel.root );
        }
    }

    // Mail
    if( !mobile )
    {
        const mailContainer = LX.makeContainer( [ null, "800px" ], "flex flex-col border-color rounded-lg overflow-hidden" );
        tabs.add( "Mail", mailContainer, { xselected: true, badge: { content: "5", className: "destructive px-1", asChild: true } } );

        const mailArea = new LX.Area();
        mailContainer.appendChild( mailArea.root );
        const badgeClass = "xs ml-auto bg-none font-medium";

        const sidebar = mailArea.addSidebar( m => {
            m.add( "Inbox", { selected: true, icon: "Inbox", content: LX.badge("128", badgeClass, { asElement: true }) } );
            m.add( "Drafts", { icon: "File", content: LX.badge("9", badgeClass, { asElement: true }) } );
            m.add( "Sent", { icon: "PaperPlane" } );
            m.add( "Junk", { icon: "ArchiveX", content: LX.badge("23", badgeClass, { asElement: true }) } );
            m.add( "Trash", { icon: "Trash3" } );
            m.add( "Archive", { icon: "Archive" } );
            m.separator();
            m.add( "Social", { icon: "User", content: LX.badge("972", badgeClass, { asElement: true }) } );
            m.add( "Updates", { icon: "Info", content: LX.badge("342", badgeClass, { asElement: true }) } );
            m.add( "Forums", { icon: "MessagesCircle", content: LX.badge("96", badgeClass, { asElement: true }) } );
            m.add( "Shopping ", { icon: "ShoppingCart" } );
            m.add( "Promotions", { icon: "Flag", content: LX.badge("21", badgeClass, { asElement: true }) } );
        }, {
            className: "border-r-color",
            headerTitle: "jxarco",
            headerSubtitle: "alexroco.30@gmail.com",
            headerIcon: "UserRound",
            skipFooter: true,
            displaySelected: true,
            onHeaderPressed: (e, element) => { }
        });

        const inboxArea = sidebar.siblingArea;

        var [ left, right ] = inboxArea.split({ sizes:["40%","60%"] });
        left.setLimitBox( 350, null, 650, null );

        // Manage Inbox
        {
            const inboxTabs = left.addTabs({ parentClass: "flex p-3 items-end border-b-color", sizes: [ "auto", "auto" ], float: "end" });
            const tabsRowContainer = inboxTabs.root.parentElement;

            const mailSectionTitle = LX.makeContainer( [ "auto", "auto" ], "mr-auto ml-2 place-self-center text-2xl font-semibold", "Inbox" );
            tabsRowContainer.prepend( mailSectionTitle );

            window.__showMailList = ( container, unreadOnly = false ) => {

                // Filter
                {
                    const allMailFilter = LX.makeContainer( [ "100%", "50px" ], "flex p-2", "", container );
                    const filterInput = new LX.TextInput(null, "", null,
                        { inputClass: "outline", width: "100%", icon: "Search", placeholder: "Search..." }
                    );
                    allMailFilter.appendChild( filterInput.root );
                }

                // Content
                {
                    const allMailContent = LX.makeContainer( [ "100%", "calc(100% - 50px)" ], "flex flex-col p-4 pt-0 gap-2 overflow-scroll", "", container );

                    window.__addMail = ( mail, mailContainer, idx ) => {

                        const selected = ( idx == 0 );
                        const msgContent = LX.makeContainer( [ "100%", "auto" ],
                            `flex flex-col border-color p-3 rounded-lg gap-2 select-none cursor-pointer ${ selected ? "bg-secondary" : "" }`, "", mailContainer );

                        // Name, subject, date
                        {
                            const msgInfo = LX.makeContainer( [ "100%", "auto" ], "flex flex-col gap-0.5", "", msgContent );
                            const msgNameDate = LX.makeContainer( [ "100%", "auto" ], "flex flex-row", "", msgInfo );

                            // Name + Date
                            {
                                const msgName = LX.makeContainer( [ "auto", "auto" ], "flex font-semibold text-sm gap-2", "", msgNameDate );
                                msgName.innerHTML = mail.name;
                                msgName.innerHTML += ( mail.read ? "" : `<span class="rounded-full place-self-center bg-accent" style="width: 8px; height: 8px"></span>` );
                                const msgDate = LX.makeContainer( [ "auto", "auto" ], "text-muted-foreground text-xs ml-auto place-self-center", mail.date, msgNameDate );
                            }

                            const msgSubject = LX.makeContainer( [ "100%", "auto" ], "font-semibold text-xs", mail.subject, msgInfo );
                        }

                        const msgText = LX.makeContainer( [ "100%", "auto" ], "text-xs line-clamp-2 text-muted-foreground", mail.content, msgContent );
                        const msgTags = LX.makeContainer( [ "100%", "auto" ], "flex flex-row gap-0.5 font-semibold", "", msgContent );
                        for( const tag of mail.tags )
                        {
                            msgTags.appendChild( LX.badge( tag, "xs", { asElement: true } ) );
                        }

                        LX.listen( msgContent, "click", function() {
                            mailContainer.childNodes.forEach( e => e.classList.remove( "bg-secondary" ) );
                            this.classList.add( "bg-secondary" );
                            window.__openMail( mail );
                        } );
                    };

                    LX.requestJSON( "data/example_mail_data.json", data => {
                        data.forEach( ( e, idx ) => { if( !unreadOnly || ( unreadOnly && !e.read ) ) window.__addMail( e, allMailContent, idx ) } );
                        window.__openMail( data[ 0 ] );
                    } )
                }
            }

            const allMailContainer = LX.makeContainer( [ "100%", "100%" ], "flex flex-col" );
            inboxTabs.add( "All mail", allMailContainer, { selected: true } );
            window.__showMailList( allMailContainer );

            const unreadMailContainer = LX.makeContainer( [ "100%", "100%" ], "flex flex-col" );
            inboxTabs.add( "Unread", unreadMailContainer );
            window.__showMailList( unreadMailContainer, true );
        }

        // Manage Message Preview
        {
            // Buttons
            {
                const mailPreviewHeader = LX.makeContainer( [ "100%", "43.5px" ], "flex flex-row border-b-color p-1", "", right );

                mailPreviewHeader.appendChild( new LX.Button( null, "", null, { title: "Archive", tooltip: true, buttonClass: "bg-none", icon: "Archive" } ).root );
                mailPreviewHeader.appendChild( new LX.Button( null, "", null, { title: "Move to junk", tooltip: true, buttonClass: "bg-none", icon: "ArchiveX" } ).root );
                mailPreviewHeader.appendChild( new LX.Button( null, "", null, { title: "Move to trash", tooltip: true, buttonClass: "bg-none", icon: "Trash3" } ).root );
                mailPreviewHeader.appendChild( LX.makeContainer( [ "1px", "35%" ], "border-r-color place-self-center ml-2 mr-2" ) );
                mailPreviewHeader.appendChild( new LX.Button( null, "", null, { title: "Snooze", tooltip: true, buttonClass: "bg-none", icon: "Clock" } ).root );

                mailPreviewHeader.appendChild( new LX.Button( null, "", null, { title: "Reply", tooltip: true, buttonClass: "bg-none", className: "ml-auto", icon: "Reply" } ).root );
                mailPreviewHeader.appendChild( new LX.Button( null, "", null, { title: "Reply all", tooltip: true, buttonClass: "bg-none", icon: "ReplyAll" } ).root );
                mailPreviewHeader.appendChild( new LX.Button( null, "", null, { title: "Forward", tooltip: true, buttonClass: "bg-none", icon: "Forward" } ).root );
                mailPreviewHeader.appendChild( LX.makeContainer( [ "1px", "35%" ], "border-r-color place-self-center ml-2 mr-2" ) );
                mailPreviewHeader.appendChild( new LX.Button( null, "", (value, event) => {
                    new LX.DropdownMenu( event.target, [
                        { name: "Mark as unread" },
                        { name: "Star thread" },
                        { name: "Add label" },
                        { name: "Mute thread" }
                    ], { side: "bottom", align: "end" });
                }, { buttonClass: "bg-none", icon: "EllipsisVertical" } ).root );
            }

            // Prewiew Info
            {
                const previewDataContent = LX.makeContainer( [ "100%", "100%" ], "", "", right );

                window.__openMail = ( mail ) => {

                    previewDataContent.innerHTML = "";

                    const mailNames = mail.name.split( ' ' );
                    const mailPreviewInfo = LX.makeContainer( [ "100%", "auto" ], "flex flex-row border-b-color p-4 gap-3", "", previewDataContent );

                    const avatar = new LX.Avatar( { imgSource: mail.avatar, fallback: mailNames[ 0 ][ 0 ] + mailNames[ 1 ][ 0 ], className: 'size-10', fallbackClass: "text-foreground" } );
                    mailPreviewInfo.appendChild( avatar.root );

                    const senderData = LX.makeContainer( [ "auto", "auto" ], "flex flex-col gap-0.5", `
                    <div class="text-sm font-semibold">${ mail.name }</div>
                    <div class="text-xs">${ mail.subject }</div>
                    <div class="text-xs">Reply-To: ${ mail.email }</div>
                    `, mailPreviewInfo );

                    const exactDate = LX.makeContainer( [ "auto", "auto" ], "flex flex-row text-xs text-muted-foreground ml-auto", mail.exactDate, mailPreviewInfo );
                    const mailPreviewContent = LX.makeContainer( [ "100%", "515px" ], "flex flex-row border-b-color text-sm whitespace-pre-wrap p-4", mail.content, previewDataContent );
                    const previewFooter = LX.makeContainer( [ "100%", "auto" ], "flex flex-col p-2", "", previewDataContent );

                    const msgReplyTextArea = new LX.TextArea(null, "", null,
                        { className: "mt-1", inputClass: "outline", width: "100%", resize: false, placeholder: `Reply ${ mail.name }...` }
                    );
                    previewFooter.appendChild( msgReplyTextArea.root );

                    const previewButtons = LX.makeContainer( [ "100%", "auto" ], "flex flex-row p-1", "", previewFooter );

                    const muteToggle = new LX.Toggle( null, false, null, { label: "Mute this thread" } );
                    previewButtons.appendChild( muteToggle.root );

                    const sendButton = new LX.Button( null, "Send", () => {
                        LX.toast( "Message sent!", "To:" + mail.email, { timeout: 5000, action: { name: "Undo", callback: ( toast, actionName, event ) => {
                            toast.close();
                        } } } );
                    }, { className: "ml-auto", buttonClass: "primary" } );
                    previewButtons.appendChild( sendButton.root );
                };
            }
        }
    }

    // Tasks
    if( !mobile )
    {
        const tasksContainer = LX.makeContainer( [ null, "auto" ], "col bg-background border-color rounded-lg p-6 overflow-hidden" );
        tabs.add( "Tasks", tasksContainer, { xselected: true } );

        const header = LX.makeContainer( [ null, "auto" ], "col p-4", `
            <h2>Welcome back!</h2>
            <p class="text-muted-foreground text-sm">Here's a list of your tasks for this month!</p>
        `, tasksContainer );

        const tableComponent = new LX.Table(null, {
            head: [ "Name", "Status", "Priority", "Date", "ID" ],
            body: [
                [ "Alice", "In Progress", "High", "20/06/2025", 1 ],
                [ "Bob", "Backlog", "Medium", "11/04/2025", 2 ],
                [ "Prince", "Canceled", "Low", "13/05/2025", 3 ],
                [ "Sean", "Done", "High", "28/07/2025", 4 ],
                [ "Carter", "In Progress", "Medium", "20/03/2025", 5 ],
                [ "James", "Backlog", "Low", "10/02/2025", 6 ],
                [ "Mickey", "Todo", "Low", "08/01/2025", 7 ],
                [ "Charlie", "Canceled", "Low", "23/05/2025", 8 ],
                [ "Potato", "Todo", "High", "15/07/2025", 9 ]
            ]
        }, {
            selectable: true,
            sortable: true,
            toggleColumns: true,
            filter: "Name",
            // tableClass: "bg-primary",
            customFilters: [
                { name: "Status", options: ["Backlog", "Todo", "In Progress", "Done", "Canceled"] },
                { name: "Priority", options: ["Low", "Medium", "High"] },
                { name: "ID", type: "range", min: 0, max: 9, step: 1, units: "hr" },
                { name: "Date", type: "date", xdefault: ["23/07/2025", "29/07/2025"] },
            ],
            rowActions: [
                { icon: "Edit", title: "Edit Row" },
                "delete",
                "menu"
            ],
            onMenuAction: (index, tableData) => {
                return [
                    { name: "Export" },
                    { name: "Make a copy" },
                    { name: "Favourite" },
                    null,
                    { name: "Delete", icon: "Trash2", className: "destructive" },
                ]
            }
        });
        tasksContainer.appendChild( tableComponent.root );
    }

    // Code
    if( !mobile )
    {
        const codeContainer = LX.makeContainer( [ "auto", "800px" ], "flex flex-col border-color rounded-lg overflow-hidden" );
        tabs.add( "Code", codeContainer );

        const codeArea = new LX.Area();
        codeContainer.appendChild( codeArea.root );

        let editor = new CodeEditor(codeArea, {
            // allowAddScripts: false,
            // autocomplete: false,
            // disableEdition: true,
            // fileExplorer: false
        });

        editor.setText(`interface Vec2 {
    x: number;
    y: number;
}

type Callback<T> = (value: T) => void;

class Timer {
    private startTime = 0;

    start(): void {
        this.startTime = performance.now();
    }

    elapsed(): number {
        return performance.now() - this.startTime;
    }
}

async function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const onTick: Callback<number> = time => {
    console.log(\`Elapsed: \${time.toFixed(2)}ms\`);
};

async function main() {
    const timer = new Timer();
    timer.start();

    await wait(500);
    onTick(timer.elapsed());
}

main();
`, undefined, true ); // Force detect language!
    }

    // Audio
    // {
    //     const audioContainer = LX.makeContainer( [ "auto", "850px" ], "", {
    //         backgroundColor: "red"
    //     } );

    //     tabs.add( "Audio", audioContainer );
    // }
}

// Footer
{
    const footer = new LX.Footer( {
        className: "border-t-color",
        parent: LX.root,
        columns: [
            {
                title: "LexGUI",
                items: [
                    { title: "Source code on Github", link: "https://github.com/jxarco/lexgui.js/" }
                ]
            },
            {
                title: "Projects",
                items: [
                    { title: "Animics", link: "https://animics.gti.upf.edu/" },
                    { title: "Performs", link: "https://performs.gti.upf.edu/" }
                ]
            },
            {
                title: "References",
                items: [
                    { title: "shadcn/ui", link: "https://ui.shadcn.com/" },
                    { title: "Radix UI", link: "https://www.radix-ui.com/" },
                ]
            }
        ],
        credits: `2019-${ new Date().getUTCFullYear() } Alex Rodríguez and contributors. Website source code on GitHub.`,
        socials: [
            { title: "Github", link: "https://github.com/jxarco/lexgui.js/", icon: "Github" },
            { title: "Discord", link: "https://discord.gg/vwqVrMZBXv", icon: "Discord" }
        ]
    } );
}