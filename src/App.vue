<template>
  <div class="app-container">
    <!-- Панель информации об улье - теперь слева -->
    <div class="hive-info left">
      <h2>Улей</h2>
      <p>Мёд: {{ hive ? Math.round(hive.honey) : 0 }}/{{ hive ? hive.maxHoney : 0 }}</p>
      <p>Пчёлы: {{ hive ? hive.bees.length : 0 }}/{{ hive ? hive.capacity : 0 }}</p>
      <p>Здоровье: {{ hive ? Math.round(hive.health) : 0 }}%</p>
      <p v-if="isHiveFull" class="hive-full-warning">Улей переполнен!</p>
      <div class="bee-controls">
        <button @click="spawnBear" :disabled="bear">Вызвать медведя</button>
      </div>
    </div>
    <div class="game-area">
      <canvas ref="gameCanvas" width="800" height="600"></canvas>
      <!-- Панель информации об улье - теперь справа -->
      
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
      lastBeeSpawn: 0,
lastHotPatchCheck: 0,
      lastWorkerActivation: 0,
       lastScoutCheck: 0,
        lastActivation: 0,
      isHiveFull: false,
      bear: null,
      gameOver: false,
      deleteMode: false,
      newPatchCount: 2,
       beeCost: 35, // Стоимость создания одной пчелы
    beeSpawnCooldown: 10000, // Задержка между созданиями (5 секунд)
    lastBeeSpawnTime: 0, // Время последнего создания
  
      beeParameters: {
        speed: 0.1,
        collectionSpeed: 0.02,
        capacity: 10,
        lifespan: 30000,
        lifespanVariance: 5000
      },
      
      hiveParameters: {
        maxHoney: 100,
        capacity: 20,
      },
      flowerParameters: {
        season: 'summer',
        spawnChance: 0.5,
        maxFlowers: 150,
        flowersPerPatch: 5,
        patchLifetime: 30,
      },
      flowerSpawnRate: 50,
       flowerPatchSettings: {
      minPatches: 8, // Минимум 8 полянок (было 4)
      maxPatches: 12, // Максимум 12
      spawnInterval: 5000, // Проверка каждые 10 сек (было 15)
      spawnChance: 0.8, // 80% шанс создать новую
      maxFlowers: 150 // Макс цветов (было 100)
      },
    lastPatchCheck: 0,
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

    balanceScouts() {
    const totalBees = this.bees.length;
    if (totalBees < 5) return; // Не балансируем при малом количестве
    
    const currentScouts = this.bees.filter(b => b.isScout).length;
    const targetScouts = Math.floor(totalBees * 0.2); // 20% разведчиков
    
    // Если разведчиков слишком мало
    if (currentScouts < targetScouts) {
      const candidates = this.bees.filter(b => !b.isScout && b.status === 'in-hive');
      if (candidates.length > 0) {
        const bee = candidates[0];
        bee.isScout = true;
        this.initScout(bee);
      }
    }
    // Если разведчиков слишком много
    else if (currentScouts > targetScouts + 1) {
      const candidates = this.bees.filter(b => b.isScout && b.status === 'in-hive');
      if (candidates.length > 0) {
        candidates[0].isScout = false;
      }
    }
  },

handleScoutReturn(bee) {
  if (!bee.isScout || !bee.currentFlower?.patchId) return;

  const patch = this.patches.find(p => p.id === bee.currentFlower.patchId);
  if (!patch) return;

  // 1. Сразу помечаем полянку как "горячую"
  patch.isHot = true;
  patch.hotUntil = Date.now() + 30000; // "Горячая" в течение 30 секунд

  // 2. Немедленно активируем больше рабочих пчёл
  this.activateWorkersForPatch(patch.id);
  
  // 3. Начинаем танец для дополнительного оповещения
  this.startBeeDance(bee, patch.id);
},
activateWorkersForPatch(patchId) {
  const patch = this.patches.find(p => p.id === patchId);
  if (!patch || !patch.isHot) return;

  const availableWorkers = this.bees.filter(b => 
    !b.isScout && 
    b.status === 'in-hive' &&
    (!b.isNotifiedAboutPatch || Date.now() > b.informedUntil)
  );

  // Активируем ВСЕХ доступных рабочих, а не только 30%
  availableWorkers.forEach(bee => {
    this.sendBeeToPatch(bee, patchId);
  });
},

