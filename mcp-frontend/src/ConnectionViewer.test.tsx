import React from 'react';
import { render, screen } from '@testing-library/react';
import ConnectionViewer from './ConnectionViewer';

test('renders Connection Viewer header', () => {
  render(<ConnectionViewer />);
  expect(screen.getByText(/Connection Viewer/i)).toBeInTheDocument();
}); 