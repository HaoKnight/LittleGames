const canvas = document.getElementById("gameCanvas"); /* 获取画布元素 */
const ctx = canvas.getContext("2d"); /* 获取2D绘图上下文 */
const scoreElement = document.getElementById("score"); /* 获取分数显示元素 */
const highScoreElement =
  document.getElementById("highScore"); /* 获取最高分显示元素 */
const messageElement =
  document.getElementById("message"); /* 获取消息提示元素 */
const finalScoreElement =
  document.getElementById("finalScore"); /* 获取最终分数显示元素 */
const startOverlay =
  document.getElementById("startOverlay"); /* 获取开始覆盖层元素 */

// 网格尺寸及画布动态宽高 /* 游戏配置变量 */
const blockSize = 20; /* 每个网格块的大小为20px */
let width, height; /* 声明画布的宽度和高度变量 */

// 按窗口尺寸动态调整画布（保持网格对齐） /* 调整画布大小的函数 */
function resizeCanvas() {
  /* 定义调整画布大小的函数 */
  const isLandscape =
    window.innerWidth > window.innerHeight &&
    window.innerWidth > 768; /* 判断是否为横屏且宽度足够 */
  const controlsHidden =
    document.body.classList.contains("controls-hidden"); /* 检查控制是否隐藏 */

  // 预留上下控件空间，得到可用区域 /* 计算可用区域 */
  let sideReserved = isLandscape ? 450 : 30; /* 默认预留空间 */
  let bottomReserved = isLandscape
    ? 60
    : 420; /* 默认预留空间，竖屏增加到420以容纳控制按钮 */

  if (controlsHidden) {
    /* 如果控制隐藏 */
    sideReserved = 30; /* 减少侧边预留 */
    bottomReserved = 80; /* 减少底部预留 */
  }

  let availableWidth = window.innerWidth - sideReserved; /* 计算可用宽度 */
  let availableHeight = window.innerHeight - bottomReserved; /* 计算可用高度 */

  // 限制最大与最小高度，避免过大或过小 /* 限制画布尺寸 */
  if (availableWidth > 1200)
    availableWidth = 1200; /* 如果宽度大于1200px，限制为1200px */
  if (availableHeight > 900)
    availableHeight = 900; /* 如果高度大于900px，限制为900px */
  if (availableHeight < 200)
    availableHeight = 200; /* 如果高度小于200px，限制为200px */

  // 向下取整，保持与 blockSize 对齐 /* 计算网格列数和行数 */
  const cols = Math.floor(availableWidth / blockSize); /* 列数向下取整 */
  const rows = Math.floor(availableHeight / blockSize); /* 行数向下取整 */

  canvas.width = cols * blockSize; /* 设置画布宽度 */
  canvas.height = rows * blockSize; /* 设置画布高度 */

  width = canvas.width; /* 更新宽度变量 */
  height = canvas.height; /* 更新高度变量 */
}

// 页面初始自适应 /* 初始化画布大小 */
resizeCanvas(); /* 调用调整画布大小函数 */

// 窗口尺寸变化时重算画布并重开一局（防止失真） /* 监听窗口大小变化 */
let resizeTimeout; /* 声明防抖定时器变量 */
window.addEventListener("resize", () => {
  /* 监听窗口大小变化事件 */
  clearTimeout(resizeTimeout); /* 清除之前的定时器 */
  resizeTimeout = setTimeout(() => {
    /* 设置新的定时器，200ms后执行 */
    resizeCanvas(); /* 调整画布大小 */
    // 仅在正在游戏时重置，避免未开始就自动开局 /* 如果游戏正在进行，重新初始化 */
    if (gameInterval) {
      /* 如果游戏循环存在 */
      initGame(); /* 重新初始化游戏 */
    }
  }, 200); /* 延迟200毫秒 */
});

// 核心状态 /* 游戏状态变量 */
let snake = []; /* 蛇的身体数组 */
let food = {}; /* 食物对象 */
let direction = "RIGHT"; // 当前方向 /* 当前移动方向 */
let nextDirection = "RIGHT"; // 输入缓存方向 /* 下一个移动方向（用于防止快速反向） */
let score = 0; /* 当前分数 */
let highScore =
  localStorage.getItem("snakeHighScore") ||
  0; /* 从本地存储获取最高分，默认为0 */
let gameInterval; /* 游戏循环定时器 */
let isGameOver = false; /* 游戏是否结束标志 */
let gameSpeed = 100; /* 游戏速度（毫秒） */

