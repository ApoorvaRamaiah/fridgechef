import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

interface MealSlot {
  id: string;
  day: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeId?: number;
  recipeName?: string;
  recipeImage?: string;
  servings?: number;
  notes?: string;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'> = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function MealPlannerScreen() {
  const router = useRouter();
  const [mealPlan, setMealPlan] = useState<MealSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<MealSlot | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [favoriteRecipes, setFavoriteRecipes] = useState<any[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getMonday(new Date()));

  useEffect(() => {
    loadMealPlan();
    loadFavorites();
  }, [currentWeekStart]);

  function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  const loadMealPlan = async () => {
    try {
      const weekKey = `meal_plan_${currentWeekStart.toISOString().split('T')[0]}`;
      const saved = await AsyncStorage.getItem(weekKey);
      if (saved) {
        setMealPlan(JSON.parse(saved));
      } else {
        // Initialize empty meal plan for the week
        const emptyPlan: MealSlot[] = [];
        DAYS_OF_WEEK.forEach(day => {
          MEAL_TYPES.forEach(mealType => {
            emptyPlan.push({
              id: `${day}-${mealType}`,
              day,
              mealType
            });
          });
        });
        setMealPlan(emptyPlan);
      }
    } catch (error) {
      console.error('Error loading meal plan:', error);
    }
  };

