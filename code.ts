// import { makeNoise2D, Noise2D } from "open-simplex-noise";

interface Quad {
    p1: [number, number];
    p2: [number, number];
    p3: [number, number];
    p4: [number, number];
}

interface CustomRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

type QuadStyle = "QUARTER1" | "QUARTER2" | "QUARTER3" | "QUARTER4" | "HALF1" | "HALF2" | "HALF3" | "HALF4" | "NONE";

const PHI = 1.618033988749895;

figma.showUI(__html__);

const noise = (x: number, y: number): number => Math.random();

figma.ui.onmessage = (msg) => {
    if (msg.type === "create-rectangles") {
        const [cols, rows] = randomColsAndRows(noise, 120, 6, 6);

        const quads = generateQuads(cols, rows);

        const styleWeights: [QuadStyle, number][] = [
            ["HALF1", 0.055],
            ["HALF2", 0.055],
            ["HALF3", 0.055],
            ["HALF4", 0.055],
            ["QUARTER1", 0.145],
            ["QUARTER2", 0.145],
            ["QUARTER3", 0.145],
            ["QUARTER4", 0.145],
            ["NONE", 0.2],
        ];

        const palleteWeights: [RGB, number][] = [
            [hexColorToRGB("#FFFFFF"), 0.3],
            [hexColorToRGB("#FD936A"), 0.176667],
            [hexColorToRGB("#FDAE67"), 0.166667],
            [hexColorToRGB("#FD7267"), 0.166667],
            [hexColorToRGB("#A185B6"), 0.056667],
            [hexColorToRGB("#CE87CC"), 0.056667],
            [hexColorToRGB("#FC6B83"), 0.066667],
        ];

        const strokeColor = hexColorToRGB("#040404");
        const maskColor = hexColorToRGB("#FFFFFF");

        const [nodes, maskNodes] = renderQuads(quads, styleWeights, palleteWeights, maskColor, strokeColor);

        renderQuads(quads, styleWeights, palleteWeights, maskColor, strokeColor, true, 0.5);

        figma.group(maskNodes, figma.currentPage);

        figma.currentPage.selection = nodes;
        figma.viewport.scrollAndZoomIntoView(nodes);
    }

    figma.closePlugin();
};

const renderQuads = (
    quads: Quad[],
    styleWeights: [QuadStyle, number][],
    palleteWeights: [RGB, number][],
    maskColor: RGB,
    strokeColor: RGB,
    onlyOutline: Boolean = false,
    density: number = 1
): [SceneNode[], SceneNode[]] => {
    const nodes: SceneNode[] = [];
    const maskNodes: SceneNode[] = [];

    quads.forEach((quad) => {
        if (Math.random() > density) {
            return;
        }

        const rect = figma.createRectangle();
        const r = quadToRect(quad);

        const style = pick<QuadStyle>(styleWeights);

        const rad = paneviaBorder(style);

        // if (r.w > r.h && style !== "NONE") {
        if (style === "HALF4") {
            r.x += r.w - r.h / 2; // align to right
            r.w = r.h / 2;
        } else if (style === "HALF2") {
            r.w = r.h / 2;
        }
        // }

        // if (r.w < r.h && style !== "NONE") {
        if (style === "HALF3") {
            r.h = r.w / 2;
        } else if (style === "HALF1") {
            r.y += r.h - r.w / 2; // align to bottom
            r.h = r.w / 2;
        }
        // }

        rect.x = r.x;
        rect.y = r.y;

        rect.resize(r.w, r.h);

        rect.topLeftRadius = rad[0];
        rect.topRightRadius = rad[1];
        rect.bottomRightRadius = rad[2];
        rect.bottomLeftRadius = rad[3];

        const color = pick<RGB>(palleteWeights);

        rect.fills = [
            {
                type: "SOLID",
                color: color,
                opacity: onlyOutline ? 0 : 1,
            },
        ];

        rect.strokeAlign = "CENTER";
        rect.strokeWeight = 2;
        rect.strokes = [
            {
                type: "SOLID",
                color: strokeColor,
            },
        ];

        figma.currentPage.appendChild(rect);
        nodes.push(rect);

        if (color.r === maskColor.r && color.g === maskColor.g && color.g === maskColor.b) {
            maskNodes.push(rect);
        }
    });
    return [nodes, maskNodes];
};