// Colors /* 颜色配置对象 */
// 颜色主题 /* 定义游戏颜色主题 */
const COLORS = {
  /* 颜色常量对象 */ background: "#222" /* 背景色深灰色 */,
  grid: "#333" /* 网格线颜色深灰色 */,
  snakeHead: "#2ecc71" /* 蛇头颜色绿色 */,
  snakeBody: "#27ae60" /* 蛇身颜色深绿色 */,
  food: "#e74c3c" /* 食物颜色红色 */,
  text: "#fff" /* 文字颜色白色 */,
};

highScoreElement.innerText = highScore; /* 显示最高分 */

// 初始化/重开一局 /* 初始化游戏函数 */
function initGame() {
  /* 定义初始化游戏函数 */
  // 以网格中心对齐，避免 0.5 格导致无法碰撞 /* 计算蛇的起始位置 */
  const startX =
    Math.floor(width / (2 * blockSize)) * blockSize; /* 起始X坐标，网格对齐 */
  const startY =
    Math.floor(height / (2 * blockSize)) * blockSize; /* 起始Y坐标，网格对齐 */

  snake = [
    /* 初始化蛇的身体 */ { x: startX, y: startY } /* 蛇头位置 */,
    { x: startX - blockSize, y: startY } /* 第二段位置 */,
    { x: startX - 2 * blockSize, y: startY } /* 第三段位置 */,
  ];
  direction = "RIGHT"; /* 设置初始方向为右 */
  nextDirection = "RIGHT"; /* 设置下一个方向为右 */
  score = 0; /* 重置分数为0 */
  isGameOver = false; /* 设置游戏未结束 */
  scoreElement.innerText = score; /* 更新分数显示 */
  messageElement.style.display = "none"; /* 隐藏游戏结束消息 */
  createFood(); /* 创建食物 */
  if (gameInterval) clearInterval(gameInterval); /* 如果存在游戏循环，清除它 */
  gameInterval = setInterval(gameLoop, gameSpeed); /* 开始游戏循环 */
}

// 随机生成食物，避免落在蛇身上 /* 创建食物函数 */
function createFood() {
  /* 定义创建食物函数 */
  food = {
    /* 创建食物对象 */
    x:
      Math.floor(Math.random() * (width / blockSize)) *
      blockSize /* 随机X坐标，网格对齐 */,
    y:
      Math.floor(Math.random() * (height / blockSize)) *
      blockSize /* 随机Y坐标，网格对齐 */,
  };
  // Ensure food doesn't spawn on snake /* 确保食物不生成在蛇身上 */
  for (let part of snake) {
    /* 遍历蛇的每一段 */
    if (part.x === food.x && part.y === food.y) {
      /* 如果食物位置与蛇身重叠 */
      createFood(); /* 重新创建食物 */
      return; /* 返回 */
    }
  }
}

// 绘制网格背景 /* 绘制网格函数 */
function drawGrid() {
  /* 定义绘制网格函数 */
  ctx.strokeStyle = COLORS.grid; /* 设置描边颜色为网格色 */
  ctx.lineWidth = 0.5; /* 设置线宽为0.5px */
  for (let x = 0; x <= width; x += blockSize) {
    /* 绘制垂直线 */
    ctx.beginPath(); /* 开始新路径 */
    ctx.moveTo(x, 0); /* 移动到起点 */
    ctx.lineTo(x, height); /* 绘制到终点 */
    ctx.stroke(); /* 描边 */
  }
  for (let y = 0; y <= height; y += blockSize) {
    /* 绘制水平线 */
    ctx.beginPath(); /* 开始新路径 */
    ctx.moveTo(0, y); /* 移动到起点 */
    ctx.lineTo(width, y); /* 绘制到终点 */
    ctx.stroke(); /* 描边 */
  }
}

// 绘制圆角矩形（蛇身/蛇头） /* 绘制圆角矩形函数 */
function drawRoundedRect(x, y, width, height, radius, color) {
  /* 定义绘制圆角矩形函数 */
  ctx.fillStyle = color; /* 设置填充颜色 */
  ctx.beginPath(); /* 开始新路径 */
  ctx.moveTo(x + radius, y); /* 移动到左上角圆角起点 */
  ctx.lineTo(x + width - radius, y); /* 绘制到右上角圆角起点 */
  ctx.quadraticCurveTo(
    x + width,
    y,
    x + width,
    y + radius
  ); /* 绘制右上角圆角 */
  ctx.lineTo(x + width, y + height - radius); /* 绘制到右下角圆角起点 */
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius,
    y + height
  ); /* 绘制右下角圆角 */
  ctx.lineTo(x + radius, y + height); /* 绘制到左下角圆角起点 */
  ctx.quadraticCurveTo(
    x,
    y + height,
    x,
    y + height - radius
  ); /* 绘制左下角圆角 */
  ctx.lineTo(x, y + radius); /* 绘制到左上角圆角起点 */
  ctx.quadraticCurveTo(x, y, x + radius, y); /* 绘制左上角圆角 */
  ctx.closePath(); /* 闭合路径 */
  ctx.fill(); /* 填充 */
}

