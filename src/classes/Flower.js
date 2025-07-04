export default class Flower {
  constructor(x, y, type = 'common') {
    this.id = `flower-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.x = x;
    this.y = y;
    this.type = type;
    this.size = this.calculateSize();
    this.color = this.getColorByType();
    this.rotation = Math.random() * 360;
    this.opacity = 1;
    this.maxPollen = this.calculateMaxPollen();
    this.pollen = this.maxPollen;
    this.isBlooming = true;
    this.isTargeted = false; // Добавлено: флаг занятости цветка
    this.bloomDuration = 10000 + Math.random() * 5000; // 10-15 секунд
    this.witherDuration = 5000 + Math.random() * 3000; // 5-8 секунд
    this.recoveryTime = 15000 + Math.random() * 10000; // 15-25 секунд
    this.state = 'blooming';
    this.stateTimer = Date.now();
    this.patchId = null; // Будет установлено при добавлении в полянку
  }

  calculateSize() {
    const sizes = {
      common: 12 + Math.random() * 6,  // 12-18
      rare: 18 + Math.random() * 8,    // 18-26
      magical: 25 + Math.random() * 10 // 25-35
    };
    return sizes[this.type] || sizes.common;
  }

  calculateMaxPollen() {
    const pollenAmounts = {
      common: 10 + Math.floor(Math.random() * 6),  // 10-15
      rare: 20 + Math.floor(Math.random() * 11),   // 20-30
      magical: 30 + Math.floor(Math.random() * 21) // 30-50
    };
    return pollenAmounts[this.type] || pollenAmounts.common;
  }

  getColorByType() {
    const colors = {
      common: `hsl(${320 + Math.random() * 40}, 70%, 60%)`, // Розовые оттенки
      rare: `hsl(${260 + Math.random() * 40}, 70%, 60%)`,   // Фиолетовые
      magical: `hsl(${120 + Math.random() * 40}, 70%, 60%)` // Зеленые
    };
    return colors[this.type] || colors.common;
  }

  update() {
    const now = Date.now();
    const elapsed = now - this.stateTimer;

    switch(this.state) {
      case 'blooming':
        if (elapsed > this.bloomDuration) {
          this.startWithering();
        }
        break;
        
      case 'withering':
        this.opacity = 1 - (elapsed / this.witherDuration);
        if (elapsed > this.witherDuration) {
          this.startRecovering();
        }
        break;
        
      case 'recovering':
        if (elapsed > this.recoveryTime) {
          this.startBlooming();
        }
        break;
    }
  }

  startWithering() {
    this.state = 'withering';
    this.stateTimer = Date.now();
    this.isBlooming = false;
    this.isTargeted = false; // Сброс при увядании
  }

  startRecovering() {
    this.state = 'recovering';
    this.stateTimer = Date.now();
    this.pollen = 0;
  }

  startBlooming() {
    this.state = 'blooming';
    this.stateTimer = Date.now();
    this.opacity = 1;
    this.isBlooming = true;
    this.pollen = this.calculateMaxPollen();
  }

  collectPollen(amount) {
    if (!this.isBlooming || this.pollen <= 0) return 0;
    
    const collected = Math.min(amount, this.pollen);
    this.pollen -= collected;
    
    if (this.pollen <= 0) {
      this.startWithering();
    }
    
    return collected;
  }

  isAvailable() {
    return this.isBlooming && this.pollen > 0 && !this.isTargeted;
  }

  getVisualData() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      size: this.size,
      color: this.color,
      rotation: this.rotation,
      opacity: this.opacity,
      type: this.type,
      pollen: this.pollen,
      maxPollen: this.maxPollen,
      state: this.state,
      isTargeted: this.isTargeted
    };
  }
}