sendBeeToPatch(bee, patchId) {
  const patch = this.patches.find(p => p.id === patchId);
  if (!patch || !patch.hasAvailableFlowers()) {
    bee.isBusy = false;
    return;
  }

  const flower = patch.getRandomAvailableFlower();
  if (!flower) {
    bee.isBusy = false;
    return;
  }

  bee.isBusy = true;
  bee.currentPatchId = patchId;
  bee.target = flower;
  bee.currentFlower = flower;
  bee.status = 'flying-to-flower';
  flower.isTargeted = true;
  this.calculateBeeDirection(bee);

  // Очищаем предыдущий таймер
  if (bee.flowerTimeout) clearTimeout(bee.flowerTimeout);
  
  bee.flowerTimeout = setTimeout(() => {
    if (bee.status === 'flying-to-flower') {
      this.returnBeeToHive(bee);
    }
  }, 15000);
},

startBeeDance(bee, patchId) {
  bee.isDancing = true;
  bee.danceTargetPatch = patchId;
  bee.status = 'dancing';
  
  // 1. Визуальный эффект танца
  this.renderBeeDance(bee);
  
  // 2. Сообщаем другим пчёлам (через 1 сек)
  setTimeout(() => {
    if (bee.isDancing) {
      this.informOtherBees(patchId);
    }
  }, 1000);
  
  // 3. Завершаем танец через 3-5 сек
  setTimeout(() => {
    bee.isDancing = false;
    bee.status = 'in-hive';
    setTimeout(() => this.sendScoutAgain(bee), 2000); // Новый вылет через 2 сек
  }, 3000 + Math.random() * 2000);
},
informOtherBees(patchId) {
  const patch = this.patches.find(p => p.id === patchId);
  if (!patch) return;

  // 1. Выбираем пчёл в улье (30% от общего числа)
  const hiveBees = this.bees.filter(b => 
    !b.isScout && 
    b.status === 'in-hive' && 
    !b.isNotifiedAboutPatch
  );
  
  const beesToInform = Math.max(1, Math.floor(hiveBees.length * 0.3));
  
  // 2. Сообщаем выбранным пчёлам
  hiveBees.slice(0, beesToInform).forEach(bee => {
    bee.isNotifiedAboutPatch = true;
    bee.notifiedPatchId = patchId;
    
    // Пчела запоминает полянку на 15-30 сек
    setTimeout(() => {
      bee.isNotifiedAboutPatch = false;
    }, 15000 + Math.random() * 15000);
    
    // Вылет через 1-3 сек после уведомления
    setTimeout(() => {
      if (bee.status === 'in-hive') {
        this.sendBeeToPatch(bee, patchId);
      }
    }, 1000 + Math.random() * 2000);
  });
},

    removeBee(bee, index) {
  // 1. Удаляем из основного массива
  if (index >= 0 && index < this.bees.length) {
    this.bees.splice(index, 1);
  }
  
  // 2. Удаляем из улья
  const hiveIndex = this.hive.bees.findIndex(b => b.id === bee.id);
  if (hiveIndex !== -1) {
    this.hive.bees.splice(hiveIndex, 1);
  }
  
  // 3. Очищаем все таймеры
  if (bee.returnTimeout) clearTimeout(bee.returnTimeout);
  if (bee.flowerTimeout) clearTimeout(bee.flowerTimeout);
  
  console.log(`Bee removed: ${bee.id}`);
},

  initGame() {
  // Очищаем предыдущее состояние
  this.bees = [];
  this.patches = [];
  this.flowers = [];
  
  // Создаем улей
  this.hive = new Hive({
    x: this.canvas.width / 2,
    y: this.canvas.height / 2,
    maxHoney: this.hiveParameters.maxHoney,
    capacity: this.hiveParameters.capacity
  });
  
  // Инициализируем discoveredPatches если это необходимо
  if (!Array.isArray(this.hive.discoveredPatches)) {
    this.hive.discoveredPatches = [];
  }

  // Создаем начальных пчел (5 штук)
  for (let i = 0; i < 5; i++) {
    const bee = this.addBee();
    if (i < 2) { // Первые 2 пчелы - разведчики
      bee.isScout = true;
      bee.status = 'idle';
    }
  }

  // Создаем цветочные полянки
  for (let i = 0; i < 5; i++) {
    this.addRandomFlowerPatch();
  }
},

