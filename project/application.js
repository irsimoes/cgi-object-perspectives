var canvas;
var gl;
var program;
var aspect;

var mProjectionLoc, mViewLoc, mModelLoc;

var visualization = false;
var zbufferOn = false, backfaceOn = false; //por remover
var scale = 1;
var xview = 0, yview = 0;
var eye;

const MENU_SIZE = 250;
const DEGREE_STRIDE = 0.5;
const FAR = 41;
const PLANE = 1;

var lightOn = true;
var mousePressed = false;

function fit_canvas_to_window() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight-MENU_SIZE;

    aspect = canvas.width / canvas.height;
    gl.viewport(0, 0,canvas.width, canvas.height);
}

window.onresize = function () {
    fit_canvas_to_window();
}

window.onload = function() {
    canvas = document.getElementById('gl-canvas');

    gl = WebGLUtils.setupWebGL(document.getElementById('gl-canvas'));
    fit_canvas_to_window();

    gl.clearColor(0.7, 0.8, 1.0, 1.0);

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    program = initShaders(gl, 'default-vertex', 'default-fragment');
    gl.useProgram(program);

    mProjectionLoc = gl.getUniformLocation(program, "mProjection");
    mModelLoc = gl.getUniformLocation(program, "mModel");
    mViewLoc = gl.getUniformLocation(program, "mView");
    mNormalsLoc = gl.getUniformLocation(program, "mNormals");
    mViewNormalsLoc = gl.getUniformLocation(program, "mViewNormals");

    mModel = mat4();
    gl.uniformMatrix4fv(mModelLoc,false,flatten(mModel));

    lightPositionLoc = gl.getUniformLocation(program, "lightPosition");
    materialAmbLoc = gl.getUniformLocation(program, "materialAmb");
    materialDifLoc = gl.getUniformLocation(program, "materialDif");
    materialSpeLoc = gl.getUniformLocation(program, "materialSpe");
    shininessLoc = gl.getUniformLocation(program, "shininess");

    lightAmbLoc = gl.getUniformLocation(program, "lightAmb");
    lightDifLoc = gl.getUniformLocation(program, "lightDif");
    lightSpeLoc = gl.getUniformLocation(program, "lightSpe");

    lightswitchLoc = gl.getUniformLocation(program, "lightswitch");
    gl.uniform1f(lightswitchLoc, 1.0);

    perspectiveLoc = gl.getUniformLocation(program, "perspective");
    gl.uniform1f(perspectiveLoc, 0.0);
    
    cubeInit(gl);
    cylinderInit(gl);
    parabInit(gl);
    sphereInit(gl);
    torusInit(gl);
   
    render();

    canvas.onmousedown = function() {
        mousePressed = true;
    }
    
    canvas.onwheel = function (event) {
        scale += event.deltaY * -0.01; // - para diminuir estar em conformidade com o rato
        scale = Math.max(Math.min(3.5, scale),0.1); //atribuir max e min
    }
}

window.onmousemove = function(event) {
    if(mousePressed && projections.value == "perspective") {
        xview = Math.max(Math.min(90, xview-DEGREE_STRIDE*event.movementY),-90);
        yview = (yview-DEGREE_STRIDE*event.movementX)%360; 
    }
}

window.onmouseup = function() {
    mousePressed = false;
}

window.onkeydown = function(event) {
    var key = String.fromCharCode(event.keyCode);
    switch (key) {
    case 'W': //malha arame
        this.visualization = false;
    break;
    case 'F': //preenchido
        this.visualization = true;
    break;
    case 'Z': //z-buffer
        if(this.zbufferOn) {
            gl.disable(gl.DEPTH_TEST);
            this.zbufferOn = false;    //por remover     
            zbStatus.innerHTML = "Off";
        } else {
            gl.enable(gl.DEPTH_TEST); 
            this.zbufferOn = true;    //por remover
            zbStatus.innerHTML = "On"; 
        }
    break;
    case 'B': //backface culling
        if(this.backfaceOn) {
            gl.disable(gl.CULL_FACE);
            this.backfaceOn = false;    //por remover
            bcStatus.innerHTML = "Off";
        } else {
            gl.enable(gl.CULL_FACE); 
            this.backfaceOn = true;     //por remover
            bcStatus.innerHTML = "On";
        }
    break;
    case 'L': //mudar 
        if(lightOn) {
            gl.uniform1f(lightswitchLoc, 0.0);
            lightOn = false;
        } else {
            gl.uniform1f(lightswitchLoc, 1.0);
            lightOn = true;
        }
    break;
    }
    
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    proj();
    draw();
    color();

    requestAnimationFrame(render);
}

function draw() {
    switch(objects.value) {
        case 'sphere':
            sphereDraw(gl,program, visualization);
        break;
        case 'cube':
            cubeDraw(gl,program, visualization);
        break;
        case 'torus':
            torusDraw(gl,program, visualization);
        break;
        case 'cylinder':
            cylinderDraw(gl,program, visualization);
        break;
        case 'paraboloid':
            parabDraw(gl,program, visualization);
        break;
    }
}

