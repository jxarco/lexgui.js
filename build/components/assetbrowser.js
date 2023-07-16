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
                        title: "Play",
                        icon: "fa-solid fa-play",
                        callback:  (domEl) => { 
                            console.log("play!"); 
                            domEl.classList.toggle('fa-play'), domEl.classList.toggle('fa-stop');
                        }
                    },
                    {
                        title: "Refresh",
                        icon: "fa-solid fa-arrows-rotate",
                        callback:  (domEl) => { this.#refresh_content(); }
                    }
                ]);
            } );

            this.data = [
                {
                    name: "color.png",
                    type: "Image",
                    src: "https://godotengine.org/assets/press/icon_color.png"
                },
                {
                    name: "monochrome_light.png",
                    type: "Image",
                    src: "https://godotengine.org/assets/press/icon_monochrome_light.png"
                },
                {
                    name: "example.png",
                    type: "Image",
                    path: "../images/godot_pixelart.png"
                },
                {
                    name: "vertical_color.png",
                    type: "Image",
                    src: "https://godotengine.org/assets/press/logo_vertical_color_dark.png"
                }
            ];

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

            this.#refresh_content();
        }

        #refresh_content(search_value = "", filter = "None") {

            this.filter = filter ?? this.filter;
            this.search_value = search_value ?? this.search_value;

            this.content.innerHTML = "";
            let that = this;

            const add_item = function(item) {

                let itemEl = document.createElement('li');
                itemEl.className = "lexassetitem";
                itemEl.title = item.type + ": " + item.name;
                that.content.appendChild(itemEl);

                let title = document.createElement('span');
                title.className = "lexassettitle";
                title.innerText = item.name;
                itemEl.appendChild(title);

                let preview = document.createElement('img');
                preview.src = item.src;
                itemEl.appendChild(preview);

                let info = document.createElement('span');
                info.className = "lexassetinfo";
                info.innerText = item.type;
                itemEl.appendChild(info);

                itemEl.addEventListener('click', function() {
                    that.content.querySelectorAll('.lexassetitem').forEach( i => i.classList.remove('selected') );
                    this.classList.add('selected');
                });

                itemEl.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    LX.addContextMenu( item.type, e, m => {
                        m.add("Rename");
                        m.add("Clone");
                        m.add("Properties");
                        m.add("");
                        m.add("Delete");
                    });
                });
            }

            const fr = new FileReader();

            for( let item of this.data )
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
                    add_item( item );
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
                        type = "Image";
                        break;
                    }

                    this.data.push({
                        "name": file.name,
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