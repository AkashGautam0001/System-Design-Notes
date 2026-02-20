// MingleSphere Dashboard - Client-side JavaScript

document.addEventListener('DOMContentLoaded', () => {
  // Aggregation playground
  const runBtn = document.getElementById('run-pipeline');
  if (runBtn) {
    runBtn.addEventListener('click', runPipeline);
  }

  // JSON syntax highlighting for doc cards
  document.querySelectorAll('.doc-json code').forEach((block) => {
    block.innerHTML = syntaxHighlight(block.textContent);
  });
});

async function runPipeline() {
  const collection = document.getElementById('collection').value;
  const pipelineText = document.getElementById('pipeline').value;
  const resultsEl = document.querySelector('#results code');

  if (!pipelineText.trim()) {
    resultsEl.textContent = 'Please enter a pipeline.';
    return;
  }

  try {
    JSON.parse(pipelineText);
  } catch (e) {
    resultsEl.textContent = `Invalid JSON: ${e.message}`;
    return;
  }

  resultsEl.textContent = 'Running...';

  try {
    const response = await fetch('/aggregation/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection, pipeline: pipelineText }),
    });

    const data = await response.json();

    if (data.error) {
      resultsEl.textContent = `Error: ${data.error}`;
    } else {
      const json = JSON.stringify(data.results, null, 2);
      resultsEl.innerHTML = syntaxHighlight(json);
      resultsEl.insertAdjacentHTML(
        'beforebegin',
        `<div style="color: var(--accent-green); font-size: 0.85rem; margin-bottom: 8px;">${data.count} result(s)</div>`
      );
    }
  } catch (err) {
    resultsEl.textContent = `Request failed: ${err.message}`;
  }
}

function syntaxHighlight(json) {
  if (typeof json !== 'string') {
    json = JSON.stringify(json, null, 2);
  }
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

// Add syntax highlighting CSS
const style = document.createElement('style');
style.textContent = `
  .json-key { color: #58a6ff; }
  .json-string { color: #3fb950; }
  .json-number { color: #d29922; }
  .json-boolean { color: #bc8cff; }
  .json-null { color: #484f58; }
`;
document.head.appendChild(style);
