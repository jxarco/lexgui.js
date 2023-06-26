// init library and get main area
let area = LX.init();

// change global properties after init
// LX.DEFAULT_NAME_WIDTH = "10%";
// LX.DEFAULT_SPLITBAR_SIZE = 15;
// LX.OPEN_CONTEXTMENU_ENTRY = 'mouseover';

// LX.message("I'm in another position", null, { position: [10, 10] });
// LX.message("Welcome to Lexgui", "Welcome!", { draggable: true })

// menu bar
area.addMenubar( m => {

    // {options}: callback, icon, short

    m.add( "Scene/New Scene", () => { console.log("New scene created!") });
    m.add( "Scene/Open Scene", { icon: "fa-solid fa-folder-open", short: "CTRL + O" } );
    m.add( "Scene/Open Recent/hello.scene", () => { console.log("Opening 'hello.scene'") });
    m.add( "Scene/Open Recent/goodbye.scene" );
    m.add( "Project/Project Settings" );
    m.add( "Project/Export", { icon: "fa-solid fa-download" });
    m.add( "Project/Export/DAE", { icon: "fa-solid fa-cube", short: "D" } );
    m.add( "Project/Export/GLTF", { short:  "G" } );
    m.add( "Editor/Settings", { icon: "fa-solid fa-gears" } );
    m.add( "Help", { short:  "F1" } );
    m.add( "Help/Search Help", { icon: "fa-solid fa-magnifying-glass" });
    m.add( "Help/Support LexGUI/Please", { icon: "fa-solid fa-heart" } );
    m.add( "Help/Support LexGUI/Do it" );
});

// split main area
area.split({sizes:["75%","25%"]});
var [left,right] = area.sections;

// split left area
left.split({type: 'vertical', sizes:["80vh","20vh"]});
var [up, bottom] = left.sections;

// split right area
right.split({type: 'vertical', sizes:["70vh","30vh"]});
var [rup, rbottom] = right.sections;

// another menu bar
rbottom.addMenubar( m => {
    m.add( "Vertical", e => { console.log(e); fillRightBottomPanel( side_bottom_panel, e.name ); });
    m.add( "Horizontal", e => { console.log(e); fillRightBottomPanel( side_bottom_panel, e.name ); });
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
                            'callback': function() {
                                console.log("Script opened!")
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

var kfTimeline = null;
var clipsTimeline = null;

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
        if(bottom_panel)
            bottom_panel.style.display = 'block';
        else {
            bottom_panel = new LX.Panel({id: "bottom-panel"});
            bottom.attach( bottom_panel );
            fillBottomPanel( bottom_panel ); 
        }
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
        }
        else {
            kfTimeline = new LX.KeyFramesTimeline("kf-timeline", {width: m.root.clientWidth, height: m.parent.root.parentElement.clientHeight - m.root.clientHeight});
            kfTimeline.setAnimationClip({tracks: [{name: "Test track", values: [0,1,0,1], times: [0, 0.1, 0.2, 0.3]}], duration: 1});
            kfTimeline.selectedItem = "Test track";
            bottom.attach(kfTimeline);
            kfTimeline.addButtons([ 
                { icon: 'fa fa-wand-magic-sparkles', name: 'autoKeyEnabled' },
                { icon: 'fa fa-filter', name: "optimize", callback: (e) => {   kfTimeline.onShowOptimizeMenu(e);}},
                { icon: 'fa fa-rectangle-xmark', name: 'unselectAll', callback: (e) => { kfTimeline.unSelectAllKeyFrames();}}
            ]);
            
            kfTimeline.draw(0);
            
            bottom.onresize = bounding => {
                kfTimeline.resize( [ bounding.width, bounding.height ] );
            }
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
        }
        else {
            clipsTimeline = new LX.ClipsTimeline("clips-timeline", {width: m.root.clientWidth, height: m.parent.root.parentElement.clientHeight - m.root.clientHeight});
            var clip = {name:"", start:0, duration:1, type:""};
            // clipsTimeline.addClip(clip)
            clipsTimeline.setAnimationClip({tracks: [{clips: [clip]}], duration: 1});
            clipsTimeline.selectedItem = "Test track";

            bottom.attach(clipsTimeline);
            clipsTimeline.draw(0);
            
            bottom.onResize = (a) => {
                clipsTimeline.resize(a)
            }
        }

    });

} );

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
                    LX.addContextMenu( "Node", event.value, m => {

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
    panel.addVector3("I'm a Vec3", [0.1, 0.4, 0.5], (value, event) => {
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
    panel.addVector4("I'm a Vec4", [0.3, 0.3, 0.5, 1], (value, event) => {
        console.log(value);
    });
    panel.addSeparator();
    panel.addTitle("Configuration (I'm a title)");
    panel.addCheckbox("Toggle me", true, (value, event) => {
        console.log(value);
    });
    panel.end();
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

    panel.end();
   
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
    panel.end();
}