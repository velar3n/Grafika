const vertexShaderTxt = `
    precision mediump float;

    attribute vec3 vertPosition;
    attribute vec3 vertColor;

    varying vec3 fragColor;

    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;

    void main()
    {
        fragColor = vertColor;
        gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);
    }

`

const fragmentShaderTxt = `
    precision mediump float;

    varying vec3 fragColor;

    void main()
    {
        gl_FragColor = vec4(fragColor, 1.0);
    }
`

const mat4 = glMatrix.mat4;

class World {
    #gl;
    #canvas;
    #backgroundColor;
    #program;

    // constructor
    constructor(id, backgroundColor) {
        this.#canvas = document.getElementById(id);
        this.#gl = this.#canvas.getContext("webgl");
        this.#backgroundColor = backgroundColor;
        this.#program = this.#gl.createProgram();
        this.prepareBackGround();
    }

    // prepares the background, so it can be correctly used later
    prepareBackGround() {
        const gl = this.#gl;
        gl.clearColor(...this.#backgroundColor, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
    }

    // sets the color of the background and clears the buffer
    set background(backgroundColor) {
        const gl = this.#gl;
        this.#backgroundColor = backgroundColor;
        gl.clearColor(...this.#backgroundColor, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    // prepares and loads the shaders and links them to the program
    loadShaders() {
        const gl = this.#gl;

        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderTxt);
        gl.compileShader(vertexShader);
        gl.attachShader(this.#program, vertexShader);

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentShaderTxt);
        gl.compileShader(fragmentShader);
        gl.attachShader(this.#program, fragmentShader);

        gl.linkProgram(this.#program);
    }

    // creates and sets up a buffer object
    prepareBuffer(type, name) {
        const gl = this.#gl;
        const bufferObject = gl.createBuffer();
        if (name == 'VERTEX' || name == 'COLOR') {
            gl.bindBuffer(gl.ARRAY_BUFFER, bufferObject);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(type), gl.STATIC_DRAW);
        }
        if (name == 'INDICE') {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferObject);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(type), gl.STATIC_DRAW);
        }
    }

    // sets attribute pointer
    attribPointer(location) {
        const gl = this.#gl;
        gl.vertexAttribPointer(
            location,
            3,
            gl.FLOAT,
            gl.FALSE,
            3 * Float32Array.BYTES_PER_ELEMENT,
            0 * Float32Array.BYTES_PER_ELEMENT,
        );
    }

    // sets up attribute pointers for the buffer
    loadObject(vertices, colors, indices = null) {
        const gl = this.#gl;
        this.prepareBuffer(vertices, 'VERTEX');
        
        if (indices != null) {
            this.prepareBuffer(indices, 'INDICE');
        }

        const posAttrLocation = gl.getAttribLocation(this.#program, 'vertPosition');
        this.attribPointer(posAttrLocation);
        gl.enableVertexAttribArray(posAttrLocation);
        
        this.prepareBuffer(colors, 'COLOR');
        const colorAttrLocation = gl.getAttribLocation(this.#program, 'vertColor');
        this.attribPointer(colorAttrLocation);

        gl.enableVertexAttribArray(colorAttrLocation);
    }
    
    // runs the program
    run(vertices, colors, indices = null) {
        const gl = this.#gl;
        const program = this.#program;
        const canvas = this.#canvas;

        this.loadShaders();
        this.loadObject(vertices, colors, indices);
        gl.useProgram(program);

        const matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
        const matViewUniformLocation = gl.getUniformLocation(program, 'mView');
        const matProjUniformLocation = gl.getUniformLocation(program, 'mProj');

        let worldMatrix = mat4.create();
        let worldMatrix2 = mat4.create();
        let viewMatrix = mat4.create();
        mat4.lookAt(viewMatrix, [0, 0, -8], [0, 0, 0], [0, 1, 0]);
        let projMatrix = mat4.create();
        mat4.perspective(projMatrix, glMatrix.glMatrix.toRadian(45), canvas.width / canvas.clientHeight, 0.1, 1000.0);

        gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
        gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
        gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, projMatrix);

        let rotationMatrix = new Float32Array(16);
        let translationMatrix = new Float32Array(16);
        let angle = 0;
        const loop = function () {
            angle = performance.now() / 1000 / 8 * 3 * Math.PI;
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            mat4.fromRotation(rotationMatrix, angle, [1, 1, 0]);
            mat4.fromTranslation(translationMatrix, [-1, -1, 0]);
            mat4.mul(worldMatrix, translationMatrix, rotationMatrix);
            gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
            gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

            rotationMatrix = new Float32Array(16);
            translationMatrix = new Float32Array(16);

            mat4.fromRotation(rotationMatrix, angle / 2, [1, 1, 1]);
            mat4.fromTranslation(translationMatrix, [1.2, 1.2, 0]);
            mat4.mul(worldMatrix2, translationMatrix, rotationMatrix);
            gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix2);
            gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
    }
}


// main function creating the cube out of triangles
let Triangle = function () {
    let world = new World('main-canvas', [0.5, 0.5, 0.7]);

    var boxVertices = [
            // Top
            -1.0, 1.0, -1.0,
            -1.0, 1.0, 1.0,
            1.0, 1.0, 1.0,
            1.0, 1.0, -1.0,

            // Left
            -1.0, 1.0, 1.0,
            -1.0, -1.0, 1.0,
            -1.0, -1.0, -1.0,
            -1.0, 1.0, -1.0,

            // Right
            1.0, 1.0, 1.0,
            1.0, -1.0, 1.0,
            1.0, -1.0, -1.0,
            1.0, 1.0, -1.0,

            // Front
            1.0, 1.0, 1.0,
            1.0, -1.0, 1.0,
            -1.0, -1.0, 1.0,
            -1.0, 1.0, 1.0,

            // Back
            1.0, 1.0, -1.0,
            1.0, -1.0, -1.0,
            -1.0, -1.0, -1.0,
            -1.0, 1.0, -1.0,

            // Bottom
            -1.0, -1.0, -1.0,
            -1.0, -1.0, 1.0,
            1.0, -1.0, 1.0,
            1.0, -1.0, -1.0,
        ];

    let colors = [
        // R, G, B
        0.5, 0.5, 0.5,
        0.5, 0.5, 0.5,
        0.5, 0.5, 0.5,
        0.5, 0.5, 0.5,

        0.75, 0.25, 0.5,
        0.75, 0.25, 0.5,
        0.75, 0.25, 0.5,
        0.75, 0.25, 0.5,

        0.25, 0.25, 0.75,
        0.25, 0.25, 0.75,
        0.25, 0.25, 0.75,
        0.25, 0.25, 0.75,

        1.0, 0.0, 0.15,
        1.0, 0.0, 0.15,
        1.0, 0.0, 0.15,
        1.0, 0.0, 0.15,

        0.0, 1.0, 0.15,
        0.0, 1.0, 0.15,
        0.0, 1.0, 0.15,
        0.0, 1.0, 0.15,

        0.5, 0.5, 1.0,
        0.5, 0.5, 1.0,
        0.5, 0.5, 1.0,
        0.5, 0.5, 1.0,
    ]

    var boxIndices = [
            // Top
            0, 1, 2,
            0, 2, 3,

            // Left
            5, 4, 6,
            6, 4, 7,

            // Right
            8, 9, 10,
            8, 10, 11,

            // Front
            13, 12, 14,
            15, 14, 12,

            // Back
            16, 17, 18,
            16, 18, 19,

            // Bottom
            21, 20, 22,
            22, 20, 23
        ];

    // run declared functions
    world.run(boxVertices, colors, boxIndices);
}
