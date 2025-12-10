// Spinner.ts @jxarco

import { LX } from './../core/Namespace';

/**
 * @class Spinner
 */

export class Spinner
{
    root: HTMLElement;

    constructor( options: any = {} )
    {
        const icon = options.icon ?? 'LoaderCircle';
        const size = options.size ?? 'md';
        const iconClass = `flex ${options.iconClass ?? ''}`.trim();
        const svgClass = `animate-spin ${size} ${options.svgClass ?? ''}`.trim();

        this.root = LX.makeIcon( icon, { iconClass, svgClass } );
    }

    html()
    {
        return this.root.innerHTML;
    }

    destroy()
    {
        this.root.remove();
    }
}

LX.Spinner = Spinner;
