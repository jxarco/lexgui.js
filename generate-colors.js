import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname( fileURLToPath( import.meta.url ) );
const colors = JSON.parse( fs.readFileSync( path.join( __dirname, "./registry/colors.json" ), "utf8" ) );

// CSS Variables

let css = "/* This is a generated file, do not modify (colors.css) */\n:root {\n";

for( const key in colors )
{
    const value = colors[ key ];

    if( Array.isArray( value ) )
    {
        // case: slate[ {scale:50, hex:"#..."} ]
        css += ` `;
        value.forEach(entry => {
            css += ` --${ key }-${ entry.scale }: ${ entry.hex };`;
        });
        css += `\n`;
    }
    else
    {
        // case: black.hex
        css += `  --${ key }: ${ value.hex };\n`;
    }
}

css += "}\n\n";

// Utility classes

for( const key in colors )
{
    const value = colors[ key ];

    if( Array.isArray( value ) )
    {
        // case: slate[ {scale:50, hex:"#..."} ]
        value.forEach(entry => {
            css += `.bg-${ key }-${ entry.scale } { --background-color: var(--${ key }-${ entry.scale }); background-color: var(--background-color) !important }`;
            css += `.fg-${ key }-${ entry.scale } { color: var(--${ key }-${ entry.scale }) !important }`;
        });
        css += `\n`;
    }
    else
    {
        // case: black.hex
        css += `.bg-${ key } { --background-color: var(--${ key }); background-color: var(--background-color) !important }`;
        css += `.fg-${ key } { color: var(--${ key }) !important }\n`;
    }
}

fs.writeFileSync("css/colors.css", css);
console.log("✔ colors.css generated");
