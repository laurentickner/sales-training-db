// Text-imported assets — wrangler's Text-type rules return strings at runtime.
declare module "*.html" {
  const content: string;
  export default content;
}

declare module "*/coach.js" {
  const content: string;
  export default content;
}
