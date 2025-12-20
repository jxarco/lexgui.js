// Avatar.ts @jxarco

import { LX } from './../core/Namespace';

interface AvatarDesc
{
    className?: string;
    imgSource?: string;
    imgAlt?: string;
    imgClass?: string;
    fallback?: string;
    fallbackClass?: string;
}

export class Avatar
{
    root: HTMLElement;
    imageElement: HTMLImageElement | undefined = undefined;
    fallbackElement: string | undefined = undefined;

    constructor( desc: AvatarDesc )
    {
        let rootCn = 'lexavatar bg-card items-center flex flex-row relative size-8 shrink-0 overflow-hidden rounded-full';
        this.root = LX.makeElement( 'div' );

        if ( desc.imgSource )
        {
            const cn = 'aspect-square size-full object-cover';
            const img = LX.makeElement( 'img', desc.imgClass ? LX.twMerge( ...cn.split( ' ' ), ...desc.imgClass.split( ' ' ) ) : cn, '', this.root );
            img.src = desc.imgSource;
            img.alt = desc.imgAlt;
            this.imageElement = img;
        }
        else if ( desc.fallback )
        {
            const cn = 'size-full text-sm font-semibold place-self-center text-center content-center';
            const span = LX.makeElement( 'span', desc.fallbackClass ? LX.twMerge( ...cn.split( ' ' ), ...desc.fallbackClass.split( ' ' ) ) : cn,
                desc.fallback, this.root );
            this.fallbackElement = span;
            rootCn += ' border-color';
        }

        this.root.className = desc.className ? LX.twMerge( ...rootCn.split( ' ' ), ...desc.className.split( ' ' ) ) : rootCn;
    }
}

LX.Avatar = Avatar;
