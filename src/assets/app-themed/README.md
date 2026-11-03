# Material App Artwork

Generated from `../app-art` by:

```sh
node scripts/build-themed-icons.mjs
```

Vector paths and gradients use local `--ap-logo-*` Material colour roles instead
of their source pigments. Mask and clipping geometry retain their coverage.
The four source files containing raster images use separate white alpha masks
with theme-coloured rectangles, so they do not need grayscale or blend filters.

`__AP_ICON_ID__` is replaced with a unique React instance prefix before rendering.
The generated files are trusted local assets; custom website icons never enter
the inline-SVG markup path. Original brand artwork remains unmodified in
`../app-art` for the Original and Color Tile modes.