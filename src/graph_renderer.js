const ctx = document.getElementById('focusChart').getContext('2d');
let chart;

document.getElementById('refreshButton').addEventListener('click', refreshData);

function createChart(labels, data) {
  if (chart) {
    chart.destroy();
  }

  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Focus Time (Minutes)',
          data: data,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
          borderRadius: 5,
          barPercentage: 0.6,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Time (Minutes)',
            color: '#fff',
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
          },
          ticks: {
            color: '#fff',
          },
        },
        x: {
          title: {
            display: true,
            text: 'Day',
            color: '#fff',
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
          },
          ticks: {
            color: '#fff',
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: '#fff',
          },
        },
      },
    },
  });
}

async function fetchFocusDataFromFirestore() {
  const loadingSpinner = document.getElementById('loadingSpinner');
  loadingSpinner.classList.remove('d-none');

  try {
    const userId = await window.firebaseAPI.getCurrentUserId(); 
    const focusLogs = await window.firebaseAPI.getDoc('focusLogs', userId); // All focus logs for this user
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();

    // Generate data for the last 7 days
    const data = labels.map((_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index)); // Generate dates for Mon-Sun

      const dateString = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      return focusLogs[dateString]?.focusTimeMinutes || 0;
    });

    createChart(labels, data);
  } catch (error) {
    console.error('Error fetching focus data:', error);
    alert('Failed to fetch focus data. Please try again later.');
  } finally {
    loadingSpinner.classList.add('d-none');
  }
}

function refreshData() {
  fetchFocusDataFromFirestore();
}

// Initial data fetch
fetchFocusDataFromFirestore();
