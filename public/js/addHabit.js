const goodGroup = document.getElementById("goodHabitsGroup");
const badGroup = document.getElementById("badHabitsGroup");
const goodSelect = document.getElementById("goodHabits");
const badSelect = document.getElementById("badHabits");



document.getElementById("habitType").addEventListener("change", function () {
		if (this.value === "good") {
			goodGroup.style.display = "block";
			badGroup.style.display = "none";
            goodSelect.value = "";
            badSelect.value = "";
		} else if (this.value === "bad") {
			badGroup.style.display = "block";
			goodGroup.style.display = "none";
            goodSelect.value = "";
            badSelect.value = "";
		} else {
			goodGroup.style.display = "none";
			badGroup.style.display = "none";
		}
	});