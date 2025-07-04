<template>
  <div class="app-container">
    <div class="game-area">
      <canvas ref="gameCanvas" width="800" height="600"></canvas>
      <!-- Панель информации об улье - теперь справа -->
      <div class="hive-info right">
        <h2>Улей</h2>
        <p>Мёд: {{ hive ? Math.round(hive.honey) : 0 }}/{{ hive ? hive.maxHoney : 0 }}</p>
        <p>Пчёлы: {{ hive ? hive.bees.length : 0 }}/{{ hive ? hive.capacity : 0 }}</p>
        <p>Здоровье: {{ hive ? Math.round(hive.health) : 0 }}%</p>
        <p v-if="isHiveFull" class="hive-full-warning">Улей переполнен!</p>
        <div class="bee-controls">
          <button @click="spawnBear" :disabled="bear">Вызвать медведя</button>
        </div>
      </div>
      <div v-if="gameOver" class="game-over-message">
        <h2>Симуляция окончена!</h2>
        <p>Медведь разрушил улей</p>
        <button @click="restartGame">Начать заново</button>
      </div>
    </div>
    <!-- Панель параметров -->
    <div class="parameters-panel">
      <h2>Параметры игры</h2>
      <div class="parameter-group">
        <h3>Пчёлы</h3>
        <div class="parameter">
          <label>
            Скорость полёта: {{ beeParameters.speed.toFixed(2) }}
            <input type="range" min="0.05" max="0.3" step="0.01" v-model.number="beeParameters.speed" @input="updateBeeParameters">
          </label>
        </div>
        <div class="parameter">
          <label>
            Скорость сбора: {{ beeParameters.collectionSpeed.toFixed(2) }}
            <input type="range" min="0.01" max="0.1" step="0.01" v-model.number="beeParameters.collectionSpeed" @input="updateBeeParameters">
          </label>
        </div>
        <div class="parameter">
          <label>
            Вместимость: {{ beeParameters.capacity }}
            <input type="range" min="5" max="30" step="1" v-model.number="beeParameters.capacity" @input="updateBeeParameters">
          </label>
        </div>
      </div>
      <div class="parameter-group">
        <h3>Улей</h3>
        <div class="parameter">
          <label>
            Вместимость мёда: {{ hiveParameters.maxHoney }}
            <input type="range" min="50" max="500" step="10" v-model.number="hiveParameters.maxHoney" @input="updateHiveParameters">
          </label>
        </div>
        <div class="parameter">
          <label>
            Количество пчёл: {{ hiveParameters.capacity }}
            <input type="range" min="5" max="50" step="1" v-model.number="hiveParameters.capacity" @input="updateHiveParameters">
          </label>
        </div>
      </div>
      <div class="parameter-group">
        <h3>Цветы</h3>
        <div class="parameter">
          <label>Время года:</label>
          <select v-model="flowerParameters.season" @change="updateFlowerParameters">
            <option value="spring">Весна</option>
            <option value="summer">Лето</option>
            <option value="autumn">Осень</option>
            <option value="winter">Зима</option>
          </select>
        </div>
        <div class="parameter">
          <label>
            Частота появления: {{ flowerSpawnRate }}%
            <input type="range" min="1" max="100" step="1" v-model.number="flowerSpawnRate" @input="updateFlowerParameters">
          </label>
        </div>
        <div class="parameter">
          <label>
            Количество цветов на полянке: {{ flowerParameters.flowersPerPatch }}
            <input type="range" min="3" max="10" step="1" v-model.number="flowerParameters.flowersPerPatch" @input="updateFlowerParameters">
          </label>
        </div>
        <div class="parameter">
          <label>
            Время жизни полянки: {{ flowerParameters.patchLifetime }} секунд
            <input type="range" min="10" max="60" step="1" v-model.number="flowerParameters.patchLifetime" @input="updateFlowerParameters">
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Flower from './classes/Flower';
import Hive from './classes/Hive';
import Bee from './classes/Bee';
import FlowerPatch from './classes/FlowerPatch';
import Bear from './classes/Bear';

