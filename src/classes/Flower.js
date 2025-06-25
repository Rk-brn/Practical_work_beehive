export default class Flower {
  constructor(x, y, type = 'common') {
    this.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    this.x = x;
    this.y = y;
    this.type = type;
    this.size = type === 'common' ? 15 : 25;
    this.color = this.getColorByType(type);
    this.rotation = Math.random() * 360;
    this.opacity = 1;
    this.pollen = type === 'common' ? 10 : 30;
    this.isBlooming = true;
    this.bloomDuration = 10000; // 10 секунд цветения
    this.witherDuration = 5000; // 5 секунд увядания
    this.recoveryTime = 15000; // 15 секунд восстановления
    this.state = 'blooming'; // blooming, withering, recovering
    this.stateTimer = Date.now();
  }
  
  getColorByType(type) {
    const colors = {
      common: '#FF69B4',  // Розовый
      rare: '#9370DB',    // Фиолетовый
      magical: '#00FA9A'  // Зеленый
    };
    return colors[type] || colors.common;
  }
  
  update() {
    const now = Date.now();
    const elapsed = now - this.stateTimer;
    
    switch(this.state) {
      case 'blooming':
        if (elapsed > this.bloomDuration) {
          this.state = 'withering';
          this.stateTimer = now;
        }
        break;
        
      case 'withering':
        this.opacity = 1 - (elapsed / this.witherDuration);
        if (elapsed > this.witherDuration) {
          this.state = 'recovering';
          this.stateTimer = now;
          this.isBlooming = false;
        }
        break;
        
      case 'recovering':
        if (elapsed > this.recoveryTime) {
          this.state = 'blooming';
          this.stateTimer = now;
          this.opacity = 1;
          this.isBlooming = true;
        }
        break;
    }
  }
  
  collectPollen(amount) {
    if (!this.isBlooming) return 0;
    
    const collected = Math.min(amount, this.pollen);
    this.pollen -= collected;
    
    if (this.pollen <= 0) {
      this.state = 'withering';
      this.stateTimer = Date.now();
    }
    
    return collected;
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
      state: this.state
    };
  }
}