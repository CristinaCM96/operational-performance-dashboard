const entryForm = document.getElementById("entryForm");
const entryList = document.getElementById("entryList");
const exportCsvBtn = document.getElementById("exportCsvBtn");

const totalDevicesEl = document.getElementById("totalDevices");
const avgTimeEl = document.getElementById("avgTime");
const totalErrorsEl = document.getElementById("totalErrors");
const errorRateEl = document.getElementById("errorRate");
const successRateEl = document.getElementById("successRate");
const successTargetEl = document.getElementById("successTarget");
const efficiencyScoreEl = document.getElementById("efficiencyScore");
const totalPartsEl = document.getElementById("totalParts");

const searchInput = document.getElementById("searchInput");
const filterDate = document.getElementById("filterDate");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const sortSelect = document.getElementById("sortSelect");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const importJsonInput = document.getElementById("importJsonInput");

const timerDisplay = document.getElementById("timerDisplay");
const startTimerBtn = document.getElementById("startTimerBtn");
const pauseTimerBtn = document.getElementById("pauseTimerBtn");
const resetTimerBtn = document.getElementById("resetTimerBtn");
const useTimerBtn = document.getElementById("useTimerBtn");

const weeklyTasksEl = document.getElementById("weeklyTasks");
const weeklyEfficiencyEl = document.getElementById("weeklyEfficiency");
const weeklyWorkingTimeEl = document.getElementById("weeklyWorkingTime");
const weeklyErrorsEl = document.getElementById("weeklyErrors");

const monthlyTasksEl = document.getElementById("monthlyTasks");
const monthlyEfficiencyEl = document.getElementById("monthlyEfficiency");
const monthlyWorkingTimeEl = document.getElementById("monthlyWorkingTime");
const monthlyErrorsEl = document.getElementById("monthlyErrors");

let entries = JSON.parse(localStorage.getItem("opsTrackerEntries")) || [];
let editingId = null;

let timerSeconds = 0;
let timerInterval = null;

let efficiencyChartInstance = null;
let devicesErrorsChartInstance = null;

function saveEntries() {
  localStorage.setItem("opsTrackerEntries", JSON.stringify(entries));
}

function getWorkingTime(entry) {
  return Math.max(entry.actualTime - entry.downtime, 1);
}

function getEfficiency(entry) {
  return Math.round((entry.estimatedTime / getWorkingTime(entry)) * 100);
}

function getFilteredAndSortedEntries() {
  const searchValue = searchInput.value.toLowerCase();
  const selectedDate = filterDate.value;

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = entry.deviceType.toLowerCase().includes(searchValue);
    const matchesDate = !selectedDate || entry.date === selectedDate;

    return matchesSearch && matchesDate;
  });

  return [...filteredEntries].sort((a, b) => {
    if (sortSelect.value === "newest") return b.id - a.id;
    if (sortSelect.value === "oldest") return a.id - b.id;
    if (sortSelect.value === "best") return getEfficiency(b) - getEfficiency(a);
    if (sortSelect.value === "worst") return getEfficiency(a) - getEfficiency(b);
    if (sortSelect.value === "errors") return b.errors - a.errors;

    return 0;
  });
}

function getEfficiencyClass(efficiency) {
  if (efficiency >= 120) return "efficiency-green";
  if (efficiency >= 90) return "efficiency-orange";
  return "efficiency-red";
}

function isThisWeek(dateString) {
  const entryDate = new Date(dateString);
  const today = new Date();

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  return entryDate >= startOfWeek && entryDate < endOfWeek;
}

function isThisMonth(dateString) {
  const entryDate = new Date(dateString);
  const today = new Date();

  return (
    entryDate.getFullYear() === today.getFullYear() &&
    entryDate.getMonth() === today.getMonth()
  );
}

function getOverviewStats(filteredEntries) {
  const tasks = filteredEntries.length;

  const totalEstimatedTime = filteredEntries.reduce(
    (sum, entry) => sum + entry.estimatedTime,
    0
  );

  const totalWorkingTime = filteredEntries.reduce(
    (sum, entry) => sum + getWorkingTime(entry),
    0
  );

  const errors = filteredEntries.reduce(
    (sum, entry) => sum + entry.errors,
    0
  );

  const efficiency =
    totalWorkingTime > 0
      ? Math.round((totalEstimatedTime / totalWorkingTime) * 100)
      : 0;

  return {
    tasks,
    efficiency,
    workingTime: totalWorkingTime,
    errors
  };
}

