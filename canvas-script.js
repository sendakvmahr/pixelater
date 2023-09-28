// todo - style, allow typing in hex input for colors, sensible default palette

var canvas = document.getElementById("canvas-pass-1");
var colors = [];
var luminosities = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var gl = canvas.getContext("webgl", {antialias: false, premultipliedAlpha: true });
var scale = 5;
var uploadedImage = "";

var presetPalettes = {
    "default_blue": [
        "000000", "1a1538", "1f2e67", "313e3f",
        "3a4ca5", "3d5b5a", "5d6d5e", "2e8260",
        "6c8288", "70a39d", "62cbd8", "c4c4a7",
        "96e3a8", "ffedbb", "ffffff", "ffffff"
    ]
};

loadPalette("default_blue")

// ui updates 

function loadPalette(palette) {
    for (let i=0; i<16; i++) {
        colors[i] = utils.hex2rgb(presetPalettes[palette][i]);
        document.getElementById("color" + (i+1)).value = utils.rgb2hex(colors[i][0], colors[i][1], colors[i][2])
        updateColor(i+1);
    }
}

function updateColor(colorNumber) {
    let index = parseInt(colorNumber);
    let changeText = event === undefined || event.type === "input";
    let changeInput = event === undefined || event.type === "change";
    var newColor;
    if (event === undefined) { // palette load
        newColor = colors[index - 1];
    } else if (event.type === "input") {
        newColor = utils.hex2rgb(document.getElementById("color" + colorNumber).value);
    } else {
        newColor = utils.hex2rgb(document.getElementById("color" + colorNumber + "-text").value);
    }

    colors[index-1] = [newColor[0], newColor[1], newColor[2], 255];
    luminosities[index-1] = utils.calcLuminosity(newColor[0], newColor[1], newColor[2]);

    if (changeText) {
        document.getElementById("color" + colorNumber + "-text").value = utils.rgb2hex(newColor[0], newColor[1], newColor[2]);
    } 
    if (changeInput) {
        document.getElementById("color" + colorNumber).value = "#" + utils.rgb2hex(newColor[0], newColor[1], newColor[2]);
    }
    if (uploadedImage) {
        drawImage();
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

function resizeAll(w, h) {
    let canvases = document.getElementsByTagName("canvas");
    for (let elKey in Array.from(document.getElementsByTagName("canvas"))) {
        canvases[elKey].style.height = h  + "px";
        canvases[elKey].style.width = w  + "px";
    }
    document.getElementById("canvas-container").style.height = h  + "px";
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

    // Pixeling
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    
    let program = webglUtils.createProgramFromScripts(gl, ["vshader2d", "fgshader2d"]);
    gl.useProgram(program);

    let setters = utils.createSetters(gl, program);

    let canvasImages = {
        uploaded: {
            img: uploadedImage,
            ctx: "", 
            canvas: "",
            texture: ""
        }
    }
    utils.loadCanvasImages(gl, canvasImages);
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
        matrix = m3.projection( gl.canvas.clientWidth, gl.canvas.clientHeight);
        
    for (let o in objects) {
        let obj = objects[o];
        //gl.useProgram(obj.program);
        unis.u_textureSize = [obj.texture.canvas.width, obj.texture.canvas.height];
        
        
        let matrix2 = m3.translate(matrix, obj.translation[0], obj.translation[1]);
        matrix2 = m3.translate(matrix2, obj.width/2, obj.height/2);
        matrix2 = m3.rotate(matrix2, obj.rotation);        
        matrix2 = m3.scale(matrix2, obj.scale[0], obj.scale[1]);
        unis.u_matrix = m3.translate(matrix2, -obj.width/2, -obj.height/2);
        
        unis.u_luminosity = luminosities;
        unis.u_palette0 = utils.colorExtract(colors.slice(0, 4));
        unis.u_palette1 = utils.colorExtract(colors.slice(4, 8));
        unis.u_palette2 = utils.colorExtract(colors.slice(8, 12));
        unis.u_palette3 = utils.colorExtract(colors.slice(12, 16));


        // Set rect for object to be rendered in
        atts.a_position = {numComponents: 2, data: new Float32Array(utils.setRectangle(0, 0, obj.width, obj.height)) };
        // Sets texture coord - NOTE THIS SHOULD BE CHANGED FOR ARGUMENTS LATER FOR SPRITESHEETS
        atts.a_texCoord = {numComponents: 2, data: new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]) };
        
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

    let maxCanvasWidth = Math.round(window.innerWidth / 3);
    if (uploadedImage.width <= maxCanvasWidth) {
        resizeAll((uploadedImage.width), (uploadedImage.height));
    } else {
        resizeAll(maxCanvasWidth, (Math.round((maxCanvasWidth * uploadedImage.height)/uploadedImage.width)));
    }
}

document.getElementById("file-input").onchange = handleImage;
