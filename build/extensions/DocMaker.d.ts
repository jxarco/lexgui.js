export declare class DocMaker {
    root: Element;
    _listQueued: Element | undefined;
    constructor(element?: Element);
    setDomTarget(element: Element): void;
    lineBreak(target?: Element): void;
    header(string: string, type: string, id: string): void;
    paragraph(string: string, sup?: boolean, className?: string): void;
    code(text: string, language?: string): void;
    list(list: any[], type: string, target?: Element): void;
    bulletList(list: any[]): void;
    numberedList(list: any[]): void;
    startCodeBulletList(): void;
    endCodeBulletList(): void;
    codeListItem(item: any, target?: Element): void;
    codeBulletList(list: any[], target?: Element): void;
    image(src: string, caption?: string, parent?: Element): void;
    images(sources: string[], captions?: string[], width?: string, height?: string): void;
    video(src: string, caption?: string, controls?: boolean, autoplay?: boolean): void;
    note(text: string, warning?: boolean, title?: string, icon?: string): void;
    classCtor(name: string, params: any[], language?: string): void;
    classMethod(name: string, desc: string, params: any[], ret?: string): void;
    iLink(text: string, href: string): string;
    iPage(text: string, page: string): string | undefined;
    iCode(text: string, codeClass?: string): string;
    _copySnippet(b: any): void;
}
