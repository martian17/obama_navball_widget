let body;
let CSS = "";

cos = Math.cos;
sin = Math.sin;



const matMul3 = function(a,b){
    var result = [0,0,0,0,0,0,0,0,0];
    for(var i = 0; i < 3; i++){//lateral
        for(var j = 0; j < 3; j++){//vertical
            for(var k = 0; k < 3; k++){//depth addition
                result[i*3+j] += a[i*3+k]*b[k*3+j];
            }
        }
    }
    return result;
};


const matvec3 = function(mat,vec){
    let result = [0,0,0];
    for(var i = 0; i < 3; i++){
        for(var j = 0; j < 3; j++){
            result[i] += mat[i*3+j]*vec[j];
        }
    }
    return result;
};

const vecmat3 = function(vec,mat){
    let result = [0,0,0];
    for(var i = 0; i < 3; i++){
        for(var j = 0; j < 3; j++){
            result[i] += vec[j]*mat[j*3+i];
        }
    }
    return result;
};


const toLatLng = function(x,y,z,r){
    let lat = Math.asin(y/r);
    let lng = Math.atan2(x,z);//origin is z axis
    return [lat,lng];
}



const genYmat = function(a){
    return [
        cos(a),0,sin(a),
        0,1,0,
        -sin(a),0,cos(a)
    ];
};

const genXmat = function(a){
    return [
        1,0,0,
        0,cos(a),-sin(a),
        0,sin(a),cos(a)
    ];
};

const dist = function(){
    let r = 0;
    for(let v of arguments){
        r += v*v;
    }
    return Math.sqrt(r);
};


CSS += `
.cube-wrapper{
    position:absolute;
    left:100px;
    top:100px;
    perspective: 400px;
}

.cube-wrapper .cube{
    width: 200px;
    height: 200px;
    position:relative;
    transform-style: preserve-3d;
    transform:rotateX(0deg) rotateY(0deg) rotateZ(0deg);
}

.cube-wrapper .cube>div{/*faces*/
    width:200px;
    height:200px;
    position:absolute;
    opacity:0.5;
}

.cube-wrapper .front{
    transform: rotateY(  0deg) translateZ(100px);
    background-color: red;
}
.cube-wrapper .back{
    transform: rotateY( 90deg) translateZ(100px);
    background-color: green;
}
.cube-wrapper .left{
    transform: rotateY(180deg) translateZ(100px);
    background-color: blue;
}
.cube-wrapper .right{
    transform: rotateY(270deg) translateZ(100px);
    background-color: purple;
}
.cube-wrapper .top{
    transform: rotateX( 90deg) translateZ(100px);
    background-color: yellow;
}
.cube-wrapper .bottom{
    transform: rotateX(-90deg) translateZ(100px);
    background-color: orange;
}
`;

class Cube3d extends ELEM{
    constructor(){
        super("div","class:cube-wrapper");
        this.setInner(`
            <div class="cube">
                <div class="front"></div>
                <div class="back"></div>
                <div class="left"></div>
                <div class="right"></div>
                <div class="top"></div>
                <div class="bottom"></div>
            </div>
        `);
        this.cube = this.query(".cube");
    }
    setOrientation(mat3){
        //expand into mat4
        let mat4 = [
            ...mat3.slice(0,3),0,
            ...mat3.slice(3,6),0,
            ...mat3.slice(6,9),0,
            0,0,0,1
        ];
        //console.log(this.head.next);
        this.cube.e.style.transform = "matrix3d("+mat4.join(",")+")";
    }
};


const urlToImageData = async function(url){
    let img = new Image();
    img.src = url;
    console.log(`trying to load ${url}`);
    await new Promise(res=>img.onload = res);
    console.log(`img loaded`);
    let canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    let ctx = canvas.getContext("2d");
    ctx.drawImage(img,0,0);
    console.log(`finished`);
    return ctx.getImageData(0,0,img.width,img.height);
};


class Navball extends ELEM{
    width = 200;
    height = 200;
    //mouse down
    down = false;
    //rotation velocity
    vx = 0;//50;
    vy = 0;//-10;
    //
    rotmat = [
        1,0,0,
        0,1,0,
        0,0,1
    ];
    texture = new ImageData(new Uint8ClampedArray([0,0,0,255]),1,1);
    obamatex = new ImageData(new Uint8ClampedArray([0,0,0,255]),1,1);
    navtex = new ImageData(new Uint8ClampedArray([0,0,0,255]),1,1);
    
