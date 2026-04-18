import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { EmptyState } from './EmptyState';

// Smoke test: verifies the unit test harness works with jsdom + RTL
describe('EmptyState', () => {
  it('renders the default message', () => {
    render(<EmptyState />);
    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument();
  });

  it('renders a custom message', () => {
    render(<EmptyState message="Нет историй" />);
    expect(screen.getByText('Нет историй')).toBeInTheDocument();
  });
});
