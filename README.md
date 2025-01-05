# pixelographer-3D

A browser-based web application (with no backend) that transforms images into pixelated 3D models, which can be printed in multicolor using a FDM printer.

# How it works

With this web application you can upload an image, scale it, and reduce its colors to a customizable palette using dithering algorithms.  
Each pixel is rendered in 3D at different height according to its color, resulting in a downloadable 3D model in STL format.  

# Usage

This application is hosted on this repository github page: https://digemall.github.io/pixelographer-3D/

# Instructions

- Upload an image
- Play with scale and dithering settings
- Play with 3D model settings and download the STL

See the following picture for an "animated" example:

![Instructions](imgs/instructions.gif?raw=true "Instructions")

## Model Slicing

Slice the STL file as usual in your slicer and then set the layer heights where color changes should happen as indicated in the application.  

Automatic filament switching units are not strictly necessary; the models are designed to work well with manual changes, since each layer has a single color. 

See the following gif for an example in prusa-slicer 2.9:

![Instructions](imgs/colors_in_slicer.gif?raw=true "Instructions")


# Credits

Many thanks to the creators of the following libraries:
- [image-quantization](https://github.com/ibezkrovnyi/image-quantization)
- [babylon.js](https://github.com/BabylonJS/Babylon.js)
- [beerc.ss](https://github.com/beercss/beercss)
- [alpine.js](https://github.com/alpinejs/alpine)