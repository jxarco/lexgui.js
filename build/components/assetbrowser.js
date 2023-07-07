(function(global){

    if(!global.LX) {
        throw("lexgui.js missing!");
    }

    LX.components.push( 'AssetBrowser' );

    /**
     * @class AssetBrowser
     * @description Asset container with Tree for file system
     */

    class AssetBrowser {

        /**
         * @param {object} options
         */
        constructor( options = {} ) {

            let div = document.createElement('div');
            div.className = 'lextimeline';
            this.root = div;

            let area = new LX.Area({height: "100%"});
            area.split({ type: "horizontal", sizes: ["20%", "80%"]});
            let [left, right] = area.sections;
            
            this.#create_left_panel(left);
            
            div.appendChild(area.root);

            // this.canvas.addEventListener("mousedown", this.processMouse.bind(this));
            // this.canvas.addEventListener("mouseup", this.processMouse.bind(this));
            // this.canvas.addEventListener("mousemove", this.processMouse.bind(this));
            // this.canvas.addEventListener("wheel", this.processMouse.bind(this));
            // this.canvas.addEventListener("dblclick", this.processMouse.bind(this));
            // this.canvas.addEventListener("contextmenu", this.processMouse.bind(this));

            right.onresize = bounding => {
                
            }
        }

        /**
        * @method updateLeftPanel
        */

        #create_left_panel(area) {

            if(this.leftPanel)
                this.leftPanel.clear();
            else {
                this.leftPanel = area.addPanel({className: 'lexassetbrowserpanel'});
                
            }

            let panel = this.leftPanel;
            panel.addTitle("Tracks", { height: "24px"});

            let items = {'id': '', 'children': []};

            let t = {
                'id': "root",
                'skipVisibility': true,
                'children': []
            }
            items.children.push(t);
            panel.addTree(null, t, {filter: false, rename: false, draggable: false, onevent: (e) => {
                switch(e.type) {
                    case LX.TreeEvent.NODE_SELECTED:
                        break;
                    case LX.TreeEvent.NODE_VISIBILITY:    
                        break;
                    case LX.TreeEvent.NODE_CARETCHANGED:    
                        break;
                }
            }});
        }

        processMouse() {

        }
    }

    LX.AssetBrowser = AssetBrowser;

})( typeof(window) != "undefined" ? window : (typeof(self) != "undefined" ? self : global ) );