import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, Alert } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FavoriteRecipe {
  id: string;
  title: string;
  image: string;
}

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    try {
      const saved = await AsyncStorage.getItem('favoriteRecipes');
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh favorites when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  const removeFavorite = async (recipeId: string) => {
    Alert.alert(
      "Remove Favorite",
      "Are you sure you want to remove this recipe from favorites?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const updatedFavorites = favorites.filter(fav => fav.id !== recipeId);
            setFavorites(updatedFavorites);
            await AsyncStorage.setItem('favoriteRecipes', JSON.stringify(updatedFavorites));
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading favorites...</Text>
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No favorite recipes yet!</Text>
        <Text style={styles.emptySubtext}>
          Browse recipes and tap the heart icon to save your favorites
        </Text>
        <TouchableOpacity 
          style={styles.browseButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.browseButtonText}>Browse Recipes</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Favorite Recipes ❤️</Text>

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardContent}
              onPress={() => router.push(`/recipes/${item.id}`)}
            >
              <Image source={{ uri: item.image }} style={styles.image} />
              <Text style={styles.recipeTitle}>{item.title}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeFavorite(item.id)}
            >
              <Text style={styles.removeText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  emptyText: { fontSize: 18, fontWeight: "600", marginBottom: 10, color: "#666" },
  emptySubtext: { fontSize: 14, color: "#999", textAlign: "center", marginBottom: 30 },
  browseButton: {
    backgroundColor: "#27AE60",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    backgroundColor: "#FAFAFA",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  recipeTitle: { fontSize: 16, marginLeft: 12, flexShrink: 1, fontWeight: "500" },
  image: { width: 60, height: 60, borderRadius: 8 },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  removeText: { fontSize: 18 },
});
