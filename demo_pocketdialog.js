// init library and get main area
let area = LX.init({ skip_default_area: true });

const pocket_dialog = new LX.PocketDialog("Load Settings", p => {
    p.addDropdown("Type", ['text', 'buffer', 'bin', 'url'], "text", v => console.log(v) );
    p.addButton(null, "Reload", v => console.log("Clicked!") );
});

