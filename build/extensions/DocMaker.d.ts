export declare class DocMaker {
    root: Element;
    _listQueued: Element | undefined;
    _lastDomTarget: Element | undefined;
    constructor(element?: Element);
    setDomTarget(element: Element): void;
    lineBreak(target?: Element): void;
    header(string: string, type: string, id: string, options?: any): any;
    paragraph(string: string, sup?: boolean, className?: string): HTMLElement | HTMLParagraphElement;
    code(text: string, language?: string): HTMLDivElement;
    list(list: any[], type: string, target?: Element, className?: string): HTMLUListElement | undefined;
    bulletList(list: any[]): HTMLUListElement | undefined;
    numberedList(list: any[]): HTMLUListElement | undefined;
    startCodeBulletList(): HTMLUListElement;
    endCodeBulletList(): void;
    codeListItem(item: any, target?: Element): void;
    codeBulletList(list: any[], target?: Element): HTMLUListElement;
    image(src: string, caption?: string, parent?: Element, className?: string): HTMLImageElement;
    images(sources: string[], captions?: string[], width?: string, height?: string): HTMLElement;
    video(src: string, caption?: string, controls?: boolean, autoplay?: boolean, className?: string): any;
    note(text: string, warning?: boolean, title?: string, icon?: string, className?: string): any;
    classCtor(name: string, params: any[], language?: string): HTMLParagraphElement;
    classMethod(name: string, desc: string, params: any[], ret?: string): HTMLElement | null;
    iLink(text: string, href: string): string;
    iPage(text: string, page: string): string | undefined;
    iCode(text: string, codeClass?: string): string;
    _copySnippet(b: any): void;
}