function updateOverview() {
  const weeklyEntries = entries.filter((entry) => isThisWeek(entry.date));
  const monthlyEntries = entries.filter((entry) => isThisMonth(entry.date));

  const weekly = getOverviewStats(weeklyEntries);
  const monthly = getOverviewStats(monthlyEntries);

  weeklyTasksEl.textContent = weekly.tasks;
  weeklyEfficiencyEl.textContent = `${weekly.efficiency}%`;
  weeklyWorkingTimeEl.textContent = `${weekly.workingTime} min`;
  weeklyErrorsEl.textContent = weekly.errors;

  monthlyTasksEl.textContent = monthly.tasks;
  monthlyEfficiencyEl.textContent = `${monthly.efficiency}%`;
  monthlyWorkingTimeEl.textContent = `${monthly.workingTime} min`;
  monthlyErrorsEl.textContent = monthly.errors;
}

function updateStats() {
  const totalDevices = entries.length;

  const totalEstimatedTime = entries.reduce(
    (sum, entry) => sum + entry.estimatedTime,
    0
  );

  const totalWorkingTime = entries.reduce(
    (sum, entry) => sum + getWorkingTime(entry),
    0
  );

  const totalErrors = entries.reduce((sum, entry) => sum + entry.errors, 0);

  const totalParts = entries.reduce(
    (sum, entry) => sum + (entry.partsRequested || 0),
    0
  );

  const efficiency =
    totalWorkingTime > 0
      ? Math.round((totalEstimatedTime / totalWorkingTime) * 100)
      : 0;

  const errorRate =
    totalDevices > 0
      ? Math.round((totalErrors / totalDevices) * 100)
      : 0;

  const successfulDevices = Math.max(totalDevices - totalErrors, 0);

  const successRate =
    totalDevices > 0
      ? Math.round((successfulDevices / totalDevices) * 100)
      : 0;

  let neededFor90 = 0;

  while (
    totalDevices + neededFor90 > 0 &&
    ((successfulDevices + neededFor90) / (totalDevices + neededFor90)) * 100 < 90
  ) {
    neededFor90++;
  }

  totalDevicesEl.textContent = totalDevices;
  avgTimeEl.textContent =
    totalDevices > 0 ? `${Math.round(totalWorkingTime / totalDevices)} min` : "0 min";
  totalErrorsEl.textContent = totalErrors;
  efficiencyScoreEl.textContent = `${efficiency}%`;
  errorRateEl.textContent = `${errorRate}%`;
  successRateEl.textContent = `${successRate}%`;
  totalPartsEl.textContent = totalParts;

  successTargetEl.textContent =
    successRate >= 90 ? "On target" : `${neededFor90} clean`;

  if (efficiency >= 120) {
    efficiencyScoreEl.style.color = "#4ade80";
  } else if (efficiency >= 90) {
    efficiencyScoreEl.style.color = "#facc15";
  } else {
    efficiencyScoreEl.style.color = "#f87171";
  }

  if (successRate >= 95) {
    successRateEl.style.color = "#4ade80";
  } else if (successRate >= 90) {
    successRateEl.style.color = "#facc15";
  } else {
    successRateEl.style.color = "#f87171";
  }

  if (errorRate <= 5) {
    errorRateEl.style.color = "#4ade80";
  } else if (errorRate <= 10) {
    errorRateEl.style.color = "#facc15";
  } else {
    errorRateEl.style.color = "#f87171";
  }
}

function renderChart() {
  const chartWrapper = document.querySelector(".chart-wrapper");

  if (efficiencyChartInstance) {
    efficiencyChartInstance.destroy();
    efficiencyChartInstance = null;
  }

  if (entries.length === 0) {
    chartWrapper.innerHTML = `
      <div class="chart-empty-state">
        <div class="chart-empty-icon">📊</div>
        <h3>No performance data yet</h3>
        <p>Add your first operational task entry to generate analytics and efficiency insights.</p>
      </div>
    `;
    return;
  }

  chartWrapper.innerHTML = `<canvas id="efficiencyChart"></canvas>`;

  const canvas = document.getElementById("efficiencyChart");
  const displayEntries = getFilteredAndSortedEntries();

  if (displayEntries.length === 0) {
    chartWrapper.innerHTML = `
      <div class="chart-empty-state">
        <div class="chart-empty-icon">🔎</div>
        <h3>No matching chart data</h3>
        <p>Try adjusting your search, date filter, or sorting options.</p>
      </div>
    `;
    return;
  }

  const labels = displayEntries.map(
    (entry) => `${entry.deviceType} (${entry.date})`
  );

  const data = displayEntries.map((entry) => getEfficiency(entry));

  const colors = data.map((efficiency) => {
    if (efficiency >= 120) return "#4ade80";
    if (efficiency >= 90) return "#facc15";
    return "#f87171";
  });

  efficiencyChartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Efficiency %",
          data,
          backgroundColor: colors,
          borderRadius: 8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#9ca3af"
          },
          grid: {
            color: "#374151"
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#9ca3af"
          },
          grid: {
            color: "#374151"
          }
        }
      }
    }
  });
}

