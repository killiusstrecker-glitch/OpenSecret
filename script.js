const TOTAL_ENTITIES = 50;
const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;

// 小人尺寸和距离控制
const GUY_SIZE = 180; // 放大尺寸
const HALF_SIZE = GUY_SIZE / 2;
const MIN_DIST = GUY_SIZE * 0.95; // 排斥距离，保证基本不重叠

const canvas = document.getElementById('mainCanvas');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
const ctx = canvas.getContext('2d');

const overlayCanvas = document.createElement('canvas');
overlayCanvas.width = CANVAS_WIDTH;
overlayCanvas.height = CANVAS_HEIGHT;
const overlayCtx = overlayCanvas.getContext('2d');

let mx = CANVAS_WIDTH / 2;
let my = CANVAS_HEIGHT / 2;

document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
});

// 资产字典
const staticImgs = {};
const activeFrames = {}; // 改用数组存储序列帧
const textImgs = {};

// 用户定义的每套动画帧名称列表
const animConfig = {
    1: ['1j', '1jj'],
    2: ['2j', '2jj', '2jjjj'], // 严格遵循您提供的结构
    3: ['3j', '3jj', '3jjjj'],
    4: ['4j', '4jj', '4jjj', '4jjjj', '4jjjjj', '4jjjjjj'], 
    5: ['5j', '5jj', '5jjjj']
};

function createFallbackText() {
    const c = document.createElement('canvas');
    c.width = 120; c.height = 40;
    const cx = c.getContext('2d');
    cx.fillStyle = 'rgba(255,255,255,0.7)'; 
    cx.fillRect(0,0,120,40);
    cx.fillStyle = 'black'; cx.font = '12px Arial'; cx.fillText('Text Missing', 10, 25);
    return c;
}
function createFallbackGuy(color) {
    const c = document.createElement('canvas');
    c.width = GUY_SIZE; c.height = GUY_SIZE;
    const cx = c.getContext('2d');
    cx.fillStyle = color; cx.fillRect(0,0,GUY_SIZE,GUY_SIZE);
    return c;
}

const fallbackTextInfo = createFallbackText();
const fallbackGuyInfo = createFallbackGuy('rgba(255,255,255,0.2)');

let loadedCount = 0;
const totalAssets = 5 + 50; // 去除 GIF 的强制进度计数，让序列帧异步后台加载
function updateLoading() {
    loadedCount++;
    const prog = document.getElementById('progress');
    if(prog) prog.innerText = `${loadedCount} / ${totalAssets}`;
    if(loadedCount >= totalAssets) {
        document.getElementById('loading').style.display = 'none';
        initApp();
    }
}

// 1. 加载资源
for(let i=1; i<=5; i++){
    let img = new Image();
    img.onload = () => { staticImgs[i] = img; updateLoading(); };
    img.onerror = () => {
        let img2 = new Image();
        img2.onload = () => { staticImgs[i] = img2; updateLoading(); };
        img2.onerror = () => { staticImgs[i] = fallbackGuyInfo; updateLoading(); };
        img2.src = `img/${i}j.jpg`; 
    };
    img.src = `img/${i}j.png`;
    
    // 2. 加载序列帧图像
    activeFrames[i] = [];
    if(animConfig[i]) {
        for(let f = 0; f < animConfig[i].length; f++) {
            let frameName = animConfig[i][f];
            let fImg = new Image();
            // 确保按顺序放入数组对应的索引位 (如果没加载出来则是 undefined)
            fImg.onload = () => { activeFrames[i][f] = fImg; };
            fImg.src = `anim/${i}d/${frameName}.png`; 
        }
    }
}

for(let i=1; i<=50; i++){
    let img = new Image();
    img.onload = () => { textImgs[i] = img; updateLoading(); };
    img.onerror = () => {
        let img2 = new Image();
        img2.onload = () => { textImgs[i] = img2; updateLoading(); };
        img2.onerror = () => { textImgs[i] = fallbackTextInfo; updateLoading(); };
        img2.src = `text/${i}.jpg`;
    };
    img.src = `text/${i}.png`; 
}

let entities = [];
let appStartTime = 0;

