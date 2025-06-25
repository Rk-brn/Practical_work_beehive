export default class Hive {
  constructor(position = { x: 400, y: 500 }) {
    this.position = position;   // Позиция улья
    this.capacity = 20;         // Максимум 20 пчел
    this.bees = [];             // Массив пчел
    this.id = `hive-${Date.now().toString(36)}`; //Уникальный индекс
    this.honey = 0;             // Количество мёда
    this.maxHoney = 100;        // Максимальный запас мёда
    this.health = 100;          // Здоровье улья (0-100)
    this.defense = 1;           // Уровень защиты (1-5)
  }

  // Добавить пчелу в улей
  addBee(bee) {
    if (this.bees.length >= this.capacity) {
      console.warn('Улей переполнен! Максимум 20 пчел.');
      return false;
    }
    
    this.bees.push(bee);
    bee.position = {...this.position}; // Помещаем пчелу в улей
    bee.inHive = true;
    console.log(`Пчела ${bee.id} добавлена в улей. Всего пчел: ${this.bees.length}`);
    return true;
  }

  // Убрать пчелу из улья
  removeBee(beeId) {
    const index = this.bees.findIndex(bee => bee.id === beeId);
    if (index !== -1) {
      const [removedBee] = this.bees.splice(index, 1);
      removedBee.inHive = false;
      console.log(`Пчела ${beeId} удалена из улья. Осталось: ${this.bees.length}`);
      return true;
    }
    console.warn(`Пчела ${beeId} не найдена в улье!`);
    return false;
  }
  
  // Добавить мёд в улей
  addHoney(amount) {
    const actualAmount = Math.min(amount, this.maxHoney - this.honey);
    this.honey += actualAmount;
    console.log(`Добавлено ${actualAmount} мёда. Всего: ${this.honey}/${this.maxHoney}`);
    return actualAmount;
  }
  
  // Использовать мёд
  useHoney(amount) {
    if (this.honey < amount) {
      console.warn(`Недостаточно мёда! Нужно: ${amount}, есть: ${this.honey}`);
      return false;
    }
    
    this.honey -= amount;
    console.log(`Использовано ${amount} мёда. Осталось: ${this.honey}`);
    return true;
  }
  
  // Атака ос
  takeWaspAttack(waspsCount) {
    // Рассчитываем урон на основе защиты и количества охранников
    const guardBees = this.bees.filter(b => b.type === 'guard').length;
    const defensePower = this.defense * (1 + guardBees * 0.2);
    
    // Базовый урон
    const baseDamage = waspsCount * 5;
    
    // Фактический урон с учетом защиты
    const actualDamage = Math.max(0, baseDamage - defensePower);
    
    // Применяем урон
    this.health = Math.max(0, this.health - actualDamage);
    
    // Дополнительные эффекты при сильной атаке
    if (actualDamage > 20) {
      // Потеря пчел при сильной атаке
      const beesToRemove = Math.min(3, Math.floor(actualDamage / 10));
      this.removeRandomBees(beesToRemove);
    }
    
    console.log(`Атака ${waspsCount} ос! Урон: ${actualDamage}. Здоровье: ${this.health}`);
    
    // Возвращаем информацию об атаке
    return {
      damage: actualDamage,
      isDestroyed: this.health <= 0
    };
  }
  
  // Удалить случайных пчел (при атаке)
  removeRandomBees(count) {
    const beesToRemove = Math.min(count, this.bees.length);
    for (let i = 0; i < beesToRemove; i++) {
      const randomIndex = Math.floor(Math.random() * this.bees.length);
      const [bee] = this.bees.splice(randomIndex, 1);
      console.log(`Пчела ${bee.id} погибла при защите улья!`);
    }
  }
  
  // Лечение улья
  heal(amount) {
    this.health = Math.min(100, this.health + amount);
    console.log(`Улей восстановлен на ${amount}. Здоровье: ${this.health}`);
    return this.health;
  }
  
  // Улучшить защиту
  upgradeDefense() {
    if (this.defense >= 5) {
      console.warn('Достигнут максимальный уровень защиты!');
      return false;
    }
    
    if (this.useHoney(20 * this.defense)) {
      this.defense++;
      console.log(`Уровень защиты повышен до ${this.defense}`);
      return true;
    }
    
    return false;
  }
  
  // Увеличить емкость для мёда
  upgradeHoneyCapacity() {
    if (this.useHoney(30)) {
      this.maxHoney += 50;
      console.log(`Вместимость мёда увеличена до ${this.maxHoney}`);
      return true;
    }
    return false;
  }

  // Получить информацию об улье
  getInfo() {
    return {
      id: this.id,
      position: this.position,
      beeCount: this.bees.length,
      capacity: this.capacity,
      isFull: this.bees.length >= this.capacity,
      honey: this.honey,
      maxHoney: this.maxHoney,
      health: this.health,
      defense: this.defense
    };
  }
}