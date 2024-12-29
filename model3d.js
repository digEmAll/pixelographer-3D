
import * as Utils from "./utils.js";

const IMG_MODEL_MESH_NAME = "img-model";
const CAMERA_INITIAL_DIREC = { alpha: -Math.PI / 2, beta: Math.PI / 8, radius: 50 };

function init(canvasID) {
    const canvas = document.getElementById(canvasID);
    const engine = new BABYLON.Engine(canvas, true);
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = BABYLON.Color3.FromInts(25, 39, 46);

    //scene.debugLayer.show();

    let camera = new BABYLON.ArcRotateCamera("Camera", CAMERA_INITIAL_DIREC.alpha, CAMERA_INITIAL_DIREC.beta, CAMERA_INITIAL_DIREC.radius, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 15;
    camera.wheelPrecision = 10;
    /*camera.lowerAlphaLimit = null;
    camera.upperAlphaLimit = null;
    camera.upperBetaLimit = null;
    camera.lowerBetaLimit = null;*/
    camera.useFramingBehavior = true;
    camera.framingBehavior.mode = BABYLON.FramingBehavior.IgnoreBoundsSizeMode;
    // This targets the camera to scene origin
    camera.setTarget(BABYLON.Vector3.Zero());
    // This creates a light, aiming 0.1,1,0.1 - to the sky (non-mesh)
    let light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0.1, 1, 0.1), scene);
    light.intensity = 1;
    light.diffuseColor = new BABYLON.Color3(1, 1, 1);
    light.groundColor = new BABYLON.Color3(1, 1, 1);

    engine.runRenderLoop(function () {
        scene.render();
    });
    window.addEventListener("resize", function () {
        engine.resize();
    });

    initGround(scene);
    return { canvas, scene, engine, camera };
}


const { canvas, scene, engine, camera } = init("canvas3D");
const CAMERA_INITIAL_POSITION = camera.position.clone();

export function initGround(scene) {

    // show axis (red is X, blue is Z, green is Y)
    //const axes = new BABYLON.Debug.AxesViewer(scene, 5);

    // draw ground
    let ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 1000, height: 1000 }, scene);

    let gridmaterial = new BABYLON.GridMaterial("GridMaterial", scene);
    gridmaterial.majorUnitFrequency = 1;
    gridmaterial.minorUnitVisibility = 0.0;
    gridmaterial.gridRatio = 20;
    gridmaterial.backFaceCulling = false;
    gridmaterial.mainColor = new BABYLON.Color3(1, 1, 1);
    gridmaterial.lineColor = new BABYLON.Color3(1, 1, 1);
    gridmaterial.opacity = 0.8;
    gridmaterial.zOffset = 0;
    ground.material = gridmaterial;
}




// helper class created to reuse the vertices
// positions as much as possible
class PositionsContainer {
    constructor() {
        this.indices = [];
        this.positions = [];
        // contain index by x, then y, then z
        this.idxByXYZ = new Map();
    }
    // add a new vertex to positions, using the already existing
    // index if already added in the past or creating 
    // a new one if never added
    // color can be passed or not, color format is [r,g,b,a] where each value is [0,1]
    addVertex(x, y, z) {
        let idxByYZ = this.idxByXYZ.get(x);
        if (idxByYZ === undefined) {
            idxByYZ = new Map();
            this.idxByXYZ.set(x, idxByYZ);
        }
        let idxByZ = idxByYZ.get(y);
        if (idxByZ === undefined) {
            idxByZ = new Map();
            idxByYZ.set(y, idxByZ);
        }
        let index = idxByZ.get(z);
        if (index === undefined) {
            index = this.positions.length / 3;
            idxByZ.set(z, index);
        }
        this.positions.push(x, y, z);
        return index;
    }
    addIndex(index) {
        this.indices.push(index);
    }
    getCustomMesh(name, scene, mat) {
        let customMesh = new BABYLON.Mesh(name, scene);
        let vertexData = new BABYLON.VertexData();
        vertexData.positions = this.positions;
        vertexData.indices = this.indices;
        vertexData.applyToMesh(customMesh);
        if (mat != null) {
            customMesh.material = mat;
        }
        return customMesh;
    }
}

