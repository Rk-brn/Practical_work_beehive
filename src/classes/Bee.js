export default class Bee {
  constructor(hiveId) {
    this.id = `bee-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
    this.hiveId = hiveId;       // ID родного улья
    this.position = { x: 0, y: 0 };
    this.target = null;         // Текущая цель (цветок или улей)
    this.status = 'in-hive';    // in-hive, flying-to-flower, collecting, returning
    this.speed = 0.8;           // Базовая скорость (пикселей/мс)
    this.pollen = 0;            // Количество несомой пыльцы
    this.capacity = 10;         // Вместимость пчелы
    this.collectionSpeed = 0.2; // Скорость сбора пыльцы (ед./мс)
    this.inHive = true;         // Флаг нахождения в улье
    this.direction = { x: 0, y: 0 }; // Направление движения
  }

  // Обновление состояния пчелы
  update(deltaTime, flowers, hive) {
    if (!this.target && this.status !== 'in-hive') {
      this.findTarget(flowers, hive);
    }

    switch (this.status) {
      case 'flying-to-flower':
        this.move(deltaTime);
        if (this.reachedTarget()) {
          this.startCollecting();
        }
        break;
        
      case 'collecting':
        this.collectPollen(deltaTime);
        if (this.pollen >= this.capacity) {
          this.returnToHive(hive);
        }
        break;
        
      case 'returning':
        this.move(deltaTime);
        if (this.reachedTarget()) {
          this.depositPollen(hive);
          this.status = 'in-hive';
          this.inHive = true;
        }
        break;
    }
  }

  // Поиск цели
  findTarget(flowers, hive) {
    // Если в улье - ищем цветок
    if (this.inHive) {
      const availableFlowers = flowers.filter(f => f.isBlooming && f.pollen > 0);
      
      if (availableFlowers.length > 0) {
        // Берем первый попавшийся цветок для простоты
        this.target = availableFlowers[0];
        this.status = 'flying-to-flower';
        this.inHive = false;
        this.calculateDirection();
        return true;
      }
    } 
    // Если не в улье и без пыльцы - возвращаемся
    else if (this.pollen === 0) {
      this.returnToHive(hive);
    }
    
    return false;
  }

  // Начать сбор пыльцы
  startCollecting() {
    this.status = 'collecting';
    this.target.isTargeted = true; // Помечаем цветок как занятый
  }

  // Возвращение в улей
  returnToHive(hive) {
    this.target = hive.position;
    this.status = 'returning';
    this.calculateDirection();
  }

  // Движение к цели
  move(deltaTime) {
    if (!this.target || !this.direction) return;
    
    this.position.x += this.direction.x * this.speed * deltaTime;
    this.position.y += this.direction.y * this.speed * deltaTime;
  }

  // Сбор пыльцы
  collectPollen(deltaTime) {
    if (!this.target || !this.target.isBlooming) {
      this.returnToHive(hive);
      return;
    }
    
    const collectAmount = this.collectionSpeed * deltaTime;
    const collected = this.target.collectPollen(collectAmount);
    this.pollen += collected;
  }

  // Сдача пыльцы в улей
  depositPollen(hive) {
    if (this.pollen > 0) {
      hive.addHoney(this.pollen);
      this.pollen = 0;
    }
    this.target = null;
  }

  // Проверка достижения цели
  reachedTarget() {
    if (!this.target) return false;
    
    const targetX = this.target.x || this.target.position.x;
    const targetY = this.target.y || this.target.position.y;
    
    const dx = targetX - this.position.x;
    const dy = targetY - this.position.y;
    return Math.sqrt(dx * dx + dy * dy) < 5; // Допустимая погрешность
  }

  // Расчет направления движения
  calculateDirection() {
    if (!this.target) return;
    
    const targetX = this.target.x || this.target.position.x;
    const targetY = this.target.y || this.target.position.y;
    
    const dx = targetX - this.position.x;
    const dy = targetY - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      this.direction = {
        x: dx / distance,
        y: dy / distance
      };
    }
  }

  // Изменение параметров через интерфейс
  setParameters({ speed, capacity, collectionSpeed }) {
    if (speed !== undefined) this.speed = speed;
    if (capacity !== undefined) this.capacity = capacity;
    if (collectionSpeed !== undefined) this.collectionSpeed = collectionSpeed;
  }

  // Получение данных для визуализации
  getVisualData() {
    return {
      id: this.id,
      x: this.position.x,
      y: this.position.y,
      status: this.status,
      pollen: this.pollen,
      capacity: this.capacity,
      direction: this.direction
    };
  }
}