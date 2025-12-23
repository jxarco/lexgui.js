interface AvatarDesc {
    className?: string;
    imgSource?: string;
    imgAlt?: string;
    imgClass?: string;
    fallback?: string;
    fallbackClass?: string;
}
export declare class Avatar {
    root: HTMLElement;
    imageElement: HTMLImageElement | undefined;
    fallbackElement: string | undefined;
    constructor(desc: AvatarDesc);
}
export {};