function renderDevicesErrorsChart() {
  const canvas = document.getElementById("devicesErrorsChart");

  if (!canvas) return;

  if (devicesErrorsChartInstance) {
    devicesErrorsChartInstance.destroy();
    devicesErrorsChartInstance = null;
  }

  const displayEntries = getFilteredAndSortedEntries();

  const deviceStats = {};

  displayEntries.forEach((entry) => {
    if (!deviceStats[entry.deviceType]) {
      deviceStats[entry.deviceType] = {
        completed: 0,
        errors: 0
      };
    }

    deviceStats[entry.deviceType].completed += 1;
    deviceStats[entry.deviceType].errors += entry.errors;
  });

  const labels = Object.keys(deviceStats);
  const completedData = labels.map((device) => deviceStats[device].completed);
  const errorData = labels.map((device) => deviceStats[device].errors);

  devicesErrorsChartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Devices Completed",
          data: completedData,
          backgroundColor: "#4ade80",
          borderRadius: 8
        },
        {
          label: "Errors",
          data: errorData,
          backgroundColor: "#f87171",
          borderRadius: 8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#f9fafb"
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#9ca3af"
          },
          grid: {
            color: "#374151"
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#9ca3af",
            stepSize: 1
          },
          grid: {
            color: "#374151"
          }
        }
      }
    }
  });
}

function renderEntries() {
  entryList.innerHTML = "";

  if (entries.length === 0) {
    entryList.innerHTML = `
      <p class="empty-state">No entries yet. Add your first work entry.</p>
    `;
    return;
  }

  const displayEntries = getFilteredAndSortedEntries();

  if (displayEntries.length === 0) {
    entryList.innerHTML = `
      <p class="empty-state">No matching entries found.</p>
    `;
    return;
  }

  displayEntries.forEach((entry) => {
    const entryWorkingTime = getWorkingTime(entry);
    const entryEfficiency = getEfficiency(entry);
    const efficiencyClass = getEfficiencyClass(entryEfficiency);

    const entryCard = document.createElement("article");
    entryCard.className = "entry-card";

    entryCard.innerHTML = `
      <div class="entry-card-header">
        <div>
          <h3>${entry.deviceType}</h3>
          <p class="entry-date">${entry.date}</p>
        </div>

        <div class="entry-actions">
          <span class="efficiency-badge ${efficiencyClass}">
            ${entryEfficiency}%
          </span>

          <button class="edit-btn" data-id="${entry.id}">Edit</button>
          <button class="delete-btn" data-id="${entry.id}">Delete</button>
        </div>
      </div>

      <div class="entry-details">
        <p><strong>${entry.estimatedTime}</strong> min estimated</p>
        <p><strong>${entry.actualTime}</strong> min actual</p>
        <p><strong>${entryWorkingTime}</strong> min working time</p>
        <p><strong>${entry.errors}</strong> errors</p>
        <p><strong>${entry.partsRequested || 0}</strong> parts requested</p>
        <p><strong>${entry.downtime}</strong> min downtime</p>
      </div>

      ${entry.notes ? `<p class="entry-notes">${entry.notes}</p>` : ""}
    `;

    entryList.appendChild(entryCard);
  });
}

