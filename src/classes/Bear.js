export default class Bear {
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
    this.detectionRadius = 150; // Увеличенный радиус обнаружения улья
    this.wanderingRadius = 300;
    this.attackPower = 2;
    this.attackCooldown = 0;
    this.state = 'idle'; // 'idle', 'wandering', 'chasing', 'attacking', 'leaving', 'dead'
    this.homePosition = { ...this.position };
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.wanderTarget = this.getRandomWanderTarget();
    this.attackRange = 50; // Дистанция для атаки
    this.direction = { x: Math.random() < 0.5 ? 1 : -1, y: Math.random() < 0.5 ? 1 : -1 };
    this.wanderTime = 0;
    this.maxWanderTime = 3000 + Math.random() * 4000; // 3-7 секунд блуждания
     this.setBoundaries(canvasWidth, canvasHeight);
  }

  getRandomWanderTarget() {
    return {
      x: this.homePosition.x + (Math.random() * this.wanderingRadius * 2 - this.wanderingRadius),
      y: this.homePosition.y + (Math.random() * this.wanderingRadius * 2 - this.wanderingRadius)
    };
  }

  setBoundaries(canvasWidth, canvasHeight) {
    this.boundaries = {
      left: 30,
      right: canvasWidth - 30,
      top: 30,
      bottom: canvasHeight - 30
    };
  }


  update(deltaTime, hive) {
    // Проверка состояния и здоровья
    if (this.state === 'dead' || this.state === 'gone') {
      return this.state === 'dead' ? 'bear-dead' : null;
    }

    // Обновление позиции с проверкой границ
    this.updatePosition(deltaTime);
    this.enforceBoundaries();

    // Проверка расстояния до улья
    const distanceToHive = this.calculateDistance(hive.position);
    const canSeeHive = distanceToHive <= this.detectionRadius;

    // Логика перехода между состояниями
    switch (this.state) {
      case 'idle':
        if (canSeeHive) {
          this.target = hive;
          this.state = 'chasing';
        } else {
          this.state = 'wandering';
        }
        break;

      case 'wandering':
        if (canSeeHive) {
          this.target = hive;
          this.state = 'chasing';
        }
        break;

      case 'chasing':
        if (!canSeeHive) {
          this.state = 'wandering';
        } else if (distanceToHive <= this.attackRange) {
          this.state = 'attacking';
        }
        break;

      case 'attacking':
        if (distanceToHive > this.attackRange) {
          this.state = 'chasing';
        } else {
          this.attackCooldown += deltaTime;
          if (this.attackCooldown >= 1000) { // Атака раз в секунду
            const result = hive.takeDamage(this.attackPower);
            this.attackCooldown = 0;
            if (result === 'hive-destroyed') {
              this.state = 'leaving';
              return 'hive-destroyed';
            }
          }
        }
        break;

      case 'leaving':
        this.position.x += this.speed * deltaTime;
        if (this.position.x > this.canvasWidth + 100) {
          this.state = 'gone';
        }
        break;
    }

    return null;
  }


  updatePosition(deltaTime) {
    if (this.state === 'chasing' && this.target) {
      // Движение к цели (улью)
      const dx = this.target.position.x - this.position.x;
      const dy = this.target.position.y - this.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        this.position.x += (dx / distance) * this.speed * deltaTime;
        this.position.y += (dy / distance) * this.speed * deltaTime;
      }
    } else if (this.state === 'wandering') {
      // Случайное блуждание
      this.position.x += this.direction.x * this.speed * deltaTime;
      this.position.y += this.direction.y * this.speed * deltaTime;
    }
  }


  enforceBoundaries(prevPos) {
    // Жесткое ограничение границ с откатом
    if (this.position.x < this.boundaries.left) {
      this.position.x = this.boundaries.left;
      this.direction.x *= -1;
    }
    if (this.position.x > this.boundaries.right) {
      this.position.x = this.boundaries.right;
      this.direction.x *= -1;
    }
    if (this.position.y < this.boundaries.top) {
      this.position.y = this.boundaries.top;
      this.direction.y *= -1;
    }
    if (this.position.y > this.boundaries.bottom) {
      this.position.y = this.boundaries.bottom;
      this.direction.y *= -1;
    }

    // Дополнительная проверка для состояния "leaving"
    if (this.state === 'leaving' && this.position.x > this.boundaries.right + 100) {
      this.state = 'gone';
    }
  }

  checkWallCollision() {
    const margin = 30;
    return {
      x: this.position.x <= margin || this.position.x >= this.canvasWidth - margin,
      y: this.position.y <= margin || this.position.y >= this.canvasHeight - margin
    };
  }

  changeDirection() {
    // Случайное изменение направления (может измениться по одной оси или по обеим)
    if (Math.random() < 0.7) this.direction.x = this.direction.x > 0 ? -1 : 1;
    if (Math.random() < 0.7) this.direction.y = this.direction.y > 0 ? -1 : 1;
    
    // Иногда добавляем небольшую случайную составляющую
    this.direction.x += (Math.random() * 0.4 - 0.2);
    this.direction.y += (Math.random() * 0.4 - 0.2);
    
    // Нормализуем вектор направления
    const length = Math.sqrt(this.direction.x * this.direction.x + this.direction.y * this.direction.y);
    this.direction.x /= length;
    this.direction.y /= length;
  }

  handleWanderingState(deltaTime, hive) {
    // Движение в текущем направлении
    this.position.x += this.direction.x * this.speed * deltaTime;
    this.position.y += this.direction.y * this.speed * deltaTime;

    // Проверка обнаружения улья
    const distanceToHive = this.calculateDistance(hive.position);
    if (distanceToHive <= this.detectionRadius) {
      this.target = hive;
      this.state = 'chasing';
    }
  }

  handleIdleState(hive) {
    const distanceToHive = this.calculateDistance(hive.position);
    if (distanceToHive <= this.detectionRadius) {
      this.target = hive;
      this.state = 'chasing';
    } else {
      this.state = 'wandering';
      this.wanderTarget = this.getRandomWanderTarget();
    }
  }

  handleWanderingState(deltaTime, hive) {
    if (!this.wanderTarget) {
      this.wanderTarget = this.getRandomWanderTarget();
    }

    const dx = this.wanderTarget.x - this.position.x;
    const dy = this.wanderTarget.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Движение к цели
    if (distance > 5) {
      this.position.x += (dx / distance) * this.speed * deltaTime;
      this.position.y += (dy / distance) * this.speed * deltaTime;
    } else {
      // Достигли цели - выбираем новую
      this.wanderTarget = this.getRandomWanderTarget();
    }

    // Проверка обнаружения улья
    const distanceToHive = this.calculateDistance(hive.position);
    if (distanceToHive <= this.detectionRadius) {
      this.target = hive;
      this.state = 'chasing';
      this.wanderTarget = null;
    }
  }

  handleChasingState(deltaTime, hive) {
    if (!this.target) {
      this.state = 'wandering';
      return;
    }

    const dx = this.target.position.x - this.position.x;
    const dy = this.target.position.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.attackRange) {
      // Продолжаем преследование
      this.position.x += (dx / distance) * this.speed * deltaTime;
      this.position.y += (dy / distance) * this.speed * deltaTime;
    } else {
      // Достаточно близко для атаки
      this.state = 'attacking';
    }
  }

  handleAttackingState(deltaTime, hive) {
    this.attackCooldown += deltaTime;
    
    if (this.attackCooldown > 1000) { // Атака раз в секунду
      hive.takeDamage(this.attackPower);
      this.attackCooldown = 0;
      
      if (hive.health <= 0) {
        this.state = 'leaving';
        return 'hive-destroyed';
      }
    }
  }

  handleLeavingState(deltaTime) {
    // Медведь уходит за правый край экрана
    this.position.x += this.speed * deltaTime;
    if (this.position.x > this.canvasWidth + 100) {
      this.state = 'gone';
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.state = 'dead';
      return true;
    }
    return false;
  }

  calculateDistance(target) {
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getVisualData() {
    return {
      position: this.position,
      state: this.state,
      health: this.health,
      maxHealth: this.maxHealth,
      detectionRadius: this.detectionRadius
    };
  }
}