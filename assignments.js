
const assignmentsList = document.getElementById("allAssignmentsList");

const assignments = JSON.parse(
    localStorage.getItem("assignments")
) || [];

if (assignments.length === 0) {
    assignmentsList.textContent = "No assignments added yet.";
} else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    assignments.sort((a, b) => new Date(a.date) - new Date(b.date));


assignments.sort(function (a, b) {
    // Pending assignments always come first
    if (!a.completed && b.completed) return -1;
    if (a.completed && !b.completed) return 1;

    // Within each group, sort by due date
    const aDate = new Date(a.date + "T00:00:00");
    const bDate = new Date(b.date + "T00:00:00");

    return aDate - bDate;
});


assignments.forEach(function (assignment) {
        const dueDate = new Date(assignment.date + "T00:00:00");
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        
if (!assignment.completed &&
    dueDate.getTime() === tomorrow.getTime()) {

    const reminder = document.createElement("div");
    reminder.textContent =
        "🔔 Reminder: " + assignment.name +
        " is due tomorrow!";

    reminder.style.backgroundColor = "#fff3cd";
    reminder.style.color = "#856404";
    reminder.style.padding = "15px";
    reminder.style.margin = "10px 0";
    reminder.style.borderRadius = "10px";
    reminder.style.fontWeight = "bold";
    reminder.style.width = "fit-content";
reminder.style.maxWidth = "90%";
reminder.style.margin = "12px auto";
reminder.style.padding = "10px 18px";

    assignmentsList.appendChild(reminder);
}

        
        const card = document.createElement("div");
        card.className = "assignment-card";
        const heading = document.createElement("h3");
        const details = document.createElement("p");
        const status = document.createElement("p");

        heading.textContent = assignment.name;
        details.textContent =
            "Subject: " + assignment.subject +
            " | Due: " + assignment.date;

        status.textContent = assignment.completed
    
status.textContent = assignment.completed
    ? "Status: Completed ✓"
    : "Status: Pending !";


status.className = assignment.completed
    ? "status-completed"
    : "status-pending";
       

card.appendChild(heading);
card.appendChild(details);
card.appendChild(status);

// Mark Completed button
if (!assignment.completed) {
    const completeButton = document.createElement("button");
    completeButton.textContent = "✓ Mark Completed";
    completeButton.className = "complete-button";

    completeButton.onclick = function () {
        assignment.completed = true;

        localStorage.setItem(
            "assignments",
            JSON.stringify(assignments)
    
        );
        alert("✅ Assignment added successfully!");

        location.reload();
    };

    card.appendChild(completeButton);
}


// Delete button
const deleteButton = document.createElement("button");
deleteButton.textContent = "🗑️ Delete";
deleteButton.className = "delete-button";

deleteButton.onclick = function () {
    const confirmDelete = confirm(
        "Are you sure you want to delete this assignment?"
    );

    if (confirmDelete) {
        const updatedAssignments = assignments.filter(
            item => item !== assignment
        );

        localStorage.setItem(
            "assignments",
            JSON.stringify(updatedAssignments)
        );

        card.remove();
    }
};

card.appendChild(deleteButton);
assignmentsList.appendChild(card);

    });
}