class Entity {
    constructor(id, gx, gy, templateIdx) {
        this.id = id;
        this.templateIdx = templateIdx || (Math.floor(Math.random() * 5) + 1); 
        
        this.gx = gx;
        this.gy = gy;
        
        // 文字初始在屏幕随机周围，飘散回归
        this.tx = Math.random() * CANVAS_WIDTH;
        this.ty = Math.random() * CANVAS_HEIGHT;
        
        this.state = 'intro_wait'; 
        this.hoverTime = 0;
        this.particles = [];
        this.uploaded = false;
        
        this.curTextScale = 1;
        this.curTextOpacity = 0;
        this.curTextX = this.tx;
        this.curTextY = this.ty;
        this.curGuyOpacity = 0.2;
        this.isTarget = false;
    }
    
    update(t) {
        if(this.state === 'dissolved') return; 
        
        // Phase 1: 开场动画
        if(t <= 5000) {
            this.state = 'intro_wait';
            this.curTextOpacity = t / 5000; 
            this.curGuyOpacity = 0.2;       
        } 
        else if(t <= 7000) {
            this.state = 'intro_move';
            let progress = (t - 5000) / 2000;
            let ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            this.curTextX = this.tx + (this.gx - this.tx) * ease; 
            this.curTextY = this.ty + (this.gy - this.ty) * ease;
            this.curTextScale = 1 - ease; 
            this.curTextOpacity = 1 - ease; 
        } 
        else if(this.state === 'intro_move' || this.state === 'intro_wait') {
            this.state = 'idle';
            this.curTextOpacity = 0;
        }
        
        // Phase 2: 交互与探照灯
        if(this.state === 'idle' || this.state === 'active') {
            let isHover = this.isTarget; 
            
            if(isHover) {
                if(this.state === 'idle') {
                    this.state = 'active';
                    this.curGuyOpacity = 1.0; 
                }
                this.hoverTime += 16.6; // 以60帧计算增量
                if(this.hoverTime >= 3000) {
                    this.state = 'text_show';
                    this.textShowStartTime = t;
                    if(!this.uploaded) {
                        this.uploaded = true;
                        uploadToTD(textImgs[this.id]);
                        document.body.style.transform = `translate(${Math.random()*4-2}px, ${Math.random()*4-2}px)`; 
                        setTimeout(() => document.body.style.transform = `none`, 100);
                    }
                }
            } else {
                this.state = 'idle';
                this.curGuyOpacity = 0.2; 
                this.hoverTime = 0;
            }
        }
        
        // Phase 3: 文本回显
        if(this.state === 'text_show') {
            let passed = t - this.textShowStartTime;
            this.curGuyOpacity = 1.0;
            
            let showP = Math.min(passed / 500, 1.0); 
            this.curTextOpacity = showP;
            this.curTextScale = 1.0;
            this.curTextX = this.gx;
            this.curTextY = this.gy - GUY_SIZE/2 - 20; 
            
            if(passed >= 2000) {
                this.state = 'dissolving';
                this.dissolveStartTime = t;
                this.createParticles();
            }
        }
        
        // Phase 4: 粒子消散
        if(this.state === 'dissolving') {
            let passed = t - this.dissolveStartTime;
            this.curTextOpacity = Math.max(0, 1.0 - passed/1000); 
            
            let allDead = true;
            for(let p of this.particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.vx += p.wind; 
                p.vy += p.gravity; 
                p.alpha -= 0.015;  
                if(p.alpha > 0) allDead = false;
            }
            if(allDead) this.state = 'dissolved';
        }
    }
    
    createParticles() {
        let img = staticImgs[this.templateIdx];
        if(!img || !img.width) return;
        const steps = 14; 
        
        // 根据图片的真实长宽比计算绘制尺寸
        let imgRatio = img.width / img.height;
        let drawW = GUY_SIZE;
        let drawH = GUY_SIZE;
        if(imgRatio > 1) { drawH = GUY_SIZE / imgRatio; }
        else { drawW = GUY_SIZE * imgRatio; }
        
        const pxW = drawW / steps; 
        const pxH = drawH / steps;
        
        for(let i=0; i<steps; i++){
            for(let j=0; j<steps; j++){
                this.particles.push({
                    imgX: i*(img.width/steps), imgY: j*(img.height/steps),
                    imgW: img.width/steps, imgH: img.height/steps,
                    x: this.gx - drawW/2 + i*pxW, 
                    y: this.gy - drawH/2 + j*pxH,
                    w: pxW, h: pxH,
                    vx: (Math.random()-0.5) * 3, 
                    vy: Math.random() * -2 - 1,   
                    gravity: Math.random() * -0.04 - 0.02, 
                    wind: (Math.random()-0.5) * 0.1, 
                    alpha: 1.0 + Math.random() * 0.5 
                });
            }
        }
    }
    
