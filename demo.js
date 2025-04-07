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
            width: "256px", className: "right", buttonClass: "outline left fg-tertiary bg-secondary" }
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
                callback:  (event, swapValue) => { LX.setTheme( swapValue ? "light" : "dark" ) }
            }
        ], { float: "right" });
    });
}

// Header
{
    const header = LX.makeContainer( [ null, "auto" ], "flex flex-col border-top border-bottom gap-2 px-6 py-12" );
    
    header.innerHTML = `
        <a>Get started with LexGUI.js</a>
        <h1>Build your application interface</h1>
        <p class="font-light" style="max-width:32rem">A set of beautifully-designed, accessible widgets and components.
        No complex frameworks. Pure JavaScript and CSS. Open Source.</p>
    `;
    
    area.attach( header );
}

// Content
{
    const tabs = area.addTabs( { parentClass: "p-4", sizes: [ "auto", "auto" ], contentClass: "p-6 pt-0" } );

    // Mail
    {
        const mailContainer = LX.makeContainer( [ null, "800px" ], "flex flex-col bg-primary border rounded-lg" );
        tabs.add( "Mail", mailContainer, { selected: true } );

        const mailArea = new LX.Area({ className: "rounded-lg" });
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
            // collapseToIcons: false,
            className: "border-right",
            parentClass: "rounded-lg",
            headerTitle: "jxarco",
            headerSubtitle: "alexroco.30@gmail.com",
            headerImage: "https://raw.githubusercontent.com/jxarco/lexgui.js/refs/heads/master/images/icon.png",
            // header: customHeader,
            skipFooter: true,
            displaySelected: true,
            onHeaderPressed: (e, element) => { }
        });

        const inboxArea = sidebar.siblingArea;
        inboxArea.root.classList.add( "rounded-lg" );

        var [ left, right ] = inboxArea.split({ sizes:["40%","60%"] });
        left.setLimitBox( 350, null, 650, null );

        // Manage Inbox
        {
            const inboxTabs = left.addTabs({ parentClass: "flex p-3 items-end border-bottom", sizes: [ "auto", "auto" ], float: "end" });
            const tabsRowContainer = inboxTabs.root.parentElement;

            const mailSectionTitle = LX.makeContainer( [ "auto", "auto" ], "mr-auto ml-2 self-center text-xxl font-semibold" );
            mailSectionTitle.innerHTML = "Inbox";
            tabsRowContainer.prepend( mailSectionTitle );

            window.__showMailList = ( container, unreadOnly = false ) => {

                // Filter
                {
                    const allMailFilter = LX.makeContainer( [ "100%", "50px" ], "flex p-2" );
                    container.appendChild( allMailFilter );
                    const filterInput = new LX.TextInput(null, "", null, 
                        { inputClass: "outline", width: "100%", icon: "fa fa-magnifying-glass", placeholder: "Search..." } 
                    );
                    allMailFilter.appendChild( filterInput.root );
                }
    
                // Content
                {
                    const allMailContent = LX.makeContainer( [ "100%", "calc(100% - 50px)" ], "flex flex-col p-4 pt-0 gap-2 overflow-scroll" );
                    container.appendChild( allMailContent );
    
                    window.__addMail = ( mail, mailContainer ) => {
                        const msgContent = LX.makeContainer( [ "100%", "auto" ], 
                            "flex flex-col border p-3 rounded-lg gap-2 select-none hover:bg-secondary cursor-pointer" );
                        mailContainer.appendChild( msgContent );
    
                        // Name, subject, date
                        {
                            const msgInfo = LX.makeContainer( [ "100%", "auto" ], "flex flex-col gap-0.5" );
                            msgContent.appendChild( msgInfo );
    
                            const msgNameDate = LX.makeContainer( [ "100%", "auto" ], "flex flex-row" );
                            msgInfo.appendChild( msgNameDate );
    
                            // Name + Date
                            {
                                const msgName = LX.makeContainer( [ "auto", "auto" ], "flex font-semibold text-md gap-2" );
                                msgName.innerHTML = mail.name;
                                msgName.innerHTML += ( mail.read ? "" : `<span class="rounded-full self-center bg-accent" style="width: 8px; height: 8px"></span>` );
                                msgNameDate.appendChild( msgName );
    
                                const msgDate = LX.makeContainer( [ "auto", "auto" ], "fg-tertiary text-sm ml-auto self-center" );
                                msgDate.innerHTML = mail.date;
                                msgNameDate.appendChild( msgDate );
                            }
    
                            const msgSubject = LX.makeContainer( [ "100%", "auto" ], "font-semibold text-sm" );
                            msgSubject.innerHTML = mail.subject;
                            msgInfo.appendChild( msgSubject );
                        }
                        const msgText = LX.makeContainer( [ "100%", "auto" ], "text-sm line-clamp-2 fg-tertiary" );
                        msgText.innerHTML = mail.content;
                        msgContent.appendChild( msgText );
                        const msgTags = LX.makeContainer( [ "100%", "auto" ], "flex flex-row gap-0.5 font-semibold" );
                        for( const tag of mail.tags )
                        {
                            msgTags.appendChild( LX.badge( tag, "sm", { asElement: true } ) );
                        }
                        msgContent.appendChild( msgTags );
    
                        msgContent.listen( "click", () => {
                            window.__openMail( mail );
                        } );
                    };
    
                    LX.requestJSON( "data/example_mail_data.json", data => {
                        data.forEach( e => { if( !unreadOnly || ( unreadOnly && !e.read ) ) window.__addMail( e, allMailContent ) } );
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
            right.root.className += " rounded-lg";

            // Buttons
            {
                const mailPreviewHeader = LX.makeContainer( [ "100%", "59.59px" ], "flex flex-row border-bottom p-1" );
                right.attach( mailPreviewHeader );

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
                const previewDataContent = LX.makeContainer( [ "100%", "100%" ], "" );
                right.attach( previewDataContent );

                window.__openMail = ( mail ) => {

                    previewDataContent.innerHTML = "";

                    const mailPreviewInfo = LX.makeContainer( [ "100%", "auto" ], "flex flex-row border-bottom p-6" );
                    previewDataContent.appendChild( mailPreviewInfo );
    
                    const senderData = LX.makeContainer( [ "100%", "auto" ], "flex flex-col gap-0.5" );
                    senderData.innerHTML = `
                    <div class="text-md font-semibold">${ mail.name }</div>
                    <div class="text-sm">${ mail.subject }</div>
                    <div class="text-sm">Reply-To: ${ mail.email }</div>
                    `;
                    mailPreviewInfo.appendChild( senderData );
    
                    const exactDate = LX.makeContainer( [ "100%", "auto" ], "flex flex-row text-sm fg-tertiary justify-end" );
                    exactDate.innerHTML = mail.exactDate;
                    mailPreviewInfo.appendChild( exactDate );

                    const mailPreviewContent = LX.makeContainer( [ "100%", "505px" ], "flex flex-row border-bottom text-md whitespace-pre-wrap p-4" );
                    mailPreviewContent.innerHTML = mail.content;
                    previewDataContent.appendChild( mailPreviewContent );

                    const previewFooter = LX.makeContainer( [ "100%", "auto" ], "flex flex-col p-2" );
                    previewDataContent.appendChild( previewFooter );

                    const msgReplyTextArea = new LX.TextArea(null, "", null, 
                        { className: "mt-1", inputClass: "outline", width: "100%", resize: false, placeholder: `Reply ${ mail.name }` } 
                    );
                    previewFooter.appendChild( msgReplyTextArea.root );

                    const previewButtons = LX.makeContainer( [ "100%", "auto" ], "flex flex-row p-1" );
                    previewFooter.appendChild( previewButtons );

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
        const tasksContainer = LX.makeContainer( [ null, "auto" ], "col bg-primary border rounded-lg p-6" );
        tabs.add( "Tasks", tasksContainer, { xselected: true } );

        const header = LX.makeContainer( [ null, "auto" ], "col rounded-lg p-6" );
        header.innerHTML = `
            <h2>Welcome back!</h2>
            <p class="fg-tertiary">Here's a list of your tasks for this month!</p>
        `;
        tasksContainer.appendChild( header );

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

    // Editor
    {
        const editorContainer = LX.makeContainer( [ "auto", "850px" ], "", {
            backgroundColor: "red"
        } );

        tabs.add( "Editor", editorContainer );
    }

    // Code
    {
        const codeContainer = LX.makeContainer( [ "auto", "850px" ], "", {
            backgroundColor: "red"
        } );

        tabs.add( "Code", codeContainer );
    }

    // Audio
    {
        const audioContainer = LX.makeContainer( [ "auto", "850px" ], "", {
            backgroundColor: "red"
        } );

        tabs.add( "Audio", audioContainer );
    }
}

// Footer
{
    const footer = new LX.Footer( {
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