/* add one rectangular facet (two triangles) perpendicular to one axis ("x","y","z") 
   x1,y1,z1 and x2,y2,z2 represents the diagonal points
   direction: 1 means the normal has the same direction of the perpendicularToAxis, -1 if opposite
*/
function addRectFacet(posContainer, x1, y1, z1, x2, y2, z2, perpAxis, direction) {
    let newIndices = [];
    switch (perpAxis) {
        case "z":
            {
                let [x_1, x_2] = Utils.minMax(x1, x2);
                let [y_1, y_2] = Utils.minMax(y1, y2);
                newIndices.push(posContainer.addVertex(x_1, y_1, z1));
                newIndices.push(posContainer.addVertex(x_2, y_1, z1));
                newIndices.push(posContainer.addVertex(x_2, y_2, z1));
                newIndices.push(posContainer.addVertex(x_1, y_2, z1));
                direction = -direction;
            }
            break;
        case "x":
            {
                let [z_1, z_2] = Utils.minMax(z1, z2);
                let [y_1, y_2] = Utils.minMax(y1, y2);
                newIndices.push(posContainer.addVertex(x1, y_1, z_1));
                newIndices.push(posContainer.addVertex(x1, y_1, z_2));
                newIndices.push(posContainer.addVertex(x1, y_2, z_2));
                newIndices.push(posContainer.addVertex(x1, y_2, z_1));
            }
            break;
        case "y":
            {
                let [x_1, x_2] = Utils.minMax(x1, x2);
                let [z_1, z_2] = Utils.minMax(z1, z2);
                newIndices.push(posContainer.addVertex(x_1, y1, z_1));
                newIndices.push(posContainer.addVertex(x_2, y1, z_1));
                newIndices.push(posContainer.addVertex(x_2, y1, z_2));
                newIndices.push(posContainer.addVertex(x_1, y1, z_2));
            }
            break;
    }
    let orderOfNewIndices = direction < 0 ? [0, 3, 2, 0, 2, 1] : [0, 2, 3, 0, 1, 2];
    for (let i = 0; i < 6; i++) {
        posContainer.addIndex(newIndices[orderOfNewIndices[i]]);
    }
}

// Sort to be intendes from lower layer to top:
// - Decreasing Luminosity: the lower level is the most luminous color
// - Increasing Luminosity: the lower level is the least luminous color
// - Keep original: the indicated palette order is applied as is
export const PaletteSortTypes = ["Decreasing Luminosity", "Increasing Luminosity", "Keep original"]
function sortPalette(type, palette) {
    if (type == 2) {
        return palette;
    }
    let ascDescMult = (type == 0 ? -1 : 1);
    let paletteClone = [...palette];
    paletteClone.sort(function (a, b) {
        let diff = a.getLuminosity() - b.getLuminosity();
        return diff * ascDescMult;
    })
    return paletteClone;
}

function clearMeshes(scene, filterFun) {
    let nMeshes = scene.meshes.length;
    for (let m = 0; m < nMeshes; m++) {
        let mesh = scene.meshes[m];
        if (filterFun(mesh)) {
            mesh.dispose();
        }
    }
}

// delete model
export function clearModel() {
    clearMeshes(scene, (m) => m.name == IMG_MODEL_MESH_NAME);
    resetCamera();
}

function resetCamera() {
    camera.alpha = CAMERA_INITIAL_DIREC.alpha;
    camera.beta = CAMERA_INITIAL_DIREC.beta;
    camera.radius = CAMERA_INITIAL_DIREC.radius;
    camera.setTarget(BABYLON.Vector3.Zero());
    camera.position = CAMERA_INITIAL_POSITION.clone();
}

