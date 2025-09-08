import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { SchemaDocumentView } from '../schema/SchemaDocumentView';

describe('SchemaDocumentView (tasks)', () => {
  it('epicsのリストをitemTitleとバッジで表示できる', () => {
    const schema: any = {
      $id: 'urn:test:tasks',
      title: 'Tasks',
      type: 'object',
      required: ['title', 'version', 'epics'],
      properties: {
        title: { type: 'string' },
        version: { type: 'string' },
        epics: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              status: { enum: ['todo', 'in-progress', 'done'], 'x-ui': { display: 'badge' } },
              priority: { enum: ['critical', 'high', 'medium', 'low'], 'x-ui': { display: 'badge' } },
              tags: { type: 'array', items: { type: 'string' }, 'x-ui': { display: 'chips' } }
            }
          },
          'x-ui': { display: 'list', section: 'main', order: 1, itemTitle: 'id+title' }
        }
      }
    };

    const data: any = {
      title: 'タスク',
      version: '0.1.0',
      epics: [
        { id: 'TASK-PRJ-001', title: '画面改善', status: 'in-progress', priority: 'high', tags: ['frontend'] }
      ]
    };

    render(<SchemaDocumentView data={data} schema={schema} />);

    const item = screen.getAllByText(/TASK-PRJ-001/)[0].closest('li')!;
    const withinLi = within(item);
    expect(withinLi.getByText(/画面改善/)).toBeInTheDocument();
    expect(withinLi.getByTestId('status-badge')).toHaveTextContent('in-progress');
    expect(withinLi.getByTestId('priority-badge')).toHaveTextContent('high');
    expect(withinLi.getByText('frontend')).toBeInTheDocument();
  });
});

