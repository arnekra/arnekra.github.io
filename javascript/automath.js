"use strict";
function register() {
    let taskDiv = document.getElementById("task");
    let remainingTime = 600;
    let score = 0;
    let successCount = 0;
    let failCount = 0;
    function setupTask() {
        let comb = Math.floor(Math.random() * 100) + 1;
        let left = Math.floor(comb / 10);
        let right = comb % 10;
        let answer = left + right;
        taskDiv.setAttribute("answer", answer.toString());
        taskDiv.setAttribute("class", "active-task");
        taskDiv.innerText = left.toString() + " + " + right.toString() + " =";
    }
    function updateScore() {
        let scoreDiv = document.getElementById("score");
        scoreDiv.innerText = score.toString() + " (" + successCount.toString()
            + " av " + (successCount + failCount).toString() + ")";
    }
    function updateTime() {
        let timeDiv = document.getElementById("time");
        timeDiv.innerText = (remainingTime / 10).toFixed(1);
    }
    function startTimer() {
        setInterval(function () {
            if (taskDiv.getAttribute("class") == "active-task" && remainingTime > 0) {
                remainingTime -= 1;
                updateTime();
                if (remainingTime == 0) {
                    taskDiv.setAttribute("class", "inactive-task");
                }
            }
        }, 100);
    }
    for (let i = 1; i <= 20; ++i) {
        let btn = document.getElementById("a" + i);
        btn.addEventListener("click", function (ev) {
            if (taskDiv.getAttribute("class") == "inactive-task")
                return;
            taskDiv.setAttribute("class", "inactive-task");
            let answer = taskDiv.getAttribute("answer") || "";
            let ok = i.toString() == answer;
            let successButton = ok ? btn : document.getElementById("a" + answer);
            if (ok) {
                btn.setAttribute("class", "success");
                score += i;
                successCount += 1;
            }
            else {
                btn.setAttribute("class", "error");
                successButton.setAttribute("class", "correct");
                score = Math.max(0, score - 5);
                failCount += 1;
            }
            updateScore();
            setTimeout(function () {
                btn.removeAttribute("class");
                if (!ok) {
                    successButton.removeAttribute("class");
                }
                if (remainingTime > 0)
                    setupTask();
            }, 2000);
        });
    }
    updateScore();
    updateTime();
    startTimer();
    setupTask();
}
if (document.getElementById("a1") != null) {
    register();
}
else {
    document.addEventListener("DOMContentLoaded", function () {
        register();
    });
}
//# sourceMappingURL=automath.js.map