// opts:
//   palette (in color points, ordered ground to top)
//   paletteSortType
//   pixelSideSize (mm)
//   firstLayerHeight
//   otherLayersHeight
// img:
//   getWidth()
//   getHeight()
//   getPixelColor()
// colorpoint:
//   r,g,b,a
//   uint32
//   getLuminosity()
export async function updateModel(img, opts) {
    // N.B.: these operations have been split with several (promisified) setTimeout, to allow minimal UI updates while computing
    await Utils.promiseSetZeroTimeout(() => {
        clearModel();
    });
    let sortedReducedPalette = await Utils.promiseSetZeroTimeout(() => {
        // sort palette and reduce it to the actual used colors
        let pal = sortPalette(opts.paletteSortType, opts.palette);
        pal = reducePalette(img, pal);
        return pal;
    });

    let manifoldPosContainer = new PositionsContainer();
    await Utils.promiseSetZeroTimeout(() => {
        iterateOnFacets(img, opts, sortedReducedPalette, (x1, y1, z1, x2, y2, z2, perpAxis, direction) => addRectFacet(manifoldPosContainer, x1, y1, z1, x2, y2, z2, perpAxis, direction));
    });

    let material = await Utils.promiseSetZeroTimeout(() => {
        const paletteCol3 = sortedReducedPalette.map(x => new BABYLON.Color3(x.r / 255, x.g / 255, x.b / 255));
        let thresholds = [opts.firstLayerHeight, ...Array(sortedReducedPalette.length - 2).fill(opts.otherLayersHeight)]
        thresholds = thresholds.map((sum => value => sum += value)(0));
        let mat = createAndBuildMaterialNode(scene, paletteCol3, thresholds);
        return mat;
    });

    await Utils.promiseSetZeroTimeout(() => {
        const customMesh = manifoldPosContainer.getCustomMesh(IMG_MODEL_MESH_NAME, scene, material);
        customMesh.isVisible = true;
        camera.setTarget(customMesh)
    });
    return sortedReducedPalette.map(x => Utils.rgbToHex(x.r, x.g, x.b));
}



// remove the unused colors from the palette, to avoid creating useless layers
function reducePalette(img, palette) {
    let usedColors = new Set();
    const width = img.getWidth();
    const height = img.getHeight();
    for (let imgX = 0; imgX < width; imgX++) {
        for (let imgY = 0; imgY < height; imgY++) {
            usedColors.add(img.getPixelColor(imgX, imgY).uint32);
        }
    }
    return palette.filter(col => usedColors.has(col.uint32))
}

// onFacetCallback args: x1,y1,z1,x2,y2,z2,perpAxis,direction,colorIndex
function iterateOnFacets(img, opts, sortedReducedPalette, onFacetCallback) {
    const paletteUint32 = sortedReducedPalette.map(x => x.uint32);

    function getNumLayersOfPoint(x, y) {
        let point = img.getPixelColor(x, y);
        return paletteUint32.indexOf(point.uint32) + 1;
    }
    const width = img.getWidth();
    const height = img.getHeight();
    const pixelSizeSize = opts.pixelSideSize;
    const gndHeight = opts.firstLayerHeight;
    const otherLayersHeight = opts.otherLayersHeight;
    function getYHeightFromNLayers(numLayers) {
        if (numLayers == 0) {
            return 0;
        }
        return gndHeight + (numLayers - 1) * otherLayersHeight;
    }
    for (let imgX = 0; imgX < width; imgX++) {
        for (let imgY = 0; imgY < height; imgY++) {
            let currPixNumLayers = getNumLayersOfPoint(imgX, imgY);
            // neighbors pixels
            let abovePixNumLayers = imgY > 0 ? getNumLayersOfPoint(imgX, imgY - 1) : 0;
            let belowPixNumLayers = imgY < height - 1 ? getNumLayersOfPoint(imgX, imgY + 1) : 0;
            let leftPixNumLayers = imgX > 0 ? getNumLayersOfPoint(imgX - 1, imgY) : 0;
            let rightPixNumLayers = imgX < width - 1 ? getNumLayersOfPoint(imgX + 1, imgY) : 0;

            // draw pixel facets
            // note: our mesh lies on x,z plane of the 3D space
            //
            // z ^
            //   | 
            //   |
            //   .------. x2,z2
            //   |      |
            //   |      |
            //   '------' ------> x
            // x1,z1
            let x1 = (imgX * pixelSizeSize) - (width * pixelSizeSize) / 2;
            let x2 = x1 + pixelSizeSize;
            const reverseImgY = height - imgY - 1;
            let z1 = (reverseImgY * pixelSizeSize) - (width * pixelSizeSize) / 2;
            let z2 = z1 + pixelSizeSize;

            // bottom (first layer) facet
            onFacetCallback(x1, 0, z1, x2, 0, z2, "y", -1, 0 /* color index */);
            // top facet
            let topY = getYHeightFromNLayers(currPixNumLayers);
            onFacetCallback(x1, topY, z1, x2, topY, z2, "y", 1, currPixNumLayers - 1);

            // lateral facets for each layer (facets between adjacent layers of neighbors pixels are skipped)
            for (let layIdx = 0; layIdx < currPixNumLayers; layIdx++) {
                let layY1 = getYHeightFromNLayers(layIdx);
                let layY2 = getYHeightFromNLayers(layIdx + 1);
                let currColorIdx = layIdx;
                // above
                if (abovePixNumLayers <= layIdx) {
                    onFacetCallback(x1, layY1, z2, x2, layY2, z2, "z", 1, currColorIdx);
                }
                // below
                if (belowPixNumLayers <= layIdx) {
                    onFacetCallback(x1, layY1, z1, x2, layY2, z1, "z", -1, currColorIdx);
                }
                // left
                if (leftPixNumLayers <= layIdx) {
                    onFacetCallback(x1, layY1, z1, x1, layY2, z2, "x", -1, currColorIdx);
                }
                // right
                if (rightPixNumLayers <= layIdx) {
                    onFacetCallback(x2, layY1, z1, x2, layY2, z2, "x", 1, currColorIdx);
                }
            }
        }
    }
}

