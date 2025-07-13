export default class Hive {
  constructor(position = { x: 400, y: 500 }) {
    this.id = `hive-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.position = position;
    this.capacity = 20;
    this.bees = [];
    this.honey = 0;
    this.maxHoney = 100;
    this.health = 1;
    this.maxHealth = 1;
    this.defense = 1;
    this.discoveredPatches = [];
    this.lastSpawnTime = Date.now();
  }


  addBee(bee) {
    if (this.bees.length >= this.capacity) return false;
    
    bee.position = { ...this.position };
    bee.status = 'in-hive';
    this.bees.push(bee);
    return true;
  }

  removeBee(beeId) {
    const index = this.bees.findIndex(b => b.id === beeId);
    if (index !== -1) {
      return this.bees.splice(index, 1)[0];
    }
    return null;
  }

  addHoney(amount) {
    const spaceLeft = this.maxHoney - this.honey;
    const added = Math.min(amount, spaceLeft);
    this.honey += added;
    
    // Автоматическое создание новых пчел
    if (this.honey >= 20 && this.bees.length < this.capacity) {
      const now = Date.now();
      if (now - this.lastSpawnTime > 5000) { // Не чаще чем раз в 5 сек
        this.lastSpawnTime = now;
        this.honey -= 20;
        return { added, spawnedBee: true };
      }
    }
    
    return { added, spawnedBee: false };
  }

  useHoney(amount) {
    if (this.honey < amount) return false;
    this.honey -= amount;
    return true;
  }

  takeDamage(amount) {
    const damage = Math.max(0, amount - this.defense);
    this.health = Math.max(0, this.health - damage);
    
    if (this.health <= 0) {
      this.handleDestruction();
    }
    
    return damage;
  }

  handleDestruction() {
    // При разрушении улья теряем 50% пчел и весь мед
    const beesToKeep = Math.floor(this.bees.length * 0.5);
    while (this.bees.length > beesToKeep) {
      this.bees.pop();
    }
    this.honey = 0;
    this.health = 10; // Минимальное здоровье для восстановления
  }

  addDiscoveredPatch(patchId, beeId) {
    if (!this.discoveredPatches.has(patchId)) {
      this.discoveredPatches.set(patchId, {
        discoveredBy: beeId,
        discoveryTime: Date.now(),
        lastVisited: Date.now()
      });
    }
  }

  getPatchInfo(patchId) {
    return this.discoveredPatches.get(patchId) || null;
  }

  upgrade(option) {
    const upgrades = {
      capacity: { cost: 30, effect: () => this.capacity += 5 },
      honeyStorage: { cost: 40, effect: () => this.maxHoney += 50 },
      defense: { cost: 25 * this.defense, effect: () => this.defense = Math.min(5, this.defense + 1) },
      heal: { cost: 20, effect: () => this.health = Math.min(this.maxHealth, this.health + 30) }
    };

    if (!upgrades[option] || !this.useHoney(upgrades[option].cost)) {
      return false;
    }

    upgrades[option].effect();
    return true;
  }

  getInfo() {
    return {
      id: this.id,
      position: this.position,
      bees: this.bees.length,
      capacity: this.capacity,
      honey: this.honey,
      maxHoney: this.maxHoney,
      health: this.health,
      maxHealth: this.maxHealth,
      defense: this.defense,
      discoveredPatches: this.discoveredPatches.size
    };
  }
addDiscoveredPatch(patch) {
  if (!this.discoveredPatches.some(p => p.id === patch.id)) {
    this.discoveredPatches.push({
      id: patch.id,
      x: patch.x,
      y: patch.y,
      lastUpdated: Date.now()
    });
    // Ограничиваем количество запомненных полянок
    if (this.discoveredPatches.length > 5) {
      this.discoveredPatches.shift();
    }
  }
}

}