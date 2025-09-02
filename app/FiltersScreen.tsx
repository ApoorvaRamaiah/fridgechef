import React, { useState, useEffect } from "react";
import { View, Text, Switch, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function FiltersScreen() {
  const [filters, setFilters] = useState({
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    nonVegetarian: false,
  });

  useEffect(() => {
    const loadFilters = async () => {
      const saved = await AsyncStorage.getItem("filters");
      if (saved) setFilters(JSON.parse(saved));
    };
    loadFilters();
  }, []);

  const toggleFilter = async (key: keyof typeof filters) => {
    const updated = { ...filters, [key]: !filters[key] };
    setFilters(updated);
    await AsyncStorage.setItem("filters", JSON.stringify(updated));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Dietary Preferences</Text>
      {Object.entries(filters).map(([key, value]) => (
        <View key={key} style={styles.filterRow}>
          <Text style={styles.label}>{key}</Text>
          <Switch
            value={value}
            onValueChange={() => toggleFilter(key as keyof typeof filters)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  heading: { fontSize: 20, fontWeight: "bold", marginBottom: 20 },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  label: { fontSize: 16, textTransform: "capitalize" },
});