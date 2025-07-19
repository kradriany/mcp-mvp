import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Connection Viewer header', () => {
  render(<App />);
  expect(screen.getByText(/Connection Viewer/i)).toBeInTheDocument();
});
