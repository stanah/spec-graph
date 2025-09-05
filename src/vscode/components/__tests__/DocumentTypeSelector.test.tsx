import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentTypeSelector } from '../DocumentTypeSelector';
import { DocumentTypeRegistry } from '../../../services/documentTypes';
import { registerDefaultDocumentTypes } from '../../../services/documentTypes.builtins';

describe('DocumentTypeSelector', () => {
  const setup = (selectedKey?: string) => {
    const registry = new DocumentTypeRegistry();
    registerDefaultDocumentTypes(registry);
    const types = registry.list();
    const onSelect = vi.fn();
    render(<DocumentTypeSelector types={types} selectedKey={selectedKey} onSelect={onSelect} />);
    return { onSelect };
  };

  it('renders built-in types', () => {
    setup('requirements');
    expect(screen.getByRole('button', { name: 'Requirements' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stakeholders' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Design' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tasks' })).toBeInTheDocument();
  });

  it('indicates selected type with aria-pressed', () => {
    setup('requirements');
    expect(screen.getByRole('button', { name: 'Requirements' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onSelect when a type is clicked', () => {
    const { onSelect } = setup('requirements');
    fireEvent.click(screen.getByRole('button', { name: 'Design' }));
    expect(onSelect).toHaveBeenCalledWith('design');
  });
});