addRandomFlowerPatch() {
    // Умное размещение - подальше от улья и других полянок
    let attempts = 0;
    let x, y, validPosition;
    
    do {
      x = 100 + Math.random() * (this.canvas.width - 200);
      y = 100 + Math.random() * (this.canvas.height - 200);
      
      // Проверяем расстояние до улья
      const distToHive = Math.sqrt(
        Math.pow(x - this.hive.position.x, 2) + 
        Math.pow(y - this.hive.position.y, 2)
      );
      
      // Проверяем расстояние до других полянок
      const farFromOthers = this.patches.every(patch => {
        return Math.sqrt(Math.pow(x - patch.x, 2) + Math.pow(y - patch.y, 2)) > 200;
      });
      
      validPosition = distToHive > 250 && farFromOthers;
      attempts++;
    } while (!validPosition && attempts < 20);
    
    if (validPosition) {
      const count = 3 + Math.floor(Math.random() * 4); // 3-6 цветков
      const patch = new FlowerPatch(x, y, count);
      
      // Устанавливаем время жизни в зависимости от сезона
      const seasonMultiplier = {
        spring: 1.2,
        summer: 1.5,
        autumn: 0.8,
        winter: 0.5
      };
      
      patch.patchLifetime *= seasonMultiplier[this.flowerParameters.season];
      this.patches.push(patch);
      this.flowers.push(...patch.flowers);
    }
  },

    addBee() {
  if (this.hive.bees.length >= this.hive.capacity) return null; // Возвращаем null если нет места
  
  const bee = new Bee(this.hive.id);
  bee.speed = this.beeParameters.speed;
  bee.collectionSpeed = this.beeParameters.collectionSpeed;
  bee.capacity = this.beeParameters.capacity;
  
  // Только 30% пчёл становятся разведчиками
  bee.isScout = Math.random() < 0.3;
  bee.isActiveScout = bee.isScout;

  bee.position = { 
    x: this.hive.position.x + (Math.random() * 20 - 10), 
    y: this.hive.position.y + (Math.random() * 20 - 10)
  };
  
  bee.status = bee.isScout ? 'idle' : 'in-hive';
  
  this.hive.bees.push(bee);
  this.bees.push(bee);
  
  return bee; // Возвращаем созданную пчелу
}, 

 // Обновлённый метод активации рабочих пчёл
  activateWorkerBees(patchId = null) {
    const availableWorkers = this.bees.filter(bee => 
      !bee.isScout && 
      bee.status === 'in-hive' && 
      (!bee.isInformed || Date.now() > bee.informedUntil)
    );

    // Активируем не более 30% доступных рабочих
    const workersToActivate = Math.max(1, Math.floor(availableWorkers.length * 0.3));
    
    availableWorkers.slice(0, workersToActivate).forEach(bee => {
      this.sendBeeToFlower(bee, patchId);
    });
  },

  // Обновлённый метод для отправки пчелы к цветку
