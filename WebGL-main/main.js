'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.


function deg2rad(angle) {
    return angle * Math.PI / 180;
}


class Model {
    constructor(name) {
        this.name = name;
        this.vertexBuffer = gl.createBuffer();
        this.lineIndexBuffer = gl.createBuffer();
        this.vertexCount = 0;
        this.lineIndexCount = 0;
    }

    BufferData(surfaceData) {
        // Bind and buffer vertex data
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, surfaceData.vertices, gl.STATIC_DRAW);
        this.vertexCount = surfaceData.vertices.length / 3;

        // Bind and buffer line index data for wireframe
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.lineIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, surfaceData.lineIndices, gl.STATIC_DRAW);
        this.lineIndexCount = surfaceData.lineIndices.length;
    }

    Draw() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.lineIndexBuffer);

        // Draw wireframe with LINES
        gl.drawElements(gl.LINES, this.lineIndexCount, gl.UNSIGNED_SHORT, 0);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() { 
    gl.clearColor(0.9, 0.9, 0.9, 1);  // Light gray background for contrast
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Set up projection and modelView matrices as before
    let projection = m4.perspective(Math.PI / 4, 1, 0.1, 100);
    let modelView = spaceball.getViewMatrix();
    let translateToPointZero = m4.translation(0, 0, -10); 
    let matAccum0 = m4.multiply(translateToPointZero, modelView);
    let modelViewProjection = m4.multiply(projection, matAccum0);

    // Send transformation matrix to shader
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

    // Set the color to black for lines
    gl.uniform4fv(shProgram.iColor, [0, 0, 0, 1]);
    
    // Draw the wireframe model
    surface.Draw();
}


// V 11: Twice Oblique Trochoid Cylindroid
function CreateSurfaceData(c, H, alpha, phi, k, theta0, uMin, uMax, vMin, vMax, nu, nv) {
    let vertices = [];
    // let normalList = [];
    let lineIndices = [];

    let p = k * Math.PI;

    let du = (uMax - uMin) / (nu - 1);
    let dv = (vMax - vMin) / (nv - 1);

    for (let i = 0; i < nu; i++) {
        let u = uMin + i * du;
        for (let j = 0; j < nv; j++) {
            let v = vMin + j * dv;

            let theta = theta0 + p * u;

            // Calculate x, y, z positions (as before)
            let x = c * u + v * (Math.sin(phi) + Math.tan(alpha) * Math.cos(phi) * Math.cos(theta));
            let y = v * Math.tan(alpha) * Math.sin(theta);
            let z = H + v * (Math.tan(alpha) * Math.sin(phi) * Math.cos(theta) - Math.cos(phi));

            vertices.push(x, y, z);

            // Calculate line indices for wireframe (adjacent vertices in grid)
            if (i < nu - 1) lineIndices.push(i * nv + j, (i + 1) * nv + j);
            if (j < nv - 1) lineIndices.push(i * nv + j, i * nv + j + 1);
        }
    }

    return { vertices: new Float32Array(vertices), lineIndices: new Uint16Array(lineIndices) };
}


function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('PhongLighting', prog);
    shProgram.Use();

    // Get attribute and uniform locations
    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");
    shProgram.iLightPosition = gl.getUniformLocation(prog, "lightPosition");

    surface = new Model('Surface');

    // Trochoid from Page 97 Fig. 2 of "EncyclopediaOfAnalyticalSurfaces.pdf"
    // let surfaceData = CreateSurfaceData(5, 1, 0.033 * Math.PI, 0, 8, 0, 0, 1, -5, 5, 50, 50);

    // Trochoid from Page 98 Fig. 3 of "EncyclopediaOfAnalyticalSurfaces.pdf"
    let surfaceData = CreateSurfaceData(2, 1, 0.05 * Math.PI, 0, 2, 0, 0, 1, -4, 4, 50, 50);

    surface.BufferData(surfaceData);
    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
     }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw();
}
