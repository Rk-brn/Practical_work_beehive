export default class Bee {
  constructor(name) {
    this.name = name;
    this.pollen = 0;
  }

  collectPollen(amount) {
    this.pollen += amount;
    console.log(`🐝 ${this.name} собрала ${amount} пыльцы`);
  }
}