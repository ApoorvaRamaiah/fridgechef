import AsyncStorage from '@react-native-async-storage/async-storage';
import RecipeDetailsScreen from './recipes/[id]';

export default function RecipeListScreen() {
async function fetchRecipes(ingredients: string[]) {
  const saved = await AsyncStorage.getItem('filters');
  const filters = saved ? JSON.parse(saved) : {};

  let dietParam = '';

  if (filters.vegetarian) dietParam = '&diet=vegetarian';
  if (filters.vegan) dietParam = '&diet=vegan';
  if (filters.glutenFree) dietParam = '&intolerances=gluten';
  if (filters.nonVegetarian) dietParam = ''; // non-veg means no restriction (default)

  const url = `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredients}&number=10&apiKey=${process.env.EXPO_PUBLIC_SPOONACULAR_KEY}${dietParam}`;

  const response = await fetch(url);
  return response.json();
}
}

