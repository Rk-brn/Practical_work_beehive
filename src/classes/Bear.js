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
  }

  getRandomWanderTarget() {
    return {
      x: this.homePosition.x + (Math.random() * this.wanderingRadius * 2 - this.wanderingRadius),
      y: this.homePosition.y + (Math.random() * this.wanderingRadius * 2 - this.wanderingRadius)
    };
  }

  update(deltaTime, hive) {
    // Ограничение позиции в пределах canvas
    this.position.x = Math.max(20, Math.min(this.canvasWidth - 20, this.position.x));
    this.position.y = Math.max(20, Math.min(this.canvasHeight - 20, this.position.y));

    // Логика состояний
    switch (this.state) {
      case 'idle':
        this.handleIdleState(hive);
        break;
        
      case 'wandering':
        this.handleWanderingState(deltaTime, hive);
        break;
        
      case 'chasing':
        this.handleChasingState(deltaTime, hive);
        break;
        
      case 'attacking':
        this.handleAttackingState(deltaTime, hive);
        break;
        
      case 'leaving':
        this.handleLeavingState(deltaTime);
        break;
    }

    return this.state === 'dead' ? 'bear-dead' : null;
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