const API_BASE_URL = '/api/v1';

// Check system health on load
document.addEventListener('DOMContentLoaded', () => {
  checkHealth();
  setupFormSubmission();
});

async function checkHealth() {
  const statusDot = document.querySelector('.status-dot');
  const statusText = document.getElementById('status-text');
  
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    
    if (data.status === 'healthy') {
      statusDot.classList.add('healthy');
      statusText.textContent = 'Система готова к работе';
    } else {
      statusDot.classList.add('error');
      statusText.textContent = 'Система частично доступна';
    }
  } catch (error) {
    statusDot.classList.add('error');
    statusText.textContent = 'Ошибка подключения к серверу';
    console.error('Health check failed:', error);
  }
}

function setupFormSubmission() {
  const form = document.getElementById('story-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await generateStory();
  });
}

async function generateStory() {
  const form = document.getElementById('story-form');
  const submitBtn = document.getElementById('submit-btn');
  const loading = document.getElementById('loading');
  const resultContainer = document.getElementById('result-container');
  const errorMessage = document.getElementById('error-message');
  
  // Hide previous results and errors
  resultContainer.style.display = 'none';
  errorMessage.style.display = 'none';
  
  // Show loading
  loading.style.display = 'block';
  submitBtn.disabled = true;
  
  // Collect form data
  const formData = {
    prompt: document.getElementById('prompt').value,
    genre: document.getElementById('genre').value || undefined,
    characters: document.getElementById('characters').value 
      ? document.getElementById('characters').value.split(',').map(c => c.trim())
      : undefined,
    setting: document.getElementById('setting').value || undefined,
    length: document.getElementById('length').value,
    temperature: parseFloat(document.getElementById('temperature').value),
    top_p: parseFloat(document.getElementById('top_p').value)
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Ошибка генерации истории');
    }
    
    const data = await response.json();
    
    // Display story
    displayStory(data);
    
  } catch (error) {
    console.error('Error:', error);
    errorMessage.textContent = `Ошибка: ${error.message}`;
    errorMessage.style.display = 'block';
  } finally {
    loading.style.display = 'none';
    submitBtn.disabled = false;
  }
}

function displayStory(data) {
  const resultContainer = document.getElementById('result-container');
  const storyOutput = document.getElementById('story-output');
  const storyMetadata = document.getElementById('story-metadata');
  
  // Display story text
  storyOutput.textContent = data.story;
  
  // Display metadata
  const metadata = data.metadata;
  storyMetadata.innerHTML = `
    <span><strong>Длина:</strong> ${getLengthLabel(metadata.length)}</span>
    <span><strong>Слов:</strong> ${metadata.word_count}</span>
    <span><strong>Время генерации:</strong> ${metadata.generation_time}с</span>
    <span><strong>Температура:</strong> ${metadata.temperature}</span>
  `;
  
  // Show result container
  resultContainer.style.display = 'block';
  
  // Scroll to result
  resultContainer.scrollIntoView({ behavior: 'smooth' });
}

function getLengthLabel(length) {
  const labels = {
    'short': 'Короткая',
    'medium': 'Средняя',
    'long': 'Длинная'
  };
  return labels[length] || length;
}

function copyStory() {
  const storyText = document.getElementById('story-output').textContent;
  
  navigator.clipboard.writeText(storyText).then(() => {
    alert('История скопирована в буфер обмена!');
  }).catch(err => {
    console.error('Failed to copy:', err);
    alert('Не удалось скопировать историю');
  });
}

function resetForm() {
  document.getElementById('story-form').reset();
  document.getElementById('result-container').style.display = 'none';
  document.getElementById('temp-value').textContent = '0.8';
  document.getElementById('topp-value').textContent = '0.95';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function showStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/statistics`);
    const data = await response.json();
    
    const message = `
📊 Статистика системы:

• Фрагментов в базе: ${data.total_chunks}
• Модель эмбеддингов: ${data.embedding_model}
• LLM модель: ${data.llm_model}
• Размер фрагмента: ${data.chunk_size}
• Перекрытие: ${data.chunk_overlap}
    `;
    
    alert(message);
  } catch (error) {
    alert('Не удалось загрузить статистику');
    console.error('Stats error:', error);
  }
}
