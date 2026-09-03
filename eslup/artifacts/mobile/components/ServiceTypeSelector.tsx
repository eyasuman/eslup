import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ServiceType } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const SERVICE_TYPES: { id: ServiceType; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
  { id: "onsite", label: "In person", icon: "map-pin" },
  { id: "online", label: "Online", icon: "video" },
  { id: "homecare", label: "Home care", icon: "home" },
];

interface ServiceTypeSelectorProps {
  selected: ServiceType | null;
  onSelect: (type: ServiceType | null) => void;
}

export function ServiceTypeSelector({ selected, onSelect }: ServiceTypeSelectorProps) {
  const colors = useColors();

  const handleSelect = (id: ServiceType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(selected === id ? null : id);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {SERVICE_TYPES.map((type) => {
        const isSelected = selected === type.id;
        return (
          <Pressable
            key={type.id}
            onPress={() => handleSelect(type.id)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: isSelected ? colors.primary : colors.glass,
                borderColor: isSelected ? colors.primary : colors.border,
                opacity: pressed ? 0.85 : 1,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Feather
              name={type.icon as any}
              size={15}
              color={isSelected ? "#fff" : colors.mutedForeground}
            />
            <View style={styles.chipText}>
              <Text
                style={[
                  styles.chipLabel,
                  { color: isSelected ? "#fff" : colors.foreground },
                ]}
              >
                {type.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
  },
  chipText: {},
  chipLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
