/* Deterministic, runtime-free design mockups. Tables are the single source for values. */
(() => {
  const root = document.documentElement;
  const $ = (selector) => document.querySelector(selector);
  const rows = (id) => [...$(id).rows].map((row) => [...row.cells].map((cell) => cell.textContent.trim()));
  const area = rows('#area-data').map(([label, value]) => ({ label, value: Number(value) }));
  const bars = rows('#bar-data').map(([label, value]) => ({ label, value: Number(value) }));
  const channels = rows('#ring-data').map(([label, value]) => ({ label, value: Number(value) }));
  const comparison = rows('#comparison-data').map(([label, value, previous]) => ({ label, value: Number(value), previous: Number(previous) }));
  const format = new Intl.NumberFormat('en-US');
  const cap = (value) => value[0].toUpperCase() + value.slice(1);

  $('#request-total').textContent = format.format(area.reduce((sum, point) => sum + point.value, 0));
  $('#throughput-total').textContent = format.format(bars.at(-1).value);
  $('#response-average').firstChild.textContent = (comparison.reduce((sum, point) => sum + point.value, 0) / comparison.length).toFixed(1);

  function appearance() {
    const { palette, strength, theme, flat } = root.dataset;
    const label = `${cap(palette)} / ${flat === 'true' ? 'Flat' : cap(strength)} / ${cap(theme)}`;
    $('#preview-label').textContent = label;
    $('#appearance-status').textContent = `Chart appearance: ${label}. Sample values are unchanged.`;
  }

  for (const setting of ['theme', 'palette', 'strength']) {
    const buttons = document.querySelectorAll(`[data-${setting}-option]`);
    for (const button of buttons) {
      button.addEventListener('click', () => {
        root.dataset[setting] = button.dataset[`${setting}Option`];
        for (const option of buttons) option.setAttribute('aria-pressed', String(option === button));
        appearance();
      });
    }
  }
  $('#flat-toggle').addEventListener('click', (event) => {
    const flat = root.dataset.flat !== 'true';
    root.dataset.flat = String(flat);
    event.currentTarget.setAttribute('aria-pressed', String(flat));
    appearance();
  });

  // Midpoint Bézier handles never extend beyond either endpoint's value.
  function line(points) {
    return points.map(([x, y], index) => {
      if (!index) return `M${x},${y}`;
      const [px, py] = points[index - 1];
      const mid = (px + x) / 2;
      return `C${mid},${py} ${mid},${y} ${x},${y}`;
    }).join(' ');
  }

  function wash(id) {
    return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop class="gradient-base wash-top" offset="0"/><stop class="gradient-base wash-middle" offset=".7"/><stop class="gradient-base wash-bottom" offset="1"/></linearGradient>`;
  }

  function chart(container, data, { max, ticks, label, unit = '', previous = false, bar = false }) {
    // The viewBox follows the actual plot width, so labels keep their size on resize.
    function draw() {
      const width = Math.max(310, container.clientWidth);
      const height = container.clientHeight;
      const box = { left: 34, right: width - 14, top: 12, bottom: height - 30 };
      const plotWidth = box.right - box.left;
      const y = (value) => box.bottom - value / max * (box.bottom - box.top);
      const x = (index) => bar
        ? box.left + (index + .5) * plotWidth / data.length
        : box.left + index * plotWidth / (data.length - 1);
      const points = data.map((point, index) => [x(index), y(point.value)]);
      const d = line(points);
      const tickLabels = ticks.map((value) => `<line class="grid-line" x1="${box.left}" y1="${y(value)}" x2="${box.right}" y2="${y(value)}"/><text class="axis-label" x="${box.left - 9}" y="${y(value) + 4}" text-anchor="end">${value}${unit}</text>`).join('');
      const labels = data.map((point, index) => {
        if (!bar && data.length > 8 && ![0, 3, 6, 9, 13].includes(index)) return '';
        return `<text class="axis-label" x="${x(index)}" y="${height - 7}" text-anchor="middle">${point.label}</text>`;
      }).join('');
      const gradientId = previous ? 'comparison-wash' : 'area-wash';
      const areaPath = `<path class="${previous ? 'comparison-fill' : 'area-fill'}" d="${d} L${box.right},${box.bottom} L${box.left},${box.bottom} Z"/>`;
      const barsMarkup = data.map((point, index) => {
        const w = Math.min(28, plotWidth / data.length * .56);
        return `<rect class="bar" x="${x(index) - w / 2}" y="${y(point.value)}" width="${w}" height="${box.bottom - y(point.value)}" rx="3"/><line class="bar-top" x1="${x(index) - w / 2 + 3}" y1="${y(point.value)}" x2="${x(index) + w / 2 - 3}" y2="${y(point.value)}"/>`;
      }).join('');
      const prior = previous ? `<path class="plot-line past-line" d="${line(data.map((point, index) => [x(index), y(point.previous)]))}"/>` : '';
      const marks = bar ? barsMarkup : `${areaPath}${prior}<path class="plot-line ${previous ? '' : 'line-gradient'}" d="${d}"/><circle class="latest-point" cx="${points.at(-1)[0]}" cy="${points.at(-1)[1]}" r="4.5"/>`;
      container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}. Exact values are in the sample data table."><defs>${wash(gradientId)}<linearGradient id="${bar ? 'bar-gradient' : previous ? 'comparison-line-gradient' : 'area-line-gradient'}" x1="0" y1="${bar ? 1 : 0}" x2="${bar ? 0 : 1}" y2="0"><stop class="gradient-base" offset="0"/><stop class="gradient-tip" offset="1"/></linearGradient></defs>${tickLabels}${marks}${labels}<g class="inspect-marker" visibility="hidden" aria-hidden="true"><line class="inspect-line" y1="${box.top}" y2="${box.bottom}"/><circle class="inspect-dot"/></g></svg><div class="chart-tooltip" role="status" hidden></div>`;
      const svg = container.querySelector('svg');
      const tooltip = container.querySelector('.chart-tooltip');
      const marker = container.querySelector('.inspect-marker');
      let selected = -1;

      function inspect(index) {
        selected = Math.max(0, Math.min(data.length - 1, index));
        const point = data[selected];
        tooltip.textContent = `${point.label}: ${format.format(point.value)}${unit}${previous ? ` this week; ${format.format(point.previous)}${unit} previous week` : bar ? ' completed' : ' resolved'}`;
        tooltip.hidden = false;
        marker.setAttribute('visibility', 'visible');
        marker.querySelector('line').setAttribute('x1', x(selected));
        marker.querySelector('line').setAttribute('x2', x(selected));
        marker.querySelector('circle').setAttribute('cx', x(selected));
        marker.querySelector('circle').setAttribute('cy', y(point.value));
      }
      function clear() {
        selected = -1;
        tooltip.hidden = true;
        marker.setAttribute('visibility', 'hidden');
      }
      svg.addEventListener('pointermove', (event) => {
        const rect = svg.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width * width;
        inspect(Math.round((px - box.left) / plotWidth * (bar ? data.length : data.length - 1) - (bar ? .5 : 0)));
      });
      svg.addEventListener('pointerleave', clear);
      container.onkeydown = (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'Escape') return clear();
        inspect(event.key === 'Home' ? 0 : event.key === 'End' ? data.length - 1 : selected < 0 ? 0 : selected + (event.key === 'ArrowRight' ? 1 : -1));
      };
      container.onblur = clear;
    }
    container.tabIndex = 0;
    container.setAttribute('role', 'group');
    container.setAttribute('aria-label', `${label}. Use Left and Right arrow keys to inspect values, Home or End to jump, Escape to clear.`);
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    draw();
  }

  chart($('#area-chart'), area, { max: 160, ticks: [0, 40, 80, 120, 160], label: 'Daily resolved requests, November 9 to 22' });
  chart($('#bar-chart'), bars, { max: 800, ticks: [0, 200, 400, 600, 800], label: 'Weekly completed requests, weeks 40 to 47', bar: true });
  chart($('#comparison-chart'), comparison, { max: 5, ticks: [0, 1, 2, 3, 4, 5], label: 'Daily mean resolution time, this week and previous week', unit: 'h', previous: true });

  const channelTotal = channels.reduce((sum, channel) => sum + channel.value, 0);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const ringClasses = ['primary', 'secondary', 'tertiary'];
  let offset = 0;
  const segments = channels.map((channel, index) => {
    const length = channel.value / channelTotal * circumference;
    const arc = `<circle class="ring-segment ring-${ringClasses[index]}" cx="100" cy="100" r="${radius}" stroke-dasharray="${length - 3} ${circumference - length + 3}" stroke-dashoffset="${-offset - 1.5}" transform="rotate(-90 100 100)"><title>${channel.label}: ${format.format(channel.value)} requests (${Math.round(channel.value / channelTotal * 100)}%)</title></circle>`;
    offset += length;
    return arc;
  }).join('');
  $('#ring-chart').innerHTML = `<svg viewBox="0 0 200 200" role="img" aria-label="${format.format(channelTotal)} sample requests: Portal 58 percent, Email 27 percent, Chat 15 percent."><defs><linearGradient id="ring-primary" x1="0" y1="1" x2="1" y2="0"><stop class="gradient-base" offset="0"/><stop class="gradient-tip" offset="1"/></linearGradient><linearGradient id="ring-secondary" x1="0" y1="1" x2="1" y2="0"><stop class="ring-second-start" offset="0"/><stop class="ring-second-end" offset="1"/></linearGradient><linearGradient id="ring-tertiary" x1="0" y1="1" x2="1" y2="0"><stop class="ring-third-start" offset="0"/><stop class="ring-third-end" offset="1"/></linearGradient></defs><circle class="ring-track" cx="100" cy="100" r="${radius}"/>${segments}<text class="ring-value" x="100" y="100" text-anchor="middle">${format.format(channelTotal)}</text><text class="ring-label" x="100" y="121" text-anchor="middle">total requests</text></svg>`;
  appearance();
})();
