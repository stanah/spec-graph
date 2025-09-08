import { render, screen } from '@testing-library/react';
import React from 'react';
import { SchemaDocumentView } from '../schema/SchemaDocumentView';

describe('SchemaDocumentView (stakeholders)', () => {
  it('stakeholdersをitemTitle=id+nameで表示し、roleをバッジ表示（チップ）できる', () => {
    const schema: any = {
      $id: 'urn:test:stakeholders',
      title: 'Stakeholders',
      type: 'object',
      required: ['title', 'version', 'stakeholders'],
      properties: {
        title: { type: 'string' },
        version: { type: 'string' },
        stakeholders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              role: { enum: ['product-owner', 'tech-lead'], 'x-ui': { display: 'badge' } }
            }
          },
          'x-ui': { display: 'list', section: 'main', order: 1, itemTitle: 'id+name' }
        }
      }
    };

    const data: any = {
      title: '関係者',
      version: '1.0.0',
      stakeholders: [
        { id: 'STK-001', name: '山田太郎', role: 'product-owner' }
      ]
    };

    render(<SchemaDocumentView data={data} schema={schema} />);

    expect(screen.getByText(/STK-001/)).toBeInTheDocument();
    expect(screen.getByText(/山田太郎/)).toBeInTheDocument();
    expect(screen.getByText(/product-owner/)).toBeInTheDocument();
  });
});

