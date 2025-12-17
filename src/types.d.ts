declare module '*.css'
{
    const content: { [className: string]: string; };
    export default content;
}

declare module "https://cdn.jsdelivr.net/npm/tailwind-merge@3.4.0/+esm" {
  export function twMerge(...classes: string[]): string;
}
