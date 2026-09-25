import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FeedbackCarousel } from '../components/landing/cinematic/FeedbackCarousel';

vi.mock('../components/landing/cinematic/feedback', async (importOriginal) => {
  const original = await importOriginal<typeof import('../components/landing/cinematic/feedback')>();
  return {
    ...original,
    FEEDBACK_ITEMS: [
      { id: 'demo', kind: 'demonstracao', message: 'Mensagem de exemplo.', context: 'Recurso · Calculadora' },
      {
        id: 'real',
        kind: 'verificado',
        message: 'Depoimento real.',
        context: 'Conta 100k',
        rating: 4,
        author: { name: 'Ana Souza' },
        source: { name: 'Trustpilot', url: 'https://example.com/review' },
      },
      // Sem nota: mesmo marcado como verificado, não pode ganhar estrelas.
      { id: 'sem-nota', kind: 'verificado', message: 'Incompleto.', context: 'x', author: { name: 'Bruno' } },
    ],
  };
});

describe('carrossel de feedback', () => {
  it('só mostra nome, estrelas e fonte em depoimento verificado com nota', () => {
    render(<FeedbackCarousel />);

    expect(screen.getAllByRole('img', { name: 'Nota 4 de 5' }).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole('img', { name: /Nota \d de 5/ })).toHaveLength(
      screen.getAllByRole('img', { name: 'Nota 4 de 5' }).length,
    );
    expect(screen.getAllByText('Ana Souza').length).toBeGreaterThan(0);
    expect(screen.getAllByText('AS').length).toBeGreaterThan(0);
    expect(screen.queryByText('Bruno')).not.toBeInTheDocument();
    expect(screen.getAllByText('Demonstração').length).toBeGreaterThan(0);
  });
});