const SEASONS = {
  spring: { spawnChance: 0.3, maxFlowers: 30, bloomDuration: 15000 },
  summer: { spawnChance: 0.5, maxFlowers: 50, bloomDuration: 10000 },
  autumn: { spawnChance: 0.2, maxFlowers: 20, bloomDuration: 12000 },
  winter: { spawnChance: 0.05, maxFlowers: 10, bloomDuration: 8000 }
};

export default {
  name: 'App',
  data() {
    return {
      canvas: null,
      ctx: null,
      flowers: [],
      patches: [],
      hive: null,
      bees: [],
      lastTime: 0,
      gameLoopId: null,
      flowerSearchCooldown: 0,
      isHiveFull: false,
      bear: null,
      gameOver: false,
      deleteMode: false,
      
      beeParameters: {
        speed: 0.1,
        collectionSpeed: 0.02,
        capacity: 10,
        lifespan: 100000,
        lifespanVariance: 5000
      },
      
      hiveParameters: {
        maxHoney: 100,
        capacity: 20,
      },
      flowerParameters: {
        season: 'summer',
        spawnChance: 0.5,
        maxFlowers: 50,
        flowersPerPatch: 5,
        patchLifetime: 30,
      },
      flowerSpawnRate: 50,
      lastFlowerSpawnTime: 0
    };
  },
  computed: {
    hiveFullness() {
      return this.hive ? this.hive.honey / this.hive.maxHoney : 0;
    },
    flowerSpawnChance() {
      return this.flowerSpawnRate / 100;
    },
    canAddBee() {
      return this.hive && this.hive.honey >= 25 && this.bees.length < this.hive.capacity;
    }
  },
  watch: {
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
      this.updateSeasonConfig();
    });
  },
  beforeDestroy() {
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
    }
  },
  methods: {
    removeBee(bee, index) {
      this.bees.splice(index, 1);
      const hiveBeeIndex = this.hive.bees.findIndex(b => b.id === bee.id);
      if (hiveBeeIndex !== -1) {
        this.hive.bees.splice(hiveBeeIndex, 1);
      }
    },

    notifyBeesAboutPatch(patchId) {
      const patch = this.patches.find(p => p.id === patchId);
      if (!patch || patch.discoveredByBee) return;

      const availableFlowers = patch.flowers.filter(f => f.isBlooming && f.pollen > 0);
      if (availableFlowers.length === 0) return;

      if (!patch.discoveredByBee) {
        patch.discoveredByBee = true;
        
        const idleBees = this.bees.filter(bee => 
          bee.status === 'idle' && 
          !bee.isNotifiedAboutPatch
        );
        
        const beesToNotify = Math.max(1, Math.floor(idleBees.length * 0.2));
        
        idleBees.slice(0, beesToNotify).forEach((bee, i) => {
          setTimeout(() => {
            const flower = availableFlowers[
              Math.floor(Math.random() * availableFlowers.length)
            ];
            
            bee.target = { x: flower.x, y: flower.y };
            bee.status = 'flying-to-flower';
            this.calculateBeeDirection(bee);
            bee.isNotifiedAboutPatch = true;
            
            setTimeout(() => {
              bee.isNotifiedAboutPatch = false;
            }, 15000 + Math.random() * 15000);
          }, i * 3000);
        });
      }
    },

    initGame() {
      const hiveX = 100 + Math.random() * (this.canvas.width - 200);
      const hiveY = 100 + Math.random() * (this.canvas.height - 200);
      
      this.hive = new Hive({ 
        x: hiveX, 
        y: hiveY,
        maxHoney: this.hiveParameters.maxHoney,
        capacity: this.hiveParameters.capacity
      });

      for (let i = 0; i < 4; i++) {
        this.addRandomFlowerPatch();
      }

      for (let i = 0; i < 5; i++) {
        this.addBee();
      }
    },

    addRandomFlowerPatch() {
      const x = 50 + Math.random() * (this.canvas.width - 100);
      const y = 50 + Math.random() * (this.canvas.height - 100);
      const count = Math.floor(Math.random() * 4) + 3;
      const patch = new FlowerPatch(x, y, count);
      this.patches.push(patch);
      this.flowers.push(...patch.flowers);
    },

    addBee() {
      if (this.hive.bees.length >= this.hive.capacity) return;
      
      const bee = new Bee(this.hive.id);
      bee.speed = this.beeParameters.speed;
      bee.collectionSpeed = this.beeParameters.collectionSpeed;
      bee.capacity = this.beeParameters.capacity;
      bee.birthTime = Date.now();
      bee.lifespan = this.beeParameters.lifespan + Math.random() * this.beeParameters.lifespanVariance * 2 - this.beeParameters.lifespanVariance;
      bee.position = { 
        x: this.hive.position.x + (Math.random() * 20 - 10), 
        y: this.hive.position.y + (Math.random() * 20 - 10)
      };
      bee.status = 'in-hive';
      this.hive.bees.push(bee);
      this.bees.push(bee);
      
      if (!this.isHiveFull) {
        this.findFlowerForBee(bee);
      }
    },
    
    spawnBear() {
      if (this.bear) return;
      
      this.bear = new Bear(this.canvas.width, this.canvas.height);
      this.bear.position = {
        x: -50,
        y: 100 + Math.random() * (this.canvas.height - 200)
      };
      this.bear.homePosition = { ...this.bear.position };
      this.bear.state = 'wandering';
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

    updateBeeParameters() {
      this.bees.forEach(bee => {
        bee.speed = this.beeParameters.speed;
        bee.collectionSpeed = this.beeParameters.collectionSpeed;
        bee.capacity = this.beeParameters.capacity;
      });
    },
    
    updateHiveParameters() {
      this.hive.maxHoney = this.hiveParameters.maxHoney;
      this.hive.capacity = this.hiveParameters.capacity;
      
      if (this.hive.bees.length > this.hive.capacity) {
        const excess = this.hive.bees.length - this.hive.capacity;
        for (let i = 0; i < excess; i++) {
          const bee = this.hive.bees.pop();
          const index = this.bees.indexOf(bee);
          if (index !== -1) {
            this.bees.splice(index, 1);
          }
        }
      }
    },
    
    updateSeasonConfig() {
      const seasonConfig = SEASONS[this.flowerParameters.season];
      this.flowerParameters.spawnChance = seasonConfig.spawnChance;
      this.flowerParameters.maxFlowers = seasonConfig.maxFlowers;
    },
    
    updateFlowerParameters() {
      this.updateSeasonConfig();
    },

    update(deltaTime) {
      if (this.gameOver) return;

      const now = Date.now();
      this.bees.forEach((bee, index) => {
        if (now - bee.birthTime > bee.lifespan) {
          this.removeBee(bee, index);
        }
      });

      if (this.bear) {
        const result = this.bear.update(deltaTime, this.hive);
        if (result === 'hive-destroyed') {
          this.gameOver = true;
        }

        if (this.bear.state === 'attacking') {
          this.bees.forEach(bee => {
            if (bee.status !== 'attacking-bear') {
              bee.status = 'attacking-bear';
              bee.target = { 
                x: this.bear.position.x, 
                y: this.bear.position.y 
              };
              this.calculateBeeDirection(bee);
            }

            this.moveBee(bee, deltaTime);

            if (this.checkBeeReachedTarget(bee)) {
              this.bear.takeDamage(0.5);
              bee.target = { 
                x: this.bear.position.x + Math.random() * 20 - 10,
                y: this.bear.position.y + Math.random() * 20 - 10
              };
              this.calculateBeeDirection(bee);
            }
          });
        }
      }

      this.patches.forEach(patch => patch.update(deltaTime));
      this.patches = this.patches.filter(patch => !patch.isDead);

      this.lastFlowerSpawnTime += deltaTime;
      if (this.lastFlowerSpawnTime > 5000 && 
          this.flowers.length < this.flowerParameters.maxFlowers && 
          Math.random() < this.flowerParameters.spawnChance / 100) {
        this.addRandomFlowerPatch();
        this.lastFlowerSpawnTime = 0;
      }

      let activeBees = [];
      let hiveBees = [];

      this.bees.forEach(bee => {
        if (bee.status === 'in-hive') {
          hiveBees.push(bee);
        } else {
          activeBees.push(bee);
        }
      });

      const scouts = activeBees.filter(b => b.status === 'idle');
      scouts.slice(0, Math.max(1, Math.floor(hiveBees.length * 0.3))).forEach(bee => {
        this.findFlowerForBee(bee);
      });

      this.bees.forEach(bee => {
        if (bee.status === 'attacking-bear') {
          this.moveBee(bee, deltaTime);
          if (this.checkBeeReachedTarget(bee)) {
            this.bear.takeDamage(0.5);
            bee.target = { 
              x: this.bear.position.x + Math.random() * 20 - 10,
              y: this.bear.position.y + Math.random() * 20 - 10
            };
            this.calculateBeeDirection(bee);
          }
          return;
        }

        if (bee.status === 'flying-to-flower') {
          this.moveBee(bee, deltaTime);
          if (this.checkBeeReachedTarget(bee)) {
            bee.status = 'collecting';
            bee.currentFlower = this.findFlowerAtPosition(bee.position);
          }
        }

        if (bee.status === 'collecting') {
          this.collectPollen(bee, deltaTime);
          if (bee.pollen >= bee.capacity) {
            this.returnBeeToHive(bee);
          }
        }

        if (bee.status === 'returning') {
          this.moveBee(bee, deltaTime);
          if (this.checkBeeReachedHive(bee)) {
            this.depositPollen(bee);
            bee.status = 'in-hive';
            bee.target = null;
            bee.direction = null;
            bee.pollen = 0;
          }
        }

        if (bee.status === 'idle') {
          this.findFlowerForBee(bee);
        }
      });
      
      if (!this.isHiveFull && this.hive.honey > 20 && this.bees.length < this.hive.capacity) {
        this.addBee();
        this.hive.honey -= 20;
      }
    },

    returnBeeToHive(bee) {
    bee.status = 'returning';
    bee.target = { ...this.hive.position };
    bee.calculateDirection();

    // Безопасная проверка на наличие цветка и patchId
    if (bee.isScout && bee.pollen > 0 && bee.currentFlower?.patchId) {
      this.startScoutDance(bee);
    }
  },

  startScoutDance(bee) {
    // Сохраняем patchId перед возможной очисткой currentFlower
    const patchId = bee.currentFlower?.patchId;
    if (!patchId) return;

    bee.isDancing = true;
    bee.danceStartTime = Date.now();
    bee.danceDuration = 3000 + Math.random() * 2000;

    setTimeout(() => {
      if (bee.isDancing) {
        this.informOtherBees(patchId); // Используем сохраненный patchId
      }
    }, 1000);

    setTimeout(() => {
      bee.isDancing = false;
      bee.isScout = false;
    }, bee.danceDuration);
  },

  informOtherBees(patchId) {
    const patch = this.patches.find(p => p.id === patchId);
    if (!patch) return;

    const availableFlowers = patch.flowers.filter(f => f.isBlooming && f.pollen > 0);
    if (availableFlowers.length === 0) return;

    const hiveBees = this.bees.filter(b => 
      b.status === 'in-hive' && 
      !b.isNotifiedAboutPatch
    );

    const beesToInform = Math.max(1, Math.floor(hiveBees.length * 0.3));
    
    hiveBees.slice(0, beesToInform).forEach((bee, index) => {
      setTimeout(() => {
        const flower = availableFlowers[
          Math.floor(Math.random() * availableFlowers.length)
        ];
        
        if (flower) {
          bee.isNotifiedAboutPatch = true;
          bee.status = 'flying-to-flower';
          bee.target = flower;
          bee.currentFlower = flower;
          bee.calculateDirection();
          
          setTimeout(() => {
            bee.isNotifiedAboutPatch = false;
          }, 15000 + Math.random() * 15000);
        }
      }, index * 300);
    });
  },

    findFlowerForBee(bee) {
      if (this.isHiveFull || bee.isNotifiedAboutPatch) return;

      const knownPatches = this.patches.filter(p => p.discoveredByBee);
      if (knownPatches.length > 0) {
        const randomPatch = knownPatches[Math.floor(Math.random() * knownPatches.length)];
        const flowers = randomPatch.flowers.filter(f => f.isBlooming && f.pollen > 0);
        
        if (flowers.length > 0) {
          const flower = flowers[Math.floor(Math.random() * flowers.length)];
          bee.target = { x: flower.x, y: flower.y };
          bee.status = 'flying-to-flower';
          this.calculateBeeDirection(bee);
          return;
        }
      }

      if (Math.random() < 0.3) {
        const newPatches = this.patches.filter(p => !p.discoveredByBee);
        if (newPatches.length > 0) {
          const patch = newPatches[0];
          const flower = patch.flowers.find(f => f.isBlooming && f.pollen > 0);
          
          if (flower) {
            bee.target = { x: flower.x, y: flower.y };
            bee.status = 'flying-to-flower';
            this.calculateBeeDirection(bee);
            bee.isScout = true;
            return;
          }
        }
      }

      const allFlowers = this.flowers.filter(f => f.isBlooming && f.pollen > 0);
      if (allFlowers.length > 0) {
        const flower = allFlowers[Math.floor(Math.random() * allFlowers.length)];
        bee.target = { x: flower.x, y: flower.y };
        bee.status = 'flying-to-flower';
        this.calculateBeeDirection(bee);
      }

      if (allFlowers.length > 0) {
    const flower = allFlowers[Math.floor(Math.random() * allFlowers.length)];
    bee.target = { x: flower.x, y: flower.y };
    bee.currentFlower = flower; // Устанавливаем текущий цветок
    bee.status = 'flying-to-flower';
    this.calculateBeeDirection(bee);
  }
    },

    moveBee(bee, deltaTime) {
      if (!bee.target || !bee.direction) return;
      bee.position.x += bee.direction.x * bee.speed * deltaTime;
      bee.position.y += bee.direction.y * bee.speed * deltaTime;
    },

    checkBeeReachedTarget(bee) {
      if (!bee.target) return false;
      const dx = bee.target.x - bee.position.x;
      const dy = bee.target.y - bee.position.y;
      return Math.sqrt(dx * dx + dy * dy) < 10;
    },
    
    checkBeeReachedHive(bee) {
      if (!this.hive) return false;
      const dx = this.hive.position.x - bee.position.x;
      const dy = this.hive.position.y - bee.position.y;
      return Math.sqrt(dx * dx + dy * dy) < 15;
    },

    findFlowerAtPosition(position) {
      return this.flowers.find(f => {
        const dx = f.x - position.x;
        const dy = f.y - position.y;
        return Math.sqrt(dx * dx + dy * dy) < 20;
      });
    },

    calculateBeeDirection(bee) {
      if (!bee.target) return;
      const dx = bee.target.x - bee.position.x;
      const dy = bee.target.y - bee.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        bee.direction = {
          x: dx / distance,
          y: dy / distance
        };
      } else {
        bee.direction = { x: 0, y: 0 };
      }
    },

  collectPollen(bee, deltaTime) {
    if (!bee.currentFlower) {
      this.returnBeeToHive(bee);
      return;
    }

    const collected = bee.currentFlower.collectPollen(bee.collectionSpeed * deltaTime);
    bee.pollen += collected;

    if (bee.pollen >= bee.capacity) {
      this.returnBeeToHive(bee);
      return;
    }

    if (collected > 0 && bee.isScout && bee.currentFlower?.patchId) {
      // Только разведчики отмечают полянку
      const patch = this.patches.find(p => p.id === bee.currentFlower.patchId);
      if (patch) patch.discovered = true;
    }
  },

    depositPollen(bee) {
      if (bee.pollen > 0) {
        this.hive.honey = Math.min(this.hive.maxHoney, Math.round(this.hive.honey + bee.pollen));
        bee.pollen = 0;
      }
      
      bee.position = { ...this.hive.position };
      bee.status = 'idle';
      bee.target = null;
      bee.currentFlower = null;
      
      if (!this.isHiveFull) {
        this.findFlowerForBee(bee);
      }
    },


    updateBeeBehavior(deltaTime) {
    this.bees.forEach(bee => {
      const result = bee.update(deltaTime, {
        flowers: this.flowers,
        hive: this.hive,
        bears: this.bear ? [this.bear] : []
      });

      if (result === 'die') {
        this.removeBee(bee);
      }

      // Обработка "танца" разведчика
      if (bee.isScout && bee.status === 'returning' && bee.reachedTarget()) {
        this.handleScoutDance(bee);
      }
    });
  },

  handleScoutDance(scoutBee) {
    if (!scoutBee.currentFlower?.patchId) return;

    // Помечаем пчелу как танцующую
    scoutBee.isDancing = true;
    scoutBee.danceStartTime = Date.now();
    scoutBee.danceDuration = 3000 + Math.random() * 2000; // 3-5 секунд танца

    // Через 1 секунду начинаем информировать других пчёл
    setTimeout(() => {
      if (scoutBee.isDancing) {
        this.informOtherBees(scoutBee.currentFlower.patchId);
      }
    }, 1000);

    // Завершаем танец через заданное время
    setTimeout(() => {
      scoutBee.isDancing = false;
      scoutBee.isScout = false;
    }, scoutBee.danceDuration);
  },

  informOtherBees(patchId) {
    const patch = this.patches.find(p => p.id === patchId);
    if (!patch) return;

    // Выбираем пчёл в улье (первые 30% или минимум 1 пчелу)
    const hiveBees = this.bees.filter(b => 
      b.status === 'in-hive' && 
      !b.isNotifiedAboutPatch
    );
    
    const beesToInform = Math.max(1, Math.floor(hiveBees.length * 0.3));
    
    hiveBees.slice(0, beesToInform).forEach((bee, index) => {
      setTimeout(() => {
        const flower = patch.flowers.find(f => f.isBlooming && f.pollen > 0);
        if (flower) {
          bee.isNotifiedAboutPatch = true;
          bee.status = 'flying-to-flower';
          bee.target = flower;
          bee.currentFlower = flower;
          bee.calculateDirection();
          
          // Сбрасываем уведомление через 15-30 секунд
          setTimeout(() => {
            bee.isNotifiedAboutPatch = false;
          }, 15000 + Math.random() * 15000);
        }
      }, index * 300); // Задержка между вылетом пчёл
    });
  },

    render() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = '#a8e6cf';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.patches.forEach(patch => {
        if (patch.isDead) {
          this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        } else {
          this.ctx.fillStyle = 'rgba(0, 128, 0, 0.2)';
        }
        this.ctx.beginPath();
        this.ctx.arc(patch.x, patch.y, 50, 0, Math.PI * 2);
        this.ctx.fill();
      });

      this.flowers.forEach(flower => {
        const f = flower.getVisualData();
        this.ctx.strokeStyle = '#2E7D32';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(f.x, f.y);
        this.ctx.lineTo(f.x, f.y + 40);
        this.ctx.stroke();
        this.ctx.save();
        this.ctx.globalAlpha = f.opacity;
        this.ctx.fillStyle = f.color;
        this.ctx.beginPath();
        this.ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#FFEB3B';
        this.ctx.beginPath();
        this.ctx.arc(f.x, f.y, f.size / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      });

      this.ctx.fillStyle = this.isHiveFull ? '#d9534f' : '#8B4513';
      this.ctx.beginPath();
      this.ctx.arc(this.hive.position.x, this.hive.position.y, 40, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.fillStyle = '#000';
      this.ctx.beginPath();
      this.ctx.arc(this.hive.position.x, this.hive.position.y + 10, 15, 0, Math.PI);
      this.ctx.fill();
      
      this.bees.forEach(bee => {
        if (bee.status === 'attacking-bear') {
          this.ctx.fillStyle = '#FF4500';
        } else {
          this.ctx.fillStyle = '#FFD700';
        }
        
        this.ctx.beginPath();
        
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
        
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(bee.position.x - 8, bee.position.y - 5, 4, 10);
        this.ctx.fillRect(bee.position.x - 2, bee.position.y - 5, 4, 10);
        this.ctx.fillRect(bee.position.x + 4, bee.position.y - 5, 4, 10);
        
        this.ctx.fillStyle = 'rgba(240, 240, 240, 0.7)';
        this.ctx.beginPath();
        this.ctx.ellipse(bee.position.x - 3, bee.position.y - 8, 3, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(bee.position.x - 3, bee.position.y + 8, 3, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();
      });
      
      if (this.bear) {
        this.ctx.beginPath();
        this.ctx.arc(
          this.bear.position.x,
          this.bear.position.y,
          this.bear.detectionRadius,
          0,
          Math.PI * 2
        );
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.fillStyle = '#8B4513';
        this.ctx.beginPath();
        this.ctx.arc(this.bear.position.x, this.bear.position.y, 25, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(this.bear.position.x - 15, this.bear.position.y - 15, 15, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(this.bear.position.x - 25, this.bear.position.y - 25, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(this.bear.position.x - 20, this.bear.position.y - 15, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        const healthWidth = 60;
        const healthHeight = 8;
        const healthX = this.bear.position.x - healthWidth / 2;
        const healthY = this.bear.position.y - 50;
        
        this.ctx.fillStyle = '#555';
        this.ctx.fillRect(healthX, healthY, healthWidth, healthHeight);
        
        const healthPercent = this.bear.health / this.bear.maxHealth;
        this.ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FFC107' : '#F44336';
        this.ctx.fillRect(healthX, healthY, healthWidth * healthPercent, healthHeight);
        
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(healthX, healthY, healthWidth, healthHeight);
      }
    },
    
    restartGame() {
      this.gameOver = false;
      this.bear = null;
      this.flowers = [];
      this.bees = [];
      this.initGame();
    }
  }
};
</script>
<style>
/* Основные стили */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #6a93cb 0%, #a4bfef 100%);
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  color: #2c3e50;
}

.app-container {
  display: flex;
  justify-content: center;
  gap: 30px;
  max-width: 1200px;
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 25px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.game-area {
  position: relative;
  width: 800px;
  height: 600px;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
}

canvas {
  display: block;
  background: linear-gradient(to bottom, #e0f7fa, #b2ebf2);
  width: 100%;
  height: 100%;
  border: 3px solid #4db6ac;
  border-radius: 10px;
}

/* Информация об улье */
.hive-info {
  position: absolute;
  top: 25px;
  left: 25px;
  background: rgba(255, 255, 255, 0.95);
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
  min-width: 220px;
  z-index: 10;
  transition: transform 0.3s ease;
}

.hive-info:hover {
  transform: translateY(-5px);
}

.hive-info h2 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #2c3e50;
  font-size: 1.4rem;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 10px;
}

.hive-info p {
  margin: 12px 0;
  font-size: 1rem;
  color: #34495e;
  display: flex;
  justify-content: space-between;
}

.hive-info p span {
  font-weight: 600;
  color: #2980b9;
}

.hive-full-warning {
  color: #e74c3c !important;
  font-weight: 600;
  text-align: center;
  margin-top: 15px !important;
  padding-top: 10px;
  border-top: 1px dashed #eee;
}

/* Панель параметров */
.parameters-panel {
  background: rgba(255, 255, 255, 0.95);
  padding: 30px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  width: 350px;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.parameters-panel:hover {
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.25);
}

.parameters-panel h2 {
  margin-top: 0;
  color: #2c3e50;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 18px;
  font-size: 1.8rem;
  text-align: center;
}

.parameter-group {
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f5f5f5;
}

.parameter-group:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.parameter-group h3 {
  margin: 0 0 20px 0;
  color: #3498db;
  font-size: 1.35rem;
  position: relative;
  padding-left: 15px;
}

.parameter-group h3:before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  background: #3498db;
  border-radius: 50%;
}

.parameter {
  margin-bottom: 22px;
  background: rgba(236, 240, 241, 0.4);
  padding: 18px;
  border-radius: 10px;
  transition: background 0.3s ease;
}

.parameter:hover {
  background: rgba(236, 240, 241, 0.7);
}

.parameter label {
  display: block;
  margin-bottom: 12px;
  font-weight: 600;
  color: #2c3e50;
  font-size: 1.05rem;
}

.parameter input[type="range"] {
  width: 100%;
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(to right, #3498db, #2ecc71);
  outline: none;
  margin-top: 10px;
  cursor: pointer;
  -webkit-appearance: none;
}

.parameter input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #3498db;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.parameter select {
  width: 100%;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid #ddd;
  background: white;
  font-size: 1.05rem;
  margin-top: 10px;
  box-shadow: inset 0 2px 5px rgba(0,0,0,0.05);
  transition: all 0.3s ease;
  cursor: pointer;
}

.parameter select:focus {
  border-color: #3498db;
  outline: none;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

/* Сообщение о конце игры */
.game-over-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.95);
  padding: 30px;
  border-radius: 15px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  z-index: 100;
  max-width: 80%;
}

.game-over-message h2 {
  color: #e74c3c;
  margin-bottom: 15px;
}

.game-over-message p {
  font-size: 1.2rem;
  margin-bottom: 20px;
}

.game-over-message button {
  padding: 12px 25px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.game-over-message button:hover {
  background: #2980b9;
  transform: translateY(-2px);
}

/* Кнопки управления */
.bee-controls {
  margin-top: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bee-controls button {
  padding: 10px 15px;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.bee-controls button:disabled {
  background: #95a5a6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.bee-controls button:nth-child(1) {
  background: #3498db;
}

.bee-controls button:nth-child(1):hover {
  background: #2980b9;
}

.bee-controls button:nth-child(2) {
  background: #e74c3c;
}

.bee-controls button:nth-child(2):hover {
  background: #c0392b;
}

.bee-controls button:nth-child(3) {
  background: #795548;
}

.bee-controls button:nth-child(3):hover {
  background: #5D4037;
}

.delete-active {
  background: #c0392b !important;
}

/* Адаптивность */
@media (max-width: 1200px) {
  .app-container {
    flex-direction: column;
    align-items: center;
  }
  
  .parameters-panel {
    width: 800px;
    max-width: 100%;
    margin-top: 35px;
  }
}

@media (max-width: 850px) {
  .app-container {
    padding: 15px;
  }
  
  .game-area, .parameters-panel {
    width: 100%;
    max-width: 100%;
  }
  
  .game-area {
    height: auto;
    aspect-ratio: 4/3;
  }
  
  canvas {
    width: 100%;
    height: auto;
  }
  
  .hive-info {
    top: 15px;
    left: 15px;
    padding: 15px;
    min-width: 180px;
  }
  
  .parameters-panel {
    padding: 25px;
  }
}

@media (max-width: 480px) {
  .hive-info {
    position: relative;
    top: 0;
    left: 0;
    width: 100%;
    margin-bottom: 20px;
  }
  
  .parameter {
    padding: 15px;
  }
  
  .bee-controls {
    flex-direction: row;
    flex-wrap: wrap;
  }
  
  .bee-controls button {
    flex: 1 1 45%;
    font-size: 0.8rem;
    padding: 8px 10px;
  }
}
.hive-info.right {
  right: 25px;
  left: auto;
  top: 25px;
  min-width: 200px;
  background: rgba(255, 255, 255, 0.9);
}

/* Уменьшаем размеры текста в панели */
.hive-info.right h2 {
  font-size: 1.2rem;
  margin-bottom: 10px;
}

.hive-info.right p {
  margin: 8px 0;
  font-size: 0.9rem;
}

/* Делаем кнопки компактнее */
.bee-controls button {
  padding: 8px 10px;
  font-size: 0.8rem;
  margin-bottom: 5px;
}
/* Улучшаем видимость медведя */
canvas {
  background: linear-gradient(to bottom, #e0f7fa, #b2ebf2);
}
.bee-attacking {
  background-color: #FF4500;
  box-shadow: 0 0 10px #FF0000;
}
</style>