# pixelographer-3D

A browser-based web application (with no backend) that transforms images into pixelated 3D models, which can be printed in multicolor using a FDM printer.

# How it works

The web application allows users to upload an image, scale it, and reduce its colors to a customizable palette using dithering algorithms.
Each pixel is rendered at different height according to its color, resulting in a downloadable 3D model in STL format.
With a 3D FDM printer ,you can slice the model, set the manual or automatic color changes in the slicer, making it ready for printing!

# Usage

This application is hosted on this repository github page: https://digemall.github.io/pixelographer-3D/

# Instructions

- Upload an image
- Play with scale and dithering settings
- Play with 3D model settings and download the STL

See the following picture for an "animated" example:

![Instructions](imgs/instructions.gif?raw=true "Instructions")

# Credits

Many thanks to the creator of the following libraries:
- [image-quantization](https://github.com/ibezkrovnyi/image-quantization)
- [babylon.js](https://github.com/BabylonJS/Babylon.js)
- [beerc.ss](https://github.com/beercss/beercss)
- [alpine.js](https://github.com/alpinejs/alpine)