var parab_points = [];
var parab_normals = [];
var parab_faces = [];
var parab_edges = [];

var parab_points_buffer;
var parab_normals_buffer;
var parab_faces_buffer;
var parab_edges_buffer;

var PARAB_LATS=20;
var PARAB_LONS=30;

function parabInit(gl, nlat, nlon) {
    nlat = nlat | PARAB_LATS;
    nlon = nlon | PARAB_LONS;
    parabBuild(nlat, nlon);
    parabUploadData(gl);
}

// Generate points using polar coordinates
function parabBuild(nlat, nlon) 
{
    // phi will be latitude
    // theta will be longitude
 
    var d_phi = Math.PI/2 / (nlat);                 //passou a ter metade do tamanho 
    var d_theta = 2*Math.PI / nlon;
    var r = 0.8;
    
   
   // Generate north polar cap                    //o polo norte passou a ser o centro do paraboloide
    var north = vec3(0,0,0);
    parab_points.push(north);
    parab_normals.push(vec3(0,1,0));
    
    
    
    
    
    // Generate middle
    for(var i=1, phi=Math.PI/2-d_phi; i<nlat; i++, phi-=d_phi) {
        for(var j=0, theta=0; j<nlon; j++, theta+=d_theta) {
            var pt = vec3(r*Math.cos(theta)*Math.sin(phi),(r*Math.cos(theta)*Math.sin(phi))*(r*Math.cos(theta)*Math.sin(phi))+(r*Math.sin(theta)*Math.sin(phi))*(r*Math.sin(theta)*Math.sin(phi)),r*Math.sin(theta)*Math.sin(phi));
            parab_points.push(pt);
            var n = vec3(pt);
            parab_normals.push(normalize(n));
        }
    }
    
    /*
    // Generate norh south cap
    var south = vec3(0,0,0);
    parab_points.push(south);
    parab_normals.push(vec3(0,-1,0));
    */
    
    
    // Generate the faces
    
    // north pole faces
    for(var i=0; i<nlon-1; i++) {
        parab_faces.push(0);
        parab_faces.push(i+nlat*(nlon-1)+2);           //esta linha e a de baixo deixaram de ligar o polo norte com a primeira linha e
        parab_faces.push(i+nlat*(nlon-1)+1);           //passaram a ligar com a ultima linha. nlat*(nlon-1) da a penultima
    }
    
    
    /*parab_faces.push(0);
    parab_faces.push(1);
    parab_faces.push(nlon);
    */
    
    
    // general middle faces
    var offset=1;
    
    for(var i=0; i<nlat-1; i++) {
        for(var j=0; j<nlon-1; j++) {
            var p = offset+i*nlon+j;
            parab_faces.push(p);
            parab_faces.push(p+nlon+1);
            parab_faces.push(p+nlon);
            
            parab_faces.push(p);
            parab_faces.push(p+1);
            parab_faces.push(p+nlon+1);
            
            
        }
        var p = offset+i*nlon+nlon-1;
        parab_faces.push(p);
        parab_faces.push(p+1);
        parab_faces.push(p+nlon);

        parab_faces.push(p);
        parab_faces.push(p-nlon+1);
        parab_faces.push(p+1);
        
         
    }
    
    /*
    // south pole faces
    var offset = 1 + (nlat-1) * nlon;
    for(var j=0; j<nlon-1; j++) {
        parab_faces.push(offset+nlon);
        parab_faces.push(offset+j);
        parab_faces.push(offset+j+1);
    }
    parab_faces.push(offset+nlon);
    parab_faces.push(offset+nlon-1);
    parab_faces.push(offset);
 */
    
    //Build the edges
    for(var i=0; i<nlon; i++) {
        parab_edges.push(0);   // North pole 
        parab_edges.push(i+nlat*(nlon-1));    //tal como em cima as edges sao criadas com triangulos entre o polo norte e a ultima linha
    }

   for(var i=0; i<nlat; i++, p++) {
        for(var j=0; j<nlon;j++, p++) {
            var p = 1 + i*nlon + j; 
            parab_edges.push(p);   // horizontal line (same latitude)
            if(j!=nlon-1) 
                parab_edges.push(p+1);
            else parab_edges.push(p+1-nlon);
            
            if(i!=nlat-1) {
                parab_edges.push(p);   // vertical line (same longitude)
                parab_edges.push(p+nlon);
            }
            else {                                             //linha antes removida mas voltei a por
                parab_edges.push(p);
                parab_edges.push(parab_points.length-1);
            }
        }
    }
    
}

function parabUploadData(gl)
{
    parab_points_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, parab_points_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(parab_points), gl.STATIC_DRAW);
    
    parab_normals_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, parab_normals_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(parab_normals), gl.STATIC_DRAW);
    
    parab_faces_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, parab_faces_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(parab_faces), gl.STATIC_DRAW);
    
    parab_edges_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, parab_edges_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(parab_edges), gl.STATIC_DRAW);
}

function parabDrawWireFrame(gl, program)
{    
    gl.useProgram(program);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, parab_points_buffer);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, parab_normals_buffer);
    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, parab_edges_buffer);
    gl.drawElements(gl.LINES, parab_edges.length, gl.UNSIGNED_SHORT, 0);
}

function parabDrawFilled(gl, program)
{
    gl.useProgram(program);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, parab_points_buffer);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, parab_normals_buffer);
    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, parab_faces_buffer);
    gl.drawElements(gl.TRIANGLES, parab_faces.length, gl.UNSIGNED_SHORT, 0);
}

function parabDraw(gl, program, filled=false) {
	if(filled) parabDrawFilled(gl, program);
	else parabDrawWireFrame(gl, program);
}