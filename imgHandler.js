// example of quantization using this library:
// https://github.com/ibezkrovnyi/image-quantization
import {
    utils,
    image,
    distance
} from "https://cdn.jsdelivr.net/npm/image-q@4.0.0/dist/esm/image-q.mjs";

import * as Utils from "./utils.js";

export function createImgObjURLOrNull(file) {
    if (!file) {
        return null;
    }
    return URL.createObjectURL(file);
}

async function getImgBitmapFromDOMImg(img) {
    let canvas = document.createElement("canvas");
    let context = canvas.getContext("2d");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    context.drawImage(img, 0, 0);
    let imgData = context.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
    const bitmap = await createImageBitmap(imgData);
    return bitmap;
}

export async function loadImgBitmapFromURL(url) {
    if (!url) {
        return null;
    }
    const img = new Image();
    await new Promise((resolve, reject) => {
        img.addEventListener("load", () => {
            resolve();
        });

        img.addEventListener("error", (err) => {
            reject(err);
        });
        img.src = url;
    })
    return getImgBitmapFromDOMImg(img);
}

function getDistanceCalculator(opts) {
    switch (opts.colorDistCalc) {
        case "cie94-graphic-arts":
            return new distance.CIE94GraphicArts();
        case "cie94-textiles":
            return new distance.CIE94Textiles();
        case "ciede2000":
            return new distance.CIEDE2000();
        case "color-metric":
            return new distance.CMetric();
        case "euclidean":
            return new distance.Euclidean();
        case "euclidean-bt709":
            return new distance.EuclideanBT709();
        case "euclidean-bt709-noalpha":
            return new distance.EuclideanBT709NoAlpha();
        case "manhattan":
            return new distance.Manhattan();
        case "manhattan-bt709":
            return new distance.ManhattanBT709();
        case "manhattan-nommyde":
            return new distance.ManhattanNommyde();
        case "pngquant":
            return new distance.PNGQuant();
        default:
            throw new Error(`Unknown colorDistanceFormula ${opts.colorDistCalc}`);
    }
}

function getImgQuantizer(opts, distanceCalculator) {
    const arrayDiffusionAlgos = {
        "atkinson": image.ErrorDiffusionArrayKernel.Atkinson,
        "floyd-steinberg": image.ErrorDiffusionArrayKernel.FloydSteinberg,
        "false-floyd-steinberg": image.ErrorDiffusionArrayKernel.FalseFloydSteinberg,
        "stucki": image.ErrorDiffusionArrayKernel.Stucki,
        "jarvis": image.ErrorDiffusionArrayKernel.Jarvis,
        "burkes": image.ErrorDiffusionArrayKernel.Burkes,
        "sierra": image.ErrorDiffusionArrayKernel.Sierra,
        "two-sierra": image.ErrorDiffusionArrayKernel.TwoSierra,
        "sierra-lite": image.ErrorDiffusionArrayKernel.SierraLite,
    }
    const args = opts.imgQuantAlgoPars;
    if (opts.imgQuantAlgo in arrayDiffusionAlgos) {
        let kernel = arrayDiffusionAlgos[opts.imgQuantAlgo]
        return new image.ErrorDiffusionArray(distanceCalculator, kernel, args.serpentine, args.minimumColorDistanceToDither / 100, args.calculateErrorLikeGIMP)
    }
    if (opts.imgQuantAlgo == "nearest") {
        return new image.NearestColor(distanceCalculator)
    }
    if (opts.imgQuantAlgo == "riemersma") {
        return new image.ErrorDiffusionRiemersma(distanceCalculator, args.errorQueueSize, args.errorPropagation);
    }
    throw new Error(`Unknown image quantization algo: ${opts.imgQuantAlgo}`)
}

export async function showModifImg(canvasDrawer, origImg, opts) {
    // resize image
    let scaledImgData = scaleImgBitmapAndGetImgData(origImg, opts.modifWidth, opts.modifHeight);
    let pointCont = await utils.PointContainer.fromImageData(scaledImgData);
    // fill palette
    let palette = new utils.Palette();
    opts.palette.forEach((c) => palette.add(hexColorToPoint(c)));
    const distanceCalculator = getDistanceCalculator(opts)
    const imageQuantizer = getImgQuantizer(opts, distanceCalculator);
    // perform quantization & dithering
    const outPointCont = imageQuantizer.quantizeSync(pointCont, palette);
    let bitmap = await pointContainerToImgBitmap(outPointCont);
    Utils.promiseSetTimeout(() => canvasDrawer.setImageBitmap(bitmap), 50);
    return outPointCont;
}