// 绘制圆形（眼睛/食物） /* 绘制圆形函数 */
function drawCircle(x, y, radius, color) {
  /* 定义绘制圆形函数 */
  ctx.fillStyle = color; /* 设置填充颜色 */
  ctx.beginPath(); /* 开始新路径 */
  ctx.arc(x, y, radius, 0, Math.PI * 2); /* 绘制圆形，从0到2π */
  ctx.fill(); /* 填充 */
}

// 主绘制函数 /* 主绘制函数 */
function draw() {
  /* 定义绘制函数 */
  // Clear screen /* 清空画布 */
  ctx.fillStyle = COLORS.background; /* 设置背景色 */
  ctx.fillRect(0, 0, width, height); /* 填充整个画布 */

  drawGrid(); /* 绘制网格 */

  // Draw Food (Apple style) /* 绘制食物（苹果风格） */
  const foodRadius = blockSize / 2 - 2; /* 食物半径 */
  const foodX = food.x + blockSize / 2; /* 食物中心X坐标 */
  const foodY = food.y + blockSize / 2; /* 食物中心Y坐标 */

  // Glow effect /* 发光效果 */
  ctx.shadowBlur = 15; /* 设置阴影模糊半径15px */
  ctx.shadowColor = COLORS.food; /* 设置阴影颜色为食物色 */
  drawCircle(foodX, foodY, foodRadius, COLORS.food); /* 绘制食物 */
  ctx.shadowBlur = 0; // Reset shadow /* 重置阴影模糊 */

  // Draw Snake /* 绘制蛇 */
  for (let i = 0; i < snake.length; i++) {
    /* 遍历蛇的每一段 */
    const isHead = i === 0; /* 判断是否为蛇头 */
    const x = snake[i].x; /* 获取当前段的X坐标 */
    const y = snake[i].y; /* 获取当前段的Y坐标 */

    // Body segments slightly smaller to see separation /* 身体段稍微小一点以便看到分离 */
    const padding = 1; /* 内边距1px */
    const size = blockSize - padding * 2; /* 实际大小 */

    ctx.shadowBlur = isHead ? 10 : 0; /* 蛇头有阴影，身体无阴影 */
    ctx.shadowColor = COLORS.snakeHead; /* 设置阴影颜色 */

    drawRoundedRect(
      /* 绘制圆角矩形 */
      x + padding /* X坐标加内边距 */,
      y + padding /* Y坐标加内边距 */,
      size /* 宽度 */,
      size /* 高度 */,
      isHead ? 6 : 4 /* 圆角半径，蛇头6px，身体4px */,
      isHead
        ? COLORS.snakeHead
        : COLORS.snakeBody /* 颜色，蛇头绿色，身体深绿色 */
    );

    ctx.shadowBlur = 0; /* 重置阴影 */

    // Eyes for head /* 为蛇头绘制眼睛 */
    if (isHead) {
      /* 如果是蛇头 */
      ctx.fillStyle = "white"; /* 设置填充颜色为白色 */
      const eyeSize = 3; /* 眼睛大小3px */
      const eyeOffset = 5; /* 眼睛偏移5px */

      let leftEyeX, leftEyeY, rightEyeX, rightEyeY; /* 声明眼睛坐标变量 */

      if (direction === "RIGHT") {
        /* 如果方向向右 */
        leftEyeX = x + blockSize - eyeOffset; /* 左眼X坐标 */
        leftEyeY = y + eyeOffset; /* 左眼Y坐标 */
        rightEyeX = x + blockSize - eyeOffset; /* 右眼X坐标 */
        rightEyeY = y + blockSize - eyeOffset; /* 右眼Y坐标 */
      } else if (direction === "LEFT") {
        /* 如果方向向左 */
        leftEyeX = x + eyeOffset; /* 左眼X坐标 */
        leftEyeY = y + eyeOffset; /* 左眼Y坐标 */
        rightEyeX = x + eyeOffset; /* 右眼X坐标 */
        rightEyeY = y + blockSize - eyeOffset; /* 右眼Y坐标 */
      } else if (direction === "UP") {
        /* 如果方向向上 */
        leftEyeX = x + eyeOffset; /* 左眼X坐标 */
        leftEyeY = y + eyeOffset; /* 左眼Y坐标 */
        rightEyeX = x + blockSize - eyeOffset; /* 右眼X坐标 */
        rightEyeY = y + eyeOffset; /* 右眼Y坐标 */
      } else if (direction === "DOWN") {
        /* 如果方向向下 */
        leftEyeX = x + eyeOffset; /* 左眼X坐标 */
        leftEyeY = y + blockSize - eyeOffset; /* 左眼Y坐标 */
        rightEyeX = x + blockSize - eyeOffset; /* 右眼X坐标 */
        rightEyeY = y + blockSize - eyeOffset; /* 右眼Y坐标 */
      }

      drawCircle(leftEyeX, leftEyeY, eyeSize, "white"); /* 绘制左眼 */
      drawCircle(rightEyeX, rightEyeY, eyeSize, "white"); /* 绘制右眼 */

      // Pupils /* 绘制瞳孔 */
      ctx.fillStyle = "black"; /* 设置填充颜色为黑色 */
      drawCircle(leftEyeX, leftEyeY, 1.5, "black"); /* 绘制左瞳孔 */
      drawCircle(rightEyeX, rightEyeY, 1.5, "black"); /* 绘制右瞳孔 */
    }
  }
}

