import React, { useState, useEffect } from "react";
import { View, Text, Switch, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

export default function CustomDrawer(props: DrawerContentComponentProps) {
  const router = useRouter();
  const [filters, setFilters] = useState({
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    nonVegetarian: false,
  });
  
  const navigationItems = [
    { title: "🏠 Home", route: "/" },
    { title: "🧊 My Fridge", route: "/fridge" },
    { title: "❤️ Favorites", route: "/favorites" },
    { title: "🍳 Find Recipes", route: "/recipes" },
    { title: "📦 My Orders", route: "/orders" },
  ];

  // Load saved filters
  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem("filters");
      if (saved) setFilters(JSON.parse(saved));
    };
    load();
  }, []);

  const toggleFilter = async (key: keyof typeof filters) => {
    const updated = { ...filters, [key]: !filters[key] };
    setFilters(updated);
    await AsyncStorage.setItem("filters", JSON.stringify(updated));
  };

  return (
    <ScrollView style={styles.container}>
      {/* App Header */}
      <View style={styles.appHeader}>
        <Text style={styles.appTitle}>FridgeChef</Text>
        <Text style={styles.appSubtitle}>Smart Recipe Generator</Text>
      </View>
      
      {/* Navigation Menu */}
      <View style={styles.navigationSection}>
        <Text style={styles.sectionTitle}>Navigation</Text>
        {navigationItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.navItem}
            onPress={() => router.push(item.route as any)}
          >
            <Text style={styles.navText}>{item.title}</Text>
            <Text style={styles.navArrow}></Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Dietary Filters */}
      <View style={styles.filtersSection}>
        <Text style={styles.sectionTitle}>Dietary Preferences</Text>
        {Object.entries(filters).map(([key, value]) => (
          <View key={key} style={styles.filterRow}>
            <Text style={styles.filterLabel}>{key}</Text>
            <Switch
              value={value}
              onValueChange={() => toggleFilter(key as keyof typeof filters)}
              trackColor={{ false: "#E0E0E0", true: "#27AE60" }}
              thumbColor={value ? "#fff" : "#f4f3f4"}
            />
          </View>
        ))}
      </View>
      
      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with ❤️ for food lovers</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  
  appHeader: {
    backgroundColor: "#27AE60",
    padding: 20,
    marginBottom: 20,
  },
  appTitle: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  appSubtitle: { fontSize: 14, color: "#E8F5E8", marginTop: 4 },
  
  navigationSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 15,
  },
  navItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  navText: { fontSize: 16, fontWeight: "500", color: "#495057" },
  navArrow: { fontSize: 18, color: "#27AE60", fontWeight: "bold" },
  
  filtersSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  filterLabel: { fontSize: 16, textTransform: "capitalize", color: "#495057" },
  
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
    alignItems: "center",
  },
  footerText: { fontSize: 12, color: "#6C757D", textAlign: "center" },
});
