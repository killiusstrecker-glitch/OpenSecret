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
        
        // 初始位置将改为在 initApp 中设定
        this.tx = 0;
        this.ty = 0;
        
        this.state = 'intro_wait'; 
        this.hoverTime = 0;
        this.particles = [];
        this.uploaded = false;
        
        this.typewriterProgress = 0;
        this.introScale = 0.7; // 文字独立大小比例
        
        this.curTextScale = 1;
        this.curTextOpacity = 0;
        this.curTextX = this.tx;
        this.curTextY = this.ty;
        this.curGuyOpacity = 0.2;
        this.isTarget = false;
    }
    
    update(t) {
        if(this.state === 'dissolved') return; 
        
        // Phase 1: 开场动画 (打字出现，接着飞向小人中心点)
        let introTypeDuration = 4000; // 时间缩短，速度提高20% (要求2)
        let introHoldDuration = 2000; 
        let introFlyDuration = 3000;

        if(t <= introTypeDuration) {
            this.state = 'intro_wait';
            this.curTextOpacity = 1.0; 
            this.curGuyOpacity = 0.0; // 打字时隐藏小主体
            this.curTextScale = this.introScale; // 应用专属放大倍率
            this.typewriterProgress = t / introTypeDuration;
            this.curTextX = this.tx;
            this.curTextY = this.ty;
        } 
        else if(t <= introTypeDuration + introHoldDuration) {
            this.state = 'intro_wait';
            this.curTextOpacity = 1.0; 
            this.curGuyOpacity = (t - introTypeDuration) / introHoldDuration * 0.2; // 逐渐显现小人
            this.curTextScale = this.introScale;
            this.typewriterProgress = 1.0;
            this.curTextX = this.tx;
            this.curTextY = this.ty;
        } 
        else if(t <= introTypeDuration + introHoldDuration + introFlyDuration) {
            this.state = 'intro_move';
            this.typewriterProgress = 1.0;
            let progress = (t - (introTypeDuration + introHoldDuration)) / introFlyDuration;
            let ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            this.curTextX = this.tx + (this.gx - this.tx) * ease; 
            this.curTextY = this.ty + (this.gy - this.ty) * ease;
            this.curTextScale = this.introScale * (1 - ease); 
            this.curTextOpacity = 1 - ease; 
            this.curGuyOpacity = 0.2;
        } 
        else if(this.state === 'intro_move' || this.state === 'intro_wait') {
            this.state = 'idle';
            this.curTextOpacity = 0;
            this.typewriterProgress = 0.0;
            this.curGuyOpacity = 0.2;
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

// 要求3：完全废弃正圆形排斥导致的“蜂巢整齐感”，改用真实的文本矩形碰撞(AABB)算法来实现文字穿插随机排版
function generateDensePositionsText() {
    let positions = [];
    const spawnWidth = CANVAS_WIDTH * 0.98; // 拓展为 98% 边界，防止极度拥挤
    const spawnHeight = CANVAS_HEIGHT * 0.98;
    const offsetX = (CANVAS_WIDTH - spawnWidth) / 2;
    const offsetY = (CANVAS_HEIGHT - spawnHeight) / 2;

    for(let i=1; i<=TOTAL_ENTITIES; i++) {
        let txtImg = textImgs[i];
        
        let imgW = txtImg && txtImg.width ? txtImg.width : 250;
        let imgH = txtImg && txtImg.height ? txtImg.height : 50;

        // 要求2：统一并且固定文本的巨大尺寸，彻底取消各个文本之间的随机大小差异变化
        let baseScale = 0.85; 
        
        // 允许字与字的检测边界发生肉眼不可见的极微小重叠（因为文字Canvas内部自带大量透明Padding，就算边界重叠，里面文字绝对不会重叠，且能让排版更紧凑密实防重叠）
        let padX = -5;  
        let padY = -5; 

        let placed = false;
        let bestX = 0, bestY = 0;
        
        let curScale = baseScale;
        let w = imgW * curScale;
        let h = imgH * curScale;

        // 极限压缩寻址：由于字体彻底统一变大，屏幕空间会极其狭小拥挤。加大寻址次数到 15000 次死磕相同尺寸找空位
        for (let shrinkRound = 0; shrinkRound < 2; shrinkRound++) {
            for (let attempts = 0; attempts < 15000; attempts++) {
                let rndX = offsetX + w/2 + Math.random() * (spawnWidth - w);
                let rndY = offsetY + h/2 + Math.random() * (spawnHeight - h);
                
                let overlap = false;
                for(let j = 0; j < positions.length; j++) {
                    let p2 = positions[j];
                    if (Math.abs(rndX - p2.x) < (w/2 + p2.w/2 + padX) && 
                        Math.abs(rndY - p2.y) < (h/2 + p2.h/2 + padY)) {
                        overlap = true;
                        break;
                    }
                }
                if (!overlap) {
                    bestX = rndX;
                    bestY = rndY;
                    placed = true;
                    break;
                }
            }
            if(placed) break;
            
            // 实在放不下，稍微缩小尺寸再来
            curScale *= 0.85;
            w = imgW * curScale;
            h = imgH * curScale;
        }

        if(!placed) { // 最终托底
            bestX = offsetX + w/2 + Math.random() * (spawnWidth - w);
            bestY = offsetY + h/2 + Math.random() * (spawnHeight - h);
        }
        
        positions.push({ x: bestX, y: bestY, w: w, h: h, scale: curScale });
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
    
    // 采用专为文本设计的矩形重叠保护算法，使得文本随机穿插、错落有致但绝不重叠
    let textIntroLayout = generateDensePositionsText();
    
    for(let i=1; i<=TOTAL_ENTITIES; i++) {
        let pos = posArray[i-1];
        let ent = new Entity(i, pos.x, pos.y, pos.templateIdx);
        ent.tx = textIntroLayout[i-1].x;
        ent.ty = textIntroLayout[i-1].y;
        ent.introScale = textIntroLayout[i-1].scale;
        ent.curTextX = ent.tx;
        ent.curTextY = ent.ty;
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
    if (t > 9000 && !isAnyBusy) { // 现在的总时长改为9秒
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
    
    // 中间层：开场动画之后再绘制探照灯遮罩
    if (t > 9000) {
        document.body.style.cursor = 'none'; // 仅在互动开始时隐藏真实指针
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
    }
    
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