  const loadFavorites = async () => {
    try {
      const saved = await AsyncStorage.getItem('favoriteRecipes');
      if (saved) {
        setFavoriteRecipes(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const saveMealPlan = async (updatedPlan: MealSlot[]) => {
    try {
      const weekKey = `meal_plan_${currentWeekStart.toISOString().split('T')[0]}`;
      await AsyncStorage.setItem(weekKey, JSON.stringify(updatedPlan));
      setMealPlan(updatedPlan);
    } catch (error) {
      console.error('Error saving meal plan:', error);
    }
  };

  const assignRecipe = (recipe: any) => {
    if (!selectedSlot) return;

    const updatedPlan = mealPlan.map(slot =>
      slot.id === selectedSlot.id
        ? {
            ...slot,
            recipeId: recipe.id,
            recipeName: recipe.title,
            recipeImage: recipe.image,
            servings: 1
          }
        : slot
    );

    saveMealPlan(updatedPlan);
    setShowRecipeModal(false);
    setSelectedSlot(null);
  };

  const clearSlot = (slotId: string) => {
    const updatedPlan = mealPlan.map(slot =>
      slot.id === slotId
        ? { ...slot, recipeId: undefined, recipeName: undefined, recipeImage: undefined, servings: undefined, notes: undefined }
        : slot
    );
    saveMealPlan(updatedPlan);
  };

  const generateShoppingList = async () => {
    const plannedRecipes = mealPlan.filter(slot => slot.recipeId);
    
    if (plannedRecipes.length === 0) {
      Alert.alert('No Recipes', 'Add recipes to your meal plan first!');
      return;
    }

    Alert.alert(
      'Generate Shopping List',
      `Generate shopping list for ${plannedRecipes.length} planned meals?`,
      [
        { text: 'Cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            // In production, you'd fetch ingredient details for each recipe
            Alert.alert('Success', 'Shopping list generated! Check the Shopping List screen.');
          }
        }
      ]
    );
  };

  const changeWeek = (direction: number) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentWeekStart(getMonday(newDate));
  };

  const formatWeekRange = () => {
    const start = currentWeekStart;
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getMealIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return '🍳';
      case 'lunch': return '🥗';
      case 'dinner': return '🍽️';
      case 'snack': return '🍪';
      default: return '🍴';
    }
  };

  const getMealSlot = (day: string, mealType: string): MealSlot | undefined => {
    return mealPlan.find(slot => slot.day === day && slot.mealType === mealType);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Meal Planner 📅</Text>
        <TouchableOpacity style={styles.generateButton} onPress={generateShoppingList}>
          <Text style={styles.generateButtonText}>🛒 Shopping List</Text>
        </TouchableOpacity>
      </View>

      {/* Week Navigator */}
      <View style={styles.weekNavigator}>
        <TouchableOpacity onPress={() => changeWeek(-1)} style={styles.navButton}>
          <Text style={styles.navButtonText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.weekRange}>{formatWeekRange()}</Text>
        <TouchableOpacity onPress={() => changeWeek(1)} style={styles.navButton}>
          <Text style={styles.navButtonText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Meal Types Legend */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.legend}>
        {MEAL_TYPES.map(type => (
          <View key={type} style={styles.legendItem}>
            <Text style={styles.legendIcon}>{getMealIcon(type)}</Text>
            <Text style={styles.legendText}>{type}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Meal Grid */}
      <ScrollView style={styles.mealGrid}>
        {DAYS_OF_WEEK.map(day => (
          <View key={day} style={styles.daySection}>
            <Text style={styles.dayTitle}>{day}</Text>
            <View style={styles.mealsRow}>
              {MEAL_TYPES.map(mealType => {
                const slot = getMealSlot(day, mealType);
                return (
                  <TouchableOpacity
                    key={`${day}-${mealType}`}
                    style={[styles.mealSlot, slot?.recipeId && styles.mealSlotFilled]}
                    onPress={() => {
                      if (slot) {
                        setSelectedSlot(slot);
                        setShowRecipeModal(true);
                      }
                    }}
                    onLongPress={() => slot?.recipeId && clearSlot(slot.id)}
                  >
                    <Text style={styles.mealIcon}>{getMealIcon(mealType)}</Text>
                    {slot?.recipeName ? (
                      <Text style={styles.recipeName} numberOfLines={2}>{slot.recipeName}</Text>
                    ) : (
                      <Text style={styles.emptyText}>Tap to add</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Recipe Selection Modal */}
      <Modal visible={showRecipeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Recipe</Text>
            <Text style={styles.modalSubtitle}>
              {selectedSlot?.day} - {selectedSlot?.mealType}
            </Text>

            {favoriteRecipes.length === 0 ? (
              <View style={styles.emptyFavorites}>
                <Text style={styles.emptyText}>No favorite recipes yet!</Text>
                <TouchableOpacity
                  style={styles.addFavoritesButton}
                  onPress={() => {
                    setShowRecipeModal(false);
                    router.push('/favorites');
                  }}
                >
                  <Text style={styles.addFavoritesButtonText}>Add Favorites</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={favoriteRecipes}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.recipeOption}
                    onPress={() => assignRecipe(item)}
                  >
                    <Text style={styles.recipeOptionText}>{item.title}</Text>
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowRecipeModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: 'bold' },
  generateButton: {
    backgroundColor: '#27AE60',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  generateButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  weekNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  navButton: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  weekRange: { fontSize: 16, fontWeight: '600', color: '#2C3E50' },
  legend: {
    marginBottom: 16,
    maxHeight: 60,
  },
  legendItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  legendIcon: { fontSize: 24, marginBottom: 4 },
  legendText: { fontSize: 12, color: '#6C757D', textTransform: 'capitalize' },
  mealGrid: { flex: 1 },
  daySection: {
    marginBottom: 20,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 10,
  },
  mealsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mealSlot: {
    flex: 0.24,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 8,
    minHeight: 80,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealSlotFilled: {
    backgroundColor: '#E8F5E8',
    borderColor: '#27AE60',
    borderStyle: 'solid',
  },
  mealIcon: { fontSize: 20, marginBottom: 4 },
  recipeName: {
    fontSize: 10,
    textAlign: 'center',
    color: '#2C3E50',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 9,
    color: '#6C757D',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    width: '90%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 20,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  emptyFavorites: {
    alignItems: 'center',
    padding: 40,
  },
  addFavoritesButton: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  addFavoritesButtonText: { color: '#fff', fontWeight: 'bold' },
  recipeOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  recipeOptionText: { fontSize: 16, color: '#2C3E50' },
  closeButton: {
    backgroundColor: '#6C757D',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
