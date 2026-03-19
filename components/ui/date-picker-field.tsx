import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';

interface DatePickerFieldProps {
  value: string; // ISO date string YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  minimumDate?: Date;
}

export function DatePickerField({ value, onChange, label, placeholder, minimumDate }: DatePickerFieldProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [show, setShow] = useState(false);

  const dateValue = value ? new Date(value + 'T00:00:00') : new Date();

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selectedDate) {
      onChange(selectedDate.toISOString().split('T')[0]);
    }
  };

  const displayText = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : (placeholder ?? 'Select date');

  if (Platform.OS === 'ios') {
    return (
      <View>
        {label && (
          <Text className="text-text-secondary dark:text-text-secondary-dark text-sm font-medium mb-2">
            {label}
          </Text>
        )}
        <Pressable
          onPress={() => setShow(true)}
          className="bg-surface dark:bg-surface-dark rounded-bento px-4 py-3 flex-row items-center justify-between"
        >
          <Text style={{ color: value ? colors.text : colors.textMuted }}>
            {displayText}
          </Text>
        </Pressable>
        <Modal visible={show} animationType="fade" transparent onRequestClose={() => setShow(false)}>
          <Pressable className="flex-1 bg-black/50 justify-end" onPress={() => setShow(false)}>
            <View
              style={{ backgroundColor: colors.surface }}
              className="rounded-t-3xl p-4"
              onStartShouldSetResponder={() => true}
            >
              <View className="flex-row justify-between items-center mb-2 px-2">
                <Text style={{ color: colors.text }} className="text-lg font-bold">Select Date</Text>
                <Pressable onPress={() => setShow(false)}>
                  <Text style={{ color: colors.tint }} className="font-semibold">Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={dateValue}
                mode="date"
                display="spinner"
                onChange={handleChange}
                minimumDate={minimumDate}
                themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
              />
            </View>
          </Pressable>
        </Modal>
      </View>
    );
  }

  // Android
  return (
    <View>
      {label && (
        <Text className="text-text-secondary dark:text-text-secondary-dark text-sm font-medium mb-2">
          {label}
        </Text>
      )}
      <Pressable
        onPress={() => setShow(true)}
        className="bg-surface dark:bg-surface-dark rounded-bento px-4 py-3 flex-row items-center justify-between"
      >
        <Text style={{ color: value ? colors.text : colors.textMuted }}>
          {displayText}
        </Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display="default"
          onChange={handleChange}
          minimumDate={minimumDate}
        />
      )}
    </View>
  );
}