    draw(ctx, t) {
        if(this.state === 'dissolved') return;
        
        // 渲染小人/序列帧 (严格保持原始图片比例)
        if (this.state !== 'dissolving') {
            ctx.globalAlpha = this.curGuyOpacity;
            
            let sourceImage = null;
            if((this.state === 'active' || this.state === 'text_show') && activeFrames[this.templateIdx]) {
                // 每隔 0.46 秒 (460 毫秒) 进行一次照片切换
                let framesArr = activeFrames[this.templateIdx];
                let fIndex = Math.floor(t / 460) % framesArr.length;
                
                // 如果该帧刚好没加载出来/写错了，则后备使用静态图
                sourceImage = framesArr[fIndex] || staticImgs[this.templateIdx];
            } else {
                sourceImage = staticImgs[this.templateIdx];
            }
            
            if(sourceImage && sourceImage.width) {
                let imgRatio = sourceImage.width / sourceImage.height;
                let drawW = GUY_SIZE;
                let drawH = GUY_SIZE;
                if(imgRatio > 1) { drawH = GUY_SIZE / imgRatio; }
                else { drawW = GUY_SIZE * imgRatio; }
                
                ctx.drawImage(sourceImage, this.gx - drawW/2, this.gy - drawH/2, drawW, drawH);
            }
            ctx.globalAlpha = 1.0;
        }
        
        // 渲染文本图片 (完全按照原图比例与尺寸，不再强行压缩或变形)
        if(this.curTextOpacity > 0) {
            let txtImg = textImgs[this.id];
            if(txtImg && txtImg.width) {
                ctx.globalAlpha = this.curTextOpacity;
                let w = txtImg.width * this.curTextScale;
                let h = txtImg.height * this.curTextScale;
                
                // 直接使用原图的宽度和高度，不进行硬编码尺寸改变
                ctx.drawImage(txtImg, this.curTextX - w/2, this.curTextY - h/2, w, h);
                ctx.globalAlpha = 1.0;
            }
        }
    }
    
    drawParticles(ctx) {
        let img = staticImgs[this.templateIdx];
        if(!img) return;
        for(let p of this.particles) {
            if(p.alpha <= 0) continue;
            ctx.globalAlpha = Math.min(p.alpha, 1.0);
            try {
                ctx.drawImage(img, p.imgX, p.imgY, p.imgW, p.imgH, p.x, p.y, p.w, p.h);
            } catch(e){}
        }
        ctx.globalAlpha = 1.0;
    }
}

// ---------------- 3. 主循环与坐标生成 ----------------

// 生成随机但不重叠且密集的坐标算法
function generateDensePositions(count) {
    let positions = [];
    // 限制生成区域，形成“人群密集”感
    const spawnWidth = Math.min(CANVAS_WIDTH * 0.9, 1600); 
    const spawnHeight = Math.min(CANVAS_HEIGHT * 0.8, 900);
    const offsetX = (CANVAS_WIDTH - spawnWidth) / 2;
    // 重心分布
    const offsetY = CANVAS_HEIGHT - spawnHeight - 50;

    for(let i=0; i<count; i++) {
        let attempts = 0;
        let p = null;
        let currentMinDist = MIN_DIST;
        
        while(attempts < 2000) {
            let x = offsetX + HALF_SIZE + Math.random() * (spawnWidth - GUY_SIZE);
            let y = offsetY + HALF_SIZE + Math.random() * (spawnHeight - GUY_SIZE);
            let overlap = false;
            for(let existing of positions) {
                let d = Math.sqrt(Math.pow(x - existing.x, 2) + Math.pow(y - existing.y, 2));
                if (d < currentMinDist) {
                    overlap = true;
                    break;
                }
            }
            if(!overlap) {
                p = {x, y};
                break;
            }
            attempts++;
            // 弹性衰减：如果实在塞不下，略微允许一点点贴近
            if (attempts % 300 === 0) {
                currentMinDist *= 0.9; 
            }
        }
        // 保底措施
        if(!p) {
            p = {x: offsetX + Math.random() * spawnWidth, y: offsetY + Math.random() * spawnHeight};
        }
        positions.push(p);
    }
    return positions;
}


