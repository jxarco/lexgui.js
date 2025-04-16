import { LX } from 'lexgui';
import 'lexgui/components/codeeditor.js';
import 'lexgui/components/timeline.js';
import 'lexgui/components/audio.js';

window.LX = LX;

const area = LX.init( { strictViewport: false, rootClass: "wrapper" } );

// Menubar
{
    area.addMenubar( m => {

        m.setButtonImage("lexgui.js", "images/icon.png", () => {window.open("https://jxarco.github.io/lexgui.js/")}, {float: "left"})

        m.add( "Docs", { icon: "fa-solid fa-magnifying-glass", short: "F1", callback: () => { window.open("./docs/") }});

        const commandButton = new LX.Button(null, "Search command...", () => { LX.setCommandbarState( true ) }, {
            width: "256px", className: "right", buttonClass: "border left fg-tertiary bg-secondary" }
        );
        m.root.appendChild( commandButton.root );

        m.addButtons( [
            {
                title: "Github",
                icon: "fa-brands fa-github",
                callback:  (event) => {
                    window.open( "https://github.com/jxarco/lexgui.js/", "_blank" );
                }
            },
            {
                title: "Change Theme",
                icon: "fa-solid fa-sun",
                swap: "fa-solid fa-moon",
                callback:  (swapValue) => { LX.setTheme( swapValue ? "light" : "dark" ) }
            }
        ], { float: "right" });
    });
}

// Header
{
    const header = LX.makeContainer( [ null, "auto" ], "flex flex-col border-top border-bottom gap-2 px-6 py-12", `
        <a>Get started with LexGUI.js <span class="text-sm fg-secondary">${ LX.version }</span></a>
        <h1>Build your application interface</h1>
        <p class="font-light" style="max-width:32rem">A set of beautifully-designed, accessible widgets and components.
        No complex frameworks. Pure JavaScript and CSS. Open Source.</p>
    `, area );
}

