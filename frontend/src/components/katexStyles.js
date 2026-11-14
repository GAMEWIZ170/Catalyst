// Only the KaTeX stylesheet, in a file of its own. RichText loads it with import(). Keeping it separate matters:
// when it sat next to the KaTeX script in one dynamic import, the build put both in one chunk, so loading the
// stylesheet also downloaded the 80 KB script, even for formulas the server had already drawn.
import "katex/dist/katex.min.css";
