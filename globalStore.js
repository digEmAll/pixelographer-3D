import Alpine from "https://cdn.jsdelivr.net/npm/alpinejs@3.14.3/+esm";
import * as ImgHandler from "./imgHandler.js";
import { CanvasDrawer } from "./canvasDrawer.js";
import * as Utils from "./utils.js";
import * as Model3D from "./model3d.js";

const INITIAL_MAX_WH = 400;
const INITIAL_PALETTE = ["#000000", "#cc0002", "#0f52ba", "#f7c500", "#ffc6a9", "#fffbf6"];
const INITIAL_IMG_QUANT_ALGO = Object.keys(ImgHandler.imgQuantizationsMap)[0];
const INITIAL_DISTANCE_CALC = ImgHandler.distanceMethods[0];
const INITIAL_PIXEL_SIZE = 1.4;
const INITIAL_FIRST_LAYER_HEIGHT = 1.0;
const INITIAL_OTHER_LAYERS_HEIGHT = 0.2;
const INITIAL_PALETTE_SORT_TYPE = 0;


function initGlbStore() {
    Alpine.store("glb", {
        loaded: true,
        wizstep: 0,
        origImg: null,
        modifImg: null,
        loadingDialog: false,
        loadingDialogText: "Loading...",
        errorNotification: false,
        errorNotificationText: "Error",
        timeNotification: false,
        timeNotificationText: "...",
        get step0() {
            return this.wizstep == 0;
        },
        get step1() {
            return this.wizstep == 1;
        },
        get step2() {
            return this.wizstep == 2;
        },
        get originWH() {
            return this.origImg == null ? null : { w: this.origImg.width, h: this.origImg.height }
        },
        showLoadingDialog(text) {
            this.loadingDialogText = text ?? "Loading...";
            this.loadingDialog = true;
        },
        hideLoadingDialog() {
            this.loadingDialog = false;
        },
        showErrorNotification(text) {
            this.errorNotificationText = text ?? "Error";
            this.errorNotification = true;
        },
        showTimeNotification(text, millisec) {
            this.timeNotificationText = text;
            this.timeNotification = true;
            setTimeout(() => {
                this.timeNotification = false;
            }, millisec);
        },
        setStep(step) {
            let prevStep = this.wizstep;
            this.wizstep = step;
            Alpine.store(`step${step}`).enterStep(prevStep)
        },
        inverseColor(col) {
            if (col == null) {
                return null;
            }
            return Utils.invertColor(col);
        },
    })
}

function initStep0Store() {

    const origImgDOM = document.getElementById("img-orig");

    Alpine.store("step0", {
        enterStep(prevStep) {
            Alpine.store("step2").clearModel();
        },
        onChangeImg(evt) {
            const file = evt.target.files?.[0];
            const imgUrl = ImgHandler.createImgObjURLOrNull(file);
            origImgDOM.src = imgUrl;
            ImgHandler.loadImgBitmapFromURL(imgUrl).then(
                (img) => {
                    if (img != null) {
                        let glbStore = Alpine.store("glb");
                        glbStore.origImg = img;
                        glbStore.modifImg = null; // clear modified image
                        Alpine.store("step2").clearModel();
                        glbStore.setStep(1);
                    }
                }
            ).catch(err => {
                Alpine.store("glb").showErrorNotification(`An error occurred loading image`)
                console.error(err);
            });
        },
    })
}

