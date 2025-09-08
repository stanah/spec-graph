import { render, screen } from '@testing-library/react';
import React from 'react';
import { SchemaDocumentView } from '../schema/SchemaDocumentView';

describe('SchemaDocumentView (design)', () => {
  it('componentsをitemTitle=id+nameで表示できる', () => {
    const schema: any = {
      $id: 'urn:test:design',
      title: 'Design',
      type: 'object',
      required: ['title', 'version', 'components'],
      properties: {
        title: { type: 'string' },
        version: { type: 'string' },
        components: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              type: { enum: ['service', 'module'] }
            }
          },
          'x-ui': { display: 'list', section: 'main', order: 1, itemTitle: 'id+name' }
        }
      }
    };

    const data: any = {
      title: '設計',
      version: '1.0.0',
      components: [
        { id: 'DSG-ABC-001', name: 'Auth Service', type: 'service' }
      ]
    };

    render(<SchemaDocumentView data={data} schema={schema} />);

    expect(screen.getByText(/DSG-ABC-001/)).toBeInTheDocument();
    expect(screen.getByText(/Auth Service/)).toBeInTheDocument();
  });
});

