import { getRecipe } from '../../src/core/recipes';
import { RECIPE_IDS } from '../../src/core/recipes/ids';
import { getRecipeOptions } from '../../src/core/recipes/options';
import { registerRecipe } from '../../src/core/recipes/store';
import { PRESETS } from '../../src/presets';
import { registerPreset } from '../../src/presets/store';

RECIPE_IDS.forEach((id) => registerRecipe(id, { run: getRecipe(id), options: getRecipeOptions(id) }));
PRESETS.forEach(registerPreset);