    constructor(){
        super("div","class:navball");
        let that = this;
        let {width,height} = this;
        let canvase = this.add("canvas");
        canvase.style("opacity:0.5");
        let canvas = canvase.e;
        canvas.width = width;
        canvas.height = height;
        let ctx = canvas.getContext("2d");
        this.canvas = canvas;
        this.ctx = ctx;
        this.imgdata = ctx.getImageData(0,0,width,height);
        //texture is an image data
        urlToImageData("navball.png").then((texture)=>{
            that.texture = texture;
            that.navtex = texture;
        });
        urlToImageData("obama.png").then((texture)=>{
            that.obamatex = texture;
        });
        
        
        
        
        //this.on("mousedown",this.handleMousedown);
        body.on("mousedown",this.handleMousedown);
        this.cube = this.add(new Cube3d);
        this.cube.style("z-index:-1");
        
        let start = 0;
        let an = (t)=>{
            if(start === 0)start = t;
            let dt = t-start;
            start = t;
            this.onFrame(dt/1000);
            requestAnimationFrame(an);
        }
        requestAnimationFrame(an);
    }
    //arrow function method automatically binds to this
    handleMousedown = (e)=>{
        body.on("mousemove",this.handleMousemove);
        body.on("mouseup",this.handleMouseup);
        this.x0 = e.clientX;
        this.y0 = e.clientY;
        this.t0 = Date.now();
        this.mvx = 0;
        this.mvy = 0;
        this.down = true;
    }
    handleMousemove = (e)=>{
        //calculate mouse velocity
        let x = e.clientX;
        let y = e.clientY;
        let t = Date.now();
        let dt = (t - this.t0)/1000;
        let dx = x - this.x0;
        let dy = y - this.y0;
        if(dt === 0)return false;//infinity->nan bug, preventing being frozen
        this.mvx = dx/dt;
        this.mvy = dy/dt;
        this.x0 = x;
        this.y0 = y;
        this.t0 = t;
    }
    handleMouseup = (e)=>{
        body.off("mousemove",this.handleMousemove);
        body.off("mouseup",this.handleMouseup);
        this.down = false;
    }
    onFrame = (dt)=>{//dt in seconds
        if(this.down){
            if(Date.now() - this.t0 > 100){
                this.mvx = 0;
                this.mvy = 0;
                console.log("cancelled");
            }
            this.vx = this.vx+(this.mvx-this.vx)*dt*3;
            this.vy = this.vy+(this.mvy-this.vy)*dt*3;
        }
        //friction part
        this.vx *= (2-dt)/2;
        this.vy *= (2-dt)/2;
        let r = dist(this.vx,this.vy);
        //console.log(r);
        let frvx = (this.vx/r)*dt*5;
        let frvy = (this.vy/r)*dt*5;
        this.vx -= frvx;
        this.vy -= frvy;
        if(r < 0.5){//movement less than 1px
            this.vx = 0;
            this.vy = 0;
        }
        /*if(r !== 0){
            let frvx = (this.vx/r)*dt*1;
            let frvy = (this.vy/r)*dt*1;
            console.log(frvx,frvy);
            if(frvx*(this.vx-frvx) <= 0 || frvy*(this.vy-frvy) <= 0){
                this.vx = 0;
                this.vy = 0;
            }else{
                this.vx -= frvx;
                this.vy -= frvy;
            }
        }*/
        
        
        let dx = dt*this.vx;
        let dy = dt*this.vy;
        //console.log(dx,dy);
        //remember small angle approximation? sin(x) x>0 := x
        let ay = -dx/100;//destination angle for the y axis
        let ax = dy/100;//destination angle for the x axis
        let ymat = genYmat(ay);
        let xmat = genXmat(ax);
        this.rotmat = matMul3(matMul3(this.rotmat,ymat),xmat);
        //console.log(this.rotmat);
        
        
        this.cube.setOrientation(this.rotmat);
        //console.log(dx,dy);
        //then finally plug in all the values
        //cube.style.transform = "matrix3d("+resultMatrix.join(",")+")";
        
        
        this.render();
    }
    render = ()=>{
        let {canvas,ctx,imgdata,width,height,texture,rotmat} = this;
        let data = imgdata.data;
        let texdata = texture.data;
        let rr = width/2;
        let PI2 = Math.PI*2;
        //console.log(texdata);
        //find intersection, rotate it, then find the polar coordinates using atan()
        for(let y = 0; y < height; y++){
            for(let x = 0; x < width; x++){
                let dx = x-rr;
                let dy = y-rr;
                let r = dist(dx,dy);
                if(r > rr)continue;
                let dz = Math.sqrt(rr*rr-dx*dx-dy*dy);
                //now we know xyz, rotate it
                [dx,dy,dz] = matvec3(rotmat,[dx,dy,dz]);
                //to lat lng
                let [lat,lng] = toLatLng(dx,dy,dz,rr);
                let texx = (((lng+PI2+Math.PI)%(PI2))/PI2)*texture.width;
                let texy = ((Math.PI/2+lat)/Math.PI)*texture.height;
                //get the color from that potint in the texture
                let tidx = (Math.floor(texy)*texture.width+Math.floor(texx))*4;
                let idx = (y*width+x)*4;
                //console.log(idx,tidx);
                data[idx+0] = texdata[tidx+0];
                data[idx+1] = texdata[tidx+1];
                data[idx+2] = texdata[tidx+2];
                data[idx+3] = texdata[tidx+3];
                //console.log(data[idx+0],data[idx+3],texdata[tidx+3]);
            }
        }
        ctx.putImageData(imgdata,0,0);
        //throw new Error("done");
    }
}


{
    //text/css blob to the head
    let head = new ELEM(document.head);
    let blob = new Blob([CSS],{type:"text/css"});
    let link = head.add(new ELEM("link","rel:stylesheet"));
    link.attr("href",URL.createObjectURL(blob));
}
body = new ELEM(document.body);

let navball = body.add(new Navball);
let form = body.add("div");
form.add("label",0,"Obama mode");
form.add("input","type:checkbox").on("input",(e)=>{
    if(e.target.checked){
        navball.texture = navball.obamatex;
    }else{
        navball.texture = navball.navtex;
    }
});
