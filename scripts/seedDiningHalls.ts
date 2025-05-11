import { db } from '../firebase';
import { collection, setDoc, doc } from 'firebase/firestore';

const halls = [
  { name: 'Arrillaga Family Dining Commons', order: 1 },
  { name: 'Lakeside Dining', order: 2 },
  { name: 'Wilbur Dining', order: 3 },
  { name: 'Stern Dining', order: 4 },
  { name: 'Branner Dining', order: 5 },
  { name: 'Gerhard Casper Dining Commons', order: 6 },
  { name: 'Florence Moore Dining', order: 7 },
  { name: 'EVGR Dining', order: 8 },
  { name: 'Ricker Dining', order: 9 },
  { name: 'Suites Dining', order: 10 },
  { name: 'Yost, Murray, EAST Dining', order: 11 },
  { name: 'Row (Self-Op) Dining', order: 12 },
  { name: 'Co-Op Dining', order: 13 },
];

async function seedStanfordDiningHalls() {
  for (const hall of halls) {
    const ref = doc(collection(db, 'diningHalls'));
    await setDoc(ref, { name: hall.name, order: hall.order });
  }
  console.log('Stanford dining halls seeded!');
}

seedStanfordDiningHalls().catch((e) => {
  console.error('Seeding failed:', e);
  process.exit(1);
}); 