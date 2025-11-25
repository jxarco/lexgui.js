export declare class vec2 {
    x: number;
    y: number;
    constructor(x?: number, y?: number);
    get xy(): number[];
    get yx(): number[];
    set(x: number, y: number): void;
    add(v: vec2, v0?: vec2): vec2;
    sub(v: vec2, v0?: vec2): vec2;
    mul(v: number | vec2, v0?: vec2): vec2;
    div(v: vec2, v0?: vec2): vec2;
    abs(v0?: vec2): vec2;
    dot(v: vec2): number;
    len2(): number;
    len(): number;
    nrm(v0?: vec2): vec2;
    dst(v: vec2): number;
    clp(min: number, max: number, v0?: vec2): vec2;
    fromArray(array: number[]): void;
    toArray(): number[];
}
