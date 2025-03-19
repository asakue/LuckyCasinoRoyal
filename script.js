
class SlotMachine {
    constructor() {
        this.balance = 1000;
        this.currentBet = 10;
        this.symbols = ['🍒', '🍋', '🍉', '🍇', '🍀', '💎'];
        this.symbolWeights = [30, 25, 20, 15, 7, 3];
        this.isSpinning = false;
        this.soundEnabled = true;
        this.freeSpins = 0;
        this.bonus = new BonusSystem(this);

        this.reels = document.querySelectorAll('.reel');
        this.balanceDisplay = document.getElementById('balance');
        this.betDisplay = document.getElementById('currentBet');
        this.spinButton = document.getElementById('spinButton');
        this.winPopup = document.getElementById('winPopup');
        this.winAmountDisplay = document.getElementById('winAmount');
        this.bonusProgress = document.getElementById('bonusProgress');
        this.freeSpinsCounter = document.getElementById('freeSpinsCounter');

        this.initSounds();
        this.initEventListeners();
        this.updateUI();

        // Запуск фоновой музыки после первого взаимодействия с пользователем
        this.startBackgroundMusicOnFirstInteraction();
    }

    initSounds() {
        this.sounds = {
            spin: document.getElementById('spinSound'),
            win: document.getElementById('winSound'),
            bigWin: document.getElementById('bigWinSound'),
            bonus: document.getElementById('bonusSound'),
            background: document.getElementById('bgMusic')
        };

        // Устанавливаем громкость звуков
        Object.values(this.sounds).forEach(sound => {
            if (sound) sound.volume = 0.3;
        });
    }

    startBackgroundMusicOnFirstInteraction() {
        const startMusic = () => {
            if (this.sounds.background) {
                this.sounds.background.loop = true;
                this.sounds.background.play().catch(() => {
                    console.log("Автовоспроизведение фоновой музыки заблокировано браузером.");
                });
            }
            // Удаляем обработчик после первого взаимодействия
            document.removeEventListener('click', startMusic);
            document.removeEventListener('keydown', startMusic);
        };

        // Запуск музыки после первого клика или нажатия клавиши
        document.addEventListener('click', startMusic);
        document.addEventListener('keydown', startMusic);
    }

    initEventListeners() {
        const toggleMusicButton = document.getElementById('toggleMusic');
        const soundIcon = toggleMusicButton.querySelector('.sound-icon');
        const soundWaves = toggleMusicButton.querySelector('.sound-waves');
        const volumeControl = document.getElementById('volumeControl');
    
        toggleMusicButton.addEventListener('click', () => {
            this.soundEnabled = !this.soundEnabled;
            this.sounds.background[this.soundEnabled ? 'play' : 'pause']();
    
            // Изменяем иконку и анимацию волн
            if (this.soundEnabled) {
                soundIcon.classList.remove('muted');
                soundIcon.textContent = '🔊'; // Иконка для включенного звука
                toggleMusicButton.classList.add('active');
            } else {
                soundIcon.classList.add('muted');
                soundIcon.textContent = '🔇'; // Иконка для выключенного звука
                toggleMusicButton.classList.remove('active');
            }
        });
    
        volumeControl.addEventListener('input', (e) => {
            const volume = e.target.value;
            Object.values(this.sounds).forEach(sound => {
                if (sound) sound.volume = volume;
            });
        });
    }

    setBet(amount) {
        if (amount >= 10 && amount <= this.balance) {
            this.currentBet = amount;
            this.updateUI();
        } else {
            this.showNotification(amount < 10 ? 'Минимальная ставка 10₽!' : 'Недостаточно средств!');
        }
    }

    changeBet(delta) {
        const newBet = Math.max(10, Math.min(this.currentBet + delta, Math.min(this.balance, 500)));
        this.setBet(newBet);
    }

    setMaxBet() {
        this.setBet(Math.min(this.balance, 500));
    }

    async spin() {
        if (this.isSpinning || (this.freeSpins === 0 && this.balance < this.currentBet)) return;
        this.isSpinning = true;
        this.spinButton.disabled = true;

        if (this.freeSpins === 0) {
            this.balance -= this.currentBet;
        }

        const results = this.generateResults();

        // Воспроизведение звука spin.mp3
        if (this.soundEnabled && this.sounds.spin) {
            this.sounds.spin.currentTime = 0; // Перемотка звука на начало
            this.sounds.spin.play();
        }

        await this.animateSymbols(results);

        const winAmount = this.calculateWin(results);
        if (winAmount > 0) {
            this.balance += winAmount;

            // Воспроизведение звука win.mp3 или bigwin.mp3
            if (winAmount >= this.currentBet * 5) {
                if (this.soundEnabled && this.sounds.bigWin) {
                    this.sounds.bigWin.currentTime = 0;
                    this.sounds.bigWin.play();
                }
            } else {
                if (this.soundEnabled && this.sounds.win) {
                    this.sounds.win.currentTime = 0;
                    this.sounds.win.play();
                }
            }

            this.showPopup('ПОБЕДА!', `Выигрыш: ${winAmount}₽`, 3000);
        }

        this.bonus.addPoints(Math.floor(this.currentBet * 0.1));

        if (results.every(symbol => symbol === '💎')) {
            this.bonus.grantFreeSpins(10);
            this.showNotification('Получено 10 бесплатных вращений!');

            // Воспроизведение звука bonus.mp3
            if (this.soundEnabled && this.sounds.bonus) {
                this.sounds.bonus.currentTime = 0;
                this.sounds.bonus.play();
            }
        }

        this.updateUI();
        this.isSpinning = false;
        this.spinButton.disabled = false;
    }

