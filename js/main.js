// sample habits 
var habits = [
	{ id: 1, name: "Morning Meditation", category: "Good Habit", streak: 7 },
	{ id: 2, name: "30-min Exercise", category: "Health", streak: 3 },
	{ id: 3, name: "Read 10 pages", category: "Learning", streak: 12 }
]

// get DOMS
var habitsList = document.getElementById("habitsList");
var calendar = document.getElementById("calendar");

function showHabits() {
	let html = "";
	for (let i = 0; i < habits.length; i++) {
    	html += `
			<div class="habit-card">
				<div class="habit-title">
				<strong>${habits[i].name}</strong>
				<span class="habit-category">${habits[i].category}</span>
				</div>
				<p>🔥 ${habits[i].streak} day streak</p>
			</div>
    	`;
  	}
  	habitsList.innerHTML = html;
}

function generateCalendar() {
	var days = ["Sun", "Mon", "Wed", "Thur", "Fri", "Sat"];
}

showHabits();
generateCalendar();