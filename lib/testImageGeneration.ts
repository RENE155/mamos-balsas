/**
 * Testavimo pagalbinės funkcijos paveikslėlių generavimui
 * Paleiskite jas, kad patikrintumėte veikėjų nuoseklumą prieš įjungdami pilną generavimą
 */

import { extractCharacters, analyzeScenes, buildImagePrompt, generateImage } from './imageGeneration';
import type { CharacterDescription, Scene } from '@/types';

// Testinė pasaka lietuvių kalba
const TEST_STORY = `
Mažasis meškiukas Tedis gyveno jaukiame namelyje giliai miške. Tedis turėjo švelnų, šiltą rudą kailį ir mažas apvalias ausis. Jo akys buvo tamsiai rudos, kaip medaus lašeliai, o nosytė - maža ir juoda. Tedis visada nešiojo mėlyną megztinį su baltomis žvaigždutėmis.

Vieną vakarą Tedis išgirdo tylų beldimą į duris. Tai buvo jo geriausia draugė - pelytė Lilė. Lilė buvo maža pilka pelytė su rožinėmis ausytėmis ir ilga plona uodegėle. Ji nešiojo mažytį raudoną kaspinėlį ant galvos.

"Tedi, žiūrėk!" - sušuko Lilė. "Danguje tiek daug žvaigždžių!"

Tedis ir Lilė kartu išėjo į lauką. Jie atsisėdo ant minkštos žolės ir žiūrėjo į žvaigždėtą dangų. Mėnulis švietė sidabriniu šviesiu, o žvaigždės mirksėjo kaip maži deimantai.

"Labanakt, žvaigždutės," - tyliai pasakė Tedis.
"Labanakt, mėnuli," - pridūrė Lilė.

Abu draugai grįžo į jaukų namelį ir užmigo saldžiu miegu.
`;

export interface TestResult {
  success: boolean;
  characters?: CharacterDescription[];
  scenes?: Scene[];
  images?: Array<{ base64: string; prompt: string }>;
  error?: string;
  costs?: {
    characterExtraction: string;
    sceneAnalysis: string;
    imageGeneration: string;
    total: string;
  };
}

/**
 * 1 testo žingsnis: veikėjų išgavimas
 * Tai turėtų išgauti Tedį (mešką) ir Lilę (pelę) su išsamiais aprašymais
 */
