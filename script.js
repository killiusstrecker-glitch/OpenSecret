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
        startIntroAnimation(() => {
            initApp();
        });
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

function createTextCanvas(text) {
    // 1. 去除文字前面的序号和标点符号
    text = text.replace(/^\d+[\.\、\s]+/, '');

    const c = document.createElement('canvas');
    const cx = c.getContext('2d');
    
    const fontSize = 18;
    const lineHeight = 28;
    const paddingX = 20;
    const paddingY = 20;
    const maxWidth = 300 - paddingX * 2;

    cx.font = `${fontSize}px "Inter", "Microsoft YaHei", sans-serif`;
    
    let line = '';
    const lines = [];
    for (let i = 0; i < text.length; i++) {
        const testLine = line + text[i];
        const metrics = cx.measureText(testLine);
        // 如果长度超限且当前行不为空，换行
        if (metrics.width > maxWidth && line.length > 0) {
            lines.push(line);
            line = text[i];
        } else {
            line = testLine;
        }
    }
    lines.push(line);

    // 根据实际使用的最大宽度决定画布尺寸
    let actualMaxWidth = 0;
    lines.forEach(l => {
        const w = cx.measureText(l).width;
        if (w > actualMaxWidth) actualMaxWidth = w;
    });

    c.width = actualMaxWidth + paddingX * 2;
    c.height = lines.length * lineHeight + paddingY * 2;

    // 改变尺寸后需重新设置字体和其他上下文属性
    cx.font = `${fontSize}px "Inter", "Microsoft YaHei", sans-serif`;
    cx.textBaseline = 'top';
    cx.textAlign = 'left'; // 改变为左对齐，配合打字机效果更符合书写习惯
    
    // 添加文字阴影使其在复杂背景下更容易阅读
    cx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    cx.shadowBlur = 8;
    cx.shadowOffsetX = 0;
    cx.shadowOffsetY = 2;
    cx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    
    lines.forEach((l, index) => {
        cx.fillText(l, paddingX, paddingY + index * lineHeight);
    });

    // 存储完整的文本和分行信息，供动态打字机效果使用
    c.fullText = text;
    c.textLines = lines;

    return c;
}

let lines = window.openSecretTexts || [];
for(let i=1; i<=50; i++) {
    let content = "暂无文本...";
    if (lines.length > 0) {
        content = lines[(i - 1) % lines.length];
    }
    textImgs[i] = createTextCanvas(content);
    updateLoading();
}
console.log("成功加载了文本！总计文本数量：", lines.length);

let entities = [];
let appStartTime = 0;

class Entity {
    constructor(id, gx, gy, templateIdx) {
        this.id = id;
        this.templateIdx = templateIdx || (Math.floor(Math.random() * 5) + 1); 
        
        this.gx = gx;
        this.gy = gy;
        
        this.state = 'idle'; 
        this.hoverTime = 0;
        this.particles = [];
        this.uploaded = false;
        
        this.typewriterProgress = 0;
        
        this.curTextScale = 1;
        this.curTextOpacity = 0;
        this.curTextX = this.gx;
        this.curTextY = this.gy - GUY_SIZE/2 - 20;
        this.curGuyOpacity = 0.2;
        this.isTarget = false;
    }
    
