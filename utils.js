var utils = (function (){


  // Set of functions for loading canvas onto images so it can be run without a localhost.
  function loadCanvasImages(gl, canvasImages) {
    let keys = Object.keys(canvasImages);
    for (let k in keys) {
      let kkey = keys[k];
      if (canvasImages[kkey].img === undefined ){ continue; }
      let img = canvasImages[kkey].img;
      let ctx = document.createElement('canvas').getContext("2d");
      setCanvasImage(ctx, img);
      canvasImages[kkey].ctx = ctx;
      canvasImages[kkey].canvas = ctx.canvas;
      canvasImages[kkey].texture = blankTexture(gl);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ctx.canvas);
    }
  }

  function setCanvasImage(ctx, img) {
    // sets canvas image for a 2d canvas. called by loadCanvasImages only
    ctx.canvas.width = img.width;
    ctx.canvas.height = img.height;
    ctx.width = img.width;
    ctx.height = img.height;
    ctx.drawImage(img, 0, 0); 
  }

  function blankTexture(gl) {
    // creates a texture. Called by loadCanvasImages only
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return texture;
  }

  // Makes setters for shader attributes
  function createASetter(gl, location){
    var buffer = gl.createBuffer();
    return function(b) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(// instead of float maybe get it from the b.data.type
        location, b.numComponents || b.data.size, b.type || gl.FLOAT, b.normalize || false, b.stride || 0, b.offset || 0);
      gl.bufferData(gl.ARRAY_BUFFER, (b.data), gl.STATIC_DRAW)
    };
  }    
  function getBindPointForSamplerType(gl, type) {
    if (type === gl.SAMPLER_2D)   return gl.TEXTURE_2D;        // eslint-disable-line
    if (type === gl.SAMPLER_CUBE) return gl.TEXTURE_CUBE_MAP;  // eslint-disable-line
    return undefined;
  }
  function createUSetter(gl, program, uniform){
    var n=program; 
    let textureUnit = 0;
    let i=uniform;
    const r=gl.getUniformLocation(n,i.name),t=i.type,f=i.size>1&&"[0]"===i.name.substr(-3);if(t===gl.FLOAT&&f)return function(n){gl.uniform1fv(r,n)};if(t===gl.FLOAT)return function(n){gl.uniform1f(r,n)};if(t===gl.FLOAT_VEC2)return function(n){gl.uniform2fv(r,n)};if(t===gl.FLOAT_VEC3)return function(n){gl.uniform3fv(r,n)};if(t===gl.FLOAT_VEC4)return function(n){gl.uniform4fv(r,n)};if(t===gl.INT&&f)return function(n){gl.uniform1iv(r,n)};if(t===gl.INT)return function(n){gl.uniform1i(r,n)};if(t===gl.INT_VEC2)return function(n){gl.uniform2iv(r,n)};if(t===gl.INT_VEC3)return function(n){gl.uniform3iv(r,n)};if(t===gl.INT_VEC4)return function(n){gl.uniform4iv(r,n)};if(t===gl.BOOL)return function(n){gl.uniform1iv(r,n)};if(t===gl.BOOL_VEC2)return function(n){gl.uniform2iv(r,n)};if(t===gl.BOOL_VEC3)return function(n){gl.uniform3iv(r,n)};if(t===gl.BOOL_VEC4)return function(n){gl.uniform4iv(r,n)};if(t===gl.FLOAT_MAT2)return function(n){gl.uniformMatrix2fv(r,!1,n)};if(t===gl.FLOAT_MAT3)return function(n){gl.uniformMatrix3fv(r,!1,n)};if(t===gl.FLOAT_MAT4)return function(n){gl.uniformMatrix4fv(r,!1,n)};if((t===gl.SAMPLER_2D||t===gl.SAMPLER_CUBE)&&f){const n=[];for(let i=0;i<info.size;++i)n.push(textureUnit++);return u=getBindPointForSamplerType(gl,t),n=n,function(i){gl.uniform1iv(r,n),i.forEach(function(i,r){gl.activeTexture(gl.TEXTURE0+n[r]),gl.bindTexture(u,i)})}}var u,o;if(t===gl.SAMPLER_2D||t===gl.SAMPLER_CUBE)return function(n,i){return function(t){gl.uniform1i(r,i),gl.activeTexture(gl.TEXTURE0+i),gl.bindTexture(n,t)}}(getBindPointForSamplerType(gl,t),textureUnit++);throw"unknown type: 0x"+t.toString(16)};
  
  function createSetters(gl, program){
    var atts = {}, 
        unis = {}, 
        numUnis = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS), 
        numAtts = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    for (let u=0; u<numUnis; u++){ 
      let info = gl.getActiveUniform(program, u);
      if (!info) { break; }
      let name = info.name;
      name = name.substr(-3) === "[0]" ? name.substr(0, name.length-3) : name;
      unis[name] = createUSetter(gl, program, info);
    }    
    for (let a=0; a<numAtts; a++) {
      let info = gl.getActiveAttrib(program, a);
      if (!info) { break; }
    let name = info.name;
      let location = gl.getAttribLocation(program, name)
      atts[name] = createASetter(gl, location);
    }
    return {att: atts, uni: unis}
  }

  // rearranges rectangle into a... projection?
  function setRectangle(x1, y1, width, height) {
    var x2 = x1 + width;
    var y2 = y1 + height;
    return [
      x1, y1,
      x2, y1,
      x1, y2,
      x1, y2,
      x2, y1,
      x2, y2
    ];
  } 

  // random colors
  function randColor(){
      return [Math.floor(Math.random() * 255),Math.floor(Math.random() * 255),Math.floor(Math.random() * 255)];
  }

  function calcLuminosity(r, g, b) { return (0.2126 * r / 255) + (0.7152 * g/255) + (0.0722 * b/255); }

  function rgb2hex(red, green, blue) {
      var rgb = blue | (green << 8) | (red << 16);
      return (0x1000000 + rgb).toString(16).slice(1)
  }

  function hex2rgb(hexColor){
      var h = hexColor.replace('#', '');
      h =  h.match(new RegExp('(.{'+h.length/3+'})', 'g'));
      for(var i=0; i<h.length; i++)
          h[i] = parseInt(h[i].length==1? h[i]+h[i]:h[i], 16); 
      h[4] = 255;
      return h;
  }   

  // extracts colors and formats them into 4x4 matrix format for shaders
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
  return {
    loadCanvasImages: loadCanvasImages,
    createSetters: createSetters,
    setRectangle: setRectangle,
    randColor: randColor,
    calcLuminosity: calcLuminosity,
    rgb2hex: rgb2hex,
    hex2rgb: hex2rgb,
    colorExtract: colorExtract,
  }
})();