// 更新蛇位置与碰撞处理 /* 更新游戏状态函数 */
function update() {
  /* 定义更新函数 */
  if (isGameOver) return; /* 如果游戏结束，直接返回 */

  direction = nextDirection; /* 更新当前方向 */

  const head = { x: snake[0].x, y: snake[0].y }; /* 获取蛇头位置 */

  if (direction === "RIGHT") head.x += blockSize; /* 如果向右，X坐标增加 */
  else if (direction === "LEFT") head.x -= blockSize; /* 如果向左，X坐标减少 */
  else if (direction === "UP") head.y -= blockSize; /* 如果向上，Y坐标减少 */
  else if (direction === "DOWN") head.y += blockSize; /* 如果向下，Y坐标增加 */

  // 边界碰撞 /* 检查边界碰撞 */
  if (head.x < 0 || head.x >= width || head.y < 0 || head.y >= height) {
    /* 如果超出边界 */
    gameOver(); /* 游戏结束 */
    return; /* 返回 */
  }

  // 身体碰撞 /* 检查身体碰撞 */
  for (let part of snake) {
    /* 遍历蛇的每一段 */
    if (head.x === part.x && head.y === part.y) {
      /* 如果蛇头与身体重叠 */
      gameOver(); /* 游戏结束 */
      return; /* 返回 */
    }
  }

  snake.unshift(head); /* 在数组开头添加新的蛇头 */

  // 吃到食物 /* 检查是否吃到食物 */
  if (head.x === food.x && head.y === food.y) {
    /* 如果蛇头与食物重叠 */
    score++; /* 分数加1 */
    scoreElement.innerText = score; /* 更新分数显示 */
    if (score > highScore) {
      /* 如果分数超过最高分 */
      highScore = score; /* 更新最高分 */
      localStorage.setItem("snakeHighScore", highScore); /* 保存到本地存储 */
      highScoreElement.innerText = highScore; /* 更新最高分显示 */
    }
    createFood(); /* 创建新食物 */
    // Increase speed slightly /* 稍微增加速度 */
    if (gameSpeed > 30) gameSpeed -= 2; /* 如果速度大于30ms，减少2ms */
    clearInterval(gameInterval); /* 清除旧的游戏循环 */
    gameInterval = setInterval(
      gameLoop,
      gameSpeed
    ); /* 用新速度重新开始游戏循环 */
  } else {
    /* 否则 */
    snake.pop(); /* 移除蛇尾 */
  }
}

// 帧循环：更新 + 绘制 /* 游戏循环函数 */
function gameLoop() {
  /* 定义游戏循环函数 */
  update(); /* 更新游戏状态 */
  draw(); /* 绘制游戏画面 */
}