export function clearModifImg(canvasDrawer) {
    canvasDrawer.setImageBitmap(null);
}

export function computeWH(origW, origH, newSizeType, newSizeVal) {
    let ratio = origW / origH;
    let newVal = Math.round(newSizeVal);
    let retVal = {};
    if (newSizeType == "width") {
        retVal.w = newVal;
        retVal.h = Math.round(newVal / ratio);
    } else {
        retVal.h = newVal;
        retVal.w = Math.round(newVal * ratio);
    }
    return retVal;
}

export function limitWH(origW, origH, maxVal) {
    if (origW < maxVal && origH < maxVal) {
        return { w: origW, h: origH };
    }
    let scaleOn = origW > origH ? "width" : "height";
    return computeWH(origW, origH, scaleOn, maxVal);
}


export const distanceMethods = [
    "euclidean",
    "euclidean-bt709",
    "euclidean-bt709-noalpha",
    "cie94-graphic-arts",
    "cie94-textiles",
    "ciede2000",
    "color-metric",
    "manhattan",
    "manhattan-bt709",
    "manhattan-nommyde",
    "pngquant"
]

const ditherArrayArgs = {
    serpentine: { type: "bool", default: true, caption: "Serpentine" },
    minimumColorDistanceToDither: { type: "numrange", min: 0, max: 100, default: 0, caption: "Min.color distance to dither" },
    calculateErrorLikeGIMP: { type: "bool", default: false, caption: "Calculate error like GIMP" }
};

export const imgQuantizationsMap = {
    "atkinson": ditherArrayArgs,
    "floyd-steinberg": ditherArrayArgs,
    "false-floyd-steinberg": ditherArrayArgs,
    "stucki": ditherArrayArgs,
    "jarvis": ditherArrayArgs,
    "burkes": ditherArrayArgs,
    "sierra": ditherArrayArgs,
    "two-sierra": ditherArrayArgs,
    "sierra-lite": ditherArrayArgs,
    "nearest": {},
    "riemersma": {
        errorQueueSize: { type: "num", default: 16, caption: "Error queue size" },
        errorPropagation: { type: "num", default: 1, caption: "Error propagation" }
    },
};


function hexColorToPoint(hex) {
    // expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
        return r + r + g + g + b + b;
    });

    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    let r = parseInt(result[1], 16);
    let g = parseInt(result[2], 16);
    let b = parseInt(result[3], 16);
    return utils.Point.createByRGBA(r, g, b, 255);
}

async function pointContainerToImgBitmap(pointContainer) {
    let ui8ca = new Uint8ClampedArray(pointContainer.toUint8Array());
    const imgBitmap = await createImageBitmap(
        new ImageData(ui8ca, pointContainer.getWidth(), pointContainer.getHeight())
    );
    return imgBitmap;
}

function scaleImgBitmapAndGetImgData(imgBitmap, tW, tH) {
    const canvas = document.createElement("canvas");
    let sW = imgBitmap.width;
    let sH = imgBitmap.height;
    canvas.width = tW;
    canvas.height = tH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgBitmap, 0, 0, sW, sH, 0, 0, tW, tH);
    let scaledImgData = ctx.getImageData(0, 0, tW, tH);
    return scaledImgData;
}

async function scalePointContainer(pointContainer, tW, tH) {
    const imgBitmap = await pointContainerToImgBitmap(pointContainer);
    const canvas = document.createElement("canvas");
    let sW = imgBitmap.width;
    let sH = imgBitmap.height;
    canvas.width = tW;
    canvas.height = tH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgBitmap, 0, 0, sW, sH, 0, 0, tW, tH);
    let scaledPointCont = await utils.PointContainer.fromHTMLCanvasElement(canvas);
    return scaledPointCont;
}

export class ImgWrap {
    constructor(pointCont) {
        this._pointCont = pointCont;
        this._height = this._pointCont.getHeight();
        this._width = this._pointCont.getWidth();
        this._pointArr = this._pointCont.getPointArray();
    }
    getWidth() {
        return this._width;
    }
    getHeight() {
        return this._height;
    }
    // return an object with r,g,b and uint32 properties
    getPixelColor(x, y) {
        let idx = y * this._width + x;
        return this._pointArr[idx];
    }
}

export function hexPaletteToPointPalette(hexPalette) {
    return hexPalette.map(c => hexColorToPoint(c))
}