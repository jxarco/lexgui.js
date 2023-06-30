// init library and get main area
let area = LX.init();

// change global properties after init
// LX.DEFAULT_NAME_WIDTH = "10%";
// LX.DEFAULT_SPLITBAR_SIZE = 16;
// LX.OPEN_CONTEXTMENU_ENTRY = 'mouseover';

// LX.message("I'm in another position", null, { position: [10, 10] });
// LX.message("Welcome to Lexgui", "Welcome!");

// menu bar
area.addMenubar( m => {

    // {options}: callback, icon, short

    m.add( "Scene/New Scene", () => { console.log("New scene created!") });
    m.add( "Scene/Open Scene", { icon: "fa-solid fa-folder-open", short:  "S", callback: () => { console.log("Opening SCENE Dialog") } } );
    m.add( "Scene/Open Recent/hello.scene", name => { console.log("Opening " + name) });
    m.add( "Scene/Open Recent/goodbye.scene", name => { console.log("Opening " + name) });
    m.add( "Project/Project Settings" );
    m.add( "Project/Export", { icon: "fa-solid fa-download" });
    m.add( "Project/Export/DAE", { icon: "fa-solid fa-cube", short: "D", callback: () => { console.log("Exporting DAE...") }} );
    m.add( "Project/Export/GLTF", { short:  "G" } );
    m.add( "Editor/Settings", { icon: "fa-solid fa-gears", callback: () => {
        const dialog = new LX.Dialog( "Settings", p => {
            p.addText("A Text", "Testing first widget");
            p.sameLine(3);
            p.addLabel("Buttons:");
            p.addButton(null, "Click me", () => {
                console.log( p.getValue("A Text") );
            });
            p.addButton(null, "Click me v2!", () => {
                console.log( p.getValue("A Text") );
            });
        });
    }} );
    m.add( "Help/Search Help", { icon: "fa-solid fa-magnifying-glass", short:  "F1", callback: () => { console.log("Opening HELP") }});
    m.add( "Help/Support LexGUI/Please", { icon: "fa-solid fa-heart" } );
    m.add( "Help/Support LexGUI/Do it" );

    m.addButtons( [
        {
            title: "Play",
            icon: "fa-solid fa-play",
            callback:  (domEl) => { 
                console.log("play!"); 
                domEl.classList.toggle('fa-play'), domEl.classList.toggle('fa-stop');
            }
        },
        {
            title: "Pause",
            icon: "fa-solid fa-pause",
            disabled: true,
            callback:  (domEl) => { console.log("pause!") }
        },
        {
            icon: "fa-solid fa-magnifying-glass",
            callback:  (domEl) => { console.log("glass!") }
        }
    ]);
    
    m.getButton("Play");

});

// split main area
area.split({sizes:["75%","25%"]});
var [left,right] = area.sections;

// split left area
left.split({type: 'vertical', sizes:["80vh","20vh"]});
var [up, bottom] = left.sections;

var kfTimeline = null;
var clipsTimeline = null;

bottom.onresize = bounding => {
    if(kfTimeline) kfTimeline.resize( [ bounding.width, bounding.height ] );
    if(clipsTimeline) clipsTimeline.resize( [ bounding.width, bounding.height ] );
}

