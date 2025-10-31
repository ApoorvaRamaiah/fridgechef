import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NutritionEntry {
  id: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: number;
}

interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function NutritionTrackerScreen() {
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [goals, setGoals] = useState<DailyGoals>({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 65
  });
  const [newEntry, setNewEntry] = useState<Partial<NutritionEntry>>({
    mealType: 'breakfast',
    recipeName: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [tempGoals, setTempGoals] = useState(goals);

  useEffect(() => {
    loadEntries();
    loadGoals();
  }, [selectedDate]);

  const loadEntries = async () => {
    try {
      const dateKey = selectedDate.toISOString().split('T')[0];
      const stored = await AsyncStorage.getItem(`nutrition_${dateKey}`);
      if (stored) {
        setEntries(JSON.parse(stored));
      } else {
        setEntries([]);
      }
    } catch (error) {
      console.error('Error loading entries:', error);
    }
  };

  const loadGoals = async () => {
    try {
      const stored = await AsyncStorage.getItem('nutrition_goals');
      if (stored) {
        setGoals(JSON.parse(stored));
        setTempGoals(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const saveEntries = async (updatedEntries: NutritionEntry[]) => {
    try {
      const dateKey = selectedDate.toISOString().split('T')[0];
      await AsyncStorage.setItem(`nutrition_${dateKey}`, JSON.stringify(updatedEntries));
      setEntries(updatedEntries);
    } catch (error) {
      console.error('Error saving entries:', error);
    }
  };

  const saveGoals = async () => {
    try {
      await AsyncStorage.setItem('nutrition_goals', JSON.stringify(tempGoals));
      setGoals(tempGoals);
      setShowGoalsModal(false);
      Alert.alert('Success', 'Goals updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save goals');
    }
  };

  const addEntry = () => {
    if (!newEntry.recipeName || !newEntry.calories) {
      Alert.alert('Error', 'Please fill in at least recipe name and calories');
      return;
    }

    const entry: NutritionEntry = {
      id: Date.now().toString(),
      date: selectedDate.toISOString().split('T')[0],
      mealType: newEntry.mealType || 'breakfast',
      recipeName: newEntry.recipeName || '',
      calories: newEntry.calories || 0,
      protein: newEntry.protein || 0,
      carbs: newEntry.carbs || 0,
      fat: newEntry.fat || 0,
      timestamp: Date.now()
    };

    const updated = [...entries, entry];
    saveEntries(updated);
    setNewEntry({
      mealType: 'breakfast',
      recipeName: '',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    });
    setShowAddModal(false);
  };

  const deleteEntry = (entryId: string) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry?',
      [
        { text: 'Cancel' },
        {
          text: 'Delete',
          onPress: () => {
            const updated = entries.filter(e => e.id !== entryId);
            saveEntries(updated);
          },
          style: 'destructive'
        }
      ]
    );
  };

  const getTodayTotals = () => {
    return entries.reduce(
      (totals, entry) => ({
        calories: totals.calories + entry.calories,
        protein: totals.protein + entry.protein,
        carbs: totals.carbs + entry.carbs,
        fat: totals.fat + entry.fat
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  const getProgress = (consumed: number, goal: number) => {
    return Math.min((consumed / goal) * 100, 100);
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const isToday = () => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  };

  const formatDate = () => {
    if (isToday()) return 'Today';
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    return selectedDate.toLocaleDateString('en-US', options);
  };

  const totals = getTodayTotals();
  const entriesByMeal = {
    breakfast: entries.filter(e => e.mealType === 'breakfast'),
    lunch: entries.filter(e => e.mealType === 'lunch'),
    dinner: entries.filter(e => e.mealType === 'dinner'),
    snack: entries.filter(e => e.mealType === 'snack')
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Nutrition Tracker 📊</Text>
        <TouchableOpacity style={styles.goalsButton} onPress={() => setShowGoalsModal(true)}>
          <Text style={styles.goalsButtonText}>⚙️ Goals</Text>
        </TouchableOpacity>
      </View>

      {/* Date Navigator */}
      <View style={styles.dateNavigator}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateButton}>
          <Text style={styles.dateButtonText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.dateText}>{formatDate()}</Text>
        <TouchableOpacity 
          onPress={() => changeDate(1)} 
          style={styles.dateButton}
          disabled={isToday()}
        >
          <Text style={[styles.dateButtonText, isToday() && styles.dateButtonDisabled]}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Daily Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Daily Summary</Text>
        
        {/* Calories */}
        <View style={styles.nutrientRow}>
          <View style={styles.nutrientInfo}>
            <Text style={styles.nutrientLabel}>🔥 Calories</Text>
            <Text style={styles.nutrientValue}>
              {totals.calories} / {goals.calories}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${getProgress(totals.calories, goals.calories)}%`, backgroundColor: '#FF6B6B' }]} />
          </View>
        </View>

        {/* Protein */}
        <View style={styles.nutrientRow}>
          <View style={styles.nutrientInfo}>
            <Text style={styles.nutrientLabel}>🍖 Protein</Text>
            <Text style={styles.nutrientValue}>
              {totals.protein}g / {goals.protein}g
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${getProgress(totals.protein, goals.protein)}%`, backgroundColor: '#4ECDC4' }]} />
          </View>
        </View>

        {/* Carbs */}
        <View style={styles.nutrientRow}>
          <View style={styles.nutrientInfo}>
            <Text style={styles.nutrientLabel}>🌾 Carbs</Text>
            <Text style={styles.nutrientValue}>
              {totals.carbs}g / {goals.carbs}g
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${getProgress(totals.carbs, goals.carbs)}%`, backgroundColor: '#FFD93D' }]} />
          </View>
        </View>

        {/* Fat */}
        <View style={styles.nutrientRow}>
          <View style={styles.nutrientInfo}>
            <Text style={styles.nutrientLabel}>🥑 Fat</Text>
            <Text style={styles.nutrientValue}>
              {totals.fat}g / {goals.fat}g
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${getProgress(totals.fat, goals.fat)}%`, backgroundColor: '#95E1D3' }]} />
          </View>
        </View>
      </View>

      {/* Add Entry Button */}
      <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
        <Text style={styles.addButtonText}>+ Add Food</Text>
      </TouchableOpacity>

      {/* Meals List */}
      <ScrollView style={styles.mealsList}>
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No entries for this day</Text>
            <Text style={styles.emptySubtext}>Tap "+ Add Food" to start tracking</Text>
          </View>
        ) : (
          Object.entries(entriesByMeal).map(([mealType, mealEntries]) => {
            if (mealEntries.length === 0) return null;
            return (
              <View key={mealType} style={styles.mealSection}>
                <Text style={styles.mealTitle}>
                  {getMealIcon(mealType)} {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                </Text>
                {mealEntries.map(entry => (
                  <View key={entry.id} style={styles.entryCard}>
                    <View style={styles.entryInfo}>
                      <Text style={styles.entryName}>{entry.recipeName}</Text>
                      <Text style={styles.entryNutrition}>
                        {entry.calories} cal • {entry.protein}g P • {entry.carbs}g C • {entry.fat}g F
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteEntry(entry.id)}>
                      <Text style={styles.deleteIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Entry Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Food Entry</Text>

            <Text style={styles.label}>Meal Type</Text>
            <View style={styles.mealTypeButtons}>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.mealTypeButton, newEntry.mealType === type && styles.mealTypeButtonActive]}
                  onPress={() => setNewEntry({ ...newEntry, mealType: type })}
                >
                  <Text style={[styles.mealTypeButtonText, newEntry.mealType === type && styles.mealTypeButtonTextActive]}>
                    {getMealIcon(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Food/Recipe Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Chicken Salad"
              value={newEntry.recipeName}
              onChangeText={(text) => setNewEntry({ ...newEntry, recipeName: text })}
            />

            <Text style={styles.label}>Calories *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 350"
              keyboardType="numeric"
              value={newEntry.calories?.toString() || ''}
              onChangeText={(text) => setNewEntry({ ...newEntry, calories: parseInt(text) || 0 })}
            />

            <View style={styles.macrosRow}>
              <View style={styles.macroField}>
                <Text style={styles.label}>Protein (g)</Text>
                <TextInput
                  style={styles.smallInput}
                  placeholder="0"
                  keyboardType="numeric"
                  value={newEntry.protein?.toString() || ''}
                  onChangeText={(text) => setNewEntry({ ...newEntry, protein: parseInt(text) || 0 })}
                />
              </View>
              <View style={styles.macroField}>
                <Text style={styles.label}>Carbs (g)</Text>
                <TextInput
                  style={styles.smallInput}
                  placeholder="0"
                  keyboardType="numeric"
                  value={newEntry.carbs?.toString() || ''}
                  onChangeText={(text) => setNewEntry({ ...newEntry, carbs: parseInt(text) || 0 })}
                />
              </View>
              <View style={styles.macroField}>
                <Text style={styles.label}>Fat (g)</Text>
                <TextInput
                  style={styles.smallInput}
                  placeholder="0"
                  keyboardType="numeric"
                  value={newEntry.fat?.toString() || ''}
                  onChangeText={(text) => setNewEntry({ ...newEntry, fat: parseInt(text) || 0 })}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={addEntry}>
                <Text style={styles.saveButtonText}>Add Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Goals Modal */}
      <Modal visible={showGoalsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Daily Goals</Text>

            <Text style={styles.label}>Daily Calorie Goal</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={tempGoals.calories.toString()}
              onChangeText={(text) => setTempGoals({ ...tempGoals, calories: parseInt(text) || 0 })}
            />

            <Text style={styles.label}>Protein Goal (g)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={tempGoals.protein.toString()}
              onChangeText={(text) => setTempGoals({ ...tempGoals, protein: parseInt(text) || 0 })}
            />

            <Text style={styles.label}>Carbs Goal (g)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={tempGoals.carbs.toString()}
              onChangeText={(text) => setTempGoals({ ...tempGoals, carbs: parseInt(text) || 0 })}
            />

            <Text style={styles.label}>Fat Goal (g)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={tempGoals.fat.toString()}
              onChangeText={(text) => setTempGoals({ ...tempGoals, fat: parseInt(text) || 0 })}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowGoalsModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveGoals}>
                <Text style={styles.saveButtonText}>Save Goals</Text>
              </TouchableOpacity>
            </View>
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
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: 'bold' },
  goalsButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  goalsButtonText: { color: '#fff', fontWeight: 'bold' },
  dateNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  dateButton: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dateButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  dateButtonDisabled: { color: '#ccc' },
  dateText: { fontSize: 18, fontWeight: '600' },
  summaryCard: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  nutrientRow: { marginBottom: 12 },
  nutrientInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  nutrientLabel: { fontSize: 14, fontWeight: '500' },
  nutrientValue: { fontSize: 14, color: '#6C757D' },
  progressBar: {
    height: 8,
    backgroundColor: '#E9ECEF',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  addButton: {
    backgroundColor: '#27AE60',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  mealsList: { flex: 1 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#666', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#999' },
  mealSection: { marginBottom: 20 },
  mealTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#2C3E50',
  },
  entryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  entryInfo: { flex: 1 },
  entryName: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
  entryNutrition: { fontSize: 12, color: '#6C757D' },
  deleteIcon: { fontSize: 18 },
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#495057',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  mealTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  mealTypeButton: {
    flex: 0.23,
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  mealTypeButtonActive: {
    backgroundColor: '#27AE60',
    borderColor: '#27AE60',
  },
  mealTypeButtonText: { fontSize: 24 },
  mealTypeButtonTextActive: { opacity: 1 },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  macroField: { flex: 0.32 },
  smallInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: '#6C757D',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.48,
  },
  cancelButtonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  saveButton: {
    backgroundColor: '#27AE60',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.48,
  },
  saveButtonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
});