function initStep1Store() {
    const modifImgDOM = document.getElementById("img-modif");
    const canvasDrawer = new CanvasDrawer(modifImgDOM);

    // create initial advanced args for each quantization algo
    const imgQuantAlgoParsByAlgo = {};
    for (let algo in ImgHandler.imgQuantizationsMap) {
        let argsObj = {};
        for (let [argKey, argDef] of Object.entries(ImgHandler.imgQuantizationsMap[algo])) {
            argsObj[argKey] = argDef.default;
        }
        imgQuantAlgoParsByAlgo[algo] = argsObj;
    }

    Alpine.store("step1", {
        needsUpdate: false,
        autoRefresh: true,
        modifWidth: null,
        modifHeight: null,
        palette: [...INITIAL_PALETTE],
        paletteSelectedIdx: -1,
        imgQuantAlgos: [...Object.keys(ImgHandler.imgQuantizationsMap)],
        imgQuantAlgoSelected: INITIAL_IMG_QUANT_ALGO,
        imgQuantAlgoParsByAlgo: imgQuantAlgoParsByAlgo,
        distanceCalcs: [...ImgHandler.distanceMethods],
        distCalcSelected: INITIAL_DISTANCE_CALC,
        get cannotMoveTo() {
            return Alpine.store("glb").origImg == null;
        },
        get sizeInfo() {
            const oImg = Alpine.store("glb").origImg;
            return oImg ? `Original: ${oImg.width} x ${oImg.height}` : "";
        },
        get imgOpts() {
            return {
                modifWidth: this.modifWidth,
                modifHeight: this.modifHeight,
                palette: this.palette,
                colorDistCalc: this.distCalcSelected,
                imgQuantAlgo: this.imgQuantAlgoSelected,
                imgQuantAlgoPars: this.imgQuantAlgoPars
            };
        },
        get selectedPaletteColor() {
            if (this.paletteSelectedIdx < 0) {
                return null;
            }
            return this.palette[this.paletteSelectedIdx];
        },
        get imgQuantAlgoPars() {
            return this.imgQuantAlgoParsByAlgo[this.imgQuantAlgoSelected];
        },
        get imgQuantAlgoNumPars() {
            return this.getImgQuantAlgoSelectedParsOfType("num");
        },
        get imgQuantAlgoNumRangePars() {
            return this.getImgQuantAlgoSelectedParsOfType("numrange");
        },
        get imgQuantAlgoBoolArgs() {
            return this.getImgQuantAlgoSelectedParsOfType("bool");
        },
        autoRefreshChanged(value) {
            this.autoRefresh = value;
            if (value && this.needsUpdate) {
                this.applyImgOptsChanged();
            }
        },
        getImgQuantAlgoSelectedPars() {
            return Object.entries(ImgHandler.imgQuantizationsMap[this.imgQuantAlgoSelected]);
        },
        getImgQuantAlgoSelectedParsOfType(type) {
            return this.getImgQuantAlgoSelectedPars().filter(x => x[1].type == type)
        },
        enterStep(prevStep) {
            const glbStore = Alpine.store("glb");
            if (prevStep < 1 && glbStore.modifImg == null) {
                const oImg = glbStore.origImg;
                let initialModifSize = ImgHandler.limitWH(oImg.width, oImg.height, INITIAL_MAX_WH);
                this.modifWidth = initialModifSize.w;
                this.modifHeight = initialModifSize.h;
                this.imgOptsChanged();
                this.clearModifImage();
            } else {
                // coming back from step 2 or origImg has not changed --> we only clear the mesh
                Alpine.store("step2").clearModel();
            }
        },
        clearModifImage() {
            ImgHandler.clearModifImg(canvasDrawer);
        },
        imgOptsChanged() {
            if (this.autoRefresh) {
                this.applyImgOptsChanged();
            } else {
                this.needsUpdate = true;
            }
        },
        applyImgOptsChanged() {
            ImgHandler.showModifImg(canvasDrawer, Alpine.store("glb").origImg, this.imgOpts).then((res) => {
                Alpine.store("glb").modifImg = res;
                this.needsUpdate = false;
            });
        },
        sizeChanged(what, value) {
            if (what == "width" || what == "height") {
                let numVal = Math.round(parseFloat(value));
                const oImg = Alpine.store("glb").origImg;
                let newSize = ImgHandler.computeWH(oImg.width, oImg.height, what, numVal);
                this.modifWidth = newSize.w;
                this.modifHeight = newSize.h;
            }
            this.imgOptsChanged();
        },
        paletteClick(what, arg1) {
            switch (what) {
                case "add":
                    {
                        this.palette = [...this.palette, arg1];
                    }
                    break;
                case "delete":
                    {
                        if (this.paletteSelectedIdx < 0) {
                            return;
                        }
                        this.palette = this.palette.filter((col, idx) => idx != this.paletteSelectedIdx);
                        this.paletteSelectedIdx = -1;
                    }
                    break;
                case "edit":
                    {
                        this.palette = this.palette.map((col, idx) => idx != this.paletteSelectedIdx ? col : arg1);
                    }
                    break;
                case "moveup":
                    {
                        if (this.paletteSelectedIdx < 0) {
                            return;
                        }
                        let curIdx = this.paletteSelectedIdx;
                        let newPalette = [...this.palette.filter((col, idx) => idx < curIdx - 1), this.palette[curIdx], ...this.palette.filter((col, idx) => idx >= curIdx - 1 && idx != curIdx)];
                        this.palette = newPalette;
                        this.paletteSelectedIdx = Math.max(curIdx - 1, 0);
                    }
                    break;
                case "movedown":
                    {
                        if (this.paletteSelectedIdx < 0) {
                            return;
                        }
                        let curIdx = this.paletteSelectedIdx;
                        let newPalette = [...this.palette.filter((col, idx) => idx <= curIdx + 1 && idx != curIdx), this.palette[curIdx], ...this.palette.filter((col, idx) => idx > curIdx + 1)];
                        this.palette = newPalette;
                        this.paletteSelectedIdx = Math.min(curIdx + 1, this.palette.length - 1);
                    }
                    break;
            }
            this.imgOptsChanged();
        },
        distanceCalcChange(newDist) {
            this.distCalcSelected = newDist;
            this.imgOptsChanged();
        },
        imgQuantAlgoChange(newAlgo) {
            this.imgQuantAlgoSelected = newAlgo;
            this.imgOptsChanged();
        },
        imgQuantAlgoParChange(key, newVal) {
            let type = this.getImgQuantAlgoSelectedPars().find(p => p[0] == key)[1].type;
            let parser = (v) => v;
            switch (type) {
                case "bool":
                    break;
                case "num":
                case "numrange":
                    parser = parseFloat;
                    break;
                default:
                    throw new Error(`Unknown type ${type}`);
            }
            this.imgQuantAlgoPars[key] = parser(newVal);
            this.imgOptsChanged();
        }
    })
}

