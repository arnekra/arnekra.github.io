"use strict";
function register() {
    const taskDiv = document.getElementById("task");
    const appDiv = document.getElementById("application");
    const dialogMask = document.getElementById("dialog-mask");
    const settingsDiv = document.getElementById("settings");
    const outerUserButton = document.getElementById("user");
    const closeUserDialog = document.getElementById("close-user-dialog");
    let answerRowCount = 2;
    let remainingTime = 0;
    let score = 0;
    let successCount = 0;
    let failCount = 0;
    let timerId = undefined;
    const userButtonClickHandlers = {};
    const norwegianTexts = {
        enterNamePrompt: "Venligst skriv navnet på den nye brukeren.",
    };
    let texts = norwegianTexts;
    function getDayNo() {
        return Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24));
    }
    function getWeekNo(dayNo) {
        return Math.floor((dayNo + 3) / 7);
    }
    function setupAddTask(rowCount) {
        const comb = Math.floor(Math.random() * 100) + 10;
        const a = Math.floor(comb / 10); // number between 1 and 10
        const b = comb % 10; // number between 0 and 9
        const swapped = Math.random() >= 0.5;
        const left = swapped ? b : a;
        const right = swapped ? a : b;
        const answer = left + right;
        return { left: left, right: right, answer: answer, scoreValue: answer };
    }
    function setupSubtractTask(rowCount) {
        const addTask = setupAddTask(rowCount);
        return { left: addTask.answer, right: addTask.right, answer: addTask.left, scoreValue: addTask.scoreValue };
    }
    function setupMultiplyTask(rowCount) {
        const comb = Math.floor(Math.random() * 10 * rowCount);
        const a = Math.floor(comb / 10) + 1; // number between 1 and rowCount
        const b = 1 + (comb % 10); // number between 1 and 10
        const swapped = Math.random() >= 0.5;
        const left = swapped ? b : a;
        const right = swapped ? a : b;
        const answer = left * right;
        return { left: left, right: right, answer: answer, scoreValue: a + b };
    }
    function setupDivideTask(rowCount) {
        const comb = Math.floor(Math.random() * 100) + 10;
        const a = Math.floor(comb / 10); // number between 1 and 10
        const b = comb % 10; // number between 0 and 9
        const left = a * b;
        const right = a;
        const answer = b;
        return { left: left, right: right, answer: answer, scoreValue: a + b };
    }
    ;
    const operatorInfoTab = {
        add: { text: " + ", setupTask: setupAddTask },
        subtract: { text: " - ", setupTask: setupSubtractTask },
        multiply: { text: " * ", setupTask: setupMultiplyTask },
        divide: { text: " / ", setupTask: setupDivideTask },
    };
    var currentOpType = "add";
    class ScoreItem {
        constructor(parsed, dayNo, weekNo) {
            this.dayGames = 0;
            this.dayScore = 0;
            this.dayRecord = 0;
            this.weekGames = 0;
            this.weekScore = 0;
            this.weekRecord = 0;
            this.totalGames = 0;
            this.totalScore = 0;
            this.totalRecord = 0;
            if (!parsed)
                return;
            if (typeof (parsed.hiScore) === 'number') {
                this.totalRecord = parsed.hiScore;
            }
            else {
                if (typeof (parsed.totalGames) === 'number')
                    this.totalGames = parsed.totalGames;
                if (typeof (parsed.totalScore) === 'number')
                    this.totalScore = parsed.totalScore;
                if (typeof (parsed.totalRecord) === 'number')
                    this.totalRecord = parsed.totalRecord;
            }
            if (typeof (parsed.dayNo) === 'number' && typeof (parsed.dayScore) === 'number'
                && typeof (parsed.dayGames) === 'number' && parsed.dayNo === dayNo) {
                this.dayScore = parsed.dayScore;
                this.dayGames = parsed.dayGames;
                if (typeof (parsed.dayRecord) === 'number')
                    this.dayRecord = parsed.dayRecord;
            }
            if (typeof (parsed.weekNo) === 'number' && typeof (parsed.weekScore) === 'number'
                && typeof (parsed.weekGames) === 'number' && parsed.weekNo === weekNo) {
                this.weekScore = parsed.weekScore;
                this.weekGames = parsed.weekGames;
                if (typeof (parsed.weekRecord) === 'number')
                    this.weekRecord = parsed.weekRecord;
            }
        }
    }
    class ScoreInfo {
        constructor(userId) {
            this.weekNo = 0;
            this.items = {};
            this.id = userId;
            this.dayNo = getDayNo();
            this.weekNo = getWeekNo(this.dayNo);
            const stored = localStorage.getItem('automath.scoreInfo.' + userId);
            const parsed = stored ? JSON.parse(stored) : undefined;
            if (parsed) {
                if (parsed.items && typeof (parsed.items) === "object") {
                    for (const opType in parsed.items) {
                        const parsedItem = parsed.items[opType];
                        this.items[opType] = new ScoreItem(parsedItem, this.dayNo, this.weekNo);
                    }
                }
                else if (parsed.hiScore || parsed.totalRecord) {
                    this.items["add"] = new ScoreItem(parsed, this.dayNo, this.weekNo);
                }
            }
            const types = ["add", "subtract", "multiply", "divide"];
            for (const opType of types) {
                if (!this.items[opType])
                    this.items[opType] = new ScoreItem();
            }
        }
        prepareNewGame() {
            const dayNo = getDayNo();
            if (dayNo != this.dayNo) {
                this.dayNo = dayNo;
                for (const opType in this.items) {
                    const item = this.items[opType];
                    item.dayGames = 0;
                    item.dayScore = 0;
                    item.dayRecord = 0;
                }
            }
            const weekNo = getWeekNo(this.dayNo);
            if (weekNo != this.weekNo) {
                this.weekNo = weekNo;
                for (const opType in this.items) {
                    const item = this.items[opType];
                    item.weekGames = 0;
                    item.weekScore = 0;
                    item.weekRecord = 0;
                }
            }
        }
        save() {
            localStorage.setItem('automath.scoreInfo.' + this.id, JSON.stringify(this, (key, value) => {
                return key !== 'id' ? value : undefined;
            }));
        }
    }
    let currentScoreInfo = undefined;
    function updateScoreTable() {
        if (currentScoreInfo) {
            const scoreItem = currentScoreInfo.items[currentOpType];
            document.getElementById('dayGames').innerText = scoreItem.dayGames.toString();
            document.getElementById('dayScore').innerText = scoreItem.dayScore.toString();
            document.getElementById('dayRecord').innerText = scoreItem.dayRecord.toString();
            document.getElementById('weekGames').innerText = scoreItem.weekGames.toString();
            document.getElementById('weekScore').innerText = scoreItem.weekScore.toString();
            document.getElementById('weekRecord').innerText = scoreItem.weekRecord.toString();
            document.getElementById('totalGames').innerText = scoreItem.totalGames.toString();
            document.getElementById('totalScore').innerText = scoreItem.totalScore.toString();
            document.getElementById('totalRecord').innerText = scoreItem.totalRecord.toString();
        }
    }
    function setUser(id, name) {
        outerUserButton.innerText = name;
        currentScoreInfo = id !== 'anonym' ? new ScoreInfo(id) : undefined;
        const scoreTable = document.querySelector(".score-table");
        if (currentScoreInfo) {
            updateScoreTable();
            if (scoreTable)
                scoreTable.removeAttribute('style');
        }
        else if (scoreTable) {
            scoreTable.setAttribute('style', 'visibility: hidden;');
        }
    }
    class UserInfo {
        constructor() {
            this.nameMap = { anonym: 'ANONYM' };
            this.currentId = 'anonym';
            const stored = localStorage.getItem('automath.userinfo');
            const parsed = stored ? JSON.parse(stored) : undefined;
            if (typeof (parsed) === 'object' && typeof (parsed.nameMap) === 'object') {
                this.nameMap = parsed.nameMap;
                if (typeof (parsed.currentId) === 'string') {
                    this.currentId = parsed.currentId;
                }
            }
        }
        save() {
            localStorage.setItem('automath.userinfo', JSON.stringify(this));
        }
    }
    function selectUserButton(userInfo, id, userButton) {
        const selected = document.querySelector("div.user-container > div.selected");
        if (selected) {
            selected.removeAttribute("class");
        }
        userButton.setAttribute("class", "selected");
        userInfo.currentId = id;
        userInfo.save();
        setUser(id, userInfo.nameMap[id]);
    }
    function activateUserButton(userInfo, id, userButton) {
        const clickHandler = function () {
            selectUserButton(userInfo, id, userButton);
            userInfo.save();
        };
        userButton.addEventListener('click', clickHandler);
        userButtonClickHandlers[id] = { button: userButton, handler: clickHandler };
    }
    function appendUserButton(userInfo, container, id) {
        const name = userInfo.nameMap[id];
        const userButton = document.createElement('div');
        userButton.innerText = name;
        if (id == userInfo.currentId)
            userButton.setAttribute('class', 'selected');
        activateUserButton(userInfo, id, userButton);
        container.appendChild(userButton);
        return userButton;
    }
    function setupUserButtons(userInfo) {
        const container = document.querySelector("div.user-container");
        if (!container)
            return;
        container.innerHTML = '';
        for (const id in userInfo.nameMap) {
            if (userInfo.nameMap.hasOwnProperty(id)) {
                appendUserButton(userInfo, container, id);
            }
        }
    }
    function setupUserSupport() {
        if (typeof (Storage) !== "undefined") {
            outerUserButton.addEventListener("click", function () {
                dialogMask.setAttribute("class", "visible");
                settingsDiv.setAttribute("class", "visible");
            });
            const userInfo = new UserInfo();
            setupUserButtons(userInfo);
            const addUserButton = document.getElementById('addUser');
            const container = document.querySelector("div.user-container");
            if (addUserButton && container) {
                addUserButton.addEventListener('click', function () {
                    const name = prompt(texts.enterNamePrompt);
                    if (!name)
                        return;
                    let idBase = name.toLocaleLowerCase();
                    let newId = idBase;
                    let index = 0;
                    while (userInfo.nameMap[newId]) {
                        newId = idBase + (++index);
                    }
                    userInfo.nameMap[newId] = name.toLocaleUpperCase();
                    const newButton = appendUserButton(userInfo, container, newId);
                    selectUserButton(userInfo, newId, newButton);
                });
            }
            setUser(userInfo.currentId, userInfo.nameMap[userInfo.currentId]);
            outerUserButton.removeAttribute("style");
        }
    }
    function setupTask() {
        const operatorInfo = operatorInfoTab[currentOpType];
        const task = operatorInfo.setupTask(answerRowCount);
        taskDiv.setAttribute("answer", task.answer.toString());
        taskDiv.setAttribute("score-value", task.scoreValue.toString());
        appDiv.setAttribute("class", "active");
        taskDiv.innerText = task.left.toString() + operatorInfo.text + task.right.toString() + " =";
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
                    if (currentScoreInfo) {
                        const currentScoreItem = currentScoreInfo.items[currentOpType];
                        currentScoreItem.dayGames += 1;
                        document.getElementById('dayGames').innerText = currentScoreItem.dayGames.toString();
                        currentScoreItem.dayScore += score;
                        document.getElementById('dayScore').innerText = currentScoreItem.dayScore.toString();
                        if (score > currentScoreItem.dayRecord) {
                            currentScoreItem.dayRecord = score;
                            document.getElementById('dayRecord').innerText = score.toString();
                        }
                        currentScoreItem.weekGames += 1;
                        document.getElementById('weekGames').innerText = currentScoreItem.weekGames.toString();
                        currentScoreItem.weekScore += score;
                        document.getElementById('weekScore').innerText = currentScoreItem.weekScore.toString();
                        if (score > currentScoreItem.weekRecord) {
                            currentScoreItem.weekRecord = score;
                            document.getElementById('weekRecord').innerText = score.toString();
                        }
                        currentScoreItem.totalGames += 1;
                        document.getElementById('totalGames').innerText = currentScoreItem.totalGames.toString();
                        currentScoreItem.totalScore += score;
                        document.getElementById('totalScore').innerText = currentScoreItem.totalScore.toString();
                        if (score > currentScoreItem.totalRecord) {
                            currentScoreItem.totalRecord = score;
                            document.getElementById('totalRecord').innerText = score.toString();
                        }
                        currentScoreInfo.save();
                    }
                    setTimeout(function () {
                        scoreDiv.setAttribute("class", "score");
                        appDiv.setAttribute("class", "ready");
                        taskDiv.innerText = "? + ? =";
                    }, 2500);
                }
            }
        }, 100);
    }
    function updateDynamicRowCount() {
        const dx = document.body.offsetWidth;
        const dy = document.body.offsetHeight;
        const available = dy - 0.16 * dx;
        const rowCount = Math.max(Math.min(Math.floor(available / (0.075 * dx)), 9), 2);
        answerRowCount = rowCount;
        const className = "rows-" + rowCount;
        const multiplyButton = document.getElementById("multiply");
        multiplyButton.setAttribute("data-rows", className);
        if (multiplyButton.getAttribute("class") == "selected") {
            const clipperDiv = document.getElementById("clipper");
            clipperDiv.setAttribute("class", className);
        }
    }
    updateDynamicRowCount();
    window.addEventListener("resize", updateDynamicRowCount);
    // activate the operator selector buttons
    let opButtons = document.querySelectorAll("div.op-select > div");
    const clipperDiv = document.getElementById("clipper");
    opButtons.forEach((opButton, key, parent) => {
        opButton.addEventListener("click", (ev) => {
            if (opButton.getAttribute("class") == "selected")
                return;
            const oldOpBtn = document.querySelector("div.op-select > div.selected");
            oldOpBtn.removeAttribute("class");
            opButton.setAttribute("class", "selected");
            clipperDiv.setAttribute("class", opButton.getAttribute("data-rows") || "");
            currentOpType = opButton.id;
            const opInfo = operatorInfoTab[currentOpType];
            taskDiv.innerText = "?" + opInfo.text + "? =";
            updateScoreTable();
        });
    });
    for (let i = 0; i <= 90; ++i) {
        let btn = document.getElementById("a" + i);
        btn.addEventListener("click", function (ev) {
            if (appDiv.getAttribute("class") == "inactive")
                return;
            appDiv.setAttribute("class", "inactive");
            let answer = taskDiv.getAttribute("answer") || "";
            let ok = i.toString() == answer;
            let successButton = ok ? btn : document.getElementById("a" + answer);
            if (ok) {
                const scoreValue = parseInt(taskDiv.getAttribute("score-value") || "0");
                btn.setAttribute("class", "success");
                score += scoreValue;
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
    setupUserSupport();
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
        if (currentScoreInfo)
            currentScoreInfo.prepareNewGame();
    });
    const closeUserDialogClickHandler = function () {
        dialogMask.setAttribute("class", "hidden");
        settingsDiv.setAttribute("class", "hidden");
    };
    dialogMask.addEventListener("click", closeUserDialogClickHandler);
    closeUserDialog.addEventListener("click", closeUserDialogClickHandler);
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