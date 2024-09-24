function register(): void {
	const taskDiv = document.getElementById("task") as HTMLElement;
	const appDiv = document.getElementById("application") as HTMLElement;
	const dialogMask = document.getElementById("dialog-mask") as HTMLElement;
	const settingsDiv = document.getElementById("settings") as HTMLElement;
	const outerUserButton = (document.getElementById("user") as HTMLElement);
	const closeUserDialog = (document.getElementById("close-user-dialog") as HTMLElement);
	let answerRowCount: number = 2;
	let remainingTime = 0;
	let score = 0;
	let successCount = 0;
	let failCount = 0;
	let timerId: number | undefined = undefined;
	const userButtonClickHandlers: { [id: string]: {button: HTMLDivElement, handler: EventListener}} = {};

	interface Texts {
		readonly enterNamePrompt: string;
	}
	const norwegianTexts: Texts = {
		enterNamePrompt: "Venligst skriv navnet på den nye brukeren.",
	}
	let texts: Texts= norwegianTexts;

	function getDayNo() {
		return Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24));
	}

	function getWeekNo(dayNo: number) {
		return Math.floor((dayNo + 3) / 7);
	}

	interface TaskInfo {
		left: number;
		right: number;
		answer: number;
		scoreValue: number;
		op?: string
	}
	function setupAddTask(rowCount: number): TaskInfo {
		const comb = Math.floor(Math.random() * 100) + 10;
		const a = Math.floor(comb / 10); // number between 1 and 10
		const b = comb % 10; // number between 0 and 9
		const swapped = Math.random() >= 0.5;
		const left = swapped ? b : a;
		const right = swapped ? a : b;
		const answer = left + right;
		return { left: left, right: right, answer: answer, scoreValue: answer };
	}
	function setupSubtractTask(rowCount: number): TaskInfo {
		const addTask = setupAddTask(rowCount);
		return { left: addTask.answer, right: addTask.right, answer: addTask.left, scoreValue: addTask.scoreValue };
	}
	function setupMultiplyTask(rowCount: number): TaskInfo {
		const comb = Math.floor(Math.random() * 10 * rowCount);
		const a = Math.floor(comb / 10) + 1; // number between 1 and rowCount
		const b = 1 + (comb % 10); // number between 1 and 10
		const swapped = Math.random() >= 0.5;
		const left = swapped ? b : a;
		const right = swapped ? a : b;
		const answer = left * right;
		return { left: left, right: right, answer: answer, scoreValue: a + b };
	}
	function setupDivideTask(rowCount: number): TaskInfo {
		const comb = Math.floor(Math.random() * 100) + 10;
		const a = Math.floor(comb / 10); // number between 1 and 10
		const b = comb % 10; // number between 0 and 9
		const left = a * b;
		const right = a;
		const answer = b;
		return { left: left, right: right, answer: answer, scoreValue: a + b };
	}
	function setupComboTask(rowCount: number): TaskInfo {
		const comb = Math.round(Math.random() * 441);
		const a = Math.floor(comb / 21) - 10; // number between 0 an 21
		const b = comb % 21 - 10; // number between - and 10
		const left = a;
		const right = b;
		const op = Math.random() >= 0.5 ? "+" : "-"
		const answer = op === "+" ? a + b : a - b ;
		const minusCount = (a < 0 ? 1 : 0) + (b < 0 ? 1 : 0) + (op === "-" ? 1 : 0)
		return { left: left, right: right, answer: answer, scoreValue: Math.abs(a) + Math.abs(b) + minusCount, op };
	}

	interface OperatorInfo {
		readonly text: string;
		setupTask(rowCount: number) : TaskInfo;
	};
	const operatorInfoTab = {
		add: { text: " + ", setupTask: setupAddTask } as OperatorInfo,
		subtract: { text: " - ", setupTask: setupSubtractTask } as OperatorInfo,
		multiply: { text: " * ", setupTask: setupMultiplyTask } as OperatorInfo,
		divide: { text: " / ", setupTask: setupDivideTask } as OperatorInfo,
		combo: { text: " +/- ", setupTask: setupComboTask } as OperatorInfo,
	} as const
	Object.freeze(operatorInfoTab)
	type OpType = keyof typeof operatorInfoTab
	let currentOpType: keyof typeof operatorInfoTab = "add";

	class ScoreItem {
		dayGames: number = 0;
		dayScore: number = 0;
		dayRecord: number = 0;
		weekGames: number = 0;
		weekScore: number = 0;
		weekRecord: number = 0;
		totalGames: number = 0;
		totalScore: number = 0;
		totalRecord: number = 0;

		constructor(parsed?: any, okDay?: boolean, okWeek?: boolean) {
			if (!parsed)
				return;
			if (typeof(parsed.hiScore) === 'number') {
				this.totalRecord = parsed.hiScore;
			} else {
				if (typeof(parsed.totalGames) === 'number')
					this.totalGames = parsed.totalGames;
				if (typeof(parsed.totalScore) === 'number')
					this.totalScore = parsed.totalScore;
				if (typeof(parsed.totalRecord) === 'number')
					this.totalRecord = parsed.totalRecord;
			}
			if (okDay) {
				this.dayScore = parsed.dayScore;
				this.dayGames = parsed.dayGames;
				if (typeof(parsed.dayRecord) === 'number')
					this.dayRecord = parsed.dayRecord;
			}
			if (okWeek) {
				this.weekScore = parsed.weekScore;
				this.weekGames = parsed.weekGames;
				if (typeof(parsed.weekRecord) === 'number')
					this.weekRecord = parsed.weekRecord;
			}
		}
	}

	class ScoreInfo {
		id: string;
		dayNo: number;
		weekNo: number = 0;
		items: { [key: string]: ScoreItem } = {};

		constructor(userId: string) {
			this.id = userId;
			this.dayNo = getDayNo();
			this.weekNo = getWeekNo(this.dayNo);
			const stored = localStorage.getItem('automath.scoreInfo.' + userId);
			const parsed = stored ? JSON.parse(stored) : undefined;
			if (parsed) {
				const okDay = typeof(parsed.dayNo) === 'number' && parsed.dayNo === this.dayNo;
				const okWeek = typeof(parsed.weekNo) === 'number' && parsed.weekNo === this.weekNo;
				if (parsed.items && typeof(parsed.items) === "object") {
					for (const opType in parsed.items) {
						const parsedItem = parsed.items[opType];
						this.items[opType] = new ScoreItem(parsedItem, okDay, okWeek);
					}
				} else if (parsed.hiScore || parsed.totalRecord) {
					this.items["add"] = new ScoreItem(parsed, okDay, okWeek);
				}
			}
			const types: OpType[] = ["add", "subtract", "multiply", "divide", "combo"];
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

		save(): void {
			localStorage.setItem('automath.scoreInfo.' + this.id, JSON.stringify(this, (key: string, value: any) => {
				return key !== 'id' ? value : undefined;
			}));
		}
	}

	let currentScoreInfo: ScoreInfo | undefined = undefined;

	function updateScoreTable() {
		if (currentScoreInfo) {
			const scoreItem = currentScoreInfo.items[currentOpType];
			(document.getElementById('dayGames') as HTMLElement).innerText = scoreItem.dayGames.toString();
			(document.getElementById('dayScore') as HTMLElement).innerText = scoreItem.dayScore.toString();
			(document.getElementById('dayRecord') as HTMLElement).innerText = scoreItem.dayRecord.toString();
			(document.getElementById('weekGames') as HTMLElement).innerText = scoreItem.weekGames.toString();
			(document.getElementById('weekScore') as HTMLElement).innerText = scoreItem.weekScore.toString();
			(document.getElementById('weekRecord') as HTMLElement).innerText = scoreItem.weekRecord.toString();
			(document.getElementById('totalGames') as HTMLElement).innerText = scoreItem.totalGames.toString();
			(document.getElementById('totalScore') as HTMLElement).innerText = scoreItem.totalScore.toString();
			(document.getElementById('totalRecord') as HTMLElement).innerText = scoreItem.totalRecord.toString();
		}
	}

	function setUser(id: string, name: string) {
		outerUserButton.innerText = name;
		currentScoreInfo = id !== 'anonym' ? new ScoreInfo(id) : undefined;
		const scoreTable = document.querySelector(".score-table");
		if (currentScoreInfo) {
			updateScoreTable();
			if (scoreTable)
				scoreTable.removeAttribute('style');
		} else if (scoreTable) {
			scoreTable.setAttribute('style', 'visibility: hidden;')
		}
	}

	class UserInfo {
		public nameMap: { [id: string]: string} = { anonym: 'ANONYM' };
		public currentId: string = 'anonym';
		public constructor() {
			const stored = localStorage.getItem('automath.userinfo');
			const parsed = stored ? JSON.parse(stored) : undefined;
			if (typeof(parsed) === 'object' && typeof(parsed.nameMap) === 'object') {
				this.nameMap = parsed.nameMap;
				if (typeof(parsed.currentId) === 'string') {
					this.currentId = parsed.currentId;
				}
			}
		}
		public save(): void {
			localStorage.setItem('automath.userinfo', JSON.stringify(this));
		}
	}

	function selectUserButton(userInfo: UserInfo, id: string, userButton: HTMLDivElement) {
		const selected = document.querySelector("div.user-container > div.selected");
		if (selected) {
			selected.removeAttribute("class");
		}
		userButton.setAttribute("class", "selected");
		userInfo.currentId = id;
		userInfo.save();
		setUser(id, userInfo.nameMap[id]);
	}

	function activateUserButton(userInfo: UserInfo, id: string, userButton: HTMLDivElement) {
		const clickHandler = function() {
			selectUserButton(userInfo, id, userButton);
			userInfo.save();
		}
		userButton.addEventListener('click', clickHandler);
		userButtonClickHandlers[id] = { button: userButton, handler: clickHandler };
	}

	function appendUserButton(userInfo: UserInfo, container: Element, id: string): HTMLDivElement {
		const name = userInfo.nameMap[id];
		const userButton = document.createElement('div');
		userButton.innerText = name;
		if (id == userInfo.currentId)
			userButton.setAttribute('class', 'selected');
		activateUserButton(userInfo, id, userButton);
		container.appendChild(userButton);
		return userButton;
	}

	/**
	 * Adds all the user buttons in the container at the top of the user dialog
	 * @param container the container for the user buttons
	 * @param userInfo The user info to connect to the container
	 */
	function setupUserButtons(container: Element, userInfo: UserInfo) {
		container.innerHTML = '';
		for (const id in userInfo.nameMap) {
			if (userInfo.nameMap.hasOwnProperty(id)) {
				appendUserButton(userInfo, container, id)
			}
		}
	}

	/**
	 * Executes a command provided its command string
	 * @param container the DIV element containing the user buttons
	 * @param userInfo information about the users in the system and who is the current user
	 * @param command the command string of the command to be handled
	 */
	function handleCommand(container: Element, userInfo: UserInfo, command: string) {
		switch (command) {
			case "!delete:record":
				if (currentScoreInfo && currentScoreInfo.items[currentOpType]) {
					currentScoreInfo.items[currentOpType].totalRecord = 0;
					(document.getElementById('totalRecord') as HTMLElement).innerText = "0";
					currentScoreInfo.save();
				} else {
					alert("Kan ikke slette rekorden til anonym bruker.")
				}
				break;
			case "!delete:user":
				if (currentScoreInfo) {
					const userId = currentScoreInfo.id;
					delete userInfo.nameMap[userId];
					selectUserButton(userInfo, "anonym", userButtonClickHandlers["anonym"].button);
					const buttonInfo = userButtonClickHandlers[userId];
					delete userButtonClickHandlers[userId];
					buttonInfo.button.removeEventListener("click", buttonInfo.handler);
					container.removeChild(buttonInfo.button);
					localStorage.removeItem('automath.scoreInfo.' + userId);
				} else {
					alert("Kan ikke slette anonym bruker.")
				}
				break;
			default:
				alert("'" + command + "' er ikke en gjenkjent kommando.");
				break;
		}
	}

	function setupUserSupport() {
		if (typeof(Storage) !== "undefined") {
			outerUserButton.addEventListener("click", function() {
				dialogMask.setAttribute("class", "visible");
				settingsDiv.setAttribute("class", "visible");
			});

			const userInfo = new UserInfo();

			const addUserButton = document.getElementById('addUser');
			const container = document.querySelector("div.user-container");
			if (addUserButton && container) {
				setupUserButtons(container, userInfo);
				addUserButton.addEventListener('click', function() {
					const name = prompt(texts.enterNamePrompt);
					if (!name)
						return;
					if (name.substring(0, 1) === "!") {
						handleCommand(container, userInfo, name);
					} else {
						const idBase = name.toLocaleLowerCase();
						let newId = idBase;
						let index = 0;
						while (userInfo.nameMap[newId]) {
							newId = idBase + (++index);
						}
						userInfo.nameMap[newId] = name.toLocaleUpperCase();
						const newButton = appendUserButton(userInfo, container, newId);
						selectUserButton(userInfo, newId, newButton);
					}
				});
			}
			setUser(userInfo.currentId, userInfo.nameMap[userInfo.currentId]);
			outerUserButton.removeAttribute("style");
		}
	}

	function setupTask(): void {
		const operatorInfo = operatorInfoTab[currentOpType];
		const task = operatorInfo.setupTask(answerRowCount);
		taskDiv.setAttribute("answer", task.answer.toString());
		taskDiv.setAttribute("score-value", task.scoreValue.toString())
		appDiv.setAttribute("class", "active");
		const leftOp = task.left < 0 ? `(${task.left})` : `${task.left}`
		const rightOp = task.right < 0 ? `(${task.right})` : `${task.right}`
		const opText = task.op ?? operatorInfo.text
		taskDiv.innerText = `${leftOp} ${opText} ${rightOp} =`
	}

	function updateScore() {
		let scoreDiv = document.getElementById("score") as HTMLElement;
		scoreDiv.innerText = score.toString() + " (" + successCount.toString()
			+ " av " + (successCount + failCount).toString() + ")";
	}

	function updateTime() {
		let timeDiv = document.getElementById("time") as HTMLElement;
		timeDiv.innerText = (remainingTime / 10).toFixed(1);
	}

	function startTimer() {
		remainingTime = 600;
		timerId = setInterval(function() {
			if (appDiv.getAttribute("class") == "active" && remainingTime > 0) {
				remainingTime -= 1;
				updateTime();
				if (remainingTime == 0) {
					clearInterval(timerId);
					timerId = undefined;
					appDiv.setAttribute("class", "inactive");
					let scoreDiv = document.getElementById("score") as HTMLElement;
					scoreDiv.setAttribute("class", "score-hilite");
					if (currentScoreInfo) {
						const currentScoreItem = currentScoreInfo.items[currentOpType];
						currentScoreItem.dayGames += 1;
						(document.getElementById('dayGames') as HTMLElement).innerText = currentScoreItem.dayGames.toString();
						currentScoreItem.dayScore += score;
						(document.getElementById('dayScore') as HTMLElement).innerText = currentScoreItem.dayScore.toString();
						if (score > currentScoreItem.dayRecord) {
							currentScoreItem.dayRecord = score;
							(document.getElementById('dayRecord') as HTMLElement).innerText = score.toString();
						}

						currentScoreItem.weekGames += 1;
						(document.getElementById('weekGames') as HTMLElement).innerText = currentScoreItem.weekGames.toString();
						currentScoreItem.weekScore += score;
						(document.getElementById('weekScore') as HTMLElement).innerText = currentScoreItem.weekScore.toString();
						if (score > currentScoreItem.weekRecord) {
							currentScoreItem.weekRecord = score;
							(document.getElementById('weekRecord') as HTMLElement).innerText = score.toString();
						}

						currentScoreItem.totalGames += 1;
						(document.getElementById('totalGames') as HTMLElement).innerText = currentScoreItem.totalGames.toString();
						currentScoreItem.totalScore += score;
						(document.getElementById('totalScore') as HTMLElement).innerText = currentScoreItem.totalScore.toString();
						if (score > currentScoreItem.totalRecord) {
							currentScoreItem.totalRecord = score;
							(document.getElementById('totalRecord') as HTMLElement).innerText = score.toString();
						}
						currentScoreInfo.save();
					}
					setTimeout(function() {
						scoreDiv.setAttribute("class", "score");
						appDiv.setAttribute("class", "ready")
						taskDiv.innerText = "? + ? ="
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
		const multiplyButton = document.getElementById("multiply") as HTMLDivElement;
		multiplyButton.setAttribute("data-rows", className);
		if (multiplyButton.getAttribute("class") == "selected") {
			const clipperDiv = document.getElementById("clipper") as HTMLDivElement;
			clipperDiv.setAttribute("class", className);
		}
	}

	updateDynamicRowCount();
	window.addEventListener("resize", updateDynamicRowCount);

	// Activate the dark/light selector buttons
	const styleButtons = document.querySelectorAll("div.style-select > div") as NodeListOf<HTMLDivElement>;
	const loadedBodyClass = localStorage.getItem("automath.body-class") || "dark";
	document.body.setAttribute("class", loadedBodyClass);
	styleButtons.forEach((styleButton: HTMLDivElement, key: number, parent: NodeListOf<HTMLDivElement>) => {
		const bodyClass = styleButton.getAttribute("data-body-class") || "light";
		if (bodyClass === loadedBodyClass) {
			styleButton.setAttribute("class", "selected");
		} else {
			styleButton.removeAttribute("class");
		}
		styleButton.addEventListener("click", (ev: MouseEvent): any => {
			if (styleButton.getAttribute("class") == "selected")
				return;
			const oldStyleBtn = document.querySelector("div.style-select > div.selected") as HTMLDivElement;
			oldStyleBtn.removeAttribute("class");
			styleButton.setAttribute("class", "selected");
			document.body.setAttribute("class", bodyClass);
			localStorage.setItem("automath.body-class", bodyClass)
		});
	});

	// activate the operator selector buttons
	const opButtons = document.querySelectorAll("div.op-select > div") as NodeListOf<HTMLDivElement>;
	const clipperDiv = document.getElementById("clipper") as HTMLDivElement;
	Object.keys(operatorInfoTab).forEach(key => {
		const opType = key as OpType
		const opInfo = operatorInfoTab[opType]
		const opButton = document.getElementById(opType)
		opButton?.addEventListener("click", (ev: MouseEvent): any => {
			if (opButton.getAttribute("class") == "selected")
				return;
			const oldOpBtn = document.querySelector("div.op-select > div.selected") as HTMLDivElement;
			oldOpBtn.removeAttribute("class");
			opButton.setAttribute("class", "selected");
			clipperDiv.setAttribute("class", opButton.getAttribute("data-rows") || "");
			currentOpType = opType;
			taskDiv.innerText = "?" + opInfo.text + "? =";
			updateScoreTable();
		});
	})
	for (let i = -20; i <= 90; ++i) {
		const btnId = i < 0 ? `minus${-i}` : `a${i}`
		let btn = document.getElementById(btnId) as HTMLElement;
		btn.addEventListener("click", function(this: HTMLElement, ev: MouseEvent): any {
			if (appDiv.getAttribute("class") == "inactive")
				return;
			appDiv.setAttribute("class", "inactive");
			const answer = taskDiv.getAttribute("answer") || "";
			const ok = i.toString() == answer;
			const successId = answer.startsWith("-") ? `minus${answer.substring(1)}` : `a${answer}`
			const correctButton = ok ? btn : document.getElementById(successId) as HTMLElement;
			if (ok) {
				const scoreValue = parseInt(taskDiv.getAttribute("score-value") || "0");
				btn.setAttribute("class", "success");
				score += scoreValue;
				successCount += 1;
			} else {
				btn.setAttribute("class", "error");
				correctButton.setAttribute("class", "correct");
				score = Math.max(0, score - 5);
				failCount += 1;
			}
			updateScore();
			setTimeout(function() {
				btn.removeAttribute("class");
				if (!ok) {
					correctButton.removeAttribute("class");
				}
				if (remainingTime > 0)
					setupTask();
			}, 2000);
		});
	}

	setupUserSupport();
	(document.getElementById("start") as HTMLElement).addEventListener("click", function() {
		if (appDiv.getAttribute("class") !== "ready")
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

	const closeUserDialogClickHandler = function() {
		dialogMask.setAttribute("class", "hidden");
		settingsDiv.setAttribute("class", "hidden");
	};
	dialogMask.addEventListener("click", closeUserDialogClickHandler);
	closeUserDialog.addEventListener("click", closeUserDialogClickHandler);
}

if (document.getElementById("a1") != null) {
    register();
} else {
    document.addEventListener("DOMContentLoaded", function() {
        register();
    });
}