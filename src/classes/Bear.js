class Bear {
  constructor(canvasWidth, canvasHeight) {
    this.id = `bear-${Date.now()}`;
    this.position = { 
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight
    };
    this.target = null;
    this.health = 100;
    this.maxHealth = 100;
    this.speed = 0.1;
    this.detectionRadius = 300; // Радиус обнаружения улья
    this.wanderingRadius = 150; // Как далеко может уйти от точки старта
    this.attackPower = 2;
    this.attackCooldown = 0;
    this.state = 'idle'; // wandering, chasing, attacking, leaving
    this.homePosition = { ...this.position }; // Точка, вокруг которой бродит
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.nextWanderTarget = this.getRandomWanderTarget();
  }

  getRandomWanderTarget() {
    return {
      x: this.homePosition.x + (Math.random() * this.wanderingRadius * 2 - this.wanderingRadius),
      y: this.homePosition.y + (Math.random() * this.wanderingRadius * 2 - this.wanderingRadius)
    };
  }

  update(deltaTime, hive) {
  // Ограничиваем позицию медведя в пределах карты
  this.position.x = Math.max(20, Math.min(this.canvasWidth - 20, this.position.x));
  this.position.y = Math.max(20, Math.min(this.canvasHeight - 20, this.position.y));

  if (this.state === 'idle') {
  // Медведь всегда хочет мёда — сразу начинаем поиск улья
  const dx = hive.position.x - this.position.x;
  const dy = hive.position.y - this.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance <= this.detectionRadius) {
    this.target = hive;
    this.state = 'moving';
  } else {
    this.state = 'wandering';
    this.wanderTarget = this.getRandomWanderTarget(); // Используем getRandomWanderTarget()
  }
}

if (this.state === 'wandering') {
  // Генерируем случайную точку, если её нет
  if (!this.wanderTarget) {
    this.wanderTarget = {
      x: Math.random() * this.canvasWidth,
      y: Math.random() * this.canvasHeight
    };
  }

  // Вычисляем расстояние до цели
  const dx = this.wanderTarget.x - this.position.x;
  const dy = this.wanderTarget.y - this.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Двигаемся к цели
  if (distance > 0) {
    this.position.x += (dx / distance) * this.speed * deltaTime;
    this.position.y += (dy / distance) * this.speed * deltaTime;
  }

  // Если достигли точки — генерируем новую
  if (distance < 20) {
    this.wanderTarget = {
      x: Math.random() * this.canvasWidth,
      y: Math.random() * this.canvasHeight
    };
  }

  // Проверяем, видим ли улей
  const hiveDistance = Math.hypot(hive.position.x - this.position.x, hive.position.y - this.position.y);
  if (hiveDistance <= this.detectionRadius) {
    this.target = hive;
    this.state = 'moving';
    this.wanderTarget = null; // Очищаем цель брождения
  }
}


  if (this.state === 'moving' && this.target) {
    const dx = this.target.position.x - this.position.x;
    const dy = this.target.position.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      this.position.x += (dx / distance) * this.speed * deltaTime;
      this.position.y += (dy / distance) * this.speed * deltaTime;
    }

    if (distance < 50) {
      this.state = 'attacking';
    }
  }

  if (this.state === 'attacking') {
    this.attackCooldown += deltaTime;
    if (this.attackCooldown > 1000) {
      hive.health -= this.attackPower;
      this.attackCooldown = 0;
      if (hive.health <= 0) {
        this.state = 'leaving';
        return 'hive-destroyed';
      }
    }
  }

  if (this.state === 'leaving') {
    this.position.x += this.speed * deltaTime;
    if (this.position.x > this.canvasWidth + 100) {
      this.state = 'gone';
    }
  }

  return null;
}
 isAtTarget(target) {
  const dx = target.x - this.position.x;
  const dy = target.y - this.position.y;
  return Math.sqrt(dx * dx + dy * dy) < 20; // Расстояние считается как "достигнуто"
}

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.state = 'dead';
    }
  }
}