// init library and get main area
let area = LX.init({ skip_default_area: true });

const pocket_dialog = new LX.PocketDialog("Load Settings", p => {
    p.addColor("Background", "#b7a9b1");
    p.addText("Text", "Pocket Dialog Lexgui.js @jxarco", null, {placeholder: "e.g. ColorPicker", icon: "fa fa-font"});
    p.addColor("Font Color", [1, 0.1, 0.6], (value, event) => {
        console.log("Font Color: ", value);
    });
    p.addNumber("Font Size", 36, (value, event) => {
        console.log(value);
    }, { min: 1, max: 48, step: 1});
    p.addVector2("2D Position", [250, 350], (value, event) => {
        console.log(value);
    }, { min: 0, max: 1024 });
});

// add canvas to left upper part
var canvas = document.createElement('canvas');
canvas.id = "mycanvas";
canvas.width = window.innerWidth;
canvas.height = window.innerHeight
canvas.style.width = "100%";
canvas.style.height = "100%";
document.body.appendChild( canvas );

function loop(dt) {
    
    var ctx = canvas.getContext("2d");

    // Get values from panel widgets (e.g. color value)
    ctx.fillStyle = pocket_dialog.panel.getValue('Background');

    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = pocket_dialog.panel.getValue('Font Size') + "px Monospace";

    ctx.fillStyle = pocket_dialog.panel.getValue('Font Color');

    const text = pocket_dialog.panel.getValue('Text');
    const pos_2d = pocket_dialog.panel.getValue('2D Position');
    ctx.fillText(text, pos_2d[0] + 6, pos_2d[1] + 48);

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
