import Flower from './Flower';
export default class FlowerPatch {
  constructor(x, y, count = 5) {
    this.id = `patch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.x = x;
    this.y = y;
    this.radius = 40 + Math.random() * 20; // 40-60
    this.birthTime = Date.now();
    this.discovered = false;
    this.discoveredBy = null; // ID пчелы-разведчика
    this.patchLifetime = 45000 + Math.random() * 30000; // 45-75 секунд
    this.flowers = [];
    this.isHot = false; // "Горячая" полянка - приоритетная
    this.hotUntil = 0; // До какого времени "горячая"
    this.typeDistribution = this.calculateTypeDistribution(count);
    this.generateFlowers(count);this.isDying = false; // Добавляем флаг "умирает"
    this.isDead = false;
    this.deathTimer = null; 
    this.patchLifetime = 60000 + Math.random() * 60000 * 65000; // 1-2 минуты
    this.flowers.forEach(flower => {
      this.bloomDuration = 10000 + Math.random() * 5000; // 10-15 секунд
    this.witherDuration = 5000 + Math.random() * 3000; // 5-8 секунд
    this.recoveryTime = 15000 + Math.random() * 10000; // 15-25 секунд
        });
  }

  calculateTypeDistribution(count) {
    const common = Math.floor(count * 0.7);
    const rare = Math.floor(count * 0.25);
    const magical = count - common - rare;
    return { common, rare, magical };
  }

  generateFlowers(count) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const distance = Math.random() * this.radius;
      const x = this.x + Math.cos(angle) * distance;
      const y = this.y + Math.sin(angle) * distance;
      
      let type;
      if (i < this.typeDistribution.common) type = 'common';
      else if (i < this.typeDistribution.common + this.typeDistribution.rare) type = 'rare';
      else type = 'magical';

      const flower = new Flower(x, y, type);
      flower.patchId = this.id;
      this.flowers.push(flower);
    }
  }
shouldDie() {
  const elapsed = Date.now() - this.birthTime;
  const timeExpired = elapsed > this.patchLifetime;
  
  console.log(`Patch ${this.id} lifetime: ${elapsed/1000}s/${this.patchLifetime/1000}s`);
  
  const bloomingCount = this.flowers.filter(f => 
    f.isBlooming && f.state === 'blooming'
  ).length;
  
  return timeExpired || bloomingCount < 2;
}

 startDying() {
  if (this.isDying) return;
  
  this.isDying = true;
  
  // Принудительно переводим все цветы в режим увядания
  this.flowers.forEach(f => {
    if (f.state !== 'withering' && f.state !== 'recovering') {
      f.startWithering();
    }
    // Ускоряем процесс увядания
    f.witherDuration = 1000; // Фиксированное быстрое увядание
  });
  
  // Гарантированное удаление через 3 секунды
  setTimeout(() => {
    this.isDead = true;
    
    // Принудительно завершаем состояние всех цветов
    this.flowers.forEach(f => {
      f.state = 'recovering';
      f.opacity = 0;
    });
  }, 3000);
}


  update(deltaTime) {
    // Если полянка уже мертва, ничего не делаем
    if (this.isDead) return;
    
    // Если полянка должна умереть, но еще не начала - начинаем процесс
    if (!this.isDying && this.shouldDie()) {
      this.startDying();
    }
    
    // Обновляем все цветы (даже если умирают)
    this.flowers.forEach(flower => flower.update());
    
    if (this.isDying && !this.isDead) {
      const allRecovering = this.flowers.every(f => f.state === 'recovering');
      if (allRecovering) {
        this.isDead = true;
        if (this.deathTimer) clearTimeout(this.deathTimer);
      }
    }
  
    const now = Date.now();
    
    // Обновляем цветы
    this.flowers.forEach(flower => flower.update(deltaTime));
    
    // Постепенное увядание полянки
    if (Date.now() - this.birthTime > this.patchLifetime * 0.7) {
      // После 70% времени - начинаем увядать
      const dyingFlowers = this.flowers.filter(f => 
        f.state === 'blooming' && Math.random() < 0.002 * deltaTime
      );
      
      dyingFlowers.forEach(flower => flower.startWithering());
    }
    
    // Обновляем статус полянки
    const bloomingCount = this.flowers.filter(f => f.isBlooming).length;
    if (bloomingCount === 0) {
      this.markAsDead();
    }
  }
  



  markAsDiscovered(beeId) {
    this.discovered = true;
    this.discoveredBy = beeId;
  }

  markAsDead() {
    this.patchLifetime = 0;
    this.flowers.forEach(f => f.startWithering());
  }

  getBloomingFlowers() {
    return this.flowers.filter(f => f.isAvailable());
  }

  getVisualData() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      radius: this.radius,
      discovered: this.discovered,
      flowerCount: this.flowers.length,
      bloomingCount: this.flowers.filter(f => f.isBlooming).length,
      lifetimeLeft: this.patchLifetime - (Date.now() - this.birthTime)
    };
  }
 hasAvailableFlowers() {
    return this.flowers.some(f => f.isBlooming && f.pollen > 0);
  }

  getRandomAvailableFlower() {
    const available = this.flowers.filter(f => f.isBlooming && f.pollen > 0);
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  removeFlowersFromGlobal(globalFlowersArray) {
  // Собираем ID наших цветов
  const ourFlowerIds = this.flowers.map(f => f.id);
  
  // Удаляем наши цветы из глобального массива
  return globalFlowersArray.filter(
    flower => !ourFlowerIds.includes(flower.id)
  );
}

}