import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Provider as PaperProvider, Button } from 'react-native-paper';
import { theme } from './theme';

/**
 * Android应用根组件
 * 简单的测试界面
 */
const App: React.FC = () => {
  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={theme.colors.surface}
          translucent={false}
        />
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>只为记账</Text>
            <Text style={styles.subtitle}>Android应用</Text>
            <Button 
              mode="contained" 
              onPress={() => console.log('按钮被点击')}
              style={styles.button}
            >
              测试按钮
            </Button>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },
  button: {
    marginTop: 20,
  },
});

export default App;
