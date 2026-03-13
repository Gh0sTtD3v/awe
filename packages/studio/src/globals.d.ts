// CSS modules
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// Static asset imports (resolved by bundler)
declare module "*.svg" {
  const value: string | { src: string; width: number; height: number };
  export default value;
}

declare module "*.png" {
  const value: string | { src: string; width: number; height: number };
  export default value;
}