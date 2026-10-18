
import db from "./database.js";
import { indexPerson } from "./candidateSearch.js";

const people = db.prepare(`
  SELECT id, name
  FROM people
`).all();

let indexedPeople = 0;
let totalEntries = 0;

for (const person of people) {
  const count = indexPerson(person.id, person.name);

  if (count > 0) {
    indexedPeople++;
    totalEntries += count;
  }
}

console.log("People checked:", people.length);
console.log("People indexed:", indexedPeople);
console.log("Phonetic entries:", totalEntries);
