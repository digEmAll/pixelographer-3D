export class CanvasDrawer {
    static FORCE_CANVAS_RESIZE_EVENT = "force-canvas-resize";

    constructor(canvasDOM) {
        this.imgBitmap = null;
        this.canvas = canvasDOM;
        window.addEventListener("resize", () => {
            this.redraw();
        });
        window.addEventListener(CanvasDrawer.FORCE_CANVAS_RESIZE_EVENT, () => {
            this.redraw();
        })
    }
    // fit a rect into some container, keeping the aspect ratio of the rect
    fitRectIntoContainer(rectWidth, rectHeight, containerWidth, containerHeight) {
        const widthRatio = containerWidth / rectWidth;
        const heightRatio = containerHeight / rectHeight;
        const ratio = Math.min(widthRatio, heightRatio);
        return {
            width: rectWidth * ratio,
            height: rectHeight * ratio,
        };
    }

    setImageBitmap(newImgBitmap) {
        this.imgBitmap = newImgBitmap;
        this.redraw();
    }

    redraw() {
        let ctx = this.canvas.getContext("2d")
        const canvasBoundRect = this.canvas.getBoundingClientRect();

        this.canvas.width = Math.round(canvasBoundRect.width);
        this.canvas.height = Math.round(canvasBoundRect.height);

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.imgBitmap != null) {
            let cw = this.canvas.width;
            let ch = this.canvas.height;
            let iw = this.imgBitmap.width;
            let ih = this.imgBitmap.height;
            let tgtSize = this.fitRectIntoContainer(iw, ih, cw, ch);
            let tw = tgtSize.width;
            let th = tgtSize.height;
            let offw = (cw - tw) / 2;
            let offh = (ch - th) / 2;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(this.imgBitmap, 0, 0, iw, ih, offw, offh, tw, th)
        }
    }
}
