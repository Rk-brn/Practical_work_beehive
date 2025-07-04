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
    this.typeDistribution = this.calculateTypeDistribution(count);
    
    this.generateFlowers(count);
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

  update(deltaTime) {
    const now = Date.now();
    
    // Обновляем все цветы
    this.flowers.forEach(flower => flower.update());
    
    // Удаляем полностью увядшие цветы
    this.flowers = this.flowers.filter(flower => 
      flower.state !== 'recovering' || 
      now - flower.stateTimer < flower.recoveryTime * 2
    );
    
    // Обновляем статус полянки
    if (!this.discovered && this.flowers.some(f => f.isBlooming)) {
      const bloomingCount = this.flowers.filter(f => f.isBlooming).length;
      if (bloomingCount <= 1) {
        this.markAsDead();
      }
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
}