// todo - style, allow typing in hex input for colors, sensible default palette

var canvas = document.getElementById("canvas");
var colors = [];
var luminosities = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var gl = canvas.getContext("webgl", {antialias: false, premultipliedAlpha: true });
var scale = 2;
var uploadedImage = "";

for (let i=0; i<16; i++) {
    colors[i] = [0, 0, 0,0];
    document.getElementById("color" + (i+1)).value = rgb2hex(colors[i][0], colors[i][1], colors[i][2])
    updateColor(i+1);
}

// util functions
function randColor(){
    return [Math.floor(Math.random() * 255),Math.floor(Math.random() * 255),Math.floor(Math.random() * 255)];
}

function calcLuminosity(r, g, b) { return (0.2126 * r / 255) + (0.7152 * g/255) + (0.0722 * b/255); }


function rgb2hex(red, green, blue) {
    var rgb = blue | (green << 8) | (red << 16);
    return (0x1000000 + rgb).toString(16).slice(1)
}

function hexToRGBA(hexColor){
    var h = hexColor.replace('#', '');
    h =  h.match(new RegExp('(.{'+h.length/3+'})', 'g'));
    for(var i=0; i<h.length; i++)
        h[i] = parseInt(h[i].length==1? h[i]+h[i]:h[i], 16); 
    h[4] = 255;
    return h;
}   

function colorExtract(colors){
    let result = [];
    for (let c in colors) {
        for (let att in colors[c]) {
            result.push(colors[c][att]/255);
        }
    }
    result[3] = 1;
    result[7] = 1;
    result[11] = 1;
    result[15] = 1;
    return result;
}

// ui updates 

function updateColor(colorNumber) {
    let index = parseInt(colorNumber);
    let changeText = event === undefined || event.type === "input";
    let changeInput = event === undefined || event.type === "change";
    let newColor = event === undefined ? "000000" : 
        (event.type === "input" ?  hexToRGBA(document.getElementById("color" + colorNumber).value) : 
        hexToRGBA(document.getElementById("color" + colorNumber + "-text").value));

    colors[index-1] = [newColor[0], newColor[1], newColor[2], 255];
    luminosities[index-1] = calcLuminosity(newColor[0], newColor[1], newColor[2]);

    if (changeText) {
        document.getElementById("color" + colorNumber + "-text").value = rgb2hex(newColor[0], newColor[1], newColor[2]);
    } 
    if (changeInput) {
        document.getElementById("color" + colorNumber).value = "#" + rgb2hex(newColor[0], newColor[1], newColor[2]);
    }
}

function handleImage(e){
    var reader = new FileReader();
    reader.onload = function(event){
        var img = new Image();
        img.onload = function(){
            uploadedImage = img;
            drawImage();
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(e.target.files[0]);     
}

// webgl 
function clear(gl){ gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); }

function resize(gl){ 
    canvas.width  = canvas.clientWidth / scale;
    canvas.height = canvas.clientHeight / scale;
    gl.viewport(0, 0, gl.canvas.width , gl.canvas.height ); 
};

function drawImage() {
    if (!gl || (uploadedImage === "")) { return; }
    canvas.style.height = uploadedImage.height + "px";
    canvas.style.width = uploadedImage.width + "px";
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    
    let program = wgl.shadersToProgram(gl, document.getElementById("vshader2d").text, document.getElementById("fgshader2d").text);        
    let setters = wgl.createSetters(gl, program);
    let canvasImages = {
        uploaded: {
            img: uploadedImage,
            ctx: "", 
            canvas: "",
            texture: ""
        }
    }
    wgl.loadCanvasImages(gl, canvasImages);
    let objects = [{
      scale:[1, 1],
      translation: [0, 0],
      rotation: 0,
      program: program,
      texture: canvasImages.uploaded,
      height: canvasImages.uploaded.canvas.height,
      width: canvasImages.uploaded.canvas.width,
      primitive: gl.TRIANGLES,
      offset: 0,
      count: 6,
    }]
    
    resize(gl);
    clear(gl);
    
    let unis = {},
        atts = {},
        matrix = wgl.m3.projection( gl.canvas.clientWidth, gl.canvas.clientHeight);
        
    for (let o in objects) {
        let obj = objects[o];
        gl.useProgram(obj.program);
        unis.u_textureSize = [obj.texture.canvas.width, obj.texture.canvas.height];
        
        
        let matrix2 = wgl.m3.translate(matrix, obj.translation[0], obj.translation[1]);
        matrix2 = wgl.m3.translate(matrix2, obj.width/2, obj.height/2);
        matrix2 = wgl.m3.rotate(matrix2, obj.rotation);        
        matrix2 = wgl.m3.scale(matrix2, obj.scale[0], obj.scale[1]);
        unis.u_matrix = wgl.m3.translate(matrix2, -obj.width/2, -obj.height/2);
        
        unis.u_luminosity = luminosities;
        unis.u_palette0 = colorExtract(colors.slice(0, 4));
        unis.u_palette1 = colorExtract(colors.slice(4, 8));
        unis.u_palette2 = colorExtract(colors.slice(8, 12));
        unis.u_palette3 = colorExtract(colors.slice(12, 16));


        // Set rect for object to be rendered in
        atts.a_position = {numComponents: 2, data: new Float32Array(wgl.m3.setRectangle(0, 0, obj.width, obj.height)) };
        // Sets texture coord - NOTE THIS SHOULD BE CHANGED FOR ARGUMENTS LATER FOR SPRITESHEETS
        atts.a_texCoord = {numComponents: 2, data: new Float32Array(wgl.setTextureCoord()) };
        
        // actually setting up the unis and atts 
        for (let u in unis){
          if (setters.uni[u] === undefined){ continue; } 
          setters.uni[u](unis[u]);
        }
        for (let a in atts){
          if (setters.att[a] === undefined){ continue; } 
          setters.att[a](atts[a]);
        }
        gl.bindTexture(gl.TEXTURE_2D, obj.texture.texture);
        gl.drawArrays(obj.primitive, obj.offset, obj.count);
    }

    canvas.style.height = (uploadedImage.height / scale)  + "px";
    canvas.style.width = (uploadedImage.width / scale)  + "px";
}

document.getElementById("file-input").onchange = handleImage;