    update(t) {
        if(this.state === 'dissolved') return; 
        
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
                    this.typewriterProgress = 0.0; // 重置进度，开始回显得打字机效果
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
        
        // Phase 3: 文本回显 (动态呈现打字机)
        if(this.state === 'text_show') {
            let passed = t - this.textShowStartTime;
            this.curGuyOpacity = 1.0;
            
            // 文本打字效果 2 秒
            let showP = Math.min(passed / 2000, 1.0); 
            this.typewriterProgress = showP;
            this.curTextOpacity = 1.0;
            this.curTextScale = 1.0;
            this.curTextX = this.gx;
            this.curTextY = this.gy - GUY_SIZE/2 - 20; 
            
            // 要求1：当文字所有都出现了之后，再停留1秒，然后再消失（2000打字 + 1000停留 = 3000）
            if(passed >= 3000) {
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
    
    drawGuy(ctx, t) {
        if(this.state === 'dissolved') return;
        
        // 渲染小人/序列帧 (严格保持原始图片比例)
        if (this.state !== 'dissolving') {
            ctx.globalAlpha = this.curGuyOpacity;
            
            let sourceImage = null;
            if((this.state === 'active' || this.state === 'text_show') && activeFrames[this.templateIdx]) {
                let framesArr = activeFrames[this.templateIdx];
                let fIndex = Math.floor(t / 460) % framesArr.length;
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
    }
    
    drawText(ctx, t) {
        if(this.state === 'dissolved') return;
        
        // 渲染文本图片 (完全按照原图比例与尺寸，动态剥离文字打字机渲染)
        if(this.curTextOpacity > 0) {
            let txtImg = textImgs[this.id];
            if(txtImg && txtImg.width) {
                ctx.globalAlpha = this.curTextOpacity;
                let w = txtImg.width * this.curTextScale;
                let h = txtImg.height * this.curTextScale;
                
                if (txtImg.fullText && this.typewriterProgress !== undefined) {
                    let totalChars = txtImg.fullText.length;
                    let charsToShow = Math.floor(this.typewriterProgress * totalChars);
                    
                    if (charsToShow > 0) {
                        ctx.save();
                        const fontSize = 18 * this.curTextScale;
                        const lineHeight = 28 * this.curTextScale;
                        const paddingX = 20 * this.curTextScale;
                        const paddingY = 20 * this.curTextScale;
                        
                        ctx.font = `${fontSize}px "Inter", "Microsoft YaHei", sans-serif`;
                        ctx.textBaseline = 'top';
                        ctx.textAlign = 'left';
                        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                        ctx.shadowBlur = 8 * this.curTextScale;
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 2 * this.curTextScale;
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                        
                        let charAssigned = 0;
                        for (let i = 0; i < txtImg.textLines.length; i++) {
                            let lineStr = txtImg.textLines[i];
                            if (charAssigned + lineStr.length <= charsToShow) {
                                ctx.fillText(lineStr, this.curTextX - w/2 + paddingX, this.curTextY - h/2 + paddingY + i * lineHeight);
                                charAssigned += lineStr.length;
                            } else {
                                let remain = charsToShow - charAssigned;
                                if (remain > 0) {
                                   ctx.fillText(lineStr.substring(0, remain), this.curTextX - w/2 + paddingX, this.curTextY - h/2 + paddingY + i * lineHeight);
                                }
                                break;
                            }
                        }
                        ctx.restore();
                    }
                } else {
                    ctx.drawImage(txtImg, this.curTextX - w/2, this.curTextY - h/2, w, h);
                }
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

// 生成物理排斥、完全不重叠的均匀分布坐标
function generateDensePositions(count) {
    let positions = [];
    const spawnWidth = Math.min(CANVAS_WIDTH * 0.9, 1600); 
    const spawnHeight = Math.min(CANVAS_HEIGHT * 0.8, 900);
    const offsetX = (CANVAS_WIDTH - spawnWidth) / 2;
    const offsetY = CANVAS_HEIGHT - spawnHeight - 50;

    // 先随机初始化
    for(let i=0; i<count; i++) {
        positions.push({
            x: offsetX + HALF_SIZE + Math.random() * (spawnWidth - GUY_SIZE),
            y: offsetY + HALF_SIZE + Math.random() * (spawnHeight - GUY_SIZE)
        });
    }

    // 物理力学排斥，确保小人们绝对不重叠
    const targetDist = GUY_SIZE * 0.85; // 排斥距离
    for (let iter = 0; iter < 300; iter++) {
        for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < count; j++) {
                let dx = positions[i].x - positions[j].x;
                let dy = positions[i].y - positions[j].y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < targetDist) {
                    let diff = targetDist - dist;
                    let nx = dx / (dist || 1);
                    let ny = dy / (dist || 1);
                    positions[i].x += nx * diff * 0.5;
                    positions[i].y += ny * diff * 0.5;
                    positions[j].x -= nx * diff * 0.5;
                    positions[j].y -= ny * diff * 0.5;
                }
            }
            // 边界约束保证不超范围
            positions[i].x = Math.max(offsetX + HALF_SIZE, Math.min(offsetX + spawnWidth - HALF_SIZE, positions[i].x));
            positions[i].y = Math.max(offsetY + HALF_SIZE, Math.min(offsetY + spawnHeight - HALF_SIZE, positions[i].y));
        }
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
        let ent = new Entity(i, pos.x, pos.y, pos.templateIdx);
        entities.push(ent);
    }
    requestAnimationFrame(loop);
}

function loop(timestamp) {
    let t = timestamp - appStartTime;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // 判定是否有任何小人正在展示文字或消散，如果有，则屏蔽其他交互
    let isAnyBusy = entities.some(e => e.state === 'text_show' || e.state === 'dissolving');

    // 找出探照灯范围内距离中心最近的唯一一个小人
    let closestEnt = null;
    let minDist = 90; // 要求：只有探照灯中心鼠标实际触碰到小人身上（由于小人大小为180，故半径为90以内才算触碰）
    if (!isAnyBusy) {
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
    
    // 首层渲染：画小人
    for(let ent of entities) {
        ent.isTarget = (ent === closestEnt);
        ent.update(t);
        ent.drawGuy(ctx, t);
    }
    
    // 中间层：绘制探照灯遮罩
    document.body.style.cursor = 'none'; // 隐藏真实指针
    overlayCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); 
    overlayCtx.globalCompositeOperation = 'source-over';
    overlayCtx.fillStyle = 'rgba(0,0,0,0.85)'; 
    overlayCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    overlayCtx.globalCompositeOperation = 'destination-out';
    let grad = overlayCtx.createRadialGradient(mx, my, 0, mx, my, 250); 
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    overlayCtx.fillStyle = grad;
    overlayCtx.beginPath();
    overlayCtx.arc(mx, my, 250, 0, Math.PI*2);
    overlayCtx.fill();
    
    ctx.drawImage(overlayCanvas, 0, 0);

    ctx.globalCompositeOperation = 'screen'; 
    let lightGrad = ctx.createRadialGradient(mx, my, 0, mx, my, 250);
    lightGrad.addColorStop(0, 'rgba(60, 65, 75, 0.35)'); 
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
    
    // 顶层渲染：画文字和全图粒子散落（位于手电筒之上）
    for(let ent of entities) {
        ent.drawText(ctx, t);
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

// ---------------- 5. 独立全屏开场动画 ----------------
function startIntroAnimation(onComplete) {
    const iCanvas = document.getElementById('introCanvas');
    if (!iCanvas) {
        if(onComplete) onComplete();
        return;
    }
    iCanvas.width = window.innerWidth;
    iCanvas.height = window.innerHeight;
    const iCtx = iCanvas.getContext('2d', { alpha: false }); // optimise

    // 1. Prepare texts
    let baseTexts = window.openSecretTexts && window.openSecretTexts.length > 0 ? 
                    [...window.openSecretTexts] : 
                    Array(50).fill("在这个被数字洪流淹没的时代我们每天都在产生大量信息碎片化却很难拼凑出一个完整的秘密");
    
    // Clean each string
    baseTexts = baseTexts.map(t => t.replace(/[^\u4e00-\u9fa5]/g, ''));
    
    // Shuffle the 50 sentences (NOT the characters)
    for (let i = baseTexts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [baseTexts[i], baseTexts[j]] = [baseTexts[j], baseTexts[i]];
    }

    const fontSize = 19.2; // 放大 1.2 倍
    const lineHeight = fontSize * 1.25;
    const cols = Math.ceil(iCanvas.width / fontSize);
    const rows = Math.ceil(iCanvas.height / lineHeight);
    const totalCells = cols * rows;

    let gridArray = new Array(totalCells).fill(null);
    const TYPE_SPEED = 40; // 40ms per char
    let maxWave1Time = 0;
    let maxWave2Time = 0;

    // 1(a). Wave 1: Randomly place the initial 50 texts
    for (let i = 0; i < baseTexts.length; i++) {
        let str = baseTexts[i];
        if (!str) str = "秘密";
        let placed = false;
        let attempts = 0;
        
        while (!placed && attempts < 2000) {
            let startIdx = Math.floor(Math.random() * (totalCells - str.length));
            let overlap = false;
            for (let k = 0; k < str.length; k++) {
                if (gridArray[startIdx + k] !== null) {
                    overlap = true;
                    break;
                }
            }
            if (!overlap) {
                for (let k = 0; k < str.length; k++) {
                    gridArray[startIdx + k] = { char: str[k], wave: 1, charOffset: k };
                }
                placed = true;
            }
            attempts++;
        }
        
        // Fallback sequentially if randomly failing
        if (!placed) {
            for (let j = 0; j <= totalCells - str.length; j++) {
                let overlap = false;
                for (let k = 0; k < str.length; k++) {
                    if (gridArray[j + k] !== null) { overlap = true; break; }
                }
                if (!overlap) {
                    for (let k = 0; k < str.length; k++) {
                        gridArray[j + k] = { char: str[k], wave: 1, charOffset: k };
                    }
                    placed = true;
                    break;
                }
            }
        }
    }

    // 1(b). Wave 2: Fill remaining holes consecutively
    let textIdx = baseTexts.length;
    let charOffset = 0;
    let currentStr = baseTexts[textIdx % baseTexts.length];
    let chunkId = 0;
    
    for (let i = 0; i < totalCells; i++) {
        if (gridArray[i] === null) {
            if (!currentStr) currentStr = "秘密";
            gridArray[i] = { char: currentStr[charOffset], wave: 2, charOffset: charOffset, chunkId: chunkId };
            charOffset++;
            if (charOffset >= currentStr.length) {
                charOffset = 0;
                textIdx++;
                chunkId++;
                currentStr = baseTexts[textIdx % baseTexts.length];
            }
        }
    }

    let grid = [];
    let wave1MaxEnd = 0;
    gridArray.forEach((data, idx) => {
        let row = Math.floor(idx / cols);
        let col = idx % cols;
        let duration = data.charOffset * TYPE_SPEED;
        if (data.wave === 1 && duration > wave1MaxEnd) wave1MaxEnd = duration;

        grid.push({
            x: col * fontSize,
            y: row * lineHeight,
            char: data.char, // This acts as the rendered character, which can swap
            originChar: data.char, // Keep track if we need it
            state: 0,
            isSecret: false,
            flickerTimer: 0,
            nearIntensity: 0,
            wave: data.wave,             
            charOffset: data.charOffset,
            chunkId: data.chunkId || 0
        });
    });

    let wave2StartTime = wave1MaxEnd + 200; 
    let maxRevealTime = 0;
    let wave2Offsets = {}; // 用来存储第二波每一段独立的随机偏移时间

    grid.forEach(cell => {
        let st = 0;
        if (cell.wave === 2) {
            if (wave2Offsets[cell.chunkId] === undefined) {
                // 完全随机赋予 0~2 秒的起始延时，打破顶部向下的僵硬瀑布规律
                wave2Offsets[cell.chunkId] = Math.random() * 2000;
            }
            let chunkDelay = wave2Offsets[cell.chunkId];
            st = wave2StartTime + chunkDelay;
        }
        let revTime = st + cell.charOffset * TYPE_SPEED + Math.random() * 20; 
        cell.revealTime = revTime;
        cell.cursorTime = revTime + Math.max(TYPE_SPEED, 80); 
        
        if (cell.cursorTime > maxRevealTime) maxRevealTime = cell.cursorTime;
    });
    
    const P1_DYN = maxRevealTime + 300; 
    
    const allCharsPool = baseTexts.join(''); // Used for random garbling later

    // 2. Secret Mask Canvas Map (Aura & Exact)
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = iCanvas.width;
    maskCanvas.height = iCanvas.height;
    const mCtx = maskCanvas.getContext('2d');
    
    mCtx.fillStyle = '#000000';
    mCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    
    mCtx.globalCompositeOperation = 'lighter';
    mCtx.textAlign = 'center';
    mCtx.textBaseline = 'middle';
    
    let secretFontSize = Math.min(iCanvas.width / 4, 300);
    // 使用更圆滑的字体组合，同时用 stroke 发胖
    mCtx.font = `bold ${secretFontSize}px "Arial Rounded MT Bold", "Varela Round", "Nunito", "Quicksand", "PingFang SC", sans-serif`;
    mCtx.lineJoin = "round";
    mCtx.lineCap = "round";
    mCtx.lineWidth = secretFontSize * 0.08;
    
    let letterSpacing = secretFontSize > 150 ? "10px" : "auto";
    mCtx.letterSpacing = letterSpacing;
    
    // 渲染附近光晕 (Green Channel)
    mCtx.shadowColor = '#00FF00';
    mCtx.shadowBlur = Math.floor(secretFontSize * 0.4);
    mCtx.fillStyle = '#00FF00';
    mCtx.strokeStyle = '#00FF00';
    mCtx.fillText("SECRET", iCanvas.width / 2, iCanvas.height / 2);
    mCtx.strokeText("SECRET", iCanvas.width / 2, iCanvas.height / 2);

    // 渲染精确字体实体 (Red Channel)
    mCtx.shadowBlur = 0;
    mCtx.fillStyle = '#FF0000';
    mCtx.strokeStyle = '#FF0000';
    mCtx.fillText("SECRET", iCanvas.width / 2, iCanvas.height / 2);
    mCtx.strokeText("SECRET", iCanvas.width / 2, iCanvas.height / 2);
    
    const imgData = mCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
    
    grid.forEach(cell => {
        const px = Math.floor(cell.x + fontSize / 2);
        const py = Math.floor(cell.y + fontSize / 2);
        if (px >= 0 && px < iCanvas.width && py >= 0 && py < iCanvas.height) {
            const index = (py * iCanvas.width + px) * 4;
            let r = imgData[index];
            let g = imgData[index + 1];
            if (r > 128) { // Red channel threshold for exact word
                cell.isSecret = true;
            }
            cell.nearIntensity = g / 255.0; // Green channel for near field blur
        }
    });

    // 3. Animation Loop
    const P1 = P1_DYN; // 第一阶段动态总时长，保证全部并发文本打完
    const P2 = P1 + 4500; // 第二阶段：让 1,2,3 个字慢慢闪烁有充足时间
    const P3 = P2 + 4000; // 第三阶段：寻找 SECRET 轮廓
    const HOLD_DUR = 4000; // 第四阶段前半部分：全亮保持 4 秒，让人看清楚字
    const FADE_DUR = 2500; // 第四阶段后半部分：缓缓淡出黑屏 2.5 秒
    const P4 = P3 + HOLD_DUR + FADE_DUR; 
    let startTime = performance.now();
    
    function render(time) {
        const elapsed = time - startTime;
        let phase = 1;
        if (elapsed > P3) phase = 4;
        else if (elapsed > P2) phase = 3;
        else if (elapsed > P1) phase = 2;

        if (elapsed > P4) {
            iCanvas.style.display = 'none';
            return; // 彻底停止动画循环
        }

        if (phase === 4) {
            if (!window.introFading) {
                window.introFading = true;
                // 利用 CSS transition-delay 属性实现完美的停留机制
                iCanvas.style.transition = `opacity ${FADE_DUR / 1000}s ease-in-out ${HOLD_DUR / 1000}s`;
                iCanvas.style.opacity = '0';
                
                setTimeout(() => {
                    setTimeout(() => {
                        if(onComplete) onComplete(); // 在屏幕彻底暗下 P4 结束后，额外等待 0.5 秒再开启交互
                    }, 500);
                }, HOLD_DUR + FADE_DUR);
            }
            // 刻意不 return，让 Canvas 在 CSS 淡出的同时继续渲染乱码字符保持动态！
        }

        iCtx.fillStyle = '#000000';
        iCtx.fillRect(0, 0, iCanvas.width, iCanvas.height);
        
        iCtx.font = `${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
        iCtx.textBaseline = 'top';
        iCtx.textAlign = 'left';

        const colorDark = '#333333';
        const colorWhite = '#FFFFFF';

        grid.forEach((cell, index) => {
            if (phase === 1) {
                if (elapsed < cell.revealTime) {
                    return; // 未打字状态保持纯黑
                }
                if (elapsed < cell.cursorTime) {
                    if (cell.wave === 1 || cell.chunkId % 3 !== 0) {
                        iCtx.fillStyle = colorWhite;
                        iCtx.fillText("█", cell.x, cell.y); // 恢复初段打字机约 2 倍数量的光标
                    } else {
                        // 其余文本隐秘出现，防止屏幕白框密度过于饱和
                        iCtx.fillStyle = colorDark;
                        iCtx.fillText(cell.char, cell.x, cell.y); 
                    }
                    return;
                }
            }

            // Garbled matrix text effect from Phase 2 to Phase 4
            if (phase >= 2) {
                if (phase === 4) {
                    if (cell.isSecret) {
                        cell.state = 2; 
                    } else {
                        if (cell.state === 2) cell.state = 0; // 解除非核心像素的锁定
                        
                        // 在最后黑屏前，仅在 SECRET 轮廓“附近/光晕内”加上随机微弱闪光
                        if (cell.state === 0 && cell.nearIntensity > 0.02 && Math.random() < cell.nearIntensity * 0.004) {
                            cell.state = 1;
                            cell.flickerTimer = 100 + Math.random() * 400;
                        }
                    }
                }
                
                if (Math.random() < 0.04) { // 全局持续乱码，包括已锁定的白光 SECRET 内部字符
                    cell.char = allCharsPool[Math.floor(Math.random() * allCharsPool.length)];
                }
            }

            // Update flicker life timer
            if (cell.flickerTimer > 0) {
                cell.flickerTimer -= 16.6;
            } else if (cell.state === 1) {
                cell.state = 0;
            }

            if (phase === 2) {
                const p2Progress = (elapsed - P1) / (P2 - P1);
                // 1. 慢慢增加闪烁数量 (1 -> 150)
                const targetFlickers = 1 + 150 * Math.pow(p2Progress, 3);
                const avgLife = 300; 
                const prob = (targetFlickers / grid.length) * (16.6 / avgLife);
                
                if (cell.state === 0 && Math.random() < prob) {
                    cell.state = 1;
                    cell.flickerTimer = 100 + Math.random() * 400; // 发亮时间更长更平缓
                }
            } else if (phase === 3) {
                const p3Elapsed = elapsed - P2;
                const p3Progress = Math.min(p3Elapsed / (P3 - P2), 1.0);
                
                // 2. 背景随机闪烁快速衰减至 0
                const bgProb = (200 / grid.length) * (16.6 / 300) * Math.max(0, 1 - p3Progress * 2.5);
                
                // 3. 附近字闪烁增强，伴随抛物线起伏
                const nearPeak = Math.max(0, Math.sin(p3Progress * Math.PI)); 
                const nearProb = cell.nearIntensity * 0.08 * nearPeak; 
                
                const firingProb = bgProb + nearProb;
                
                if (cell.isSecret) {
                    // Lock chance increases at the end of phase 3
                    const lockThreshold = 0.5 + Math.random() * 0.5;
                    if (p3Progress > lockThreshold) {
                        cell.state = 2; // Locked shape
                    } else {
                        if (cell.state === 0 && Math.random() < firingProb + 0.05 * p3Progress) {
                            cell.state = 1;
                            cell.flickerTimer = 100 + Math.random() * 300;
                        }
                    }
                } else {
                    if (cell.state === 0 && Math.random() < firingProb) {
                        cell.state = 1;
                        cell.flickerTimer = 100 + Math.random() * 300;
                    }
                }
            }
            
            if (cell.state === 2 || cell.state === 1) {
                iCtx.fillStyle = colorWhite;
            } else {
                iCtx.fillStyle = colorDark;
            }
            iCtx.fillText(cell.char, cell.x, cell.y);
        });

        requestAnimationFrame(render);
    }
    
    requestAnimationFrame(render);
}