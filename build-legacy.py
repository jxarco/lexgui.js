import sys

def modify_js_file(input_file, output_file, lines_above, lines_below, remove_top=0, remove_bottom=0):
    try:
        with open(input_file, "r", encoding="utf-8") as file:
            original_lines = file.readlines()

        modified_lines = original_lines[remove_top:]
        if remove_bottom > 0:
            modified_lines = modified_lines[:-remove_bottom] if len(modified_lines) > remove_bottom else []

        modified_content = "\n".join(lines_above) + "\n" + "".join(modified_lines) + "\n" + "\n".join(lines_below)

        with open(output_file, "w", encoding="utf-8") as file:
            file.write(modified_content)

        print(f"File '{output_file}' created successfully!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    input_js = "build/lexgui.module.js"
    output_js = "build/lexgui.js"

    lines_above = [
        "\'use strict';",
        "",
        "console.warn( 'Script _build/lexgui.js_ is depracated and will be removed soon. Please use ES Modules or alternatives: https://jxarco.github.io/lexgui.js/docs/' );",
        "",
        "// Lexgui.js @jxarco",
        "",
        "(function(global){",
        ""
    ]

    lines_below = [
        "})( typeof(window) != 'undefined' ? window : (typeof(self) != 'undefined' ? self : global ) );"
    ]

    remove_top = 4
    remove_bottom = 2

    modify_js_file(input_js, output_js, lines_above, lines_below, remove_top, remove_bottom)