function initApp() {
    appStartTime = performance.now();
    let posArray = generateDensePositions(TOTAL_ENTITIES);
    
    // 保证每个类别的数量完全平均，并通过贪心算法分离同类，防止同种类扎堆
    let pool = [];
    for(let i=1; i<=5; i++) {
        for(let j=0; j < Math.ceil(TOTAL_ENTITIES / 5); j++) pool.push(i);
    }
    
    for(let i=0; i<posArray.length; i++) {
        let p = posArray[i];
        let bestType = pool[0];
        let maxMinDist = -1;
        
        for(let type of new Set(pool)) {
            let dMin = Infinity;
            for(let j=0; j<i; j++) {
                if(posArray[j].templateIdx === type) {
                    let d = Math.hypot(p.x - posArray[j].x, p.y - posArray[j].y);
                    if(d < dMin) dMin = d;
                }
            }
            if(dMin > maxMinDist) {
                maxMinDist = dMin;
                bestType = type;
            }
        }
        p.templateIdx = bestType;
        pool.splice(pool.indexOf(bestType), 1);
    }
    
    for(let i=1; i<=TOTAL_ENTITIES; i++) {
        let pos = posArray[i-1];
        entities.push(new Entity(i, pos.x, pos.y, pos.templateIdx));
    }
    requestAnimationFrame(loop);
}

function loop(timestamp) {
    let t = timestamp - appStartTime;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // 找出距离探照灯中心最近的唯一一个小人
    let closestEnt = null;
    let minDist = HALF_SIZE * 1.5; // 稍微扩大判定范围帮助用户选中
    if (t > 7000) {
        for(let ent of entities) {
            if (ent.state === 'idle' || ent.state === 'active') {
                let dist = Math.sqrt(Math.pow(mx - ent.gx, 2) + Math.pow(my - ent.gy, 2));
                if (dist < minDist) {
                    minDist = dist;
                    closestEnt = ent;
                }
            }
        }
    }
    
    for(let ent of entities) {
        ent.isTarget = (ent === closestEnt);
        ent.update(t);
        ent.draw(ctx, t);
    }
    
    // 开场动画后再绘制遮罩
    if (t > 7000) {
        document.body.style.cursor = 'none'; // 仅在互动开始时隐藏真实指针
        overlayCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); 
        overlayCtx.globalCompositeOperation = 'source-over';
        overlayCtx.fillStyle = 'rgba(0,0,0,0.85)'; 
        overlayCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        overlayCtx.globalCompositeOperation = 'destination-out';
        let grad = overlayCtx.createRadialGradient(mx, my, 0, mx, my, 250); // 加大光晕适配小人尺寸
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        overlayCtx.fillStyle = grad;
        overlayCtx.beginPath();
        overlayCtx.arc(mx, my, 250, 0, Math.PI*2);
        overlayCtx.fill();
        
        ctx.drawImage(overlayCanvas, 0, 0);

        // 为了在纯黑背景上也能清晰看到探照灯的光束，叠加一层柔和的光照
        ctx.globalCompositeOperation = 'screen'; 
        let lightGrad = ctx.createRadialGradient(mx, my, 0, mx, my, 250);
        lightGrad.addColorStop(0, 'rgba(60, 65, 75, 0.35)'); // 探照灯微弱的银色光泽
        lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = lightGrad;
        ctx.beginPath();
        ctx.arc(mx, my, 250, 0, Math.PI*2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over'; 

        ctx.fillStyle = 'rgba(0, 242, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(mx, my, 3, 0, Math.PI*2);
        ctx.fill();
    }
    
    for(let ent of entities) {
        if(ent.state === 'dissolving') {
            ent.drawParticles(ctx);
        }
    }

    requestAnimationFrame(loop);
}

// ---------------- 4. TD 数据传输 ----------------
function getBase64Image(img) {
    if(!img || !img.width) return null;
    const offCanvas = document.createElement("canvas");
    offCanvas.width = img.width; offCanvas.height = img.height;
    const cx = offCanvas.getContext("2d");
    cx.drawImage(img, 0, 0);
    try {
        return offCanvas.toDataURL("image/png");
    } catch(e) {
        return null;
    }
}

function uploadToTD(imgElement) {
    const base64 = getBase64Image(imgElement);
    if(!base64) return;
    
    fetch('/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: 'image_base64',
            data: base64,
            timestamp: Date.now()
        })
    })
    .then(res => console.log('✅ 文本图片已投递至 TD'))
    .catch(err => console.error('传输失败:', err));
}