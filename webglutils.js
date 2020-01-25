var wgl = (function () {
  function CORSImageLoad(img, url) {
    if ((new URL(url)).origin !== window.location.origin) {
      img.crossOrigin = "";
    }
    img.src = url;
  }
  /*************** WEBGL STUFF ***************/
  function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) { return shader; }
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
  }
  
  function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) { return program; }
    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
  }
  function shadersToProgram(gl, vSource, fSource){
    let vShader = createShader(gl, gl.VERTEX_SHADER, vSource);
    let fShader = createShader(gl, gl.FRAGMENT_SHADER, fSource);
    return createProgram(gl, vShader, fShader);
  }
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
  function createUSetter(gl, program, uniform){var n=program; let textureUnit = 0;i=uniform;const r=gl.getUniformLocation(n,i.name),t=i.type,f=i.size>1&&"[0]"===i.name.substr(-3);if(t===gl.FLOAT&&f)return function(n){gl.uniform1fv(r,n)};if(t===gl.FLOAT)return function(n){gl.uniform1f(r,n)};if(t===gl.FLOAT_VEC2)return function(n){gl.uniform2fv(r,n)};if(t===gl.FLOAT_VEC3)return function(n){gl.uniform3fv(r,n)};if(t===gl.FLOAT_VEC4)return function(n){gl.uniform4fv(r,n)};if(t===gl.INT&&f)return function(n){gl.uniform1iv(r,n)};if(t===gl.INT)return function(n){gl.uniform1i(r,n)};if(t===gl.INT_VEC2)return function(n){gl.uniform2iv(r,n)};if(t===gl.INT_VEC3)return function(n){gl.uniform3iv(r,n)};if(t===gl.INT_VEC4)return function(n){gl.uniform4iv(r,n)};if(t===gl.BOOL)return function(n){gl.uniform1iv(r,n)};if(t===gl.BOOL_VEC2)return function(n){gl.uniform2iv(r,n)};if(t===gl.BOOL_VEC3)return function(n){gl.uniform3iv(r,n)};if(t===gl.BOOL_VEC4)return function(n){gl.uniform4iv(r,n)};if(t===gl.FLOAT_MAT2)return function(n){gl.uniformMatrix2fv(r,!1,n)};if(t===gl.FLOAT_MAT3)return function(n){gl.uniformMatrix3fv(r,!1,n)};if(t===gl.FLOAT_MAT4)return function(n){gl.uniformMatrix4fv(r,!1,n)};if((t===gl.SAMPLER_2D||t===gl.SAMPLER_CUBE)&&f){const n=[];for(let i=0;i<info.size;++i)n.push(textureUnit++);return u=getBindPointForSamplerType(gl,t),n=n,function(i){gl.uniform1iv(r,n),i.forEach(function(i,r){gl.activeTexture(gl.TEXTURE0+n[r]),gl.bindTexture(u,i)})}}var u,o;if(t===gl.SAMPLER_2D||t===gl.SAMPLER_CUBE)return function(n,i){return function(t){gl.uniform1i(r,i),gl.activeTexture(gl.TEXTURE0+i),gl.bindTexture(n,t)}}(getBindPointForSamplerType(gl,t),textureUnit++);throw"unknown type: 0x"+t.toString(16)};
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
  
  function resizeCanvasToDisplaySize(canvas) {
    canvas.width  = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }
  function loadAttributesAndBuffers(gl, anb, program){	
    let keys = Object.keys(anb);
    for (let k in keys) {
      let obj = anb[keys[k]];
      obj.location = gl.getAttribLocation(program, keys[k]);
      obj.buffer = gl.createBuffer();
      gl.enableVertexAttribArray(obj.location);
      setBuffer(gl, obj);
      configVAttribPointer(gl, obj)
    }
  }
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
  
  function setCanvasText(obj, canvasInfo, mainCanvas){
    let ctx = canvasInfo.ctx;
	ctx.canvas.width = canvasInfo.width * mainCanvas.clientWidth;
    ctx.font = canvasInfo.font;
    let words = canvasInfo.text.split(" "), 
        line = "",
        x = 0, y = canvasInfo.lineHeight,
        lines = [],
        maxWidth = ctx.canvas.width;
    for(var n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ',
          metrics = ctx.measureText(testLine),
          testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        lines.push(line);
        line = words[n] + ' ';
        y += canvasInfo.lineHeight;
      }
      else { line = testLine; }
    }
    lines.push(line);
    ctx.canvas.height = y;
    canvasInfo.height = y;
    let bgColor = canvasInfo.bgColor;
    if (bgColor !== undefined && bgColor !== null) {
      ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = bgColor;
      ctx.fill();
    } else {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    ctx.fillStyle = canvasInfo.color;
    ctx.font = canvasInfo.font;
    for (let l in lines) {
    	ctx.fillText(lines[l], 0, canvasInfo.lineHeight*(parseInt(l)+1));
    }
    obj.height = canvasInfo.height;
    obj.width = ctx.canvas.width;
  }
  
  function reloadCanvasText(gl, obj, mainCanvas){
  	setCanvasText(obj, obj.texture, mainCanvas);
    gl.bindTexture(gl.TEXTURE_2D, obj.texture.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, obj.texture.canvas);
  }
  
  function loadCanvasText(gl, objects, mainCanvas){
    let keys = Object.keys(objects);
    for (let k in keys) {
      let obj = objects[keys[k]];
      if (obj.texture.text === undefined) { continue; }
      let ctx = document.createElement('canvas',  {alpha: true} ).getContext("2d");
      obj.texture.ctx = ctx;
      setCanvasText(obj, obj.texture, mainCanvas);
      obj.texture.canvas = ctx.canvas;
	  let texture = gl.createTexture();
      obj.texture.texture = blankTexture(gl);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, obj.texture.canvas);
    }
  }
  function loadUnis(gl, program, unis) {
    var keys  = Object.keys(unis);
    for (let k in keys) {
      unis[keys[k]] = gl.getUniformLocation(program, unis[keys[k]]);
    }
  }

  function setBuffer(gl, att){ gl.bindBuffer(gl.ARRAY_BUFFER, att.buffer); }

  function setTextureCoord() {
    return[
      0.0,  0.0,
      1.0,  0.0,
      0.0,  1.0,
      0.0,  1.0,
      1.0,  0.0,
      1.0,  1.0
    ]
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
  function setCanvasImage(ctx, img) {
    // sets canvas image for a 2d canvas. called by loadCanvasImages only
    ctx.canvas.width = img.width;
    ctx.canvas.height = img.height;
    ctx.width = img.width;
    ctx.height = img.height;
    ctx.drawImage(img, 0, 0); 
  }

  function configVAttribPointer(gl, att) {
    // setup helper function loadAttributesAndBuffers
    gl.vertexAttribPointer(att.location, att.numComponents, att.type, att.normalize, att.stride, att.offset)
  }
  function loader(images, renderStartFunction){
    let keys = Object.keys(images);
    let leftLoading = keys.length
    for (let i in keys) {
      let k = keys[i];
      var img = new Image();
      img.onload = function() {
        images[k] = img;
        leftLoading--;
        if (leftLoading === 0) {
          renderStartFunction(images);
        }
      }
      CORSImageLoad(img, images[k]);
    }
  }  
  /*************** MATRIX STUFF ***************/
  // rewrite using https://github.com/hiddentao/linear-algebra later
  // 2d
  var m3 = (function () {
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

    function projection(width, height) {
      return [2/width, 0, 0, 0, -2/height, 0, -1, 1, 1];
    }
    function translation(dx, dy) {
      return [1, 0, 0, 0, 1, 0, dx, dy, 1];
    }
    function rotation(angleR) { 
      var c = Math.cos(angleR), s = Math.sin(angleR);
      return [c,-s, 0, s, c, 0, 0, 0, 1];
    }
    function scalem(dx, dy){
      return [dx, 0, 0, 0, dy, 0, 0, 0, 1];
    }
    function multiply(n,r){
      var t=n[0],u=n[1],i=n[2],l=n[3],a=n[4],c=n[5],e=n[6],f=n[7],m=n[8],o=r[0],p=r[1],v=r[2],y=r[3],b=r[4],d=r[5],g=r[6],h=r[7],j=r[8];return[o*t+p*l+v*e,o*u+p*a+v*f,o*i+p*c+v*m,y*t+b*l+d*e,y*u+b*a+d*f,y*i+b*c+d*m,g*t+h*l+j*e,g*u+h*a+j*f,g*i+h*c+j*m]
    }
    function translate(m, dx, dy){ return multiply(m, translation(dx, dy)); };
    function rotate(m, radians){ return multiply(m, rotation(radians)); };
    function scale(m, sx, sy){ return multiply(m, scalem(sx, sy)); };
    return {
      setRectangle: setRectangle,
      projection: projection,
      translation: translation,
      rotation: rotation,
      scalem: scalem,
      translate: translate,
      rotate: rotate,
      scale: scale,
      multiply: multiply
  	}
  })();
  // 3d
  var m4 = (function () {
    function normalize(v, n) {
      n = n || new Float32Array(3);
      var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
      if (l > 0.00001) {
        n[0] = v[0] / l;
        n[1] = v[1] / l;
        n[2] = v[2] / l; }
      return n;
    }
    function translation(dx, dy, dz) {
      return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, dx, dy, dz, 1];
    }
    function rotationX(angleR) { 
      var c = Math.cos(angleR), s = Math.sin(angleR);
      return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
    }
    function rotationY(angleR) { 
      var c = Math.cos(angleR), s = Math.sin(angleR);
      return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
    }
    function rotationZ(angleR) { 
      var c = Math.cos(angleR), s = Math.sin(angleR);
      return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    }
    function scalem(dx, dy, dz){
      return [dx, 0, 0, 0, 0, dy, 0, 0, 0, 0, dz, 0, 0, 0, 0, 1];
    }
    function multiply(n,r){
      var t=n[0],u=n[1],i=n[2],l=n[3],a=n[4],c=n[5],e=n[6],f=n[7],m=n[8],o=n[9],p=n[10],v=n[11],y=n[12],b=n[13],d=n[14],g=n[15],h=r[0],j=r[1],k=r[2],q=r[3],s=r[4],w=r[5],x=r[6],z=r[7],A=r[8],B=r[9],C=r[10],D=r[11],E=r[12],F=r[13],G=r[14],H=r[15];
      return[h*t+j*a+k*m+q*y,h*u+j*c+k*o+q*b,h*i+j*e+k*p+q*d,h*l+j*f+k*v+q*g,s*t+w*a+x*m+z*y,s*u+w*c+x*o+z*b,s*i+w*e+x*p+z*d,s*l+w*f+x*v+z*g,A*t+B*a+C*m+D*y,A*u+B*c+C*o+D*b,A*i+B*e+C*p+D*d,A*l+B*f+C*v+D*g,E*t+F*a+G*m+H*y,E*u+F*c+G*o+H*b,E*i+F*e+G*p+H*d,E*l+F*f+G*v+H*g]
    }
	function inverse(r,n){n=n||new Float32Array(16);var e=r[0],a=r[1],t=r[2],i=r[3],o=r[4],u=r[5],v=r[6],c=r[7],f=r[8],l=r[9],s=r[10],w=r[11],y=r[12],A=r[13],F=r[14],b=r[15],d=s*b,g=F*w,h=v*b,j=F*c,k=v*w,m=s*c,p=t*b,q=F*i,x=t*w,z=s*i,B=t*c,C=v*i,D=f*A,E=y*l,G=o*A,H=y*u,I=o*l,J=f*u,K=e*A,L=y*a,M=e*l,N=f*a,O=e*u,P=o*a,Q=d*u+j*l+k*A-(g*u+h*l+m*A),R=g*a+p*l+z*A-(d*a+q*l+x*A),S=h*a+q*u+B*A-(j*a+p*u+C*A),T=m*a+x*u+C*l-(k*a+z*u+B*l),U=1/(e*Q+o*R+f*S+y*T);return n[0]=U*Q,n[1]=U*R,n[2]=U*S,n[3]=U*T,n[4]=U*(g*o+h*f+m*y-(d*o+j*f+k*y)),n[5]=U*(d*e+q*f+x*y-(g*e+p*f+z*y)),n[6]=U*(j*e+p*o+C*y-(h*e+q*o+B*y)),n[7]=U*(k*e+z*o+B*f-(m*e+x*o+C*f)),n[8]=U*(D*c+H*w+I*b-(E*c+G*w+J*b)),n[9]=U*(E*i+K*w+N*b-(D*i+L*w+M*b)),n[10]=U*(G*i+L*c+O*b-(H*i+K*c+P*b)),n[11]=U*(J*i+M*c+P*w-(I*i+N*c+O*w)),n[12]=U*(G*s+J*F+E*v-(I*F+D*v+H*s)),n[13]=U*(M*F+D*t+L*s-(K*s+N*F+E*t)),n[14]=U*(K*v+P*F+H*t-(O*F+G*t+L*v)),n[15]=U*(O*s+I*t+N*v-(M*v+P*s+J*t)),n}
    function fieldOfView(fieldOfViewInRadians, aspect, near, far){
      var f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewInRadians);
      var rangeInv = 1.0 / (near - far);
      return [
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (near + far) * rangeInv, -1,
        0, 0, near * far * rangeInv * 2, 0
      ];
    }
    function translate(m, dx, dy, dz){ return multiply(m, translation(dx, dy, dz)); };
    function rotateX(m, radiansX){ return multiply(m, rotationX(radiansX)); };
    function rotateY(m, radiansY){ return multiply(m, rotationY(radiansY)); };
    function rotateZ(m, radiansZ){ return multiply(m, rotationZ(radiansZ)); };
    function scale(m, sx, sy, sz){ return multiply(m, scalem(sx, sy, sz)); };
    function crossProduct(n,r){return[n[1]*r[2]-n[2]*r[1],n[2]*r[0]-n[0]*r[2],n[0]*r[1]-n[1]*r[0]]};
    function subtractVectors(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
    function lookAt(camera, target, up) {
      let zAxis = normalize(subtractVectors(camera, target));
      let xAxis = normalize(crossProduct(up, zAxis));
      let yAxis = normalize(crossProduct(zAxis, xAxis));
      return [
       xAxis[0], xAxis[1], xAxis[2], 0,
       yAxis[0], yAxis[1], yAxis[2], 0,
       zAxis[0], zAxis[1], zAxis[2], 0,
       camera[0], camera[1], camera[2], 1
      ]
    }
    function transpose(n){return[n[0],n[4],n[8],n[12],n[1],n[5],n[9],n[13],n[2],n[6],n[10],n[14],n[3],n[7],n[11],n[15]]};
    function transformPoint(v, m) {
      var dst = new Float32Array(3);
      var v0 = v[0];
      var v1 = v[1];
      var v2 = v[2];
      var d = v0 * m[0 * 4 + 3] + v1 * m[1 * 4 + 3] + v2 * m[2 * 4 + 3] + m[3 * 4 + 3];

      dst[0] = (v0 * m[0 * 4 + 0] + v1 * m[1 * 4 + 0] + v2 * m[2 * 4 + 0] + m[3 * 4 + 0]) / d;
      dst[1] = (v0 * m[0 * 4 + 1] + v1 * m[1 * 4 + 1] + v2 * m[2 * 4 + 1] + m[3 * 4 + 1]) / d;
      dst[2] = (v0 * m[0 * 4 + 2] + v1 * m[1 * 4 + 2] + v2 * m[2 * 4 + 2] + m[3 * 4 + 2]) / d;
      return dst;
    }
    return {
      translation: translation,
      rotationX: rotationX,
      rotationY: rotationY,
      rotationZ: rotationZ,
      scalem: scalem,
      multiply: multiply,
      fieldOfView: fieldOfView,
      normalize: normalize,
      inverse: inverse,
      translate: translate,
      rotateX: rotateX, 
      rotateY: rotateY,
      rotateZ: rotateZ,
      scale: scale,
      crossProduct: crossProduct,
      lookAt: lookAt,
      transpose: transpose,
      transformPoint: transformPoint
  	}
  })();
 
  
  return {
    createSetters: createSetters,
    shadersToProgram: shadersToProgram,
    	// gl, vertexSource, fragmentSource
    	// returns program
    resizeCanvasToDisplaySize: resizeCanvasToDisplaySize,   
    	// canvas
    loadAttributesAndBuffers: loadAttributesAndBuffers,  
    	// gl, attsandBuffers, program
   		// attributes and buffer format:
    	// anb = { 
    	//	 a_position: { 
    	// 		buffer: "", 		// pointer to buffer 
    	// 		location: "", 		// pointer to location
	    // 		numComponents: 2, 	// number of things per object. example: 2 components = x, y coordinate
    	// 		type: gl.FLOAT, 	// type of things
    	// 		normalize: false, 	// normalize data?
    	// 		stride: 0, 			// how big is the stride/step?
    	// 		offset: 0 			// offset from beginning
        //   }, etc...
  		// }
    reloadCanvasText: reloadCanvasText, 
    loadCanvasText: loadCanvasText,
    loadCanvasImages: loadCanvasImages, 
    	// gl, canvasImages
        // canvasImageFormat = {
        //   fire: {
        //     img: passInImages.fire,
        //     ctx: "", 
        //     canvas: "",
        //     texture: ""
        //   }
  		// } 
 	 loadUnis: loadUnis,
    	// gl, program, universals
        // universalsFormat = {
    	//   u_textureSize: "u_textureSize",
  		// }
     setBuffer: setBuffer,
	    // helper function for cleaner code: use like setBuffer(gl, attsAndBuffers.bufferName);
     	// function setBuffer(gl, att){ gl.bindBuffer(gl.ARRAY_BUFFER, att.buffer); }
     setTextureCoord: setTextureCoord, 
    	// gl, texturePositionAttributePointer
    	// FOR NOW USES WHOLE TEXTURE, THAT SHOULD CHANGE
    m3: m3,
    m4: m4,
    	/*
          translation: translation,    (dx, dy, dz)
          rotationX: rotationX,  	   (angleRadians)
          rotationY: rotationY,  	   (angleRadians)
          rotationZ: rotationZ,  	   (angleRadians)
          scalem: scalem,			   (sx, sy, sz)
          multiply: multiply,          (m1, m2)
          fieldOfView: fieldOfView,    (fieldOfViewInRadians, aspect, near, far)
          normalize: normalize,        (vector[3])
          inverse: inverse,		   	   (m4)
          translate: translate,        (m, dx, dy, dz)
          rotateX: rotateX, 		   (m, angleRadians)
          rotateY: rotateY, 		   (m, angleRadians)
          rotateZ: rotateZ, 		   (m, angleRadians)
          scale: scale, 			   (m, sx, sy, sz)
          crossProduct: crossProduct,  (vec3_1, vec3_2)
          lookAt: lookAt,			   (vec3Camera, vec3Target, up)
          transpose: transpose	       (m4)
          transformPt:transformPt	   (vec_3, m4) 
      */
    loader: loader
  };
})();
