export function invertColor(hex) {
    if (hex.indexOf("#") === 0) {
        hex = hex.slice(1);
    }
    // convert 3-digit hex to 6-digits.
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length !== 6) {
        throw new Error("Invalid HEX color.");
    }
    // invert color components
    let r = (255 - parseInt(hex.slice(0, 2), 16)).toString(16),
        g = (255 - parseInt(hex.slice(2, 4), 16)).toString(16),
        b = (255 - parseInt(hex.slice(4, 6), 16)).toString(16);
    // pad each with zeros and return
    return "#" + padZero(r) + padZero(g) + padZero(b);
}

export function padZero(str, len) {
    len = len || 2;
    let zeros = new Array(len).join("0");
    return (zeros + str).slice(-len);
}

export function minMax(a, b) {
    return a < b ? [a, b] : [b, a];
}

export function rgbaToUint32(r, g, b, a) {
    return ((this.a << 24) | (this.b << 16) | (this.g << 8) | this.r) >>> 0;
}

export function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => {
        const hex = x.toString(16)
        return hex.length === 1 ? "0" + hex : hex
    }).join("")
}

// remove elements (in place) from array according to condition 
export function arrayRemoveIf(arr, condition) {
    let i = arr.length;
    while (i--) {
        if (condition(arr[i], i)) {
            arr.splice(i, 1);
        }
    }
}

// wrap operation in a promisified setTimeout(xxx,0) allowing the browser to
// execute UI updates between one or more of these operations
export async function promiseSetZeroTimeout(operation, timeout=0) {
    return new Promise((res) => {
        setTimeout(() => {
            res(operation());
        }, timeout)
    });
}