// Content
{
    const tabs = area.addTabs( { parentClass: "p-4", sizes: [ "auto", "auto" ], contentClass: "p-6 pt-0" } );

    // Editor
    {
        const editorContainer = LX.makeContainer( [ null, "800px" ], "flex flex-col bg-primary border rounded-lg overflow-hidden" );
        tabs.add( "Editor", editorContainer, { selected: true } );

        const editorArea = new LX.Area({ className: "rounded-lg" });
        editorContainer.appendChild( editorArea.root );

        editorArea.addMenubar( m => {
            m.add( "Scene/New Scene", () => { console.log("New scene created!") });
            m.add( "Scene/Open Scene", { icon: "fa-solid fa-folder-open", short: "S" } );
            m.add( "Scene/Open Recent/hello.scene" );
            m.add( "Scene/Open Recent/Old/goodbye.scene" );
            m.add( "Scene/Open Recent/Old/salute.scene" );
            m.add( "Project/Project Settings", { disabled: true } );
            m.add( "Project/" );
            m.add( "Project/Export", { icon: "fa-solid fa-download" });
            m.add( "Project/Export/DAE", { icon: "fa-solid fa-cube", short: "D" } );
            m.add( "Project/Export/GLTF", { short:  "G" } );
            m.add( "Account/Login", { icon: "fa-solid fa-user" } );
            m.add( "Help/Search Help", { icon: "fa-solid fa-magnifying-glass", short:  "F1" } );
            m.add( "Help/Support LexGUI/Please", { icon: "fa-solid fa-heart" } );
            m.add( "Help/Support LexGUI/Do it" );
            m.addButtons( [
                {
                    title: "Play",
                    icon: "fa-solid fa-play",
                    swap: "fa-solid fa-stop"
                },
                {
                    title: "Pause",
                    icon: "fa-solid fa-pause",
                    disabled: true
                }
            ]);
        }, { sticky: false });

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
                { name: "Select", icon: "fa fa-arrow-pointer", selectable: true },
                { name: "Move", icon: "fa-solid fa-arrows-up-down-left-right", selectable: true },
                { name: "Rotate", icon: "fa-solid fa-rotate-right", selectable: true }
            ],
            { name: "Lit", options: ["Lit", "Unlit", "Wireframe"] },
            [
                { name: "Enable Snap", icon: "fa fa-table-cells", selectable: true },
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
                                'icon': 'fa-solid fa-cube',
                                'children': [],
                                'actions': [
                                    {
                                        'name': 'Open script',
                                        'icon': 'fa-solid fa-scroll'
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        'id': 'node_2',
                        'icon': 'fa-solid fa-circle-play',
                        'children': []
                    }
                ]
            };

            // This is optional!
            const treeIcons = [
                {
                    'name':'Add node',
                    'icon': 'fa-solid fa-plus'
                },
                {
                    'name':'Instantiate scene',
                    'icon': 'fa-solid fa-link'
                }
            ];

            window.tree = panel.addTree("Scene Tree", sceneData, {
                icons: treeIcons,
                addDefault: true,
                onevent: (event) => {
                    switch(event.type) {
                        case LX.TreeEvent.NODE_CONTEXTMENU:
                            const m = event.panel;
                            m.add( "Components/Transform");
                            m.add( "Components/MeshRenderer");
                            break;
                    }
                }
            });

            // add widgets to panel branch
            panel.branch("Canvas", {icon: "fa-solid fa-palette", filter: true});
            panel.addColor("Background", "#b7a9b1", null);
            panel.addText("Text", "LexGUI.js @jxarco", null, {placeholder: "e.g. ColorPicker", icon: "fa fa-font"});
            panel.addColor("Font Color", "#303b8d", null);
            panel.addNumber("Font Size", 36, null, { min: 1, max: 48, step: 1, units: "px"});
            panel.addSelect("Font Family", ["Arial", "GeistSans", "Monospace", "Ubuntu"], "GeistSans");
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

            panel.branch("Node", { icon: "fa-solid fa-cube" });
            panel.addText("Name", "node_1");
            panel.addCheckbox("Visibility", true, null, { className: "accent" });
            panel.addLayers("Layers", 10, null);

            panel.addTitle( "Transform" );
            panel.addVector3( "Position", [0.0, 0.0, 0.0] );
            panel.addVector4( "Rotation", [0.0, 0.0, 0.0, 1.0] );
            panel.addVector3( "Scale", [1.0, 1.0, 1.0] );
            panel.addButton(null, "Export", null, { buttonClass: "contrast" });
            panel.merge();
        }
    }

    // Mail
    {
        const mailContainer = LX.makeContainer( [ null, "800px" ], "flex flex-col bg-primary border rounded-lg overflow-hidden" );
        tabs.add( "Mail", mailContainer, { xselected: true } );

        const mailArea = new LX.Area();
        mailContainer.appendChild( mailArea.root );
        const badgeClass = "ml-auto no-bg font-medium";

        const sidebar = mailArea.addSidebar( m => {
            m.add( "Inbox", { selected: true, icon: "inbox", content: LX.badge("128", badgeClass, { asElement: true }) } );
            m.add( "Drafts", { icon: "file", content: LX.badge("9", badgeClass, { asElement: true }) } );
            m.add( "Sent", { icon: "paper-plane" } );
            m.add( "Junk", { icon: "box-archive-x", content: LX.badge("23", badgeClass, { asElement: true }) } );
            m.add( "Trash", { icon: "trash-can" } );
            m.add( "Archive", { icon: "box-archive" } );
            m.separator();
            m.add( "Social", { icon: "user", content: LX.badge("972", badgeClass, { asElement: true }) } );
            m.add( "Updates", { icon: "circle-info", content: LX.badge("342", badgeClass, { asElement: true }) } );
            m.add( "Forums", { icon: "comments", content: LX.badge("96", badgeClass, { asElement: true }) } );
            m.add( "Shopping ", { icon: "shopping-cart" } );
            m.add( "Promotions", { icon: "flag", content: LX.badge("21", badgeClass, { asElement: true }) } );
        }, {
            className: "border-right",
            headerTitle: "jxarco",
            headerSubtitle: "alexroco.30@gmail.com",
            headerImage: "https://raw.githubusercontent.com/jxarco/lexgui.js/refs/heads/master/images/icon.png",
            skipFooter: true,
            displaySelected: true,
            onHeaderPressed: (e, element) => { }
        });

        const inboxArea = sidebar.siblingArea;

        var [ left, right ] = inboxArea.split({ sizes:["40%","60%"] });
        left.setLimitBox( 350, null, 650, null );

        // Manage Inbox
        {
            const inboxTabs = left.addTabs({ parentClass: "flex p-3 items-end border-bottom", sizes: [ "auto", "auto" ], float: "end" });
            const tabsRowContainer = inboxTabs.root.parentElement;

            const mailSectionTitle = LX.makeContainer( [ "auto", "auto" ], "mr-auto ml-2 self-center text-xxl font-semibold", "Inbox" );
            tabsRowContainer.prepend( mailSectionTitle );

            window.__showMailList = ( container, unreadOnly = false ) => {

                // Filter
                {
                    const allMailFilter = LX.makeContainer( [ "100%", "50px" ], "flex p-2", "", container );
                    const filterInput = new LX.TextInput(null, "", null,
                        { inputClass: "outline", width: "100%", icon: "fa fa-magnifying-glass", placeholder: "Search..." }
                    );
                    allMailFilter.appendChild( filterInput.root );
                }

                // Content
                {
                    const allMailContent = LX.makeContainer( [ "100%", "calc(100% - 50px)" ], "flex flex-col p-4 pt-0 gap-2 overflow-scroll", "", container );

                    window.__addMail = ( mail, mailContainer, idx ) => {

                        const selected = ( idx == 0 );
                        const msgContent = LX.makeContainer( [ "100%", "auto" ],
                            `flex flex-col border p-3 rounded-lg gap-2 select-none hover:bg-mix cursor-pointer ${ selected ? "bg-secondary" : "" }`, "", mailContainer );

                        // Name, subject, date
                        {
                            const msgInfo = LX.makeContainer( [ "100%", "auto" ], "flex flex-col gap-0.5", "", msgContent );
                            const msgNameDate = LX.makeContainer( [ "100%", "auto" ], "flex flex-row", "", msgInfo );

                            // Name + Date
                            {
                                const msgName = LX.makeContainer( [ "auto", "auto" ], "flex font-semibold text-md gap-2", "", msgNameDate );
                                msgName.innerHTML = mail.name;
                                msgName.innerHTML += ( mail.read ? "" : `<span class="rounded-full self-center bg-accent" style="width: 8px; height: 8px"></span>` );
                                const msgDate = LX.makeContainer( [ "auto", "auto" ], "fg-tertiary text-sm ml-auto self-center", mail.date, msgNameDate );
                            }

                            const msgSubject = LX.makeContainer( [ "100%", "auto" ], "font-semibold text-sm", mail.subject, msgInfo );
                        }

                        const msgText = LX.makeContainer( [ "100%", "auto" ], "text-sm line-clamp-2 fg-tertiary", mail.content, msgContent );
                        const msgTags = LX.makeContainer( [ "100%", "auto" ], "flex flex-row gap-0.5 font-semibold", "", msgContent );
                        for( const tag of mail.tags )
                        {
                            msgTags.appendChild( LX.badge( tag, "sm", { asElement: true } ) );
                        }

                        msgContent.listen( "click", function() {
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
                const mailPreviewHeader = LX.makeContainer( [ "100%", "59.59px" ], "flex flex-row border-bottom p-1", "", right );

                mailPreviewHeader.appendChild( new LX.Button( null, "", null, { title: "Archive", tooltip: true, buttonClass: "bg-none", icon: "box-archive" } ).root );
                mailPreviewHeader.appendChild( new LX.Button( null, "", null, { title: "Move to junk", tooltip: true, buttonClass: "bg-none", icon: "box-archive-x" } ).root );
                mailPreviewHeader.appendChild( new LX.Button( null, "", null, { title: "Move to trash", tooltip: true, buttonClass: "bg-none", icon: "trash-can" } ).root );
                mailPreviewHeader.appendChild( LX.makeContainer( [ "1px", "35%" ], "border-right self-center ml-2 mr-2" ) );
                mailPreviewHeader.appendChild( new LX.Button( null, "", null, { title: "Snooze", tooltip: true, buttonClass: "bg-none", icon: "clock" } ).root );

                mailPreviewHeader.appendChild( new LX.Button( null, "", null, { title: "Reply", tooltip: true, buttonClass: "bg-none", className: "ml-auto", icon: "reply" } ).root );
                mailPreviewHeader.appendChild( new LX.Button( null, "", null, { title: "Reply all", tooltip: true, buttonClass: "bg-none", icon: "reply-all" } ).root );
                mailPreviewHeader.appendChild( new LX.Button( null, "", null, { title: "Forward", tooltip: true, buttonClass: "bg-none", icon: "forward" } ).root );
                mailPreviewHeader.appendChild( LX.makeContainer( [ "1px", "35%" ], "border-right self-center ml-2 mr-2" ) );
                mailPreviewHeader.appendChild( new LX.Button( null, "", (value, event) => {
                    new LX.DropdownMenu( event.target, [
                        { name: "Mark as unread" },
                        { name: "Star thread" },
                        { name: "Add label" },
                        { name: "Mute thread" }
                    ], { side: "bottom", align: "end" });
                }, { buttonClass: "bg-none", icon: "more" } ).root );
            }

            // Prewiew Info
            {
                const previewDataContent = LX.makeContainer( [ "100%", "100%" ], "", "", right );

                window.__openMail = ( mail ) => {

                    previewDataContent.innerHTML = "";

                    const mailPreviewInfo = LX.makeContainer( [ "100%", "auto" ], "flex flex-row border-bottom p-4 gap-3", "", previewDataContent );
                    const avatarContainer = LX.makeContainer( [ "40px", "40px" ], "bg-tertiary rounded-full content-center", "", mailPreviewInfo );

                    const mailNames = mail.name.split( ' ' );
                    const avatarIcon = LX.makeContainer( [ "auto", "auto" ], "font-medium text-lg self-center", mailNames[ 0 ][ 0 ] + mailNames[ 1 ][ 0 ], avatarContainer );

                    const senderData = LX.makeContainer( [ "auto", "auto" ], "flex flex-col gap-0.5", `
                    <div class="text-md font-semibold">${ mail.name }</div>
                    <div class="text-sm">${ mail.subject }</div>
                    <div class="text-sm">Reply-To: ${ mail.email }</div>
                    `, mailPreviewInfo );

                    const exactDate = LX.makeContainer( [ "auto", "auto" ], "flex flex-row text-sm fg-tertiary ml-auto", mail.exactDate, mailPreviewInfo );
                    const mailPreviewContent = LX.makeContainer( [ "100%", "515px" ], "flex flex-row border-bottom text-md whitespace-pre-wrap p-4", mail.content, previewDataContent );
                    const previewFooter = LX.makeContainer( [ "100%", "auto" ], "flex flex-col p-2", "", previewDataContent );

                    const msgReplyTextArea = new LX.TextArea(null, "", null,
                        { className: "mt-1", inputClass: "outline", width: "100%", resize: false, placeholder: `Reply ${ mail.name }...` }
                    );
                    previewFooter.appendChild( msgReplyTextArea.root );

                    const previewButtons = LX.makeContainer( [ "100%", "auto" ], "flex flex-row p-1", "", previewFooter );

                    const muteToggle = new LX.Toggle( null, false, null, { label: "Mute this thread", className: "contrast" } );
                    previewButtons.appendChild( muteToggle.root );

                    const sendButton = new LX.Button( null, "Send", () => {
                        LX.toast( "Message sent!", "To:" + mail.email, { timeout: 5000, action: { name: "Undo", callback: ( toast, actionName, event ) => {
                            toast.close();
                        } } } );
                    }, { className: "ml-auto", buttonClass: "contrast" } );
                    previewButtons.appendChild( sendButton.root );
                };
            }
        }
    }

    // Tasks
    {
        const tasksContainer = LX.makeContainer( [ null, "auto" ], "col bg-primary border rounded-lg p-6 overflow-hidden" );
        tabs.add( "Tasks", tasksContainer, { xselected: true } );

        const header = LX.makeContainer( [ null, "auto" ], "col p-4", `
            <h2>Welcome back!</h2>
            <p class="fg-tertiary">Here's a list of your tasks for this month!</p>
        `, tasksContainer );

        const tableWidget = new LX.Table(null, {
            head: ["Name", "Status", "Priority"],
            body: [
                ["Alice", "In Progress", "High"],
                ["Bob", "Backlog", "Medium"],
                ["Prince", "Canceled", "Low"],
                ["Sean", "Done", "High"],
                ["Carter", "In Progress", "Medium"],
                ["James", "Backlog", "Low"],
                ["Mickey", "Todo", "Low"],
                ["Charlie", "Canceled", "Low"],
                ["Potato", "Todo", "High"]
            ]
        }, {
            selectable: true,
            sortable: true,
            toggleColumns: true,
            filter: "Name",
            customFilters: [
                { name: "Status", options: ["Backlog", "Todo", "In Progress", "Done", "Cancelled"] },
                { name: "Priority", options: ["Low", "Medium", "High"] },
            ],
            rowActions: [
                { icon: "edit", title: "Edit Row" },
                "delete",
                "menu"
            ],
            onMenuAction: (index, tableData) => {
                return [
                    { name: "Export" },
                    { name: "Make a copy" },
                    { name: "Favourite" }
                ]
            }
        });
        tasksContainer.appendChild( tableWidget.root );
    }

    // Code
    {
        const codeContainer = LX.makeContainer( [ "auto", "800px" ], "flex flex-col border rounded-lg overflow-hidden" );
        tabs.add( "Code", codeContainer );

        const codeArea = new LX.Area();
        codeContainer.appendChild( codeArea.root );

        let editor = new LX.CodeEditor(codeArea, {
            // allowAddScripts: false,
            // autocomplete: false,
            // disableEdition: true,
            // fileExplorer: false
        });
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
        className: "border-top",
        parent: LX.root,
        columns: [
            {
                title: "LexGUI",
                items: [
                    { title: "Documentation", link: "https://jxarco.github.io/lexgui.js/docs/" },
                    { title: "Source code", link: "https://github.com/jxarco/lexgui.js/" }
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
            { title: "Github", link: "https://github.com/jxarco/lexgui.js/", icon: `<a class="fa-brands fa-github"></a>` },
            { title: "Discord", link: "https://discord.gg/vwqVrMZBXv", icon: `<a class="fa-brands fa-discord"></a>` }
        ]
    } );
}