const taskInput = document.getElementById("taskInput");
const timeInput = document.getElementById("timeInput");
const priorityInput = document.getElementById("priorityInput");
const timePicker = document.getElementById("timePicker");
const alarmAudio = document.getElementById("alarmSound");

let taskChart;

if("Notification" in window) Notification.requestPermission();

window.onload = () => {
  const savedTasks = JSON.parse(localStorage.getItem("dailyTasks")) || [];
  savedTasks.forEach(task => renderTask(task.text, task.time, task.completed, task.schedule, task.priority));
  highlightTasks();
  updateDashboard();
  setInterval(() => { highlightTasks(); checkAlarms(); }, 60000);
};

function addTask() {
  const text = taskInput.value.trim();
  const time = timeInput.value;
  const schedule = timePicker.value;
  const priority = priorityInput.value;

  if(!text) return;

  renderTask(text, time, false, schedule, priority);
  saveTasks();
  updateDashboard();
  taskInput.value = "";
  timePicker.value = "";
}

function renderTask(text, time, completed, schedule, priority) {
  const ul = document.getElementById(time+"List");
  const li = document.createElement("li");
  li.classList.add(priority);
  if(completed) li.classList.add("completed");

  const span = document.createElement("span");
  span.textContent = schedule ? `${text} (${schedule})` : text;

  const actions = document.createElement("div");
  actions.className = "actions";

  const completeBtn = document.createElement("button");
  completeBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
  completeBtn.className = "complete";
  completeBtn.onclick = () => { li.classList.toggle("completed"); saveTasks(); updateDashboard(); };

  const deleteBtn = document.createElement("button");
  deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
  deleteBtn.className = "delete";
  deleteBtn.onclick = () => { li.remove(); saveTasks(); updateDashboard(); };

  actions.appendChild(completeBtn);
  actions.appendChild(deleteBtn);
  li.appendChild(span);
  li.appendChild(actions);
  ul.appendChild(li);
}

function saveTasks() {
  const tasks = [];
  ["morning","afternoon","evening","night"].forEach(time => {
    document.querySelectorAll(`#${time}List li`).forEach(li => {
      tasks.push({
        text: li.querySelector("span").textContent.replace(/\(\d{2}:\d{2}\)$/, "").trim(),
        time: time,
        completed: li.classList.contains("completed"),
        schedule: (li.querySelector("span").textContent.match(/\d{2}:\d{2}/) || [null])[0],
        priority: Array.from(li.classList).find(c => ["High","Medium","Low"].includes(c)) || "Low",
        notified: li.classList.contains("notified")
      });
    });
  });
  localStorage.setItem("dailyTasks", JSON.stringify(tasks));
}

function highlightTasks() {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  document.querySelectorAll("li").forEach(li => {
    const text = li.querySelector("span").textContent;
    const match = text.match(/\d{2}:\d{2}/);
    if(match && match[0] <= currentTime && !li.classList.contains("completed")) li.classList.add("highlight");
    else li.classList.remove("highlight");
  });
}

function checkAlarms() {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const tasks = JSON.parse(localStorage.getItem("dailyTasks")) || [];

  tasks.forEach(task => {
    if(task.schedule === currentTime && !task.completed && !task.notified) {
      if(Notification.permission === "granted") {
        new Notification("Task Reminder", { body: `${task.text} scheduled for ${task.schedule}` });
      }
      alarmAudio.play();
      task.notified = true;
    }
  });
  localStorage.setItem("dailyTasks", JSON.stringify(tasks));
}

function updateDashboard() {
  const tasks = JSON.parse(localStorage.getItem("dailyTasks")) || [];
  const completedCount = tasks.filter(t=>t.completed).length;
  const pendingCount = tasks.length - completedCount;

  document.getElementById("completedCount").textContent = completedCount;
  document.getElementById("pendingCount").textContent = pendingCount;

  const ctx = document.getElementById('taskChart').getContext('2d');
  const data = [completedCount,pendingCount];

  if(taskChart) {
    taskChart.data.datasets[0].data = data;
    taskChart.update();
  } else {
    taskChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Completed','Pending'],
        datasets: [{
          data: data,
          backgroundColor: ['#28a745','#ff9800'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend:{ position:'bottom' },
          title:{ display:true, text:'Task Completion Progress' }
        }
      }
    });
  }
}