function exportToCsv() {
  if (entries.length === 0) {
    alert("No entries to export yet.");
    return;
  }

  const headers = [
    "Date",
    "Device Type",
    "Estimated Time",
    "Actual Time",
    "Downtime",
    "Working Time",
    "Errors",
    "Parts Requested",
    "Efficiency",
    "Notes"
  ];

  const rows = entries.map((entry) => [
    entry.date,
    entry.deviceType,
    entry.estimatedTime,
    entry.actualTime,
    entry.downtime,
    getWorkingTime(entry),
    entry.errors,
    entry.partsRequested || 0,
    `${getEfficiency(entry)}%`,
    entry.notes
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "operational-performance-dashboard-export.csv";
  link.click();

  URL.revokeObjectURL(url);
}
function exportToJson() {
  if (entries.length === 0) {
    alert("No entries to back up yet.");
    return;
  }

  const backup = {
    app: "Operational Performance Dashboard",
    exportedAt: new Date().toISOString(),
    entries: entries
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "operational-performance-dashboard-backup.json";
  link.click();

  URL.revokeObjectURL(url);
}

function importFromJson(event) {
  const file = event.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = function () {
    try {
      const backup = JSON.parse(reader.result);

      if (!backup.entries || !Array.isArray(backup.entries)) {
        alert("Invalid backup file.");
        return;
      }

      entries = backup.entries;
      saveEntries();

      renderEntries();
      renderChart();
      renderDevicesErrorsChart();
      updateStats();
      updateOverview();

      alert("Backup imported successfully.");
    } catch (error) {
      alert("Could not import backup file.");
    }
  };

  reader.readAsText(file);
}
function editEntry(id) {
  const entryToEdit = entries.find((entry) => entry.id === id);

  if (!entryToEdit) return;

  document.getElementById("workDate").value = entryToEdit.date;
  document.getElementById("deviceType").value = entryToEdit.deviceType;
  document.getElementById("estimatedTime").value = entryToEdit.estimatedTime;
  document.getElementById("actualTime").value = entryToEdit.actualTime;
  document.getElementById("errors").value = entryToEdit.errors;
  document.getElementById("partsRequested").value = entryToEdit.partsRequested || 0;
  document.getElementById("downtime").value = entryToEdit.downtime;
  document.getElementById("notes").value = entryToEdit.notes;

  editingId = id;
  document.querySelector(".primary-btn").textContent = "Update Entry";
}

function deleteEntry(id) {
  entries = entries.filter((entry) => entry.id !== id);

  saveEntries();
  renderEntries();
  renderChart();
  renderDevicesErrorsChart();
  updateStats();
  updateOverview();
}

entryForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const entryData = {
    id: editingId || Date.now(),
    date: document.getElementById("workDate").value,
    deviceType: document.getElementById("deviceType").value.trim(),
    estimatedTime: Number(document.getElementById("estimatedTime").value),
    actualTime: Number(document.getElementById("actualTime").value),
    errors: Number(document.getElementById("errors").value),
    partsRequested: Number(document.getElementById("partsRequested").value),
    downtime: Number(document.getElementById("downtime").value),
    notes: document.getElementById("notes").value.trim()
  };

  if (editingId) {
    entries = entries.map((entry) =>
      entry.id === editingId ? entryData : entry
    );

    editingId = null;
    document.querySelector(".primary-btn").textContent = "Save Entry";
  } else {
    entries.unshift(entryData);
  }

  saveEntries();
  renderEntries();
  renderChart();
  renderDevicesErrorsChart();
  updateStats();
  updateOverview();

  entryForm.reset();
  document.getElementById("workDate").valueAsDate = new Date();
  resetTimer();
});

function formatTimer(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function updateTimerDisplay() {
  timerDisplay.textContent = formatTimer(timerSeconds);
}

function startTimer() {
  if (timerInterval) return;

  timerInterval = setInterval(() => {
    timerSeconds++;
    updateTimerDisplay();
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  pauseTimer();
  timerSeconds = 0;
  updateTimerDisplay();
}

function useTimerTime() {
  const roundedMinutes = Math.max(Math.round(timerSeconds / 60), 1);
  document.getElementById("actualTime").value = roundedMinutes;
}

entryList.addEventListener("click", (event) => {
  if (event.target.classList.contains("delete-btn")) {
    const id = Number(event.target.dataset.id);
    deleteEntry(id);
  }

  if (event.target.classList.contains("edit-btn")) {
    const id = Number(event.target.dataset.id);
    editEntry(id);
  }
});

function refreshFilteredViews() {
  renderEntries();
  renderChart();
  renderDevicesErrorsChart();
}

searchInput.addEventListener("input", refreshFilteredViews);
filterDate.addEventListener("change", refreshFilteredViews);
sortSelect.addEventListener("change", refreshFilteredViews);

clearFiltersBtn.addEventListener("click", () => {
  searchInput.value = "";
  filterDate.value = "";
  sortSelect.value = "newest";

  refreshFilteredViews();
});

exportCsvBtn.addEventListener("click", exportToCsv);
exportJsonBtn.addEventListener("click", exportToJson);
importJsonInput.addEventListener("change", importFromJson);

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.key === "Enter") {
    event.preventDefault();
    entryForm.requestSubmit();
  }

  if (event.key === "Escape") {
    editingId = null;
    entryForm.reset();
    document.getElementById("workDate").valueAsDate = new Date();
    resetTimer();
    document.querySelector(".primary-btn").textContent = "Save Entry";
  }

  if (event.ctrlKey && event.key.toLowerCase() === "f") {
    event.preventDefault();
    searchInput.focus();
  }

  if (event.ctrlKey && event.key.toLowerCase() === "e") {
    event.preventDefault();
    exportToCsv();
  }
});

if (startTimerBtn && pauseTimerBtn && resetTimerBtn && useTimerBtn) {
  startTimerBtn.addEventListener("click", startTimer);
  pauseTimerBtn.addEventListener("click", pauseTimer);
  resetTimerBtn.addEventListener("click", resetTimer);
  useTimerBtn.addEventListener("click", useTimerTime);
}

document.getElementById("workDate").valueAsDate = new Date();

renderEntries();
renderChart();
renderDevicesErrorsChart();
updateStats();
updateOverview();