    generateResults() {
        return this.symbols.map(() => {
            const totalWeight = this.symbolWeights.reduce((sum, weight) => sum + weight, 0);
            let random = Math.random() * totalWeight;
            for (let i = 0; i < this.symbols.length; i++) {
                random -= this.symbolWeights[i];
                if (random < 0) return this.symbols[i];
            }
        });
    }

    async animateSymbols(results) {
        const animationPromises = [];
        this.reels.forEach((reel, index) => {
            const targetSymbol = results[index];

            const animation = {
                duration: 3000, // Общая длительность анимации
                interval: 100, // Интервал между сменой символов
                start: () => {
                    let startTime = Date.now();
                    const animate = () => {
                        if (Date.now() - startTime < animation.duration) {
                            // Случайный символ для эффекта перебора
                            const randomSymbol = this.symbols[Math.floor(Math.random() * this.symbols.length)];
                            reel.querySelector('.slot-cell').textContent = randomSymbol;
                            setTimeout(animate, animation.interval);
                        } else {
                            // Устанавливаем итоговый символ
                            reel.querySelector('.slot-cell').textContent = targetSymbol;
                        }
                    };
                    animate();
                }
            };

            animationPromises.push(new Promise(resolve => {
                animation.start();
                setTimeout(resolve, animation.duration);
            }));
        });

        await Promise.all(animationPromises);
    }

    calculateWin(results) {
        const [a, b, c] = results;
        const multipliers = {
            '🍒': 2, '🍋': 3, '🍉': 5,
            '🍇': 10, '🍀': 20, '💎': 50
        };
    
        let winAmount = 0;
    
        if (a === b && b === c) {
            winAmount = this.currentBet * multipliers[a];
            // Добавляем анимацию к символам
            this.reels.forEach(reel => {
                reel.querySelector('.slot-cell').classList.add('winning-symbol');
            });
        } else if (a === b || b === c || a === c) {
            winAmount = this.currentBet * 0.5;
            // Добавляем анимацию к символам, которые совпадают
            if (a === b) {
                this.reels[0].querySelector('.slot-cell').classList.add('winning-symbol');
                this.reels[1].querySelector('.slot-cell').classList.add('winning-symbol');
            }
            if (b === c) {
                this.reels[1].querySelector('.slot-cell').classList.add('winning-symbol');
                this.reels[2].querySelector('.slot-cell').classList.add('winning-symbol');
            }
            if (a === c) {
                this.reels[0].querySelector('.slot-cell').classList.add('winning-symbol');
                this.reels[2].querySelector('.slot-cell').classList.add('winning-symbol');
            }
        }
    
        winAmount *= this.bonus.multiplier;
    
        // Убираем анимацию через 1 секунду
        setTimeout(() => {
            this.reels.forEach(reel => {
                reel.querySelector('.slot-cell').classList.remove('winning-symbol');
            });
        }, 1000);
    
        return winAmount;
    }

    createParticles() {
        const particleCount = 50;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            particle.style.setProperty('--tx', `${Math.random() * 200 - 100}px`);
            particle.style.setProperty('--ty', `${Math.random() * 200 - 100}px`);
            document.body.appendChild(particle);
    
            setTimeout(() => particle.remove(), 1000);
        }
    }
    
    showPopup(title, message, duration) {
        const popup = document.createElement('div');
        popup.className = 'win-popup active';
        popup.innerHTML = `
            <div class="win-content">
                <h2>${title}</h2>
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(popup);

        // Добавляем вспышку
        const flash = document.createElement('div');
        flash.classList.add('flash-effect');
        document.body.appendChild(flash);

        // Создаем частицы
        this.createParticles();

        setTimeout(() => {
            popup.remove();
            flash.remove();
        }, duration);
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    updateUI() {
        this.balanceDisplay.textContent = this.balance;
        this.betDisplay.textContent = this.currentBet;
        this.bonusProgress.style.width = `${(this.bonus.bonusPoints / this.bonus.maxBonusPoints) * 100}%`;
        this.freeSpinsCounter.textContent = `Свободных вращений: ${this.freeSpins}`;
    }
}

class BonusSystem {
    constructor(slotMachine) {
        this.slot = slotMachine;
        this.bonusPoints = 0;
        this.maxBonusPoints = 1000;
        this.multiplier = 1;
        this.freeSpins = 0;
    }

    addPoints(amount) {
        this.bonusPoints = Math.min(this.bonusPoints + amount, this.maxBonusPoints);
        this.updateMultiplier();
    }

    updateMultiplier() {
        this.multiplier = 1 + (this.bonusPoints / this.maxBonusPoints) * 0.5;
    }

    grantFreeSpins(amount) {
        this.freeSpins += amount;
        this.slot.freeSpins = this.freeSpins;
    }
}

const game = new SlotMachine();