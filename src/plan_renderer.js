document.addEventListener("DOMContentLoaded", () => {
    const taskList = document.getElementById("taskList");
    const addTaskButton = document.getElementById("addTaskButton");
    const taskForm = document.getElementById("taskForm");
    const taskNameInput = document.getElementById("taskName");
    const taskDurationInput = document.getElementById("taskDuration");
  
    let tasks = []; // Array to store tasks
    let userId;
    let draggedIndex = null;
  
    // Function to render tasks
    const renderTasks = () => {
      taskList.innerHTML = "";
      tasks.forEach((task, index) => {
        const taskItem = document.createElement("div");
        taskItem.classList.add("list-group-item");
        taskItem.setAttribute("draggable", "true");
        taskItem.dataset.index = index;
  
        taskItem.innerHTML = `
          <div>
            <span class="task-name">${task.name}</span> - 
            <span class="task-duration">${task.duration} mins</span>
          </div>
          <div class="btn-group">
            <button class="btn btn-sm btn-primary" onclick="editTask(${index})">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteTask(${index})">Delete</button>
          </div>
        `;
  
        // Add drag-and-drop event listeners
        taskItem.addEventListener("dragstart", handleDragStart);
        taskItem.addEventListener("dragover", handleDragOver);
        taskItem.addEventListener("drop", handleDrop);
        taskItem.addEventListener("dragend", handleDragEnd);
  
        taskList.appendChild(taskItem);
      });
    };
  
    // Drag-and-drop event handlers
    const handleDragStart = (e) => {
      e.target.classList.add("dragging");
      draggedIndex = e.target.dataset.index;
    };
  
    const handleDragOver = (e) => {
      e.preventDefault();
      const target = e.target.closest(".list-group-item");
      if (target && target !== taskList.children[draggedIndex]) {
        target.classList.add("drop-target");
      }
    };
  
    const handleDrop = (e) => {
      e.preventDefault();
      const target = e.target.closest(".list-group-item");
      if (target) {
        const targetIndex = target.dataset.index;
        [tasks[draggedIndex], tasks[targetIndex]] = [tasks[targetIndex], tasks[draggedIndex]];
        renderTasks();
      }
    };
  
    const handleDragEnd = (e) => {
      e.target.classList.remove("dragging");
      taskList.querySelectorAll(".list-group-item").forEach((item) => {
        item.classList.remove("drop-target");
      });
    };
  
    // Function to add a task
    const addTask = async (name, duration) => {
        tasks.push({ name, duration });
        renderTasks();
        await window.firebaseAPI.setDoc('users', userId, {tasks});
    };
  
    // Function to edit a task
    window.editTask = async (index) => {
        const task = tasks[index];
        taskNameInput.value = task.name;
        taskDurationInput.value = task.duration;
        new bootstrap.Modal("#addTaskModal").show();
        tasks.splice(index, 1);
        await window.firebaseAPI.setDoc('users', userId, {tasks});
    };
  
    // Function to delete a task
    window.deleteTask = async (index) => {
      tasks.splice(index, 1);
      renderTasks();
      await window.firebaseAPI.setDoc('users', userId, {tasks});
    };
  
    // Handle form submission
    taskForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = taskNameInput.value.trim();
      const duration = parseInt(taskDurationInput.value, 10);
      if (name && duration > 0) {
        await addTask(name, duration);
        taskForm.reset();
        bootstrap.Modal.getInstance(document.getElementById("addTaskModal")).hide();
      }
    });
  
    addTaskButton.addEventListener("click", () => {
      taskForm.reset();
      new bootstrap.Modal("#addTaskModal").show();
    });

    const init_task = async () => {
        userId = await window.firebaseAPI.getCurrentUserId();
        const userData = await window.firebaseAPI.getUserData(userId);
        tasks = userData.tasks;
        console.log(userId, tasks);
        renderTasks();
    }

    init_task();
  });
  