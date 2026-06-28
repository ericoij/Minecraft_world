const sliderContainer = document.getElementById('sliderContainer');
const statusEl = document.getElementById('status');
const form = document.getElementById('entryForm');
const refreshButton = document.getElementById('refreshButton');
const resetButton = document.getElementById('resetButton');

const palette = [
  '#0f62fe',
  '#8a3ffc',
  '#007d79',
  '#ff832b',
  '#fa4d56',
  '#198038',
  '#6f6fff',
  '#1192e8',
  '#d12771',
  '#009d9a'
];

let sliderDefinitions = [];
const sliderInputs = new Map();
let chart;

const setStatus = (message, type = 'info') => {
  statusEl.textContent = message || '';
  statusEl.className = type === 'info' ? '' : type;
};

const hexToRgba = (hex, alpha = 0.2) => {
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const renderSliders = (definitions) => {
  sliderContainer.innerHTML = '';
  sliderInputs.clear();

  definitions.forEach((definition) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'slider';

    const label = document.createElement('div');
    label.className = 'slider-label';
    label.textContent = definition.label;

    const valueLabel = document.createElement('div');
    valueLabel.className = 'slider-value';

    const input = document.createElement('input');
    input.type = 'range';
    input.min = definition.min;
    input.max = definition.max;
    input.step = 1;
    const defaultValue = Math.round((definition.min + definition.max) / 2);
    input.value = defaultValue;
    input.dataset.sliderId = definition.id;
    input.dataset.defaultValue = String(defaultValue);

    const updateValueLabel = () => {
      valueLabel.textContent = `Value: ${input.value}`;
    };

    updateValueLabel();

    input.addEventListener('input', updateValueLabel);

    wrapper.appendChild(label);
    wrapper.appendChild(valueLabel);
    wrapper.appendChild(input);

    sliderInputs.set(definition.id, input);
    sliderContainer.appendChild(wrapper);
  });
};

const createChart = () => {
  const ctx = document.getElementById('historyChart');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: sliderDefinitions.map((definition, index) => ({
        label: definition.label,
        data: [],
        borderColor: palette[index % palette.length],
        backgroundColor: hexToRgba(palette[index % palette.length]),
        borderWidth: 2,
        tension: 0.2,
        pointRadius: 3,
        spanGaps: true
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${context.parsed.y}`
          }
        }
      },
      scales: {
        y: {
          suggestedMin: 0,
          suggestedMax: 10,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
};

const getFormValues = () => {
  const values = {};
  sliderDefinitions.forEach((definition) => {
    const input = sliderInputs.get(definition.id);
    values[definition.id] = Number(input.value);
  });
  return values;
};

const resetSliders = () => {
  sliderInputs.forEach((input) => {
    const defaultValue = Number(input.dataset.defaultValue);
    input.value = defaultValue;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

const updateChart = (entries) => {
  if (!chart) return;

  chart.data.labels = entries.map((entry) => {
    const date = new Date(entry.recordedAt);
    const options = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
    return date.toLocaleString(undefined, options);
  });

  chart.data.datasets.forEach((dataset, index) => {
    const definition = sliderDefinitions[index];
    dataset.data = entries.map((entry) => entry.sliders?.[definition.id] ?? null);
  });

  chart.update();
};

const refreshEntries = async () => {
  try {
    const response = await fetch('/api/entries');
    if (!response.ok) {
      throw new Error('Unable to load history');
    }
    const entries = await response.json();
    updateChart(entries);
  } catch (error) {
    setStatus(error.message, 'error');
  }
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('Saving entry...');

  try {
    const response = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sliders: getFormValues() })
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || 'Unable to save entry');
    }

    setStatus('Entry saved!', 'success');
    await refreshEntries();
  } catch (error) {
    setStatus(error.message, 'error');
  }
});

refreshButton.addEventListener('click', () => {
  refreshEntries();
});

resetButton.addEventListener('click', () => {
  resetSliders();
  setStatus('Sliders reset');
});

const bootstrap = async () => {
  try {
    const response = await fetch('/api/sliders');
    if (!response.ok) {
      throw new Error('Unable to load slider definitions');
    }

    const data = await response.json();
    sliderDefinitions = data.sliders;
    renderSliders(sliderDefinitions);
    createChart();
    await refreshEntries();
  } catch (error) {
    setStatus(error.message, 'error');
  }
};

bootstrap();
