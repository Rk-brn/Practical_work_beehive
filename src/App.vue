<script setup>
import Hive from './classes/Hive';
import Bee from './classes/Bee';

// Создаём улей
const hive = new Hive("Мой улей", 5);

// Создаём пчёл
const bee1 = new Bee("Бетти");
const bee2 = new Bee("Алиса");

// Добавляем пчёл в улей
hive.addBee(bee1);
hive.addBee(bee2);


// Получаем статистику
const stats = hive.getStats();
</script>

<template>
  <div class="app">
    <h1>🐝 {{ hive.name }}</h1>
    <div class="hive-stats">
      <p>Пчёл в улье: {{ stats.beesCount }} / {{ hive.maxBees }}</p>
      <p>Мёд: {{ stats.honeyStock }} г</p>
      <p>Пыльца: {{ stats.pollenStock }} г</p>
      <p>Здоровье улья: {{ stats.health }}%</p>
      <p>Матка: {{ stats.queenStatus }}</p>
    </div>
  </div>
</template>

<style scoped>
.app {
  font-family: Arial, sans-serif;
  padding: 2rem;
  background-color: #fffbe6;
  color: #333;
}

.hive-stats {
  background: #f9f9f9;
  border: 1px solid #ddd;
  padding: 1rem;
  border-radius: 8px;
  max-width: 400px;
}
</style>