// another menu bar
bottom.addMenubar( m => {
    m.add( "Information", e => { 
        console.log(e); 
        var el = document.getElementById('kf-timeline');
        if(el)
            el.style.display = 'none';
        el = document.getElementById('clips-timeline');
        if(el)
            el.style.display = 'none';

        var bottom_panel = document.getElementById('bottom-panel');
        bottom_panel.style.display = 'block';
    });

    m.add( "Keyframes Timeline", e => { 
        console.log(e);
        let el = document.getElementById('bottom-panel');
        if(el)
            el.style.display = 'none';
        el = document.getElementById('clips-timeline');
        if(el)
            el.style.display = 'none';
        var timeline = document.getElementById('kf-timeline');            
        if(timeline) {
            timeline.style.display = 'block';
            kfTimeline.resize();
        }
        else {
            kfTimeline = new LX.KeyFramesTimeline("kf-timeline", {width: m.root.clientWidth, height: m.parent.root.parentElement.clientHeight - m.root.clientHeight});
            kfTimeline.setSelectedItems(["Item 1", "Item 2", "Item 3"]);
            kfTimeline.setAnimationClip({tracks: [{name: "Item 1.position", values: [0,1,0], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 1.scale", values: [0,1,0], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 2", values: [0,1,0,1], times: [0.1, 0.2, 0.3, 0.8]}, {name: "Item 3.position", values: [0,1,0], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 3.scale", values: [0,1,0], times: [0, 0.1, 0.2, 0.3]}], duration: 1});
            bottom.attach(kfTimeline);
            
            kfTimeline.addButtons([
                { icon: 'fa fa-wand-magic-sparkles', name: 'autoKeyEnabled' },
                { icon: 'fa fa-filter', name: "optimize", callback: (value, event) => {   kfTimeline.onShowOptimizeMenu(event);}},
                { icon: 'fa fa-rectangle-xmark', name: 'unselectAll', callback: (value, event) => { kfTimeline.unSelectAllKeyFrames();}}
            ]);
            
            kfTimeline.draw(0);

            
        }
    });

    m.add( "Clips Timeline", e => { 
        console.log(e);
        let el = document.getElementById('bottom-panel');
        if(el)
            el.style.display = 'none';
        
        el = document.getElementById('kf-timeline');
        if(el)
            el.style.display = 'none';
        var ctimeline = document.getElementById('clips-timeline');            
        if(ctimeline) {
            ctimeline.style.display = 'block';
            clipsTimeline.resize();
        }
        else {
            clipsTimeline = new LX.ClipsTimeline("clips-timeline", {width: m.root.clientWidth, height: m.parent.root.parentElement.clientHeight - m.root.clientHeight});
            var clip = {name:"Clip1", start:0, duration:1, type:""};
            clipsTimeline.addClip(clip)
            // clipsTimeline.setAnimationClip({tracks: [{clips: [clip]}], duration: 2});
            clipsTimeline.selectedItems = ["Clip1"];

            bottom.attach(clipsTimeline);
            clipsTimeline.draw(0);
            
        }

    });

    bottom.onresize = bounding => {
        if(clipsTimeline)
            clipsTimeline.resize( [ bounding.width, bounding.height ] );
        
        if(kfTimeline)
            kfTimeline.resize( [ bounding.width, bounding.height ] );
    }
} );

var bottom_panel = bottom.addPanel({id: "bottom-panel"});
fillBottomPanel( bottom_panel ); 

// split right area
right.split({type: 'vertical', sizes:["70vh","30vh"]});
var [rup, rbottom] = right.sections;

// another menu bar
rbottom.addMenubar( m => {
    m.add( "Vertical", name => { console.log(name); fillRightBottomPanel( side_bottom_panel, name ); });
    m.add( "Horizontal", name => { console.log(name); fillRightBottomPanel( side_bottom_panel, name ); });
}, { float: 'center' } );

// add canvas to left upper part
var canvas = document.createElement('canvas');
canvas.width = up.root.clientWidth;
canvas.height = up.root.clientHeight;
canvas.style.width = "100%";
canvas.style.height = "100%";
up.attach( canvas );

// add on resize event to control canvas size
up.onresize = function( bounding ) {
    canvas.width = bounding.width;
    canvas.height = bounding.height;
};

let scene_data = {
    'id': 'root',
    'children': [
        {
            'id': 'node_1',
            'children': [
                {
                    'id': 'node_1_1',
                    'children': [],
                    'actions': [
                        {
                            'name': 'Open script',
                            'icon': 'fa-solid fa-scroll',
                            'callback': function(node) {
                                console.log(node.id + ": Script opened!")
                            }
                        }
                    ]
                }
            ]
        },
        {
            'id': 'node_2',
            'children': []
        }
    ]
};

// add panels
var side_panel = rup.addPanel();
fillPanel( side_panel );

var side_bottom_panel = rbottom.addPanel();
fillRightBottomPanel( side_bottom_panel, 'Vertical' );

function loop(dt) {
    
    var ctx = canvas.getContext("2d");

    // Get values from panel widgets (e.g. color value)
    ctx.fillStyle = side_panel.getValue('Background');

    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = side_panel.getValue('Font Size') + "px Monospace";

    ctx.fillStyle = side_panel.getValue('Font Color');

    const text = side_panel.getValue('Text');
    const pos_2d = side_panel.getValue('2D Position');
    ctx.fillText(text, pos_2d[0] + 6, pos_2d[1] + 48);

    if(kfTimeline)
        kfTimeline.draw();

    if(clipsTimeline)
        clipsTimeline.draw();
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// **** **** **** **** **** **** **** **** **** **** **** **** 

function fillPanel( panel ) {
    
    // add data tree

    // this is optional!
    const tree_icons = [
        {
            'name':'Add node',
            'icon': 'fa-solid fa-plus',
            'callback': () => { console.log("Node added!") }
        },
        {
            'name':'Instantiate scene',
            'icon': 'fa-solid fa-link',
            'callback': () => { console.log("Scene instantiated!") }
        }
    ];

    window.tree = panel.addTree("Scene Tree", scene_data, { 
        icons: tree_icons, 
        // filter: false,
        onevent: (event) => { 
            console.log(event.string());

            switch(event.type) {
                case LX.TreeEvent.NODE_SELECTED: 
                    console.log(event.node.id + " selected"); 
                    break;
                case LX.TreeEvent.NODE_DBLCLICKED: 
                    console.log(event.node.id + " dbl clicked"); 
                    break;
                case LX.TreeEvent.NODE_CONTEXTMENU: 
                    LX.addContextMenu( event.node.id, event.value, m => {

                        // {options}: callback, color

                        m.add( "Select Children", () => console.log("select children") );
                        m.add( "Clone", { callback: () => console.log("Clone"), color: "#0d5" } );
                        m.add( "Components/Transform");
                        m.add( "Components/MeshRenderer");
                        m.add( "Move before sibling" );
                        m.add( "Move after sibling" );
                        m.add( "Move to parent" );
                        m.add( "Delete", { color: "#f33" });
                    });
                    break;
                case LX.TreeEvent.NODE_DRAGGED: 
                    console.log(event.node.id + " is now child of " + event.value.id); 
                    break;
                case LX.TreeEvent.NODE_RENAMED:
                    console.log(event.node.id + " is now called " + event.value); 
                    break;
                case LX.TreeEvent.NODE_VISIBILITY:
                    console.log(event.node.id + " visibility: " + event.value); 
                    break;
            }
        },
    });    

    // add widgets to panel branch
    panel.branch("Preferences", {icon: "fa-solid fa-gear"});
    panel.addButton(null, "Click me, I'm Full Width...");
    panel.addDropdown("Best Engine", ["Godot", "Unity", "Unreal Engine"], "Godot", (value, event) => {
        console.log(value);
    });

    panel.addDropdown("Best Logo", [{value:"Godot", src: "https://pbs.twimg.com/profile_images/1631591220630757377/nKSCjeS3_400x400.png"}, {value: "Unity", src: "https://imgcom.masterd.es/1/blog/2019/11/39809.jpg"}, {value:"Unreal Engine", src: "https://cdn2.unrealengine.com/ue-logo-1400x788-1400x788-8f185e1e3635.jpg"}], "Godot", (value, event) => {
        console.log(value);
    }, {filter:true});

    panel.addDropdown("Best Gif", [{value:"Godot", src: "https://thumbs.gfycat.com/CaringDefensiveAndeancondor-size_restricted.gif"}, {value: "Unity", src: "https://i.gifer.com/origin/db/db3cb258e9bbb78c5851a000742e5468_w200.gif"}, {value:"Unreal Engine", src: "https://d3kjluh73b9h9o.cloudfront.net/original/4X/e/0/d/e0deb23c10cc7852c6ab91c28083e27f9c8228f8.gif"}], "Godot", (value, event) => {
        console.log(value);
    }, {filter:true});

    panel.addVector3("I'm a Vec3", [0.1, 0.4, 0.5], (value, event) => {
        console.log(value);
    });
    panel.addLayers("Layers", 10, (value, event) => {
        console.log(value);
    });
    panel.addArray("Array", ['GPTeam', 'Blat Panthers', 'Blat Bunny'], (value, event) => {
        console.log(value);
    });
    panel.addList(null, 'Blat Panthers', ['GPTeam', 'Blat Bunny', ['Blat Panthers', 'fa-solid fa-paw']], (value, event) => {
        console.log(value);
    });
    panel.merge();

    // another branch
    panel.branch("Canvas", {icon: "fa-solid fa-palette", filter: true});
    panel.addColor("Background", "#b7a9b1");
    panel.addText("Text", "Lexgui.js @jxarco", null, {placeholder: "e.g. ColorPicker"});
    panel.addColor("Font Color", [1, 0.1, 0.6], (value, event) => {
        console.log("Font Color: ", value);
    });
    panel.addNumber("Font Size", 36, (value, event) => {
        console.log(value);
    }, { min: 1, max: 48 });
    panel.addVector2("2D Position", [250, 350], (value, event) => {
        console.log(value);
    }, { min: 0, max: 1024 });
    panel.addSeparator();
    panel.addTitle("Configuration (I'm a title)");
    panel.addCheckbox("Toggle me", true, (value, event) => {
        console.log(value);
    });
    panel.addFile("Image", data => { console.log(data) }, {} );
    panel.merge();

    // This is outside a branch
    panel.addText("I'm out :(", "", null, { placeholder: "Alone..." });
    panel.addVector4("I'm a Vec4", [0.3, 0.3, 0.5, 1], (value, event) => {
        console.log(value);
    });
    panel.addButton(null, "Click me, I'm Full Width...");
    panel.addButton("Test Button", "Reduced width...");
}

function fillRightBottomPanel( panel, tab ) {
    
    panel.clear();

    panel.branch("Tabs", {icon: "fa-solid fa-table-list"});

    if(tab == 'Horizontal')
    {
        panel.addTabs([
            { 
                name: "First tab",
                icon: "fa-brands fa-discord",
                callback: p => {
                    p.addTitle("Discord tab");
                    p.addButton(null, "Connect");
                }
            },
            { 
                name: "Second tab",
                icon: "fa-brands fa-twitter",
                callback: p => {
                    p.addTitle("Twitter tab");
                    p.addText("Tweet", "", null, {placeholder: "Tyler Rake 2"});
                }
            }
        ], { vertical: false /*, showNames: true */});

        panel.addText(null, "Widgets below are out the tabs", null, { disabled: true })

        // update panel values uising widget name
        panel.addNumber("HeadRoll Value", 0, (value, event) => {
            panel.setValue('HeadRoll', value);
        }, { min: -1, max: 1, step: 0.1 });
        panel.addProgress("HeadRoll", 0, { min: -1, max: 1 });
    }
    else if(tab == 'Vertical')
    {
        panel.addTabs([
            { 
                name: "First tab",
                icon: "fa-brands fa-discord",
                callback: p => {
                    p.addTitle("Discord tab");
                    p.addButton(null, "Connect");
                }
            },
            { 
                name: "Second tab",
                icon: "fa-brands fa-twitter",
                callback: p => {
                    p.addTitle("Twitter tab");
                    p.addText("Tweet", "", null, {placeholder: "Tyler Rake 2"});
                }
            }
        ]);

         // update panel values uising widget name
        panel.addNumber("HeadRoll Value", 0, (value, event) => {
            panel.setValue('HeadRoll', value);
        }, { min: -1, max: 1, step: 0.1 });
        panel.addProgress("HeadRoll", 0, { min: -1, max: 1 });
    }

    panel.merge();
   
}

function fillBottomPanel( panel ) {
    
    // add widgets to panel branch
    panel.branch("Information", {icon: "fa fa-circle-info"});
    panel.addText("Camera", "Canon EOS 80D", null, {disabled: true}); 
    panel.addText("Serial number", "194E283DD", (value, event) => {
        console.log(value);
    });
    panel.addText(null, "This has a console.log callback", (value, event) => {
        console.log(value);
    }, { trigger: 'input' });
    panel.addButton("Apply", "Print event", (value, event) => {
        console.log(event);
    });
    panel.merge();

    panel.branch("A collapsed branch", {closed: true});
    panel.addText(null, "Nothing here", null, {disabled: true});
    panel.merge();
}