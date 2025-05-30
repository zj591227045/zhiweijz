module.exports = {
  dependencies: {
    'react-native-gesture-handler': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-gesture-handler/android/',
          packageImportPath: 'import com.swmansion.gesturehandler.RNGestureHandlerPackage;',
        },
      },
    },
    'react-native-screens': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-screens/android/',
          packageImportPath: 'import com.swmansion.rnscreens.RNScreensPackage;',
        },
      },
    },
  },
};
