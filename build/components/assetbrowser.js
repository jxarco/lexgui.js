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
            div.className = 'lexassetbrowser';
            this.root = div;

            let area = new LX.Area();
            div.appendChild(area.root);

            area.split({ type: "horizontal", sizes: ["20%", "80%"]});
            let [left, right] = area.sections;

            left.addMenubar( m => {

                m.add("Content");

                m.addButtons( [
                    {
                        icon: "fa-solid fa-left-long",
                        callback:  (domEl) => { 
                            if(!this.prev_data.length) return;
                            this.next_data.push( this.current_data );
                            this.current_data = this.prev_data.pop();
                            this.#refresh_content();
                        }
                    },
                    {
                        icon: "fa-solid fa-right-long",
                        callback:  (domEl) => { 
                            if(!this.next_data.length) return;
                            this.prev_data.push( this.current_data );
                            this.current_data = this.next_data.pop();
                            this.#refresh_content();
                        }
                    },
                    {
                        title: "Refresh",
                        icon: "fa-solid fa-arrows-rotate",
                        callback:  (domEl) => { this.#refresh_content(); }
                    }
                ]);
            } );

            this.prev_data = [];
            this.next_data = [];
            this.data = [
                {
                    id: "color.png",
                    type: "image",
                    src: "https://godotengine.org/assets/press/icon_color.png"
                },
                {
                    id: "godot",
                    type: "folder",
                    closed: true,
                    children: [
                        {
                            id: "color.png",
                            type: "image",
                            src: "https://godotengine.org/assets/press/icon_color.png"
                        },
                        {
                            id: "monochrome_light.png",
                            type: "image",
                            src: "https://godotengine.org/assets/press/icon_monochrome_light.png"
                        },
                        {
                            id: "example.png",
                            type: "image",
                            src: "../images/godot_pixelart.png"
                        },
                        {
                            id: "vertical_color.png",
                            type: "image",
                            src: "https://godotengine.org/assets/press/logo_vertical_color_dark.png"
                        }
                    ]
                },
                {
                    id: "monochrome_light.png",
                    type: "image",
                    src: "https://godotengine.org/assets/press/icon_monochrome_light.png"
                },
                {
                    id: "example.png",
                    type: "image",
                    src: "../images/godot_pixelart.png"
                },
                {
                    id: "vertical_color.png",
                    type: "image",
                    src: "https://godotengine.org/assets/press/logo_vertical_color_dark.png"
                }
            ];

            this.current_data = this.data;

            this.#create_left_panel(left);
            this.#create_right_panel(right);
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

            // Process data to show in tree
            let tree_data = {
                id: 'root',
                children: this.data
            }

            this.leftPanel.addTree("Content Browser", tree_data, { 
                // icons: tree_icons, 
                filter: false,
                onevent: (event) => { 
                    switch(event.type) {
                        case LX.TreeEvent.NODE_SELECTED: 
                            if(!event.multiple)
                                event.node.domEl.click();
                            break;
                        case LX.TreeEvent.NODE_DBLCLICKED: 
                            console.log(event.node.id + " dbl clicked"); 
                            break;
                        case LX.TreeEvent.NODE_DRAGGED: 
                            console.log(event.node.id + " is now child of " + event.value.id); 
                            break;
                        case LX.TreeEvent.NODE_RENAMED:
                            console.log(event.node.id + " is now called " + event.value); 
                            break;
                        // case LX.TreeEvent.NODE_VISIBILITY:
                        //     console.log(event.node.id + " visibility: " + event.value); 
                        //     break;
                    }
                },
            });    
        }

        #create_right_panel(area) {

            if(this.rightPanel)
                this.rightPanel.clear();
            else {
                this.rightPanel = area.addPanel({className: 'lexassetcontentpanel'});
            }

            this.rightPanel.sameLine();
            this.rightPanel.addDropdown("Filter", ["None", "Image", "Mesh", "JSON"], "None", (v) => this.#refresh_content.call(this, null, v), { width: "20%" });
            this.rightPanel.addText(null, this.search_value ?? "", (v) => this.#refresh_content.call(this, v, null), { placeholder: "Search assets..." });
            this.rightPanel.endLine();

            this.content = document.createElement('ul');
            this.content.className = "lexassetscontent";
            this.rightPanel.root.appendChild(this.content);

            this.content.addEventListener('dragenter', function(e) {
                e.preventDefault();
                this.classList.add('dragging');
            });
            this.content.addEventListener('dragleave', function(e) {
                e.preventDefault();
                this.classList.remove('dragging');
            });
            this.content.addEventListener('drop', (e) => {
                e.preventDefault();
                this.#process_drop(e);
            });
            this.content.addEventListener('click', function() {
                this.querySelectorAll('.lexassetitem').forEach( i => i.classList.remove('selected') );
            });

            this.#refresh_content();
        }

        #refresh_content(search_value, filter) {

            this.filter = filter ?? (this.filter ?? "None");
            this.search_value = search_value ?? (this.search_value ?? "");
            this.content.innerHTML = "";
            let that = this;

            const add_item = function(item) {

                const type = item.type.charAt(0).toUpperCase() + item.type.slice(1);
                const is_folder = type === "Folder";

                if((that.filter != "None" && type != that.filter) || !item.id.includes(that.search_value))
                    return;

                let itemEl = document.createElement('li');
                itemEl.className = "lexassetitem";
                itemEl.title = type + ": " + item.id;
                itemEl.tabIndex = -1;
                that.content.appendChild(itemEl);

                let title = document.createElement('span');
                title.className = "lexassettitle";
                title.innerText = item.id;
                itemEl.appendChild(title);

                let preview = document.createElement('img');
                preview.src = is_folder ? "../images/folder.png" : item.src;
                itemEl.appendChild(preview);

                if( !is_folder )
                {
                    let info = document.createElement('span');
                    info.className = "lexassetinfo";
                    info.innerText = type;
                    itemEl.appendChild(info);
                }

                itemEl.addEventListener('click', function(e) {
                    e.stopImmediatePropagation();
                    e.stopPropagation();

                    if( !is_folder ) {
                        if(!e.shiftKey)
                            that.content.querySelectorAll('.lexassetitem').forEach( i => i.classList.remove('selected') );
                        this.classList.add('selected');
                    } else {
                        that.prev_data.push( that.current_data );
                        that.current_data = item.children;
                        that.#refresh_content(search_value, filter);
                    }
                });

                itemEl.addEventListener('contextmenu', function(e) {
                    e.preventDefault();

                    const multiple = that.content.querySelectorAll('.selected').length;

                    LX.addContextMenu( multiple > 1 ? (multiple + " selected") : item.type, e, m => {
                        if(!multiple) m.add("Rename");
                        m.add("Clone");
                        if(!multiple) m.add("Properties");
                        m.add("");
                        m.add("Delete");
                    });
                });

                return itemEl;
            }

            const fr = new FileReader();

            for( let item of this.current_data )
            {
                if( item.path )
                {
                    LX.request({ url: item.path, dataType: 'blob', success: (f) => {
                        fr.readAsDataURL( f );
                        fr.onload = e => { 
                            item.src = e.currentTarget.result;
                            delete item.path;
                            this.#refresh_content(search_value, filter);
                        };
                    } });
                }else
                {
                    item.domEl = add_item( item );
                }
            }
        }

        #process_drop(e) {

            const fr = new FileReader();
            const num_files = e.dataTransfer.files.length;

            for( let i = 0; i < e.dataTransfer.files.length; ++i )
            {
                const file = e.dataTransfer.files[i];
                fr.readAsDataURL( file );
                fr.onload = e => { 
                    
                    let ext = file.name.substr(file.name.lastIndexOf('.') + 1).toLowerCase();
                    let type = 'Resource';

                    switch(ext)
                    {
                    case 'png':
                    case 'jpg':
                        type = "image";
                        break;
                    }

                    this.current_data.push({
                        "id": file.name,
                        "src": e.currentTarget.result,
                        "extension": ext,
                        "type": type
                    });
                    
                    if(i == (num_files - 1))
                    this.#refresh_content(this.search_value, this.filter);
                };
            }
        }
    }

    LX.AssetBrowser = AssetBrowser;

})( typeof(window) != "undefined" ? window : (typeof(self) != "undefined" ? self : global ) );