import { chromium } from 'playwright';

async function testExport() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('🔍 Navigating to app...');
    await page.goto('http://localhost:5173/membres', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
      console.log('⚠️ Navigation might have timed out, continuing anyway...');
    });

    // Attendre un peu pour le rendu
    await page.waitForTimeout(3000);

    // Prendre une capture d'écran pour voir ce qui est affiché
    await page.screenshot({ path: '/tmp/membres_page.png' });
    console.log('📸 Capture d\'écran sauvegardée: /tmp/membres_page.png');

    // Vérifier si le bouton Exporter est présent
    const exportButton = await page.$('button:has-text("Exporter")');
    if (exportButton) {
      console.log('✅ Bouton Exporter trouvé');
      const isVisible = await exportButton.isVisible().catch(() => false);
      console.log(isVisible ? '✅ Bouton Exporter est visible' : '❌ Bouton Exporter n\'est pas visible');

      // Obtenir le contenu de la page
      const content = await page.content();
      if (content.includes('Exporter')) {
        console.log('✅ Texte "Exporter" trouvé dans le HTML');
      }
      if (content.includes('CSV')) {
        console.log('✅ Texte "CSV" trouvé dans le HTML');
      }
      if (content.includes('Excel')) {
        console.log('✅ Texte "Excel" trouvé dans le HTML');
      }
      if (content.includes('PDF')) {
        console.log('✅ Texte "PDF" trouvé dans le HTML');
      }
    } else {
      console.log('⚠️ Bouton Exporter non trouvé via selector - vérification du HTML...');
      const content = await page.content();
      if (content.includes('Download')) {
        console.log('✅ Icône Download trouvée dans le HTML');
      }
      if (content.includes('Exporter')) {
        console.log('✅ Texte "Exporter" trouvé dans le HTML');
      }
      if (content.includes('handleExport')) {
        console.log('⚠️ Fonction handleExport est dans le code compilé');
      }
    }

    // Vérifier les imports de dépendances
    if (await page.evaluate(() => typeof window.XLSX !== 'undefined')) {
      console.log('✅ XLSX (xlsx) est disponible dans la page');
    }

    console.log('\n✅ Vérifications complétées');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await browser.close();
  }
}

testExport();
