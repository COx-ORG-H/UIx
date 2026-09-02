import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ECharts } from 'echarts';
import { ChartCore, type ChartEngine } from './ChartCore.js';

describe('ChartCore', () => {
  let resizeCallback: ResizeObserverCallback;
  const observe = vi.fn();
  const disconnect = vi.fn();
  const setOption = vi.fn();
  const resize = vi.fn();
  const dispose = vi.fn();
  const chart = { setOption, resize, dispose } as unknown as ECharts;
  const init = vi.fn(() => chart);
  const engine: ChartEngine = { init };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }

      observe = observe;
      unobserve = vi.fn();
      disconnect = disconnect;
    });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initializes once and does not apply the initial option twice', () => {
    const firstOption = { series: [{ type: 'line' as const, data: [1, 2] }] };
    const { rerender, unmount } = render(<ChartCore engine={engine} option={firstOption} />);

    expect(init).toHaveBeenCalledTimes(1);
    expect(setOption).toHaveBeenCalledTimes(1);
    expect(setOption).toHaveBeenLastCalledWith(firstOption);

    rerender(<ChartCore engine={engine} option={firstOption} />);
    expect(init).toHaveBeenCalledTimes(1);
    expect(setOption).toHaveBeenCalledTimes(1);

    const nextOption = { series: [{ type: 'line' as const, data: [2, 3] }] };
    rerender(<ChartCore engine={engine} option={nextOption} />);
    expect(setOption).toHaveBeenCalledTimes(2);
    expect(setOption).toHaveBeenLastCalledWith(nextOption, { notMerge: false });

    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('only resizes after the observed dimensions change', () => {
    const { container } = render(<ChartCore engine={engine} option={{}} />);
    const chartElement = container.querySelector('[role="img"]') as HTMLDivElement;
    let width = 0;
    Object.defineProperty(chartElement, 'clientWidth', { configurable: true, get: () => width });

    act(() => resizeCallback([], {} as ResizeObserver));
    expect(resize).not.toHaveBeenCalled();

    width = 320;
    act(() => resizeCallback([], {} as ResizeObserver));
    expect(resize).toHaveBeenCalledOnce();
  });
});
