import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Image, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RecipeDetailsScreen() {
  const { id } = useLocalSearchParams(); // dynamic route param
  const router = useRouter();
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [missingIngredients, setMissingIngredients] = useState<string[]>([]);

  useEffect(() => {
    const fetchRecipeDetails = async () => {
      try {
        const url = `https://api.spoonacular.com/recipes/${id}/information?apiKey=${process.env.EXPO_PUBLIC_SPOONACULAR_KEY}`;
        console.log("Fetching details:", url);

        const response = await fetch(url);
        const data = await response.json();
        setRecipe(data);
        
        // Check if recipe is in favorites
        const savedFavorites = await AsyncStorage.getItem('favoriteRecipes');
        if (savedFavorites) {
          const favorites = JSON.parse(savedFavorites);
          setIsFavorite(favorites.some((fav: any) => fav.id === id));
        }
        
        // Check for missing ingredients
        const savedIngredients = await AsyncStorage.getItem('fridgeIngredients');
        if (savedIngredients && data.extendedIngredients) {
          const fridgeIngredients = JSON.parse(savedIngredients);
          const missing = data.extendedIngredients.filter((ing: any) => 
            !fridgeIngredients.some((fridgeIng: string) => 
              ing.name.toLowerCase().includes(fridgeIng.toLowerCase())
            )
          ).map((ing: any) => ing.name);
          setMissingIngredients(missing);
        }
      } catch (err) {
        console.error("Error fetching recipe details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipeDetails();
  }, [id]);
  
  const toggleFavorite = async () => {
    try {
      const savedFavorites = await AsyncStorage.getItem('favoriteRecipes');
      let favorites = savedFavorites ? JSON.parse(savedFavorites) : [];
      
      if (isFavorite) {
        // Remove from favorites
        favorites = favorites.filter((fav: any) => fav.id !== id);
        setIsFavorite(false);
      } else {
        // Add to favorites
        favorites.push({
          id: recipe.id,
          title: recipe.title,
          image: recipe.image
        });
        setIsFavorite(true);
      }
      
      await AsyncStorage.setItem('favoriteRecipes', JSON.stringify(favorites));
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };
  
  const orderMissingIngredients = () => {
    if (missingIngredients.length === 0) return;
    
    // Navigate to grocery ordering screen with missing ingredients
    router.push(`/grocery-order?missingIngredients=${missingIngredients.join(',')}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#27AE60" />
        <Text>Loading recipe...</Text>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.center}>
        <Text>No recipe details found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{recipe.title}</Text>
        <TouchableOpacity onPress={toggleFavorite} style={styles.favoriteButton}>
          <Text style={styles.favoriteIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>
      
      <Image source={{ uri: recipe.image }} style={styles.image} />
      
      {/* Recipe Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.stat}>⏱️ {recipe.readyInMinutes || 'N/A'} min</Text>
        <Text style={styles.stat}>👥 {recipe.servings || 'N/A'} servings</Text>
        <Text style={styles.stat}>💚 {recipe.healthScore || 'N/A'}/100</Text>
      </View>

      <Text style={styles.subtitle}>🍴 Ingredients:</Text>
      {recipe.extendedIngredients?.map((ing: any, idx: number) => (
        <Text key={idx} style={styles.ingredient}>- {ing.original}</Text>
      ))}
      
      {/* Missing Ingredients Section */}
      {missingIngredients.length > 0 && (
        <View style={styles.missingSection}>
          <Text style={styles.missingTitle}>🛒 Missing Ingredients:</Text>
          {missingIngredients.map((ing, idx) => (
            <Text key={idx} style={styles.missingIngredient}>• {ing}</Text>
          ))}
          <TouchableOpacity style={styles.orderButton} onPress={orderMissingIngredients}>
            <Text style={styles.orderButtonText}>🚚 Order Missing Items (10-30 min delivery)</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.subtitle}>👨‍🍳 Instructions:</Text>
      <Text style={styles.instructions}>
        {recipe.instructions
          ? recipe.instructions.replace(/<[^>]+>/g, "") // remove HTML tags
          : "No instructions provided"}
      </Text>
      
      {/* Nutrition Information */}
      {recipe.nutrition && (
        <View style={styles.nutritionSection}>
          <Text style={styles.subtitle}>🥗 Nutrition (per serving):</Text>
          <Text>Calories: {recipe.nutrition.nutrients?.find((n: any) => n.name === 'Calories')?.amount || 'N/A'}</Text>
          <Text>Protein: {recipe.nutrition.nutrients?.find((n: any) => n.name === 'Protein')?.amount || 'N/A'}g</Text>
          <Text>Carbs: {recipe.nutrition.nutrients?.find((n: any) => n.name === 'Carbohydrates')?.amount || 'N/A'}g</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  title: { fontSize: 26, fontWeight: "bold", flex: 1, marginRight: 10 },
  favoriteButton: {
    padding: 8,
  },
  favoriteIcon: { fontSize: 24 },
  subtitle: { fontSize: 20, fontWeight: "600", marginVertical: 15 },
  image: { width: "100%", height: 200, borderRadius: 10, marginVertical: 10 },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#F8F9FA",
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
  },
  stat: { fontSize: 14, fontWeight: "500", color: "#495057" },
  ingredient: { fontSize: 16, marginVertical: 2, paddingLeft: 10 },
  instructions: { fontSize: 16, lineHeight: 24, color: "#495057" },
  missingSection: {
    backgroundColor: "#FFF3CD",
    padding: 15,
    borderRadius: 10,
    marginVertical: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#FFC107",
  },
  missingTitle: { fontSize: 18, fontWeight: "600", marginBottom: 10, color: "#856404" },
  missingIngredient: { fontSize: 14, color: "#856404", marginVertical: 1 },
  orderButton: {
    backgroundColor: "#FF6B35",
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    alignItems: "center",
  },
  orderButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  nutritionSection: {
    backgroundColor: "#E8F5E8",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
});
