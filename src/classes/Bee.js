export default class Bee {
  constructor(hiveId, type = 'worker') {
    // Идентификаторы и принадлежность
    this.id = `bee-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.hiveId = hiveId;
    
    // Позиция и движение
    this.position = { x: 0, y: 0 };
    this.target = null;
    this.direction = { x: 0, y: 0 };
    this.speed = 0.1 + Math.random() * 0.1; // Случайная скорость в диапазоне
    
    // Состояния
    this.status = 'in-hive'; // 'in-hive', 'flying-to-flower', 'collecting', 'returning', 'attacking'
    this.attackMode = false;
    
    // Ресурсы
    this.pollen = 0;
    this.capacity = 10 + Math.floor(Math.random() * 5); // Вместимость 10-14
    this.collectionSpeed = 0.02;
    this.lastSearchTime = 0; // Время последнего поиска цветов
    this.returnTime = 0; // Время возвращения в улей
this.searchTimeout = null; // Таймер для нового поиска
    // Боевые параметры
    this.health = 10;
    this.attackPower = 0.15;
    
    // Система разведки
    this.currentFlower = null;
   
    this.isNotifiedAboutPatch = false;
    this.lastPatchNotificationTime = 0;
    this.flowerSearchCooldown = 0;
    
    
     this.type = type; // 'worker' или 'scout'
    this.knownFlowerPatches = []; // Массив для хранения информации о полянках
    this.isDancing = false;       // Состояние "танца" в улье
    this.danceTargetPatch = null; // Полянка, о которой танцует
    this.isScout = false
    this.isActiveScout = false;
    this.isInformed = false; // Получила ли пчела информацию о полянке
    this.informedUntil = 0; // До какого времени помнит о полянке
     this.scoutMemory = []; // Память о найденных полянках
    this.currentActionTimeout = null; // Таймер текущего действия
    // Время жизни
    this.birthTime = Date.now();
    this.lifespan = 60000 + Math.random() * 30000; // 60-90 секунд
   this.danceDuration = 3000; // 3 секунды танца
    this.danceStartTime = 0;
    this.informedBees = []; // Пчёлы, которых мы уже уведомили
     this.isBusy = false;
  this.lastCheckTime = 0;
  this.currentPatchId = null;
    this.lastActionTime = Date.now();
  this.returnTimeout = null;
  this.returnTimeout = null;
  this.flowerTimeout = null;
  }

  // Метод для начала танца
  startDance(patchId) {
    this.isDancing = true;
    this.danceStartTime = Date.now();
    this.danceTargetPatch = patchId;
    this.status = 'dancing';
  }

  // Метод для обновления танца
  updateDance(hive) {
    if (!this.isDancing) return;

    // Если танец закончился
    if (Date.now() - this.danceStartTime > this.danceDuration) {
      this.isDancing = false;
      this.status = 'idle';
      this.danceTargetPatch = null;
      this.informedBees = [];
      return;
    }

    // Уведомляем случайных пчёл в улье (1 каждые 500мс)
    if (Date.now() - this.danceStartTime > this.informedBees.length * 500) {
      const uninformedBees = hive.bees.filter(bee => 
        bee.status === 'in-hive' && 
        !bee.isScout && 
        !this.informedBees.includes(bee.id)
      );

      if (uninformedBees.length > 0) {
        const randomBee = uninformedBees[Math.floor(Math.random() * uninformedBees.length)];
        this.informBee(randomBee, this.danceTargetPatch);
        this.informedBees.push(randomBee.id);
      }
    }
  }

  // Метод для уведомления другой пчелы
  informBee(bee, patchId) {
    bee.isInformed = true;
    bee.informedPatchId = patchId;
    bee.informedUntil = Date.now() + 30000; // Помнит 30 секунд
  }


  // Основной метод обновления
  update(deltaTime, gameState) {
    if (this.isScout && this.target.patch && !this.target.patch.discovered) {
  this.target.patch.discovered = true;
  this.target.patch.discoveredBy = this.id;
}

    // Проверка времени жизни
    if (Date.now() - this.birthTime > this.lifespan) {
      return 'die'; // Сигнал для удаления пчелы
    }

    // Приоритеты: 1) Атака, 2) Возвращение, 3) Сбор пыльцы
    if (this.handleAttack(deltaTime, gameState.bears, gameState.hive)) {
      return;
    }

    switch (this.status) {
      case 'in-hive':
        this.handleInHiveState(gameState.flowers, gameState.hive);
        break;
        
      case 'flying-to-flower':
        this.handleFlyingToFlower(deltaTime, gameState.hive);
        break;
        
      case 'collecting':
        this.handleCollecting(deltaTime, gameState.hive);
        break;
        
      case 'returning':
        this.handleReturning(deltaTime, gameState.hive);
        break;
    }
  }

  // ===== ОСНОВНЫЕ МЕТОДЫ ПОВЕДЕНИЯ =====
  
  handleInHiveState(flowers, hive) {
    if (this.isNotifiedAboutPatch) return;
    
    // Только если в улье есть место для мёда
    if (hive.honey < hive.maxHoney * 0.95) {
      this.findFlower(flowers, hive);
    }
  }

  handleFlyingToFlower(deltaTime, hive) {
    this.move(deltaTime);
    
    if (this.reachedTarget()) {
      if (this.target && this.target.isBlooming) {
        this.startCollecting();
      } else {
        // Цветок исчез - возвращаемся
        this.returnToHive(hive);
      }
    }
  }

  handleCollecting(deltaTime, hive) {
    if (!this.target || !this.target.isBlooming) {
      this.returnToHive(hive);
      return;
    }

    const collected = this.target.collectPollen(this.collectionSpeed * deltaTime);
    this.pollen += collected;
    
    if (this.pollen >= this.capacity) {
      this.returnToHive(hive);
    } else if (collected <= 0) {
      // Цветок опустошён
      this.target.isTargeted = false;
      this.returnToHive(hive);
    }
  }

  handleReturning(deltaTime, hive) {
    this.move(deltaTime);
    
    if (this.reachedTarget()) {
      this.depositPollen(hive);
      this.status = 'in-hive';
      
      // Сбрасываем уведомление через 10-20 секунд
      setTimeout(() => {
        this.isNotifiedAboutPatch = false;
      }, 10000 + Math.random() * 10000);
    }
  }

  // ===== МЕТОДЫ ДЕЙСТВИЙ =====

  findFlower(flowers, hive) {
    const now = Date.now();
    if (now - this.flowerSearchCooldown < 2000) return false; // Задержка между поисками

    const availableFlowers = flowers.filter(f => 
      f.isBlooming && 
      f.pollen > 0 &&
      !f.isTargeted
    );

    if (availableFlowers.length === 0) {
      this.flowerSearchCooldown = now;
      return false;
    }

    // Разведчики выбирают неразведанные полянки
    const flower = this.isScout 
      ? availableFlowers.find(f => !f.patch.discovered) || availableFlowers[0]
      : availableFlowers[0];

    if (flower) {
      this.target = flower;
      this.currentFlower = flower;
      flower.isTargeted = true;
      this.status = 'flying-to-flower';
      this.calculateDirection();
      return true;
    }

    return false;
  }

  startCollecting() {
    this.status = 'collecting';
    if (this.target) {
      this.target.isTargeted = true;
      this.currentFlower = this.target;
      
      // Разведчики помечают полянку как обнаруженную
      if (this.isScout && this.target.patch) {
        this.target.patch.discovered = true;
      }
    }
  }

  returnToHive(hive) {
    if (this.target) {
      this.target.isTargeted = false;
      this.target = null;
    }
    
    this.status = 'returning';
    this.target = { ...hive.position };
    this.calculateDirection();
  }

  depositPollen(hive) {
    if (this.pollen > 0) {
      hive.addHoney(this.pollen);
      this.pollen = 0;
    }
    this.currentFlower = null;
  }

  // ===== МЕТОДЫ АТАКИ =====

  handleAttack(deltaTime, bears, hive) {
  if (!this.attackMode) {
    const bear = this.checkForBears(hive, bears);
    if (bear) {
      this.startAttack(bear);
      return true;
    }
    return false;
  }

  // Если медведь мёртв или ушёл - прекращаем атаку
  if (!this.target || this.target.state === 'dead' || this.target.state === 'gone') {
    this.endAttack(hive);
    return false;
  }

  this.attack(deltaTime);
  return true;
}

  startAttack(bear) {
    this.attackMode = true;
    this.target = bear;
    this.status = 'attacking';
    this.calculateDirection();
  }

  attack(deltaTime) {
    this.move(deltaTime);
    
    if (this.reachedTarget()) {
      this.target.takeDamage(this.attackPower * deltaTime);
      
      // Пчела получает ответный урон
      if (Math.random() < 0.3) {
        this.health -= 0.5;
        if (this.health <= 0) {
          return 'die';
        }
      }
    }
  }

  endAttack(hive) {
    this.attackMode = false;
    this.target = null;
    this.returnToHive(hive);
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  move(deltaTime) {
    if (!this.target || !this.direction) return;
    
    this.position.x += this.direction.x * this.speed * deltaTime;
    this.position.y += this.direction.y * this.speed * deltaTime;
  }

  calculateDirection() {
    if (!this.target) return;
    
    const targetPos = this.target.position || this.target;
    const dx = targetPos.x - this.position.x;
    const dy = targetPos.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      this.direction = {
        x: dx / distance,
        y: dy / distance
      };
    }
  }

  reachedTarget() {
    if (!this.target) return false;
    
    const targetPos = this.target.position || this.target;
    const dx = targetPos.x - this.position.x;
    const dy = targetPos.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < (this.attackMode ? 10 : 5);
  }

  checkForBears(hive, bears) {
    const hivePos = hive.position;
    const detectionRadius = 200;
    
    return bears.find(bear => {
      const dx = bear.position.x - hivePos.x;
      const dy = bear.position.y - hivePos.y;
      return Math.sqrt(dx * dx + dy * dy) < detectionRadius;
    });
  }

  // ===== СЛУЖЕБНЫЕ МЕТОДЫ =====

  getVisualData() {
    return {
      id: this.id,
      position: this.position,
      status: this.status,
      direction: this.direction,
      pollen: this.pollen,
      capacity: this.capacity,
      isScout: this.isScout,
      health: this.health
    };
  }

  setParameters(params) {
    if (params.speed !== undefined) this.speed = params.speed;
    if (params.capacity !== undefined) this.capacity = params.capacity;
    if (params.collectionSpeed !== undefined) {
      this.collectionSpeed = params.collectionSpeed;
    }
  }
  // Метод для добавления информации о полянке
  addFlowerPatchInfo(patchId, flowerCount) {
    const existingPatch = this.knownFlowerPatches.find(p => p.id === patchId);
    if (!existingPatch) {
      this.knownFlowerPatches.push({
        id: patchId,
        flowerCount,
        lastVisited: Date.now()
      });
      // Сортируем по количеству цветов (чтобы летели к самым богатым)
      this.knownFlowerPatches.sort((a, b) => b.flowerCount - a.flowerCount);
    }
  }

   spawnNewBee(totalBees) {
    const bee = new Bee(this.id);
    
    // Рассчитываем процент разведчиков (10-30%)
    const scoutRatio = 0.1 + (Math.random() * 0.2);
    const currentScouts = totalBees.filter(b => b.isScout).length;
    const targetScouts = Math.floor(totalBees.length * scoutRatio);
    
    // Если разведчиков меньше нужного количества
    bee.isScout = currentScouts < targetScouts;
    
    return bee;
  }

}