function initStep2Store() {

    Alpine.store("step2", {
        pixelSideSize: INITIAL_PIXEL_SIZE,
        firstLayerHeight: INITIAL_FIRST_LAYER_HEIGHT,
        otherLayersHeight: INITIAL_OTHER_LAYERS_HEIGHT,
        paletteSortTypes: [...Model3D.PaletteSortTypes],
        paletteSortTypeSelected: INITIAL_PALETTE_SORT_TYPE,
        needsUpdate: false,
        appliedPalette: null,
        get cannotMoveTo() {
            return Alpine.store("glb").modifImg == null;
        },
        get model3DOpts() {
            return {
                palette: ImgHandler.hexPaletteToPointPalette(Alpine.store("step1").palette),
                paletteSortType: this.paletteSortTypeSelected,
                pixelSideSize: this.pixelSideSize,
                firstLayerHeight: this.firstLayerHeight,
                otherLayersHeight: this.otherLayersHeight,
            };
        },
        get colorChanges() {
            let changes = [];
            if (this.appliedPalette == null || this.appliedPalette.length == 0) {
                return changes;
            }
            changes.push({ idx: 0, h: 0, colBefore: null, colCurr: this.appliedPalette[0] })
            let height = this.firstLayerHeight;
            for (let i = 1; i < this.appliedPalette.length; i++) {
                height += this.otherLayersHeight;
                let change = { idx: i, h: height, colBefore: this.appliedPalette[i - 1], colCurr: this.appliedPalette[i] }
                changes.push(change);
            }
            return changes;
        },
        enterStep() {
            this.applyModel3DOptsChanged();
        },
        clearModel() {
            Model3D.clearModel();
        },
        model3DOptsChanged(what, value) {
            this[what] = parseFloat(value);
            this.needsUpdate = true;
        },
        applyModel3DOptsChanged() {
            this.appliedPalette = null;
            Alpine.store("glb").showLoadingDialog();
            Alpine.nextTick(() => {
                Model3D.updateModel(new ImgHandler.ImgWrap(Alpine.store("glb").modifImg), this.model3DOpts)
                    .then(finalPalette => this.appliedPalette = finalPalette)
                    .finally(() => {
                        Alpine.store("glb").hideLoadingDialog()
                        this.needsUpdate = false;
                    });
            })
        },
        exportSTLClicked() {
            Alpine.store("glb").showLoadingDialog("Exporting...");
            Alpine.nextTick(() => {
                Model3D.exportSTL().finally(() => { Alpine.store("glb").hideLoadingDialog() });
            });
        },
        copyChanges() {
            let msg = "";
            for (let change of this.colorChanges) {
                if (change.idx == 0) {
                    msg += `Initial color: ${change.colCurr}`;
                } else {
                    msg += `Color change #${change.idx}: ${change.colBefore} --> ${change.colCurr}`
                }
                msg += "\n";
            }
            navigator.clipboard.writeText(msg);
            Alpine.store("glb").showTimeNotification("Color changes information copied to clipboard !", 2000);
        }
    })
}


export function initStore() {
    initGlbStore();
    initStep0Store();
    initStep1Store();
    initStep2Store();
}