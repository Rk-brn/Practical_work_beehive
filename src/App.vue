<template>
  <div class="game-container">
    <canvas ref="gameCanvas" width="800" height="600"></canvas>
    <div class="hive-info" v-if="hive">
      <h2>Улей</h2>
      <p>Мёд: {{ Math.round(hive.honey) }}/{{ hive.maxHoney }}</p>
      <p>Пчёлы: {{ hive.bees.length }}/{{ hive.capacity }}</p>
      <p>Здоровье: {{ Math.round(hive.health) }}%</p>
      <p v-if="isHiveFull" style="color: red;">Улей переполнен! Пчёлы отдыхают</p>
    </div>
  </div>
</template>

<script>
import Flower from './classes/Flower';
import Hive from './classes/Hive';
import Bee from './classes/Bee';

export default {
  name: 'App',
  data() {
    return {
      canvas: null,
      ctx: null,
      flowers: [],
      hive: null,
      bees: [],
      lastTime: 0,
      gameLoopId: null,
      flowerSearchCooldown: 0,
      isHiveFull: false // Флаг переполнения улья
    };
  },
  computed: {
    // Вычисляем процент заполнения улья
    hiveFullness() {
      if (!this.hive) return 0;
      return this.hive.honey / this.hive.maxHoney;
    }
  },
  watch: {
    // Следим за заполнением улья
    hiveFullness(newVal) {
      this.isHiveFull = newVal >= 1;
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.canvas = this.$refs.gameCanvas;
      this.ctx = this.canvas.getContext('2d');
      this.initGame();
      this.startGameLoop();
      this.canvas.addEventListener('click', this.addFlowerAtClick);
    });
  },
  beforeDestroy() {
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
    }
    this.canvas.removeEventListener('click', this.addFlowerAtClick);
  },
  methods: {
    initGame() {
      // Инициализация улья
      this.hive = new Hive({ 
        x: this.canvas.width / 2, 
        y: this.canvas.height / 2 
      });

      // Создаем 15 случайных цветов
      for (let i = 0; i < 15; i++) {
        this.addRandomFlower();
      }

      // Добавляем 5 пчел
      for (let i = 0; i < 5; i++) {
        this.addBee();
      }
    },

    addRandomFlower() {
      const x = 50 + Math.random() * (this.canvas.width - 100);
      const y = 50 + Math.random() * (this.canvas.height - 100);
      const types = ['common', 'common', 'common', 'rare', 'magical'];
      const type = types[Math.floor(Math.random() * types.length)];
      this.flowers.push(new Flower(x, y, type));
    },

    addFlowerAtClick(event) {
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const types = ['common', 'rare', 'magical'];
      const type = types[Math.floor(Math.random() * types.length)];
      this.flowers.push(new Flower(x, y, type));
    },

    addBee() {
      if (this.hive.bees.length >= this.hive.capacity) return;
      
      const bee = new Bee(this.hive.id);
      // Устанавливаем начальную позицию пчелы в улей
      bee.position = { ...this.hive.position };
      this.hive.bees.push(bee);
      this.bees.push(bee);
      
      // Сразу запускаем пчелу на поиск цветка
      if (!this.isHiveFull) {
        this.findFlowerForBee(bee);
      }
    },

    startGameLoop() {
      this.lastTime = performance.now();
      const loop = (currentTime) => {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        this.gameLoopId = requestAnimationFrame(loop);
      };
      this.gameLoopId = requestAnimationFrame(loop);
    },

    update(deltaTime) {
      // Обновляем цветы
      this.flowers.forEach(flower => flower.update());
      
      // Оптимизация: ищем цветы раз в 500мс, а не каждый кадр
      this.flowerSearchCooldown += deltaTime;
      const shouldSearch = this.flowerSearchCooldown > 500;
      if (shouldSearch) {
        this.flowerSearchCooldown = 0;
      }
      
      // Проверяем переполнение улья
      this.isHiveFull = this.hive.honey >= this.hive.maxHoney;
      
      // Если улей переполнен, возвращаем всех пчел
      if (this.isHiveFull) {
        this.returnAllBeesToHive();
      }
      
      // Обновляем пчел
      this.bees.forEach(bee => {
        if (this.isHiveFull && bee.status !== 'returning' && bee.status !== 'in-hive') {
          // Если улей переполнен, возвращаем пчелу
          this.returnBeeToHive(bee);
        }
        
        if (bee.status === 'flying-to-flower') {
          this.moveBee(bee, deltaTime);
          if (this.checkBeeReachedTarget(bee)) {
            bee.status = 'collecting';
          }
        }
        
        if (bee.status === 'collecting') {
          this.collectPollen(bee, deltaTime);
          
          // Если пчела собрала достаточно пыльцы, возвращаемся
          if (bee.pollen >= bee.capacity) {
            this.returnBeeToHive(bee);
          }
        }
        
        if (bee.status === 'returning') {
          this.moveBee(bee, deltaTime);
          if (this.checkBeeReachedHive(bee)) {
            this.depositPollen(bee);
          }
        }
        
        // Пробуждаем "ленивых" пчел, если есть место в улье
        if (bee.status === 'idle' && shouldSearch && !this.isHiveFull) {
          this.findFlowerForBee(bee);
        }
      });
      
      // Автоматическое добавление пчел только если есть место в улье
      if (!this.isHiveFull && this.hive.honey > 20 && this.bees.length < this.hive.capacity) {
        this.addBee();
        this.hive.honey -= 20;
      }
    },

    // Вернуть пчелу в улей
    returnBeeToHive(bee) {
      bee.status = 'returning';
      bee.target = { 
        x: this.hive.position.x, 
        y: this.hive.position.y 
      };
      this.calculateBeeDirection(bee);
    },

    // Вернуть всех пчел в улей
    returnAllBeesToHive() {
      this.bees.forEach(bee => {
        if (bee.status !== 'returning' && bee.status !== 'in-hive') {
          this.returnBeeToHive(bee);
        }
      });
    },

    findFlowerForBee(bee) {
      // Если улей переполнен, не ищем цветы
      if (this.isHiveFull) return;
      
      const availableFlowers = this.flowers.filter(f => f.isBlooming && f.pollen > 0);
      if (availableFlowers.length > 0) {
        // Выбираем случайный доступный цветок
        const flower = availableFlowers[Math.floor(Math.random() * availableFlowers.length)];
        bee.target = { x: flower.x, y: flower.y };
        bee.status = 'flying-to-flower';
        this.calculateBeeDirection(bee);
      }
    },

    moveBee(bee, deltaTime) {
      if (!bee.target || !bee.direction) return;
      
      // Скорость пчелы
      const speed = 0.1;
      
      // Обновляем позицию пчелы
      bee.position.x += bee.direction.x * speed * deltaTime;
      bee.position.y += bee.direction.y * speed * deltaTime;
    },

    checkBeeReachedTarget(bee) {
      if (!bee.target) return false;
      
      // Расстояние до цели
      const dx = bee.target.x - bee.position.x;
      const dy = bee.target.y - bee.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Считаем, что достигли цели, если расстояние меньше 10 пикселей
      return distance < 10;
    },
    
    checkBeeReachedHive(bee) {
      if (!this.hive) return false;
      
      // Расстояние до улья
      const dx = this.hive.position.x - bee.position.x;
      const dy = this.hive.position.y - bee.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Считаем, что достигли улья, если расстояние меньше 15 пикселей
      return distance < 15;
    },

    calculateBeeDirection(bee) {
      if (!bee.target) return;
      
      // Вектор направления
      const dx = bee.target.x - bee.position.x;
      const dy = bee.target.y - bee.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Нормализуем вектор
      if (distance > 0) {
        bee.direction = {
          x: dx / distance,
          y: dy / distance
        };
      }
    },

    collectPollen(bee, deltaTime) {
      // Находим цветок, на котором стоит пчела
      const currentFlower = this.flowers.find(f => {
        const dx = f.x - bee.position.x;
        const dy = f.y - bee.position.y;
        return Math.sqrt(dx * dx + dy * dy) < 20;
      });
      
      if (!currentFlower || !currentFlower.isBlooming) {
        // Цветок больше не доступен, возвращаемся в улей
        this.returnBeeToHive(bee);
        return;
      }
      
      // Скорость сбора пыльцы
      const collectionSpeed = 0.02;
      
      // Собираем пыльцу с цветка
      const collected = currentFlower.collectPollen(collectionSpeed * deltaTime);
      bee.pollen += collected;
    },

    depositPollen(bee) {
      if (bee.pollen > 0) {
        // Сдаем пыльцу в улей и округляем результат
        this.hive.honey = Math.min(this.hive.maxHoney, Math.round(this.hive.honey + bee.pollen));
        bee.pollen = 0;
      }
      
      // Возвращаем пчелу в улей
      bee.position = { ...this.hive.position };
      bee.status = 'idle';
      bee.target = null;
      
      // Если есть место в улье, ищем новый цветок
      if (!this.isHiveFull) {
        this.findFlowerForBee(bee);
      }
    },

    render() {
      // Очистка холста
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Фон
      this.ctx.fillStyle = '#a8e6cf';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Цветы
      this.flowers.forEach(flower => {
        const f = flower.getVisualData();
        
        // Стебель
        this.ctx.strokeStyle = '#2E7D32';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(f.x, f.y);
        this.ctx.lineTo(f.x, f.y + 40);
        this.ctx.stroke();
        
        // Цветок
        this.ctx.save();
        this.ctx.globalAlpha = f.opacity;
        this.ctx.fillStyle = f.color;
        this.ctx.beginPath();
        this.ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Центр цветка
        this.ctx.fillStyle = '#FFEB3B';
        this.ctx.beginPath();
        this.ctx.arc(f.x, f.y, f.size / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      });
      
      // Улей
      this.ctx.fillStyle = this.isHiveFull ? '#d9534f' : '#8B4513'; // Красный при переполнении
      this.ctx.beginPath();
      this.ctx.arc(this.hive.position.x, this.hive.position.y, 40, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Вход в улей
      this.ctx.fillStyle = '#000';
      this.ctx.beginPath();
      this.ctx.arc(this.hive.position.x, this.hive.position.y + 10, 15, 0, Math.PI);
      this.ctx.fill();
      
      // Пчелы
      this.bees.forEach(bee => {
        // Тело пчелы
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        
        // Поворачиваем пчелу в направлении движения
        if (bee.direction) {
          const angle = Math.atan2(bee.direction.y, bee.direction.x);
          this.ctx.ellipse(
            bee.position.x, 
            bee.position.y, 
            10, 
            5, 
            angle, 
            0, 
            Math.PI * 2
          );
        } else {
          this.ctx.arc(bee.position.x, bee.position.y, 10, 0, Math.PI * 2);
        }
        this.ctx.fill();
        
        // Полоски на теле
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(bee.position.x - 8, bee.position.y - 5, 4, 10);
        this.ctx.fillRect(bee.position.x - 2, bee.position.y - 5, 4, 10);
        this.ctx.fillRect(bee.position.x + 4, bee.position.y - 5, 4, 10);
        
        // Крылья
        this.ctx.fillStyle = 'rgba(240, 240, 240, 0.7)';
        this.ctx.beginPath();
        this.ctx.ellipse(bee.position.x - 3, bee.position.y - 8, 3, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(bee.position.x - 3, bee.position.y + 8, 3, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();
      });
    }
  }
};
</script>

<style>
.game-container {
  position: relative;
  width: 800px;
  height: 600px;
  margin: 0 auto;
}

canvas {
  display: block;
  background-color: #e0f7fa;
  border: 2px solid #4db6ac;
  border-radius: 8px;
}

.hive-info {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.8);
  padding: 10px;
  border-radius: 5px;
  font-family: Arial, sans-serif;
  min-width: 200px;
}

.hive-info p:last-child {
  margin-bottom: 0;
}
</style>