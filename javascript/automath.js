"use strict";
function register() {
    let taskDiv = document.getElementById("task");
    let appDiv = document.getElementById("application");
    let remainingTime = 0;
    let score = 0;
    let successCount = 0;
    let failCount = 0;
    let timerId = undefined;
    function setupTask() {
        let comb = Math.floor(Math.random() * 100) + 10;
        let a = Math.floor(comb / 10);
        let b = comb % 10;
        let swapped = Math.random() >= 0.5;
        let left = swapped ? b : a;
        let right = swapped ? a : b;
        let answer = left + right;
        taskDiv.setAttribute("answer", answer.toString());
        appDiv.setAttribute("class", "active");
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
        remainingTime = 600;
        timerId = setInterval(function () {
            if (appDiv.getAttribute("class") == "active" && remainingTime > 0) {
                remainingTime -= 1;
                updateTime();
                if (remainingTime == 0) {
                    clearInterval(timerId);
                    timerId = undefined;
                    appDiv.setAttribute("class", "inactive");
                    let scoreDiv = document.getElementById("score");
                    scoreDiv.setAttribute("class", "score-hilite");
                    setTimeout(function () {
                        scoreDiv.setAttribute("class", "score");
                        appDiv.setAttribute("class", "ready");
                        taskDiv.innerText = "? + ? =";
                    }, 2500);
                }
            }
        }, 100);
    }
    for (let i = 1; i <= 20; ++i) {
        let btn = document.getElementById("a" + i);
        btn.addEventListener("click", function (ev) {
            if (appDiv.getAttribute("class") == "inactive")
                return;
            appDiv.setAttribute("class", "inactive");
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
    document.getElementById("start").addEventListener("click", function () {
        if (appDiv.getAttribute("class") != "ready")
            return;
        score = 0;
        successCount = 0;
        failCount = 0;
        updateScore();
        updateTime();
        startTimer();
        setupTask();
    });
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