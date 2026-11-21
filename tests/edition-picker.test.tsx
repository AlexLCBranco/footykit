// FK-74: the edition dropdown — the open edition on the button, every edition newest first in the list, ◀ ▶ one
// edition at a time (disabled at the ends).
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditionPicker, editionNeighbours, newestFirst } from '../src/components/EditionPicker';
import { WC_YEARS } from '../src/components/page';

const editions = WC_YEARS.map((y) => ({ value: y, label: String(y) }));
afterEach(cleanup);

describe('order and neighbours', () => {
  it('the list is newest first', () => {
    expect(newestFirst(WC_YEARS)[0]).toBe(2026);
    expect(newestFirst(WC_YEARS).at(-1)).toBe(1930);
    expect(newestFirst(WC_YEARS)).toHaveLength(WC_YEARS.length);
  });
  it('the editions either side: 1950 sits between 1938 and 1954 (no World Cup in 1942 or 1946); none past the ends', () => {
    expect(editionNeighbours(editions, 1950)).toMatchObject({ before: { value: 1938 }, after: { value: 1954 } });
    expect(editionNeighbours(editions, 1930).before).toBeUndefined();
    expect(editionNeighbours(editions, 2026).after).toBeUndefined();
    expect(editionNeighbours(editions, 1999)).toEqual({});
  });
});

describe('the dropdown', () => {
  const setup = (value: number) => {
    const onChange = vi.fn();
    render(<EditionPicker noun="World Cup" testId="ed" value={value} editions={editions} onChange={onChange} />);
    return onChange;
  };
  it('closed: only the open edition shows; opened: all 23, newest first, the open one marked', () => {
    setup(1970);
    expect(screen.getByTestId('edition-now').textContent).toBe('1970');
    expect(screen.queryByTestId('edition-list')).toBeNull();
    fireEvent.click(screen.getByTestId('edition-btn'));
    const options = within(screen.getByTestId('edition-list')).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(newestFirst(WC_YEARS).map(String));
    expect(options.filter((o) => o.getAttribute('aria-selected') === 'true').map((o) => o.textContent)).toEqual(['1970']);
  });
  it('picking an edition raises it and closes the list; Escape closes without picking', () => {
    const onChange = setup(2026);
    fireEvent.click(screen.getByTestId('edition-btn'));
    fireEvent.click(within(screen.getByTestId('edition-list')).getByText('1970'));
    expect(onChange).toHaveBeenCalledWith(1970);
    expect(screen.queryByTestId('edition-list')).toBeNull();
    fireEvent.click(screen.getByTestId('edition-btn'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('edition-list')).toBeNull();
    expect(onChange).toHaveBeenCalledTimes(1);
  });
  it('◀ ▶ step one edition; ▶ is off at the newest and ◀ at the first', () => {
    const onChange = setup(1970);
    fireEvent.click(screen.getByTestId('edition-prev'));
    fireEvent.click(screen.getByTestId('edition-next'));
    expect(onChange.mock.calls).toEqual([[1966], [1974]]);
    cleanup();
    setup(2026);
    expect((screen.getByTestId('edition-next') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('edition-prev').getAttribute('title')).toBe('The World Cup before: 2022');
    cleanup();
    setup(1930);
    expect((screen.getByTestId('edition-prev') as HTMLButtonElement).disabled).toBe(true);
  });
});