// 结束逻辑 /* 游戏结束函数 */
function gameOver() {
  /* 定义游戏结束函数 */
  isGameOver = true; /* 设置游戏结束标志 */
  clearInterval(gameInterval); /* 清除游戏循环 */
  finalScoreElement.innerText = score; /* 显示最终分数 */
  messageElement.style.display = "block"; /* 显示游戏结束消息 */
}

// 点击按钮重开 /* 重置游戏函数 */
function resetGame() {
  /* 定义重置游戏函数 */
  gameSpeed = 100; /* 重置游戏速度为100ms */
  initGame(); /* 重新初始化游戏 */
}

// 首次开始，或手动开始一局 /* 开始游戏函数 */
function START() {
  /* 定义开始游戏函数 */
  // 避免重复启动多重 interval /* 避免重复启动 */
  if (gameInterval) clearInterval(gameInterval); /* 如果存在游戏循环，清除它 */
  gameSpeed = 100; /* 设置游戏速度为100ms */
  isGameOver = false; /* 设置游戏未结束 */
  startOverlay.style.display = "none"; /* 隐藏开始覆盖层 */
  messageElement.style.display = "none"; /* 隐藏游戏结束消息 */
  initGame(); /* 初始化游戏 */
}

// 方向输入（含防反向立即撞死） /* 处理输入函数 */
function handleInput(newDir) {
  /* 定义处理输入函数 */
  if (newDir === "UP" && direction !== "DOWN")
    nextDirection = "UP"; /* 如果输入向上且当前不向下，设置下一个方向为向上 */
  else if (newDir === "DOWN" && direction !== "UP")
    nextDirection = "DOWN"; /* 如果输入向下且当前不向上，设置下一个方向为向下 */
  else if (newDir === "LEFT" && direction !== "RIGHT")
    nextDirection = "LEFT"; /* 如果输入向左且当前不向右，设置下一个方向为向左 */
  else if (newDir === "RIGHT" && direction !== "LEFT")
    nextDirection =
      "RIGHT"; /* 如果输入向右且当前不向左，设置下一个方向为向右 */
}

// 键盘控制 /* 键盘事件监听 */
document.addEventListener("keydown", (event) => {
  /* 监听键盘按下事件 */
  const key = event.key; /* 获取按下的键 */
  // Prevent scrolling when using arrow keys /* 防止使用方向键时滚动页面 */
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(key)) {
    /* 如果是方向键或空格键 */
    event.preventDefault(); /* 阻止默认行为 */
  }

  if (key === "ArrowUp" || key === "w")
    handleInput("UP"); /* 如果按下上箭头或W键，处理向上输入 */
  else if (key === "ArrowDown" || key === "s")
    handleInput("DOWN"); /* 如果按下下箭头或S键，处理向下输入 */
  else if (key === "ArrowLeft" || key === "a")
    handleInput("LEFT"); /* 如果按下左箭头或A键，处理向左输入 */
  else if (key === "ArrowRight" || key === "d")
    handleInput("RIGHT"); /* 如果按下右箭头或D键，处理向右输入 */
  else if (key === " " && isGameOver)
    resetGame(); /* 如果按下空格键且游戏结束，重置游戏 */
});

// 默认展示开始按钮，不自动开局 /* 初始化显示 */
startOverlay.style.display = "flex"; /* 显示开始覆盖层 */

// 切换控制按钮显示 /* 切换控制函数 */
function toggleControls() {
  /* 定义切换控制函数 */
  const checkbox = document.getElementById("toggleControls"); /* 获取复选框 */
  if (checkbox.checked) {
    /* 如果选中 */
    document.body.classList.remove("controls-hidden"); /* 移除隐藏类 */
  } else {
    /* 否则 */
    document.body.classList.add("controls-hidden"); /* 添加隐藏类 */
  }
  resizeCanvas(); /* 重新调整画布大小 */
  if (gameInterval) {
    /* 如果游戏正在进行 */
    initGame(); /* 重新初始化游戏 */
  }
}

// 切换控制按钮显示 /* 切换控制函数 */
function toggleControls() {
  /* 定义切换控制函数 */
  const checkbox = document.getElementById("toggleControls"); /* 获取复选框 */
  if (checkbox.checked) {
    /* 如果选中 */
    document.body.classList.remove("controls-hidden"); /* 移除隐藏类 */
  } else {
    /* 否则 */
    document.body.classList.add("controls-hidden"); /* 添加隐藏类 */
  }
  resizeCanvas(); /* 重新调整画布大小 */
  if (gameInterval) {
    /* 如果游戏正在进行 */
    initGame(); /* 重新初始化游戏 */
  }
}