// create a custom material changing the colors at each layer height
function createAndBuildMaterialNode(scene, palette, heightsThresholds) {
    // https://nme.babylonjs.com/#JLI5O7#3
    let nodeMaterial = new BABYLON.NodeMaterial("node");
    nodeMaterial.mode = BABYLON.NodeMaterialModes.Material;

    // InputBlock
    let position = new BABYLON.InputBlock("position");
    position.visibleInInspector = false;
    position.visibleOnFrame = false;
    position.target = 1;
    position.setAsAttribute("position");

    // TransformBlock
    let WorldPos = new BABYLON.TransformBlock("WorldPos");
    WorldPos.visibleInInspector = false;
    WorldPos.visibleOnFrame = false;
    WorldPos.target = 1;
    WorldPos.complementZ = 0;
    WorldPos.complementW = 1;

    // InputBlock
    let World = new BABYLON.InputBlock("World");
    World.visibleInInspector = false;
    World.visibleOnFrame = false;
    World.target = 1;
    World.setAsSystemValue(BABYLON.NodeMaterialSystemValues.World);

    // TransformBlock
    let Worldnormal = new BABYLON.TransformBlock("World normal");
    Worldnormal.visibleInInspector = false;
    Worldnormal.visibleOnFrame = false;
    Worldnormal.target = 1;
    Worldnormal.complementZ = 0;
    Worldnormal.complementW = 0;

    // InputBlock
    let normal = new BABYLON.InputBlock("normal");
    normal.visibleInInspector = false;
    normal.visibleOnFrame = false;
    normal.target = 1;
    normal.setAsAttribute("normal");

    // LightBlock
    let Lights = new BABYLON.LightBlock("Lights");
    Lights.visibleInInspector = false;
    Lights.visibleOnFrame = false;
    Lights.target = 3;

    // InputBlock
    let cameraPosition = new BABYLON.InputBlock("cameraPosition");
    cameraPosition.visibleInInspector = false;
    cameraPosition.visibleOnFrame = false;
    cameraPosition.target = 1;
    cameraPosition.setAsSystemValue(BABYLON.NodeMaterialSystemValues.CameraPosition);

    // ClampBlock
    let Clamp = new BABYLON.ClampBlock("Clamp");
    Clamp.visibleInInspector = false;
    Clamp.visibleOnFrame = false;
    Clamp.target = 4;
    Clamp.minimum = 0.3;
    Clamp.maximum = 1;

    // MultiplyBlock
    let Multiply = new BABYLON.MultiplyBlock("Multiply");
    Multiply.visibleInInspector = false;
    Multiply.visibleOnFrame = false;
    Multiply.target = 4;

    // VectorSplitterBlock
    let VectorSplitter = new BABYLON.VectorSplitterBlock("VectorSplitter");
    VectorSplitter.visibleInInspector = false;
    VectorSplitter.visibleOnFrame = false;
    VectorSplitter.target = 4;

    let colorIdx = 0;
    let colorsBlocks = [];
    let conditionsBlocks = [];
    let thresholdsBlocks = [];
    for (let col3 of palette) {
        // InputBlock
        let Color = new BABYLON.InputBlock("Color3");
        Color.visibleInInspector = false;
        Color.visibleOnFrame = false;
        Color.target = 1;
        Color.value = col3;
        Color.isConstant = true;
        colorsBlocks.push(Color);

        // ConditionalBlock
        if (colorIdx > 0) {
            let GreaterOrEqual = new BABYLON.ConditionalBlock(`GreaterOrEqual`);
            GreaterOrEqual.visibleInInspector = false;
            GreaterOrEqual.visibleOnFrame = false;
            GreaterOrEqual.target = 4;
            GreaterOrEqual.condition = BABYLON.ConditionalBlockConditions.GreaterThan;
            conditionsBlocks.push(GreaterOrEqual);

            let heightThresh = heightsThresholds[colorIdx - 1]

            let Float = new BABYLON.InputBlock("Float");
            Float.visibleInInspector = false;
            Float.visibleOnFrame = false;
            Float.target = 1;
            Float.value = heightThresh;
            Float.min = 0;
            Float.max = 0;
            Float.isBoolean = false;
            Float.matrixMode = 0;
            Float.animationType = BABYLON.AnimatedInputBlockTypes.None;
            Float.isConstant = true;

            thresholdsBlocks.push(Float)
        }

        colorIdx++;
    }
    // FragmentOutputBlock
    let FragmentOutput = new BABYLON.FragmentOutputBlock("FragmentOutput");
    FragmentOutput.visibleInInspector = false;
    FragmentOutput.visibleOnFrame = false;
    FragmentOutput.target = 2;
    FragmentOutput.convertToGammaSpace = false;
    FragmentOutput.convertToLinearSpace = false;
    FragmentOutput.useLogarithmicDepth = false;

    // TransformBlock
    let WorldPosViewProjectionTransform = new BABYLON.TransformBlock("WorldPos * ViewProjectionTransform");
    WorldPosViewProjectionTransform.visibleInInspector = false;
    WorldPosViewProjectionTransform.visibleOnFrame = false;
    WorldPosViewProjectionTransform.target = 1;
    WorldPosViewProjectionTransform.complementZ = 0;
    WorldPosViewProjectionTransform.complementW = 1;

    // InputBlock
    let ViewProjection = new BABYLON.InputBlock("ViewProjection");
    ViewProjection.visibleInInspector = false;
    ViewProjection.visibleOnFrame = false;
    ViewProjection.target = 1;
    ViewProjection.setAsSystemValue(BABYLON.NodeMaterialSystemValues.ViewProjection);

    // VertexOutputBlock
    let VertexOutput = new BABYLON.VertexOutputBlock("VertexOutput");
    VertexOutput.visibleInInspector = false;
    VertexOutput.visibleOnFrame = false;
    VertexOutput.target = 1;

    // Connections
    position.output.connectTo(WorldPos.vector);
    World.output.connectTo(WorldPos.transform);
    WorldPos.output.connectTo(WorldPosViewProjectionTransform.vector);
    ViewProjection.output.connectTo(WorldPosViewProjectionTransform.transform);
    WorldPosViewProjectionTransform.output.connectTo(VertexOutput.vector);
    WorldPos.output.connectTo(Lights.worldPosition);
    normal.output.connectTo(Worldnormal.vector);
    World.output.connectTo(Worldnormal.transform);
    Worldnormal.output.connectTo(Lights.worldNormal);
    cameraPosition.output.connectTo(Lights.cameraPosition);
    Lights.diffuseOutput.connectTo(Clamp.value);
    Clamp.output.connectTo(Multiply.left);
    position.output.connectTo(VectorSplitter.xyzIn);

    // dynamic part
    let previousBlockColor = colorsBlocks[0];
    for (let i = 1; i < palette.length; i++) {
        let conditionBlock = conditionsBlocks[i - 1]
        let threshBlock = thresholdsBlocks[i - 1]
        VectorSplitter.y.connectTo(conditionBlock.a);
        threshBlock.output.connectTo(conditionBlock.b);
        colorsBlocks[i].output.connectTo(conditionBlock.true);
        previousBlockColor.output.connectTo(conditionBlock.false);

        if (i < conditionsBlocks.length) {
            conditionBlock.output.connectTo(conditionsBlocks[i].false)
        } else {
            conditionBlock.output.connectTo(Multiply.right)
        }

        previousBlockColor = conditionBlock
    }
    // ~dynamic part
    Multiply.output.connectTo(FragmentOutput.rgb);


    // Output nodes
    nodeMaterial.addOutputNode(VertexOutput);
    nodeMaterial.addOutputNode(FragmentOutput);
    nodeMaterial.build();

    return nodeMaterial;
}


export async function exportSTL() {
    // 250ms delay to allow DOM rendering
    await Utils.promiseSetZeroTimeout(() => { }, 250);
    await Utils.promiseSetZeroTimeout(() => {
        BABYLON.STLExport.CreateSTL(
            scene.meshes.filter(x => x.name == IMG_MODEL_MESH_NAME),
            true,
            "export",
            true,
            true);
    });
}