function proj() {
    var projection;
    var mView;
    var mNormals;
    var mViewNormals;

    hideDisplay();
    switch(projections.value) {
    case "orthogonal":
        orthogonalProjection.style.display = 'inline';
        projection = ortho(-2*aspect/scale,2*aspect/scale,-2/scale, 2/scale, -10/scale, 10/scale);

        switch(orthogonalProjection.value) {
            
            case "view1": //alcado principal
                mView = lookAt([0,0,1], [0,0,0], [0,1,0]);
            break;
            case "view2": //planta
                mView = lookAt([0,1,0], [0,0,0], [0,0,-1]);
            break;
            case "view3": //alcado lateral direito
                mView = lookAt([1,0,0], [0,0,0], [0,1,0]);
            break;
        }
            mNormals = inverse(transpose(mult(mView, mModel)));
            mViewNormals = inverse(transpose(mView));
            gl.uniform1f(perspectiveLoc, 0.0);
            
    break;
    case "axonometric":
        axonometricProjection.style.display = 'inline';
        projection = ortho(-2*aspect/scale,2*aspect/scale,-2/scale, 2/scale, -10/scale, 10/scale);
        var gamma;
        var theta;

        switch(axonometricProjection.value) {
            case "isometric": //isometria
                gamma = calcGamma(30, 30);
                theta = calcTheta(30, 30);
            break;
            case "dimetric": //dimetria
                gamma = calcGamma(42, 7);
                theta = calcTheta(42, 7);
            break;
            case "trimetric": //trimetria
                gamma = calcGamma(54+16/60, 23+16/60);
                theta = calcTheta(54+16/60, 23+16/60);
        
            break;
            case "free": //livre
                gammaDiv.style.display = 'inline';
                thetaDiv.style.display = 'inline';
                
                gamma = gammaInput.value;
                theta = thetaInput.value;
            break;
            }
        mView = calcAxonomEye(gamma, theta);
        mNormals = inverse(transpose(mult(mView, mModel)));
        mViewNormals = inverse(transpose(mView));
        gl.uniform1f(perspectiveLoc, 0.0);
    break;
    case "perspective":
        dDiv.style.display = 'inline';
        var d = dInput.value;
        mView = lookAt(calcEye([0,0,d,1]), [0,0,0], [0,1,0]);
        mNormals = inverse(transpose(mult(mView, mModel)));
        mViewNormals = inverse(transpose(mView));

        var near = d - PLANE;
        var v = 2/scale;
        var fovy = 2*Math.atan((v/2)/(near));
        projection = perspective(degrees(fovy), aspect, near, FAR);
        gl.uniform1f(perspectiveLoc, 1.0);   
    break;
    }

    gl.uniformMatrix4fv(mProjectionLoc, false, flatten(projection));
    gl.uniformMatrix4fv(mViewLoc, false, flatten(mView));
    gl.uniformMatrix4fv(mNormalsLoc, false, flatten(mNormals));
    gl.uniformMatrix4fv(mViewNormalsLoc, false, flatten(mViewNormals));
}

function color() {

    gl.uniform4fv(lightPositionLoc, [lightX.value, lightY.value, lightZ.value, lightSource.value]);
    gl.uniform3fv(materialAmbLoc, [kaX.value, kaY.value, kaZ.value]);
    gl.uniform3fv(materialDifLoc, [kdX.value, kdY.value, kdZ.value]);
    gl.uniform3fv(materialSpeLoc, [ksX.value, ksY.value, ksZ.value]);
    gl.uniform1f(shininessLoc, shininess.value);
    gl.uniform3fv(lightAmbLoc, [iaX.value, iaY.value, iaZ.value]);
    gl.uniform3fv(lightDifLoc, [idX.value, idY.value, idZ.value]);
    gl.uniform3fv(lightSpeLoc, [isX.value, isY.value, isZ.value]);

}

function hideDisplay() {    
    axonometricProjection.style.display = 'none';
    orthogonalProjection.style.display = 'none';
    dDiv.style.display = 'none';
    gammaDiv.style.display = 'none';
    thetaDiv.style.display = 'none'; 
}

function degrees(radians) {
    return radians/(Math.PI / 180.0);
}

function calcTheta(a, b) { 
    return degrees(Math.atan(Math.sqrt(Math.tan(radians(a))/Math.tan(radians(b)))) - Math.PI/2);
}

function calcGamma(a, b) {
    return degrees(Math.asin(Math.sqrt(Math.tan(radians(a))*Math.tan(radians(b)))));
}

function calcAxonomEye(gamma, theta) {

    var eye = mult(rotateX(-gamma), [0,0,1,1]);
    eye = mult(rotateY(-theta), eye);

    var view = lookAt( [eye[0], eye[1], eye[2]], [0,0,0] , [0,1,0]);
    return view;
}

function calcEye(vec) {
    var eye = mult(rotateX(xview), vec);
    eye = mult(rotateY(yview), eye);

    return [eye[0], eye[1], eye[2]];
}