const paneviaBorder = (type: QuadStyle): [number, number, number, number] => {
    let radius: [number, number, number, number] = [0, 0, 0, 0];
    const radiusSize = 9999;

    switch (type) {
        case "HALF1":
            radius[0] = radiusSize;
            radius[1] = radiusSize;
            break;
        case "HALF2":
            radius[1] = radiusSize;
            radius[2] = radiusSize;
            break;
        case "HALF3":
            radius[2] = radiusSize;
            radius[3] = radiusSize;
            break;
        case "HALF4":
            radius[3] = radiusSize;
            radius[0] = radiusSize;
            break;

        case "QUARTER1":
            radius[0] = radiusSize;
            break;
        case "QUARTER2":
            radius[1] = radiusSize;
            break;
        case "QUARTER3":
            radius[2] = radiusSize;
            break;
        case "QUARTER4":
            radius[3] = radiusSize;
            break;

        default:
            break;
    }

    return radius;
};

const randomColsAndRows = (
    noise: (x: number, y: number) => number,
    l: number,
    cols: number,
    rows: number,
    seed?: number
): [number[], number[]] => {
    let columnsArray: number[] = [];
    let rowsArray: number[] = [];

    // const posibleSizes = [l, PHI * l];

    const distribution: [number, number][] = [
        [l, 0.3],
        [PHI * l, 0.7],
    ];

    for (let c = 0; c < cols; c++) {
        const d = pick<number>(distribution);
        columnsArray.push(d);
    }

    for (let r = 0; r < rows; r++) {
        const d = pick<number>(distribution);
        rowsArray.push(d);
    }

    return [columnsArray, rowsArray];
};

const classicDistribution = (l: number, cols: number, rows: number): [number[], number[]] => {
    let columnsArray: number[] = [];
    let rowsArray: number[] = [];

    for (let c = 0; c < cols; c++) {
        const d = noise(c, 0) > 0.5 ? l * PHI : l;
        columnsArray.push(d);
    }

    for (let r = 0; r < rows; r++) {
        const d = noise(r, 0) > 0.5 ? l * PHI : l;
        rowsArray.push(d);
    }

    return [columnsArray, rowsArray];
};

const generateQuads = (cols: number[], rows: number[], start: [number, number] = [0, 0]): Quad[] => {
    let currentPoint: [number, number] = [start[0], start[1]];
    let quads: Quad[] = [];

    for (let x = 0; x < cols.length; x++) {
        currentPoint = [currentPoint[0], start[1]];
        for (let y = 0; y < rows.length; y++) {
            const p1: [number, number] = [currentPoint[0], currentPoint[1]];
            const p2: [number, number] = [currentPoint[0], currentPoint[1] + rows[y]];
            const p3: [number, number] = [currentPoint[0] + cols[x], currentPoint[1]];
            const p4: [number, number] = [currentPoint[0] + cols[x], currentPoint[1] + rows[y]];

            quads.push({ p1, p2, p3, p4 });

            currentPoint[1] += rows[y];
        }
        currentPoint[0] += cols[x];
    }

    return quads;
};

const quadToRect = (quad: Quad): CustomRect => {
    return {
        x: quad.p1[0],
        y: quad.p1[1],
        w: quad.p4[0] - quad.p1[0],
        h: quad.p4[1] - quad.p1[1],
    };
};

const pick = <T>(data: [T, number][]): T => {
    const values = data.map((d) => d[0]);
    const weights = data.map((d) => d[1]);

    let sum = 0;

    const accumulatedWeights = [];

    for (let weight of weights) {
        sum += weight;
        accumulatedWeights.push(sum);
    }

    const rand = Math.random() * sum;
    const value = values[accumulatedWeights.filter((element) => element <= rand).length];

    return value;
};

const hexColorToRGB = (hexColor: string): RGB => {
    let color = Number(hexColor.replace(/^#/, "0x"));

    let rgbColor = {
        r: ((color & 0xff0000) >> (2 * 8)) / 255,
        g: ((color & 0x00ff00) >> (1 * 8)) / 255,
        b: ((color & 0x0000ff) >> (0 * 8)) / 255,
    };

    return rgbColor;
};
