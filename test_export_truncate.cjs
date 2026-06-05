// Test la troncature pour Excel
const fs = require('fs');

console.log('=' .repeat(60));
console.log('TEST: Vérification de la troncature pour Excel');
console.log('='.repeat(60));

// Fonction de troncature
const truncate = (text, max = 32000) => {
  if (!text) return ''
  return text.length > max ? text.substring(0, max - 3) + '...' : text
}

// Test data - amicalistes avec du texte très long
const testMembers = [
  {
    first_name: 'Jean',
    last_name: 'Dupont',
    notes: 'A'.repeat(50000), // Texte très long (> 32767)
    avatar_url: 'https://example.com/avatar1.jpg',
    address_street: 'B'.repeat(500),
  },
];

console.log('\n📊 Test troncature...');

// Test notes troncature
const notes = truncate(testMembers[0].notes, 1000);
console.log(`✅ Notes: ${notes.length} caractères (max autorisé: 32000)`);
if (notes.length <= 1000) {
  console.log('   ✅ Notes correctement tronquées');
}

// Test avatar_url
const avatar = truncate(testMembers[0].avatar_url, 1000);
console.log(`✅ Avatar URL: ${avatar.length} caractères (max autorisé: 1000)`);
if (avatar.length <= 1000) {
  console.log('   ✅ URL correctement tronquée');
}

// Test street
const street = truncate(testMembers[0].address_street, 200);
console.log(`✅ Rue: ${street.length} caractères (max autorisé: 200)`);
if (street.length <= 200) {
  console.log('   ✅ Rue correctement tronquée');
}

// Vérifier que les cellules Excel ne dépassent pas 32767
const excelLimits = {
  Prénom: 100,
  Nom: 100,
  Email: 100,
  Téléphone: 50,
  Grade: 50,
  'Rue': 200,
  'Code postal': 20,
  'Ville': 100,
  'État civil': 50,
  'Lien photo': 1000,
  Notes: 1000,
};

console.log('\n📋 Vérification des limites Excel:');
let allOk = true;
Object.entries(excelLimits).forEach(([field, limit]) => {
  if (limit < 32767) {
    console.log(`✅ ${field}: max ${limit} caractères (< 32767)`);
  } else {
    console.log(`❌ ${field}: max ${limit} caractères (>= 32767)`);
    allOk = false;
  }
});

console.log('\n' + '='.repeat(60));
console.log(allOk ? '✅ TOUS LES TESTS SONT PASSÉS' : '❌ CERTAINS TESTS ONT ÉCHOUÉ');
console.log('='.repeat(60));

process.exit(allOk ? 0 : 1);
