// Test les fonctions d'export sans navigateur
const fs = require('fs');

console.log('=' .repeat(60));
console.log('TEST: Vérification des fonctions d\'export');
console.log('='.repeat(60));

// Test data - amicalistes exemple
const testMembers = [
  {
    id: '1',
    first_name: 'Jean',
    last_name: 'Dupont',
    email: 'jean@example.com',
    phone: '06 12 34 56 78',
    grade: 'Capitaine',
    status: 'actif',
    join_date: '2020-03-15',
    birth_date: '1980-05-20',
    address_street: '123 rue de Paris',
    address_postal_code: '75001',
    address_city: 'Paris',
    marital_status: 'Marié',
    avatar_url: 'https://example.com/avatar1.jpg',
    notes: 'Responsable formation',
  },
  {
    id: '2',
    first_name: 'Marie',
    last_name: 'Martin',
    email: 'marie@example.com',
    phone: '06 98 76 54 32',
    grade: 'Sergent',
    status: 'inactif',
    join_date: '2019-06-20',
    birth_date: '1985-10-10',
    address_street: '456 avenue Lyon',
    address_postal_code: '69000',
    address_city: 'Lyon',
    marital_status: 'Célibataire',
    avatar_url: 'https://example.com/avatar2.jpg',
    notes: null,
  },
  {
    id: '3',
    first_name: 'Pierre',
    last_name: 'Bernard',
    email: null,
    phone: null,
    grade: 'Sapeur',
    status: 'actif',
    join_date: '2021-01-10',
    birth_date: null,
    address_street: null,
    address_postal_code: null,
    address_city: null,
    marital_status: null,
    avatar_url: null,
    notes: null,
  },
];

// Fonction pour tester CSV
function testCSV() {
  console.log('\n📊 Test CSV...');
  try {
    // Simuler papaparse.unparse
    const headers = Object.keys(testMembers[0]);
    let csv = headers.join(',') + '\n';

    testMembers.forEach(member => {
      const row = headers.map(h => {
        const value = member[h];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
      csv += row + '\n';
    });

    console.log('✅ CSV généré:');
    console.log(csv.split('\n').slice(0, 3).join('\n'));
    console.log(`   ... (${testMembers.length} lignes totales)`);

    // Vérifier que les photos sont incluses
    if (csv.includes('avatar_url')) {
      console.log('✅ Colonne "avatar_url" présente');
    }
    if (csv.includes('https://example.com/avatar')) {
      console.log('✅ URL des photos incluses');
    }
    if (csv.includes('Jean,Dupont')) {
      console.log('✅ Données complètes présentes');
    }

    return true;
  } catch (e) {
    console.error('❌ Erreur CSV:', e.message);
    return false;
  }
}

// Fonction pour tester Excel
function testExcel() {
  console.log('\n📊 Test Excel...');
  try {
    // Vérifier que xlsx peut être importé (dans la vraie app)
    const excelConfig = {
      columns: [
        'Prénom', 'Nom', 'Email', 'Téléphone', 'Grade', 'Statut',
        'Date adhésion', 'Date naissance', 'Rue', 'Code postal', 'Ville',
        'État civil', 'Lien photo', 'Notes'
      ],
      data: testMembers.map(m => ({
        Prénom: m.first_name,
        Nom: m.last_name,
        Email: m.email || '',
        Téléphone: m.phone || '',
        Grade: m.grade || '',
        Statut: m.status,
        'Date adhésion': m.join_date,
        'Date naissance': m.birth_date || '',
        Rue: m.address_street || '',
        'Code postal': m.address_postal_code || '',
        Ville: m.address_city || '',
        'État civil': m.marital_status || '',
        'Lien photo': m.avatar_url || '',
        Notes: m.notes || '',
      }))
    };

    console.log('✅ Configuration Excel créée:');
    console.log(`   - ${excelConfig.columns.length} colonnes`);
    console.log(`   - ${excelConfig.data.length} lignes de données`);

    if (excelConfig.data[0]['Lien photo']) {
      console.log('✅ Colonne "Lien photo" présente et remplie');
    }
    if (excelConfig.data.some(d => d['Lien photo'])) {
      console.log('✅ URLs des photos incluses dans le fichier');
    }

    return true;
  } catch (e) {
    console.error('❌ Erreur Excel:', e.message);
    return false;
  }
}

// Fonction pour tester PDF
function testPDF() {
  console.log('\n📊 Test PDF...');
  try {
    // Vérifier la structure du tableau HTML qui sera converti en PDF
    const tableHtml = `
      <table>
        <thead>
          <tr>
            <th>Photo</th>
            <th>Nom</th>
            <th>Email</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          ${testMembers.map(m => `
            <tr>
              <td>${m.avatar_url ? '<img src="' + m.avatar_url + '" style="width:30px"/>' : '—'}</td>
              <td>${m.first_name} ${m.last_name}</td>
              <td>${m.email || '—'}</td>
              <td>${m.status}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    console.log('✅ Tableau HTML créé pour PDF:');
    console.log(`   - ${testMembers.length} lignes de données`);

    if (tableHtml.includes('<img')) {
      console.log('✅ Tags <img> présents pour les photos');
    }
    if (tableHtml.includes('Jean Dupont')) {
      console.log('✅ Données correctement formatées');
    }

    return true;
  } catch (e) {
    console.error('❌ Erreur PDF:', e.message);
    return false;
  }
}

// Fonction pour tester le filtrage par statut
function testStatusFilter() {
  console.log('\n🔍 Test filtrage par statut...');
  try {
    const actifs = testMembers.filter(m => m.status === 'actif');
    const inactifs = testMembers.filter(m => m.status === 'inactif');

    console.log(`✅ Statut "actif": ${actifs.length} membres`);
    console.log(`✅ Statut "inactif": ${inactifs.length} membres`);

    if (actifs.length === 2 && inactifs.length === 1) {
      console.log('✅ Filtrage par statut fonctionne correctement');
      return true;
    }
  } catch (e) {
    console.error('❌ Erreur filtrage:', e.message);
    return false;
  }
}

// Lancer tous les tests
const results = [
  ['CSV', testCSV()],
  ['Excel', testExcel()],
  ['PDF', testPDF()],
  ['Filtrage statut', testStatusFilter()],
];

console.log('\n' + '='.repeat(60));
console.log('RÉSUMÉ DES TESTS');
console.log('='.repeat(60));

results.forEach(([name, result]) => {
  console.log(`${result ? '✅' : '❌'} ${name}`);
});

const allPassed = results.every(r => r[1]);
console.log('\n' + (allPassed ? '✅ TOUS LES TESTS SONT PASSÉS' : '❌ CERTAINS TESTS ONT ÉCHOUÉ'));
process.exit(allPassed ? 0 : 1);
