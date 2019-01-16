function register(): void {
	const taskDiv = document.getElementById("task") as HTMLElement;
	const appDiv = document.getElementById("application") as HTMLElement;
	const dialogMask = document.getElementById("dialog-mask") as HTMLElement;
	const settingsDiv = document.getElementById("settings") as HTMLElement;
	const outerUserButton = (document.getElementById("user") as HTMLElement);
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

	class ScoreInfo {
		id: string;
		dayNo: number;
		dayGames: number = 0;
		dayScore: number = 0;
		dayRecord: number = 0;
		weekNo: number = 0;
		weekGames: number = 0;
		weekScore: number = 0;
		weekRecord: number = 0;
		totalGames: number = 0;
		totalScore: number = 0;
		totalRecord: number = 0;

		constructor(userId: string) {
			this.id = userId;
			this.dayNo = getDayNo();
			this.weekNo = getWeekNo(this.dayNo);
			const stored = localStorage.getItem('automath.scoreInfo.' + userId);
			const parsed = stored ? JSON.parse(stored) : undefined;
			if (parsed) {
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
				if (typeof(parsed.dayNo) === 'number' && typeof(parsed.dayScore) === 'number'
						&& typeof(parsed.dayGames) === 'number' && parsed.dayNo === this.dayNo) {
					this.dayScore = parsed.dayScore;
					this.dayGames = parsed.dayGames;
					if (typeof(parsed.dayRecord) === 'number')
						this.dayRecord = parsed.dayRecord;
				}
				if (typeof(parsed.weekNo) === 'number' && typeof(parsed.weekScore) === 'number'
						&& typeof(parsed.weekGames) === 'number' && parsed.weekNo === this.weekNo) {
					this.weekScore = parsed.weekScore;
					this.weekGames = parsed.weekGames;
					if (typeof(parsed.weekRecord) === 'number')
						this.weekRecord = parsed.weekRecord;
				}
			}
		}

		prepareNewGame() {
			const dayNo = getDayNo();
			if (dayNo != this.dayNo) {
				this.dayNo = dayNo;
				this.dayGames = 0;
				this.dayScore = 0;
				this.dayRecord = 0;
			}
			const weekNo = getWeekNo(this.dayNo);
			if (weekNo != this.weekNo) {
				this.weekNo = weekNo;
				this.weekGames = 0;
				this.weekScore = 0;
				this.weekRecord = 0;
			}
		}

		save(): void {
			localStorage.setItem('automath.scoreInfo.' + this.id, JSON.stringify(this, (key: string, value: any) => {
				return key !== 'id' ? value : undefined;
			}));
		}
	}

	let currentScoreInfo: ScoreInfo | undefined = undefined;

	function setUser(id: string, name: string) {
		outerUserButton.innerText = name;
		currentScoreInfo = id !== 'anonym' ? new ScoreInfo(id) : undefined;
		const scoreTable = document.querySelector(".score-table");
		if (currentScoreInfo) {
			(document.getElementById('dayGames') as HTMLElement).innerText = currentScoreInfo.dayGames.toString();
			(document.getElementById('dayScore') as HTMLElement).innerText = currentScoreInfo.dayScore.toString();
			(document.getElementById('dayRecord') as HTMLElement).innerText = currentScoreInfo.dayRecord.toString();
			(document.getElementById('weekGames') as HTMLElement).innerText = currentScoreInfo.weekGames.toString();
			(document.getElementById('weekScore') as HTMLElement).innerText = currentScoreInfo.weekScore.toString();
			(document.getElementById('weekRecord') as HTMLElement).innerText = currentScoreInfo.weekRecord.toString();
			(document.getElementById('totalGames') as HTMLElement).innerText = currentScoreInfo.totalGames.toString();
			(document.getElementById('totalScore') as HTMLElement).innerText = currentScoreInfo.totalScore.toString();
			(document.getElementById('totalRecord') as HTMLElement).innerText = currentScoreInfo.totalRecord.toString();
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

	function setupUserButtons(userInfo: UserInfo) {
		const container = document.querySelector("div.user-container");
		if (!container)
			return;
		container.innerHTML = '';
		for (const id in userInfo.nameMap) {
			if (userInfo.nameMap.hasOwnProperty(id)) {
				appendUserButton(userInfo, container, id)
			}
		}
	}

	function setupUserSupport() {
		if (typeof(Storage) !== "undefined") {
			outerUserButton.addEventListener("click", function() {
				dialogMask.setAttribute("class", "visible");
				settingsDiv.setAttribute("class", "visible");
			});

			const userInfo = new UserInfo();

			setupUserButtons(userInfo);
			const addUserButton = document.getElementById('addUser');
			const container = document.querySelector("div.user-container");
			if (addUserButton && container) {
				addUserButton.addEventListener('click', function() {
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

	function setupTask(): void {
		let comb = Math.floor(Math.random() * 100) + 10;
		let a = Math.floor(comb / 10);
		let b = comb % 10;
		let swapped = Math.random() >= 0.5;
		let left = swapped ? b : a;
		let right = swapped ? a : b;
		let answer = left + right;
		taskDiv.setAttribute("answer", answer.toString());
		appDiv.setAttribute("class", "active");
		taskDiv.innerText = left.toString() + " + " + right.toString() + " ="
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
						currentScoreInfo.dayGames += 1;
						(document.getElementById('dayGames') as HTMLElement).innerText = currentScoreInfo.dayGames.toString();
						currentScoreInfo.dayScore += score;
						(document.getElementById('dayScore') as HTMLElement).innerText = currentScoreInfo.dayScore.toString();
						if (score > currentScoreInfo.dayRecord) {
							currentScoreInfo.dayRecord = score;
							(document.getElementById('dayRecord') as HTMLElement).innerText = score.toString();
						}

						currentScoreInfo.weekGames += 1;
						(document.getElementById('weekGames') as HTMLElement).innerText = currentScoreInfo.weekGames.toString();
						currentScoreInfo.weekScore += score;
						(document.getElementById('weekScore') as HTMLElement).innerText = currentScoreInfo.weekScore.toString();
						if (score > currentScoreInfo.weekRecord) {
							currentScoreInfo.weekRecord = score;
							(document.getElementById('weekRecord') as HTMLElement).innerText = score.toString();
						}

						currentScoreInfo.totalGames += 1;
						(document.getElementById('totalGames') as HTMLElement).innerText = currentScoreInfo.totalGames.toString();
						currentScoreInfo.totalScore += score;
						(document.getElementById('totalScore') as HTMLElement).innerText = currentScoreInfo.totalScore.toString();
						if (score > currentScoreInfo.totalRecord) {
							currentScoreInfo.totalRecord = score;
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

	for (let i = 1; i <= 20; ++i) {
		let btn = document.getElementById("a" + i) as HTMLElement;
		btn.addEventListener("click", function(this: HTMLElement, ev: MouseEvent): any {
			if (appDiv.getAttribute("class") == "inactive")
				return;
			appDiv.setAttribute("class", "inactive");
			let answer = taskDiv.getAttribute("answer") || "";
			let ok = i.toString() == answer;
			let successButton = ok ? btn : document.getElementById("a" + answer) as HTMLElement;
			if (ok) {
				btn.setAttribute("class", "success");
				score += i;
				successCount += 1;
			} else {
				btn.setAttribute("class", "error");
				successButton.setAttribute("class", "correct");
				score = Math.max(0, score - 5);
				failCount += 1;
			}
			updateScore();
			setTimeout(function() {
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
	(document.getElementById("start") as HTMLElement).addEventListener("click", function() {
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

	dialogMask.addEventListener("click", function() {
		dialogMask.setAttribute("class", "hidden");
		settingsDiv.setAttribute("class", "hidden");
	});
}

if (document.getElementById("a1") != null) {
    register();
} else {
    document.addEventListener("DOMContentLoaded", function() {
        register();
    });
}