'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
// function Model(name) {
//     this.name = name;
//     this.iVertexBuffer = gl.createBuffer();
//     this.count = 0;

//     this.BufferData = function(vertices) {

//         gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
//         gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

//         this.count = vertices.length/3;
//     }

//     this.Draw = function() {

//         gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
//         gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
//         gl.enableVertexAttribArray(shProgram.iAttribVertex);
   
//         gl.drawArrays(gl.LINE_STRIP, 0, this.count);
//     }
// }
class Model {
    constructor(name) {
        this.name = name;
        this.vertexBuffer = gl.createBuffer();
        this.indexBuffer = gl.createBuffer();
        this.indexCount = 0;
    }

    // Buffer both vertex and index data
    BufferData(data) {
        let vertices = data.vertexList;
        let indices = data.indexList;

        // Bind and buffer vertex data
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        // Bind and buffer index data
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        // Store the count of indices
        this.indexCount = indices.length;
    }

    // Draw method using index buffer
    Draw() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        // Bind the index buffer and draw elements
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
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
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI/8, 1, 8, 12); 
    
    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
    let translateToPointZero = m4.translation(0,0,-10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView );
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0 );
        
    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1 );

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection );
    
    /* Draw the six faces of a cube, with different colors. */
    gl.uniform4fv(shProgram.iColor, [1,1,0,1] );

    surface.Draw();
}

// V 11: Twice Oblique Trochoid Cylindroid
function CreateSurfaceData(H, c, alpha, phi, p, uMin, uMax, vMin, vMax, nu, nv) {
    let vertexList = [];
    let indexList = [];

    let du = (uMax - uMin) / nu;
    let dv = (vMax - vMin) / nv;

    for (let i = 0; i <= nu; i++) {
        let u = uMin + i * du;
        let theta = p * u;

        for (let j = 0; j <= nv; j++) {
            let v = vMin + j * dv;
            let x = c * u + v * (Math.sin(phi) + Math.tan(alpha) * Math.cos(phi) * Math.cos(theta));
            let y = v * Math.tan(alpha) * Math.sin(theta);
            let z = H + v * (Math.tan(alpha) * Math.sin(phi) * Math.cos(theta) - Math.cos(phi));

            vertexList.push(x, y, z);

            // Create the index list (assuming a quad mesh)
            if (i < nu && j < nv) {
                let p1 = i * (nv + 1) + j;
                let p2 = p1 + 1;
                let p3 = p1 + (nv + 1);
                let p4 = p3 + 1;

                // First triangle
                indexList.push(p1, p3, p2);
                // Second triangle
                indexList.push(p2, p3, p4);
            }
        }
    }

    return {
        vertexList: new Float32Array(vertexList),
        indexList: new Uint16Array(indexList)
    };
}

/* Initialize the WebGL context. Called from init() */
// function initGL() {
//     let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

//     shProgram = new ShaderProgram('Basic', prog);
//     shProgram.Use();

//     shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
//     shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
//     shProgram.iColor                     = gl.getUniformLocation(prog, "color");

//     surface = new Model('Surface');
//     surface.BufferData(CreateSurfaceData());
//     gl.enable(gl.DEPTH_TEST);
// }
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");

    surface = new Model('Surface');

    // Pass both vertex and index data
    let surfaceData = CreateSurfaceData(1, 5, 0.033 * Math.PI, 0, 8 * Math.PI, 0, 1, -5, 5, 50, 50);
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
