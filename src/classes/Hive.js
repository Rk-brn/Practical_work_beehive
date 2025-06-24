export default class Hive {
  constructor(name = "Main Hive", maxBees = 10) {
    this.name = name; // имя улья
    this.maxBees = maxBees; // максимальное количество пчёл
    this.bees = []; // список пчёл в улье
    this.honeyStock = 0; // запас мёда
    this.pollenStock = 0; // запас пыльцы
    this.isQueenAlive = true; // состояние матки
    this.health = 100; // здоровье улья (процент)
  }

  // Добавить пчелу в улей
  addBee(bee) {
    if (this.bees.length < this.maxBees && this.isQueenAlive) {
      this.bees.push(bee);
      console.log(`${bee.name} добавлена в улей.`);
    } else {
      console.warn("Невозможно добавить пчелу: улей переполнен или матка мертва.");
    }
  }

  // Собрать мёд из нектара
  produceHoney(amount) {
    const requiredPollen = amount * 2;
    if (this.pollenStock >= requiredPollen) {
      this.honeyStock += amount;
      this.pollenStock -= requiredPollen;
      console.log(`Улей произвёл ${amount} мёда.`);
    } else {
      console.warn("Недостаточно пыльцы для производства мёда.");
    }
  }

  // Проверить уровень здоровья улья
  checkHealth() {
    const beeFactor = this.bees.length / this.maxBees;
    const foodFactor = (this.pollenStock + this.honeyStock) / 100;
    this.health = Math.min(100, Math.round((beeFactor + foodFactor) * 50));
    console.log(`Текущее здоровье улья: ${this.health}%`);
  }

  // Метод для получения статистики
  getStats() {
    return {
      beesCount: this.bees.length,
      honeyStock: this.honeyStock,
      pollenStock: this.pollenStock,
      health: this.health,
      queenStatus: this.isQueenAlive ? "Жива" : "Погибла",
    };
  }

  // Метод вызывается при потере матки
  loseQueen() {
    this.isQueenAlive = false;
    console.error("Матка погибла! Развитие улья остановлено.");
  }
}