export async function testCharacterExtraction(): Promise<{
  success: boolean;
  characters?: CharacterDescription[];
  error?: string;
}> {
  console.log('\n=== TEST: Character Extraction ===\n');
  console.log('Input story:', TEST_STORY.substring(0, 200) + '...\n');

  try {
    const characters = await extractCharacters(TEST_STORY);

    console.log('Extracted characters:');
    characters.forEach((char, i) => {
      console.log(`\n${i + 1}. ${char.name} (${char.type})`);
      console.log(`   Color: ${char.appearance.mainColor}`);
      console.log(`   Size: ${char.appearance.size}`);
      console.log(`   Eyes: ${char.appearance.eyes}`);
      console.log(`   Features: ${char.appearance.distinctiveFeatures.join(', ')}`);
      if (char.clothing) {
        console.log(`   Clothing: ${char.clothing.color} ${char.clothing.item}`);
      }
    });

    const hasTedis = characters.some(c => c.name.toLowerCase().includes('tedis'));
    const hasLile = characters.some(c => c.name.toLowerCase().includes('lil'));

    if (!hasTedis || !hasLile) {
      console.log('\n⚠️ Warning: Not all expected characters found');
    } else {
      console.log('\n✅ Both main characters extracted successfully');
    }

    return { success: true, characters };
  } catch (error) {
    console.error('❌ Character extraction failed:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 2 testo žingsnis: scenų analizė
 * Tai turėtų suskaidyti pasaką į 2 scenas testavimui
 */
export async function testSceneAnalysis(
  characters?: CharacterDescription[]
): Promise<{
  success: boolean;
  scenes?: Scene[];
  error?: string;
}> {
  console.log('\n=== TEST: Scene Analysis ===\n');

  try {
    // Gauti veikėjus, jei jie nepateikti
    const chars = characters || (await extractCharacters(TEST_STORY));

    // Analizuoti tik 2 scenas (testavimui)
    const scenes = await analyzeScenes(TEST_STORY, 2, chars);

    console.log(`Found ${scenes.length} scenes:\n`);
    scenes.forEach((scene, i) => {
      console.log(`Scene ${i + 1}:`);
      console.log(`  Characters: ${scene.characters.join(', ')}`);
      console.log(`  Mood: ${scene.mood}`);
      console.log(`  Description: ${scene.visualDescription.substring(0, 100)}...`);
      console.log('');
    });

    if (scenes.length >= 2) {
      console.log('✅ Scene analysis successful');
    } else {
      console.log('⚠️ Warning: Expected 2 scenes, got', scenes.length);
    }

    return { success: true, scenes };
  } catch (error) {
    console.error('❌ Scene analysis failed:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 3 testo žingsnis: sugeneruoti 2 testinius paveikslėlius
 * Tai patikrina veikėjų nuoseklumą tarp paveikslėlių
 * Kaina: ~$0.022 (2 paveikslėliai žemos kokybės su gpt-image-1)
 */
export async function testImageGeneration(
  characters?: CharacterDescription[],
  scenes?: Scene[]
): Promise<{
  success: boolean;
  images?: Array<{ base64: string; prompt: string }>;
  error?: string;
}> {
  console.log('\n=== TEST: Image Generation (2 images) ===\n');
  console.log('⚠️ This will cost approximately $0.022 (gpt-image-1)\n');

  try {
    // Gauti veikėjus ir scenas, jei jie nepateikti
    const chars = characters || (await extractCharacters(TEST_STORY));
    const scns = scenes || (await analyzeScenes(TEST_STORY, 2, chars));

    const images: Array<{ base64: string; prompt: string }> = [];

    for (let i = 0; i < Math.min(2, scns.length); i++) {
      const scene = scns[i];
      const prompt = buildImagePrompt(scene, chars, 'watercolor');

      console.log(`Generating image ${i + 1}/2...`);
      console.log(`Prompt preview: ${prompt.substring(0, 150)}...`);

      const { base64 } = await generateImage(prompt, 'low');

      images.push({ base64, prompt });
      console.log(`✅ Image ${i + 1} generated (${base64.length} bytes base64)\n`);
    }

    console.log('\n✅ Test images generated successfully');
    console.log('Check the images to verify character consistency:');
    console.log('- Tedis should look the same in both images (brown bear, blue sweater)');
    console.log('- Lilė should look the same (grey mouse, red bow)');

    return { success: true, images };
  } catch (error) {
    console.error('❌ Image generation failed:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Paleisti visus testus iš eilės
 * Bendra kaina: ~$0.025 (teksto analizė + 2 paveikslėliai)
 */
export async function runAllTests(): Promise<TestResult> {
  console.log('\n🧪 Starting Image Generation Tests\n');
  console.log('================================\n');

  try {
    // 1 testas: veikėjų išgavimas
    const charResult = await testCharacterExtraction();
    if (!charResult.success) {
      return { success: false, error: 'Character extraction failed: ' + charResult.error };
    }

    // 2 testas: scenų analizė
    const sceneResult = await testSceneAnalysis(charResult.characters);
    if (!sceneResult.success) {
      return { success: false, error: 'Scene analysis failed: ' + sceneResult.error };
    }

    // 3 testas: paveikslėlių generavimas (tai kainuoja pinigų)
    const imageResult = await testImageGeneration(charResult.characters, sceneResult.scenes);
    if (!imageResult.success) {
      return { success: false, error: 'Image generation failed: ' + imageResult.error };
    }

    console.log('\n================================');
    console.log('🎉 All tests passed!\n');
    console.log('Estimated costs:');
    console.log('  - Character extraction: ~$0.001');
    console.log('  - Scene analysis: ~$0.001');
    console.log('  - 2 images (gpt-image-1 low): ~$0.022');
    console.log('  - Total: ~$0.024\n');

    return {
      success: true,
      characters: charResult.characters,
      scenes: sceneResult.scenes,
      images: imageResult.images,
      costs: {
        characterExtraction: '$0.001',
        sceneAnalysis: '$0.001',
        imageGeneration: '$0.022',
        total: '$0.024',
      },
    };
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Greitas testas tik veikėjų išgavimui (jokių išlaidų paveikslėliams)
 */
export async function quickTest(): Promise<{ success: boolean; message: string }> {
  console.log('\n🧪 Quick Test (Character Extraction Only)\n');

  try {
    const result = await testCharacterExtraction();

    if (result.success && result.characters && result.characters.length >= 2) {
      return {
        success: true,
        message: `Found ${result.characters.length} characters: ${result.characters.map(c => c.name).join(', ')}`,
      };
    }

    return {
      success: false,
      message: 'Character extraction did not find expected characters',
    };
  } catch (error) {
    return {
      success: false,
      message: String(error),
    };
  }
}
