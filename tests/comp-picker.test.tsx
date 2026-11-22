// FK-75: the league / competition box (CompPicker.tsx): it shows the open one, lists every option, filters as you type
// (case and accents ignored), and picks with a click or Enter.
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompPicker, filterComps, type CompOption } from '../src/components/CompPicker';

const LEAGUES: CompOption[] = [
  { value: 'eng.1', name: 'Premier League' }, { value: 'esp.1', name: 'LaLiga' }, { value: 'ita.1', name: 'Serie A' },
  { value: 'ger.1', name: 'Bundesliga' }, { value: 'fra.1', name: 'Ligue 1' }, { value: 'bra.1', name: 'Brasileirão' },
];
afterEach(cleanup);

describe('filterComps', () => {
  it('nothing typed: every option, in order', () => {
    expect(filterComps(LEAGUES, '')).toEqual(LEAGUES);
    expect(filterComps(LEAGUES, '   ')).toEqual(LEAGUES);
  });
  it('typed text: the names that hold it, whatever the case or accents', () => {
    expect(filterComps(LEAGUES, 'brasileirao').map((o) => o.value)).toEqual(['bra.1']);
    expect(filterComps(LEAGUES, 'LIG').map((o) => o.value)).toEqual(['esp.1', 'ger.1', 'fra.1']);
    expect(filterComps(LEAGUES, 'zzz')).toEqual([]);
  });
});

describe('the box', () => {
  const setup = (value = 'eng.1') => {
    const onPick = vi.fn();
    render(<CompPicker noun="league" testId="what-league" value={value} options={LEAGUES} onPick={onPick} />);
    return { onPick, box: screen.getByTestId('what-league'), input: screen.getByTestId('comp-picker') as HTMLInputElement };
  };
  it('closed: the open league by name, no list', () => {
    const { box, input } = setup('bra.1');
    expect(input.value).toBe('Brasileirão');
    expect(box.getAttribute('data-value')).toBe('bra.1');
    expect(screen.queryByTestId('comp-list')).toBeNull();
    expect(input.getAttribute('aria-label')).toBe('League');
  });
  it('a click opens the list: every league that had a button, in order, the open one marked', () => {
    const { input } = setup();
    fireEvent.focus(input);
    const options = within(screen.getByTestId('comp-list')).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(LEAGUES.map((o) => o.name));
    expect(options.map((o) => o.getAttribute('data-value'))).toEqual(LEAGUES.map((o) => o.value));
    expect(options.filter((o) => o.getAttribute('aria-selected') === 'true').map((o) => o.textContent)).toEqual(['Premier League']);
  });
  it('a click on an entry picks it and closes the list; the open one again picks nothing', () => {
    const { input, onPick } = setup();
    fireEvent.focus(input);
    fireEvent.click(screen.getByText('Bundesliga'));
    expect(onPick).toHaveBeenCalledWith('ger.1');
    expect(screen.queryByTestId('comp-list')).toBeNull();
    fireEvent.focus(input);
    fireEvent.click(within(screen.getByTestId('comp-list')).getByText('Premier League'));
    expect(onPick).toHaveBeenCalledTimes(1);
  });
  it('typing filters; Enter takes the first match; Escape closes and keeps the open one', () => {
    const { input, onPick } = setup();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'serie' } });
    expect(within(screen.getByTestId('comp-list')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Serie A']);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onPick).toHaveBeenCalledWith('ita.1');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'zzz' } });
    expect(screen.getByTestId('comp-list').textContent).toBe('No league matches "zzz"');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByTestId('comp-list')).toBeNull();
    expect(input.value).toBe('Premier League');
    expect(onPick).toHaveBeenCalledTimes(1);
  });
  it('arrows move from the open one; Enter picks where they stopped', () => {
    const { input, onPick } = setup('ita.1');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onPick).toHaveBeenCalledWith('ger.1');
  });
});
