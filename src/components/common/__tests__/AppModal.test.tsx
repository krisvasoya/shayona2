/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { AppModal } from '../AppModal';

jest.mock('react-native', () => ({
  Modal: ({ children }: any) => React.createElement('Modal', null, children),
  View: ({ children }: any) => React.createElement('View', null, children),
  TouchableOpacity: ({ children }: any) => React.createElement('TouchableOpacity', null, children),
  ScrollView: ({ children }: any) => React.createElement('ScrollView', null, children),
  KeyboardAvoidingView: ({ children }: any) =>
    React.createElement('KeyboardAvoidingView', null, children),
  StyleSheet: {
    create: (styles: any) => styles,
    absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  },
  Platform: { OS: 'android' },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => 'Icon',
}));

describe('AppModal Component (Global Keyboard-Safe Modals)', () => {
  it('should be defined and exportable as a valid React component', () => {
    expect(AppModal).toBeDefined();
    expect(typeof AppModal).toBe('function');
  });
});
