// init library
LX.init();

// LX.message("Welcome to Lexgui!", "Not an error!")

// create main area
var area = new LX.Area({id:"mainarea"});

// split main area
area.split({sizes:["70%","30%"]});
var [left,right] = area.sections;

// split left area
left.split({type: 'vertical', sizes:["80vh","20vh"]});
var [up, bottom] = left.sections;

// split right area
right.split({type: 'vertical', sizes:["87.5vh","12.5vh"], resize: false});
var [rup, rbottom] = right.sections;

// add canvas to left upper part
var canvas = document.createElement('canvas');
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.backgroundColor = "#ccc";
up.attach( canvas );

let scene_data = {
    'id': 'root',
    'children': [
        {
            'id': 'node_1',
            'children': [
                {
                    'id': 'node_1_1',
                    'visible': false,
                    'children': []
                },
                {
                    'id': 'node_1_2',
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
var side_panel = new LX.Panel();
rup.attach( side_panel );
fillPanel( side_panel );

var side_bottom_panel = new LX.Panel();
rbottom.attach( side_bottom_panel );
fillRightBottomPanel( side_bottom_panel );

var bottom_panel = new LX.Panel();
bottom.attach( bottom_panel );
fillBottomPanel( bottom_panel );

function loop() {
    
    var ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = side_panel.getValue('Font size') + "px Monospace";

    // Get values from panel widgets (e.g. color value)
    ctx.fillStyle = side_panel.getValue('Background');

    const pos_2d = side_panel.getValue('2D Position');
    ctx.fillText("This is a 2d canvas", pos_2d[0], pos_2d[1]);
    ctx.fillText("Lexgui.js @jxarco", pos_2d[0] + 6, pos_2d[1] + 20);

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// **** **** **** **** **** **** **** **** **** **** **** **** 

function fillPanel( panel ) {
    
    // add data tree

    panel.addTree("Scene Tree", scene_data, { 
        onselect: (name) => {  },
        ondblclick: (name) => {  },
        onchange: (event) => { 
            console.log(event.string());

            switch(event.type) {
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
    panel.branch("Preferences", {icon: LX.icons.GEAR});
    panel.addColor("Background", [1, 0.1, 0.6], (value, event) => {
        console.log("Color: ", value);
    });
    panel.addText("Extensions", "", null, {placeholder: "e.g. ColorPicker"});
    panel.addText(null, "This has a console.log callback", (value, event) => {
        console.log(value);
    });
    panel.addButton(null, "Apply changes");
    panel.addButton("Apply", "Print event", event => {
        console.log(event);
    });
    panel.merge();

    // another branch
    panel.branch("Other things");
    panel.addCombo("Pages", ["Federico", "Garcia", "Lorca"], "Garcia", (value, event) => {
        console.log(value);
    });
    panel.addNumber("Font size", 12, (value, event) => {
        console.log(value);
    }, { min: 1, max: 24 });
    panel.addVector2("2D Position", [74, 60], (value, event) => {
        console.log(value);
    }, { min: 0, max: 256 });
    panel.addVector3("Velocity", [0.1, 0.4, 0.5], (value, event) => {
        console.log(value);
    });
    panel.addVector4("Shader color", [0.3, 0.3, 0.5, 1], (value, event) => {
        console.log(value);
    });
    panel.separate();
    panel.addTitle("Configuration");
    panel.addCheckbox("Enable", true, (value, event) => {
        console.log(value);
    });
    panel.addCheckbox("This is disabled", false, null, {disabled: true});
    panel.end();
}

function fillRightBottomPanel( panel ) {
    
    panel.branch("No resize area", {icon: LX.icons.TABS});
    panel.tabs([
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
    panel.addCheckbox("Post TABS", true, (value, event) => {
        console.log(value);
    });
    panel.end();
}


function fillBottomPanel( panel ) {
    
    // add widgets to panel branch
    panel.branch("Information", {icon: LX.icons.INFO});
    panel.addText("Camera", "Canon EOS 80D", null, {disabled: true}); 
    panel.addText("Serial number", "194E283DD", (value, event) => {
        console.log(value);
    });
    panel.merge();

    panel.branch("A collapsed branch", {closed: true});
    panel.addText(null, "Nothing here", null, {disabled: true});
    panel.end();
}