sendBeeToFlower(bee, flower = null) {
  if (bee.isScout) {
  bee.lastSearchTime = Date.now();
  // Разведчики могут переопределять занятые цветы
  flower.isTargeted = false;
}

  // 1. Если конкретный цветок не указан, находим подходящий
  if (!flower) {
    const availableFlowers = this.flowers.filter(f => 
      f.isBlooming && 
      f.pollen > 0 && 
      !f.isTargeted
    );
    
    if (availableFlowers.length === 0) {
      bee.status = 'waiting';
      setTimeout(() => this.sendBeeToFlower(bee), 2000);
      return;
    }
    
    flower = availableFlowers[Math.floor(Math.random() * availableFlowers.length)];
  }

  // 2. Помечаем цветок как занятый
  flower.isTargeted = true;
  
  // 3. Назначаем цель пчеле
  bee.target = flower;
  bee.currentFlower = flower;
  bee.status = 'flying-to-flower';
  
  // 4. Для рабочих пчёл устанавливаем "память" о полянке
  if (!bee.isScout) {
    bee.isInformed = true;
    bee.informedUntil = Date.now() + 15000 + Math.random() * 15000;
  }
  
  // 5. Рассчитываем направление движения
  this.calculateBeeDirection(bee);
  
  // 6. Устанавливаем таймер сбора пыльцы (1-3 секунды)
  bee.actionTimeout = setTimeout(() => {
    if (bee.status === 'flying-to-flower' && this.checkBeeReachedTarget(bee)) {
      this.collectPollen(bee);
    }
  }, 1000 + Math.random() * 2000);
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

  returnAllBeesToHive() {
  this.bees.forEach(bee => {
    if (bee.status === 'attacking-bear') {
      bee.status = 'returning';
      bee.target = { ...this.hive.position };
      this.calculateBeeDirection(bee);
    }
  });
},
getActiveDiscoveredPatches() {
  return this.hive.discoveredPatches
    .map(patchObj => patchObj.id)
    .filter(patchId => {
      const patch = this.patches.find(p => p.id === patchId);
      return patch && !patch.isDead && patch.hasAvailableFlowers();
    });
},
activateWorkerBee(bee) {
  if (bee.status !== 'in-hive' || bee.isBusy) return;

  // 1. Проверяем "горячие" полянки
  const hotPatches = this.patches.filter(p => p.isHot && p.hotUntil > Date.now());
  if (hotPatches.length > 0) {
    this.sendBeeToPatch(bee, hotPatches[0].id);
    return;
  }

  // 2. Проверяем "известные" полянки (только живые и с цветами)
  const activePatches = this.getActiveDiscoveredPatches();
  if (activePatches.length > 0) {
    const randomIndex = Math.floor(Math.random() * activePatches.length);
    const patchId = activePatches[randomIndex];
    this.sendBeeToPatch(bee, patchId);
    return;
  }

  // 3. Случайный поиск (60% шанс)
  if (Math.random() < 0.6) {
    this.findRandomFlowerForBee(bee);
  }
},
cleanupDiscoveredPatches() {
  this.hive.discoveredPatches = this.hive.discoveredPatches.filter(patchObj => {
    const patch = this.patches.find(p => p.id === patchObj.id);
    return patch && !patch.isDead && patch.hasAvailableFlowers();
  });
},

addNewBee() {
  if (this.hive.bees.length >= this.hive.capacity) return;
  
  const newBee = new Bee(this.hive.id);
  newBee.position = {
    x: this.hive.position.x + (Math.random() * 40 - 20),
    y: this.hive.position.y + (Math.random() * 40 - 20)
  };
  
  // Рассчитываем процент разведчиков (10-30%)
  const scoutRatio = 0.1 + (Math.random() * 0.2);
  const currentScouts = this.bees.filter(b => b.isScout).length;
  const targetScouts = Math.floor(this.bees.length * scoutRatio);
  
  newBee.isScout = currentScouts < targetScouts;
  
  this.bees.push(newBee);
  this.hive.bees.push(newBee);
  
  console.log(`Created new bee: ${newBee.isScout ? 'Scout' : 'Worker'}`);
},

    manageFlowerPatches() {
    // Удаляем только полностью мертвые полянки
    this.patches = this.patches.filter(patch => 
      !patch.isDead || patch.flowers.some(f => f.state !== 'dead')
    );
    
    const activePatches = this.patches.filter(p => 
      p.flowers.some(f => f.isBlooming)
    ).length;
    
    // Создаем новые полянки более агрессивно
    if (activePatches < this.flowerPatchSettings.minPatches) {
      const patchesToAdd = this.flowerPatchSettings.minPatches - activePatches;
      
      for (let i = 0; i < patchesToAdd; i++) {
        if (this.flowers.length < this.flowerPatchSettings.maxFlowers) this.addRandomFlowerPatch();
           
        }
      }
    },

    update(deltaTime) {
      if (this.gameOver) return;
      
      const now = Date.now();

      // Автоматическое создание полянок
    if (now - this.lastPatchCheck > this.flowerPatchSettings.spawnInterval) {
      this.manageFlowerPatches();
      this.lastPatchCheck = now;
    }

   // Удаление пчёл по старости (первым делом)
for (let i = this.bees.length - 1; i >= 0; i--) {
  const bee = this.bees[i];
  
  // Проверка возраста
  const age = now - bee.birthTime;
  if (age > bee.lifespan) {
    console.log(`Removing bee ${bee.id} (age: ${Math.round(age/1000)}s > lifespan: ${bee.lifespan/1000}s)`);
    this.removeBee(bee, i);
  }
}

   // Автоматическое создание пчел
  if (now - this.lastBeeSpawnTime > this.beeSpawnCooldown) {
    const hiveFullness = this.hive.honey / this.hive.maxHoney;
    const beeRatio = this.bees.length / this.hive.capacity;
    
    // Условия для создания:
    const canSpawn = 
      this.hive.honey >= this.beeCost && 
      this.bees.length < this.hive.capacity &&
      hiveFullness > 0.6 && // Улей заполнен более чем на 60%
      beeRatio < 0.8; // Заполнено менее 80% от вместимости
    
    if (canSpawn) {
      this.addNewBee();
      this.hive.honey -= this.beeCost;
      this.lastBeeSpawnTime = now;
    }
  }

      // Автоматическая проверка "горячих" полянок
  if (Date.now() - this.lastHotPatchCheck > 2000) {
    this.patches.filter(p => p.isHot && p.hotUntil > Date.now()).forEach(patch => {
      this.activateWorkersForPatch(patch.id);
    });
    this.lastHotPatchCheck = Date.now();
  }

 // Специальная обработка для разведчиков
  this.bees.filter(b => b.isScout).forEach(bee => {
    if (bee.status === 'idle' && Date.now() - bee.lastSearchTime > 2000) {
      this.findFlowerForBee(bee);
      bee.lastSearchTime = Date.now();
    }
  });

  
  
  setInterval(() => this.cleanupDiscoveredPatches(), 5000); // раз в 5 секунд


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
 
const isHiveFull = this.hive.honey >= this.hive.maxHoney;
      this.bees.forEach((bee, index) => {
  // Очистка таймеров при удалении пчелы
   if (isHiveFull) {
      this.handleFullHiveBehavior(bee);
    }

  if (bee.markedForRemoval) {
    if (bee.returnTimeout) clearTimeout(bee.returnTimeout);
    if (bee.flowerTimeout) clearTimeout(bee.flowerTimeout);
    this.bees.splice(index, 1);
    return;
  }

  // Активация рабочих пчёл
  if (bee.status === 'in-hive' && !bee.isScout && !bee.isBusy) {
    if (Date.now() - bee.lastCheckTime > 1000) {
      this.activateWorkerBee(bee);
      bee.lastCheckTime = Date.now();
    }
  }
})

      this.patches.forEach(patch => patch.update(deltaTime));
      this.patches = this.patches.filter(patch => !patch.isDead);

      this.lastFlowerSpawnTime += deltaTime;
  if (this.lastFlowerSpawnTime > 3000 &&  // Чаще (каждые 3 секунды)
      this.flowers.length < this.flowerParameters.maxFlowers && 
      Math.random() < this.flowerParameters.spawnChance * 1.5) { // Увеличили шанс
    this.addRandomFlowerPatch(); // Создаем одну новую полянку
    this.lastFlowerSpawnTime = 0;
  }

      this.bees.forEach(bee => {

       if (bee.isScout) {
      // Принудительный возврат, если слишком долго летит
      if (bee.status === 'flying-to-flower' && Date.now() - bee.lastActionTime > 20000) {
        this.returnBeeToHive(bee);
      }
      
      // Автовылет, если застрял в улье
      if (bee.status === 'in-hive' && Date.now() - bee.lastActionTime > 5000) {
        bee.status = 'idle';
        this.findFlowerForBee(bee);
      }
    }
  

  if (bee.status === 'idle' && !bee.isScout) {
    this.findFlowerForBee(bee);
  }
  if (bee.isDancing) {
      bee.updateDance(this.hive);
    }

    // Рабочие пчёлы вылетают на известные полянки
    if (bee.status === 'in-hive' && !bee.isScout && bee.isInformed) {
      if (Date.now() > bee.informedUntil) {
        bee.isInformed = false; // Информация устарела
      } else {
        this.sendWorkerToPatch(bee, bee.informedPatchId);
      }
    }
})

      this.bees.forEach((bee, index) => {
        if (Date.now() - bee.birthTime > 120000) { // 2 минуты - абсолютный максимум
    console.warn(`Forcibly removing immortal bee ${bee.id}`);
    this.removeBee(bee, index);
  }
  // Обработка атаки на медведя
  if (this.bear && bee.status === 'attacking-bear') {
    this.moveBee(bee, deltaTime);
    
    if (this.checkBeeReachedTarget(bee)) {
      const bearDead = this.bear.takeDamage(0.5);
      
      if (bearDead) {
        // Если медведь мёртв - возвращаем пчёл в улей
        bee.status = 'returning';
        bee.target = { ...this.hive.position };
        this.calculateBeeDirection(bee);
      } else {
        // Продолжаем атаку
        bee.target = {
          x: this.bear.position.x + Math.random() * 20 - 10,
          y: this.bear.position.y + Math.random() * 20 - 10
        };
        this.calculateBeeDirection(bee);
      }
    }
    return;
  }
this.bees.forEach(bee => {
  // Автоматическая активация рабочих пчёл
  if (bee.status === 'in-hive' && !bee.isScout && !bee.isBusy) {
    // Проверяем каждые 2 секунды
    if (Date.now() - bee.lastCheckTime > 2000) {
      this.activateWorkerBee(bee);
      bee.lastCheckTime = Date.now();
    }
  }
})
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

      // Обновляем полянки и удаляем мертвые
  this.patches.forEach(patch => {
    patch.update(deltaTime);
    
    if (patch.isDying && !patch.beesReturned) {
      this.returnAllBeesFromPatch(patch.id);
      patch.beesReturned = true;
    }
  });

  // Удаляем мертвые полянки и их цветы
  this.patches = this.patches.filter(patch => {
  if (patch.isDead) {
    // Удаляем цветы этой полянки из общего массива
    this.flowers = patch.removeFlowersFromGlobal(this.flowers);
    
    // Дополнительная очистка на случай ошибок
    const patchIds = new Set(patch.flowers.map(f => f.id));
    this.flowers = this.flowers.filter(f => !patchIds.has(f.id));
      // Создаем новую полянку
      for (let i = 0; i < this.newPatchCount; i++) {this.addRandomFlowerPatch();}
      return false;
    }
    return true;
  });
    },

    // Метод для возврата ВСЕХ пчёл с полянки
    returnAllBeesFromPatch(patchId) {
      this.bees.forEach(bee => {
        if (
          (bee.currentFlower && bee.currentFlower.patchId === patchId) ||
          (bee.target && bee.target.patchId === patchId)
        ) {
          this.returnBeeToHive(bee);
          
          // Сбрасываем память о полянке у пчёл
          if (bee.isNotifiedAboutPatch && bee.notifiedPatchId === patchId) {
            bee.isNotifiedAboutPatch = false;
          }
        }
      });
    },

    // Метод для возврата пчёл с умирающей полянки
  returnBeesFromPatch(patchId) {
    this.bees.forEach(bee => {
      if (
        bee.currentFlower?.patchId === patchId || 
        bee.target?.patchId === patchId
      ) {
        if (bee.status === 'flying-to-flower' || bee.status === 'collecting') {
          this.returnBeeToHive(bee);
        }
      }
    });
  },

handleFullHiveBehavior(bee) {
  switch(bee.status) {
    case 'flying-to-flower':
      // Отменяем сбор и возвращаемся
      if (bee.target?.isTargeted) {
        bee.target.isTargeted = false;
      }
      this.returnBeeToHive(bee);
      break;
      
    case 'collecting':
      // Немедленно прекращаем сбор
      if (bee.currentFlower) {
        bee.currentFlower.isTargeted = false;
      }
      this.returnBeeToHive(bee);
      break;
      
    case 'returning':
      // Продолжаем возвращение
      break;
      
    case 'in-hive':
      // Остаемся в улье
      bee.status = 'idle';
      break;
      
    case 'idle':
      // Не начинаем новые вылеты
      break;
  }
},


returnBeeToHive(bee) {
  // Сбрасываем текущий цветок
  if (bee.currentFlower) {
    bee.currentFlower.isTargeted = false;
    bee.currentFlower = null;
  }

  // Назначаем улей как цель
  bee.target = { ...this.hive.position };
  bee.status = 'returning';
  this.calculateBeeDirection(bee);

  // Таймер на случай зависания
  bee.returnTimeout = setTimeout(() => {
    if (bee.status === 'returning') {
      bee.status = 'in-hive';
      bee.target = null;
      
      // Для разведчиков - планируем новый вылет
      if (bee.isScout) {
        setTimeout(() => {
          if (bee.status === 'in-hive') {
            bee.status = 'idle';
            this.findFlowerForBee(bee);
          }
        }, 3000); // Задержка перед новым вылетом
      }
    }
  }, 10000); // 10 секунд на возвращение
},

// Метод для отправки рабочей пчелы на полянку
sendWorkerToPatch(bee, patchId) {
  const patch = this.patches.find(p => p.id === patchId);
  if (!patch) {
    bee.isInformed = false;
    return;
  }

  const availableFlowers = patch.flowers.filter(f => 
    f.isBlooming && f.pollen > 0 && !f.isTargeted
  );

  if (availableFlowers.length > 0) {
    const flower = availableFlowers[Math.floor(Math.random() * availableFlowers.length)];
    flower.isTargeted = true;
    bee.target = flower;
    bee.currentFlower = flower;
    bee.status = 'flying-to-flower';
    this.calculateBeeDirection(bee);
  } else {
    bee.isInformed = false; // На этой полянке нет цветов
  }
},

startScoutDance(bee) {
  if (!bee.currentFlower?.patchId) return;

  // 1. Начинаем танец
  bee.isDancing = true;
  bee.danceStartTime = Date.now();
  
  // 2. Немедленно добавляем полянку в список известных
  const patch = this.patches.find(p => p.id === bee.currentFlower.patchId);
  if (patch) {
    this.hive.addDiscoveredPatch(patch); // Используем метод из Hive
  }

  // 3. Через 0.5 сек активируем пчёл (быстрее чем было)
  setTimeout(() => {
    if (bee.isDancing) {
      this.activateWorkersForPatch(bee.currentFlower.patchId); // Новый эффективный метод
    }
  }, 500);

  // 4. Завершаем танец через 2-3 сек (разведчик остаётся разведчиком)
  setTimeout(() => {
    bee.isDancing = false;
    // Разведчик НЕ становится рабочей пчелой!
    bee.status = 'idle';
    this.findFlowerForBee(bee); // Снова ищет цветы
  }, 2000 + Math.random() * 1000);
},
activateWorkersForPatch(patchId) {
  const patch = this.patches.find(p => p.id === patchId);
  if (!patch) return;

  // 1. Все доступные рабочие пчёлы в улье
  const availableWorkers = this.bees.filter(b => 
    !b.isScout && 
    b.status === 'in-hive' &&
    !b.isBusy
  );

  // 2. Берем до 70% (а не 30%) доступных пчёл
  const workersToActivate = Math.max(3, Math.floor(availableWorkers.length * 0.7));
  
  // 3. Немедленно отправляем (без задержек между пчёлами)
  availableWorkers.slice(0, workersToActivate).forEach(bee => {
    const availableFlowers = patch.flowers.filter(f => 
      f.isBlooming && f.pollen > 0 && !f.isTargeted
    );
    
    if (availableFlowers.length > 0) {
      const flower = availableFlowers[Math.floor(Math.random() * availableFlowers.length)];
      this.sendBeeToFlower(bee, flower);
    }
  });
},

findRandomFlowerForBee(bee) {
  const availableFlowers = this.flowers.filter(f => 
    f.isBlooming && f.pollen > 0 && !f.isTargeted
  );

  if (availableFlowers.length === 0) {
    bee.status = 'waiting';
    setTimeout(() => this.sendBeeToFlower(bee), 500); // Быстрее повтор
    return;
  }

  const flower = availableFlowers[Math.floor(Math.random() * availableFlowers.length)];
  this.sendBeeToFlower(bee, flower);
},

findFlowerForBee(bee) {
   if (this.hive.honey >= this.hive.maxHoney) {
    bee.status = 'idle';
    return;
  }
  // Проверяем, что это разведчик в нужном статусе
  if (!bee.isScout || (bee.status !== 'idle' && bee.status !== 'in-hive')) {
    return;
  }

  // Сбрасываем предыдущие цели
  bee.target = null;
  bee.currentFlower = null;
  bee.isBusy = false;

  // Ищем неисследованные полянки
  const unexploredPatches = this.patches.filter(patch => 
    !this.hive.discoveredPatches.some(dp => dp.id === patch.id)
  );

  if (unexploredPatches.length > 0) {
    const targetPatch = unexploredPatches[Math.floor(Math.random() * unexploredPatches.length)];
    const flower = targetPatch.getRandomAvailableFlower();
    
    if (flower) {
      bee.target = flower;
      bee.currentFlower = flower;
      bee.status = 'flying-to-flower';
      flower.isTargeted = true;
      this.calculateBeeDirection(bee);
      return;
    }
  }

  // Если не нашли - повторяем через 5 секунд
  setTimeout(() => this.findFlowerForBee(bee), 5000);
  if (!bee.isScout && this.hive.discoveredPatches.length > 0) {
    const discoveredPatches = this.getActiveDiscoveredPatches();
    if (discoveredPatches.length > 0) {
      const randomPatchId = discoveredPatches[Math.floor(Math.random() * discoveredPatches.length)];
      this.sendBeeToPatch(bee, randomPatchId);
      return;
    }
  }

  // Если не нашлось подходящей полянки, пусть всё равно ищут случайный цветок
  const flower = this.flowers.find(f => f.isBlooming && f.pollen > 0 && !f.isTargeted);
  if (flower) {
    this.sendBeeToFlower(bee, flower);
  } else {
    bee.status = 'idle';
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

  // Обновлённый метод depositPollen
  depositPollen(bee) {
  if (bee.pollen > 0) {
    this.hive.honey += bee.pollen;
    bee.pollen = 0;
  }
  
  // Для разведчиков устанавливаем статус 'idle', а не 'in-hive'
  bee.status = bee.isScout ? 'idle' : 'in-hive';
  bee.target = null;
  bee.currentFlower = null;
  
  // Очищаем предыдущий таймер, если есть
  if (bee.returnAction) {
    clearTimeout(bee.returnAction);
  }
},


  rememberFlowerPatch(bee, patchId) {
    // Добавляем полянку в память (максимум 5 последних)
    bee.scoutMemory = [
      { id: patchId, timestamp: Date.now() },
      ...bee.scoutMemory.slice(0, 4)
    ];
    
    // Активируем рабочих пчёл
    this.activateWorkerBees(patchId);
    
    // Продолжаем работу разведчика
    this.handleScoutBehavior(bee);
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
         if (patch.isDying) {
      // Рисуем полупрозрачную красную зону
      const progress = 1 - (patch.deathTimer / 5000);
      this.ctx.fillStyle = `rgba(255, 0, 0, ${0.3 * progress})`;
      this.ctx.beginPath();
      this.ctx.arc(patch.x, patch.y, patch.radius * progress, 0, Math.PI * 2);
      this.ctx.fill();
    }
      });

      this.flowers.forEach(flower => {
        if (flower.patch?.isDying) {
    // Рисуем умирающие цветы с красным оттенком
    const baseColor = flower.color;
    this.ctx.fillStyle = `rgba(255, 50, 50, ${flower.opacity * 0.7})`;
    
  } else {
        if (flower.isBlooming || flower.state !== 'recovering') {
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
            }    }
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
    // Основное тело пчелы
    this.ctx.fillStyle = bee.status === 'attacking-bear' ? '#FF4500' : '#FFD700';
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
    
    // Синяя метка для разведчиков
    if (bee.isScout) {
      this.ctx.fillStyle = '#3498db';
      this.ctx.beginPath();
      this.ctx.arc(
        bee.position.x, 
        bee.position.y - 12, // Смещаем метку выше тела пчелы
        4, // Размер метки
        0, 
        Math.PI * 2
      );
      this.ctx.fill();
      
    }
    
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
        
  // Полоса здоровья
  const healthWidth = 60;
  const healthHeight = 8;
  const healthX = this.bear.position.x - healthWidth / 2;
  const healthY = this.bear.position.y - 50;
  
  // Фон полосы здоровья
  this.ctx.fillStyle = '#555';
  this.ctx.fillRect(healthX, healthY, healthWidth, healthHeight);
  
  // Текущее здоровье (ограничиваем минимальное значение 0)
  const healthPercent = Math.max(0, this.bear.health / this.bear.maxHealth);
  const currentHealthWidth = healthWidth * healthPercent;
  
  // Основная полоса здоровья
  this.ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : 
                       healthPercent > 0.25 ? '#FFC107' : '#F44336';
  this.ctx.fillRect(healthX, healthY, currentHealthWidth, healthHeight);
  
  // Рамка
  this.ctx.strokeStyle = '#000';
  this.ctx.lineWidth = 1;
  this.ctx.strokeRect(healthX, healthY, healthWidth, healthHeight);
  
  // Добавляем текст с процентами здоровья
  this.ctx.fillStyle = '#000';
  this.ctx.font = '10px Arial';
  this.ctx.textAlign = 'center';
  this.ctx.fillText(
    `${Math.round(healthPercent * 100)}%`,
    this.bear.position.x,
    healthY - 5
  );
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