const form = document.getElementById("uploadForm");
const preview = document.getElementById("preview");
const results = document.getElementById("results");
const chartCanvas = document.getElementById("chart");
const downloadBtn = document.getElementById("downloadBtn");
const notification = document.getElementById("notification");

const aboutBtn = document.getElementById("aboutBtn");
const aboutModal = document.getElementById("aboutModal");
const closeAbout = document.getElementById("closeAbout");

let notificationTimeout;
let malariaChart = null; // 🆕 to store the chart instance

function showNotification(message, duration = 4000) {
  clearTimeout(notificationTimeout);
  notification.textContent = message;
  notification.classList.remove("hidden");
  notification.focus();

  if (duration > 0) {
    notificationTimeout = setTimeout(() => {
      notification.classList.add("hidden");
    }, duration);
  }
}

function truncateFilename(filename, maxLength = 30) {
  if (filename.length <= maxLength) return filename;
  const extIndex = filename.lastIndexOf(".");
  const ext = extIndex !== -1 ? filename.slice(extIndex) : "";
  const name = filename.slice(0, maxLength - ext.length - 3);
  return name + "..." + ext;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const files = document.getElementById("images").files;
  preview.innerHTML = "";
  results.innerHTML = "";
  chartCanvas.style.display = "none";

  if (malariaChart) {
    malariaChart.destroy(); // 🆕 destroy old chart if it exists
    malariaChart = null;
  }

  if (files.length === 0) {
    showNotification("⚠️ Please select at least one blood cell image to start detection.", 6000);
    return;
  } else {
    showNotification("Analyzing images, please wait... ⏳", 0);
  }

  Array.from(form.querySelectorAll("button")).forEach(btn => btn.disabled = true);

  [...files].forEach(file => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    preview.appendChild(img);
  });

  try {
    const formData = new FormData();
    [...files].forEach(file => formData.append("images", file));

    const response = await fetch("/predict", { method: "POST", body: formData });

    if (!response.ok) throw new Error("Prediction failed");

    const data = await response.json();

    if (!data.length) {
      showNotification("No images were processed. Please try again.", 6000);
      return;
    }

    notification.classList.add("hidden");
    results.innerHTML = "";

    let parasitizedCount = 0;
    let uninfectedCount = 0;

    data.forEach(result => {
      const container = document.createElement("div");
      container.classList.add("result-item");

      const labelClass = result.label === "Parasitized" ? "infected" : "uninfected";
      const explanation = result.label === "Parasitized"
        ? "Malaria parasites detected in this cell."
        : "Cell appears healthy without parasites.";

      container.innerHTML = `
        <strong title="${result.filename}">${truncateFilename(result.filename)}</strong>
        <span class="${labelClass}">${result.label}</span>
        <div class="confidence-bar">
          <div class="confidence-fill" style="width: ${result.confidence}%;"></div>
        </div>
        <small>${result.confidence}% confidence</small>
        <p class="explanation">${explanation}</p>
      `;

      results.appendChild(container);

      if (result.label === "Parasitized") parasitizedCount++;
      else uninfectedCount++;
    });

    malariaChart = new Chart(chartCanvas, {
      type: "bar",
      data: {
        labels: ["Parasitized", "Uninfected"],
        datasets: [{
          label: "Prediction Count",
          data: [parasitizedCount, uninfectedCount],
          backgroundColor: ["#e74c3c", "#27ae60"]
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true, precision: 0 }
        },
        plugins: { legend: { display: false } }
      }
    });

    chartCanvas.style.display = "block";
    results.focus();

  } catch (error) {
    showNotification("⚠️ Oops! Something went wrong. Please try again.", 6000);
    console.error(error);
  } finally {
    Array.from(form.querySelectorAll("button")).forEach(btn => btn.disabled = false);
  }
});

downloadBtn.addEventListener("click", () => {
  window.location.href = "/download";
});

aboutBtn.addEventListener("click", () => {
  aboutModal.classList.remove("hidden");
});

closeAbout.addEventListener("click", () => {
  aboutModal.classList.add("hidden");
});

window.addEventListener("click", (event) => {
  if (event.target === aboutModal) {
    aboutModal.classList.add("hidden");
  }
});
