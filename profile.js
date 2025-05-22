import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';

const auth = getAuth();
const db = getFirestore();

// Competition Types
const COMPETITION_TYPES = [
    { id: 'speed', name: 'Speed Challenge', description: 'Complete the task in shortest time' },
    { id: 'efficiency', name: 'Efficiency Challenge', description: 'Write the most optimized solution' },
    { id: 'innovation', name: 'Innovation Challenge', description: 'Most creative solution' },
    { id: 'debugging', name: 'Debugging Challenge', description: 'Fix bugs in given code' }
];

// Medal Awards
const MEDAL_CRITERIA = {
    'first_win': { title: 'First Victory', description: 'Won your first competition' },
    'speed_champ': { title: 'Speed Champion', description: 'Won 3 speed challenges' },
    'efficiency_expert': { title: 'Efficiency Expert', description: 'Won 3 efficiency challenges' },
    'innovation_guru': { title: 'Innovation Guru', description: 'Won 3 innovation challenges' },
    'debugging_master': { title: 'Debugging Master', description: 'Won 3 debugging challenges' },
    'top_ranked': { title: 'Top Ranked', description: 'Reached top 10 in leaderboard' }
};

// Profile Functions
export async function updateProfile() {
    const user = auth.currentUser;
    if (!user) return;

    const profileData = {
        displayName: document.getElementById('display-name').value,
        bio: document.getElementById('profile-bio').value,
        skills: Array.from(document.querySelectorAll('.skill-tag:not(.placeholder)')).map(tag => tag.textContent),
        theme: document.getElementById('profile-theme').value,
        lastUpdated: new Date()
    };

    try {
        await setDoc(doc(db, 'users', user.uid), profileData, { merge: true });
        showNotification('Profile updated successfully!', 'success');
        
        // Apply theme if changed
        if (profileData.theme) {
            document.documentElement.setAttribute('data-theme', profileData.theme);
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Error updating profile', 'error');
    }
}

export async function loadProfile() {
    const user = auth.currentUser;
    if (!user) return;

    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Basic info
        document.getElementById('display-name').value = data.displayName || '';
        document.getElementById('profile-bio').value = data.bio || '';
        document.getElementById('profile-theme').value = data.theme || 'light';
        
        // Skills
        const skillsContainer = document.getElementById('skills-container');
        skillsContainer.innerHTML = '';
        if (data.skills && data.skills.length > 0) {
            data.skills.forEach(skill => {
                addSkillTag(skill, false);
            });
        }
        
        // Stats
        document.getElementById('total-wins').textContent = data.totalWins || 0;
        document.getElementById('total-medals').textContent = data.achievements?.length || 0;
        
        // Achievements
        if (data.achievements) {
            renderAchievements(data.achievements);
        }
        
        // Apply theme
        document.documentElement.setAttribute('data-theme', data.theme || 'light');
    }
}

// Competition Functions
export async function createCompetition() {
    const user = auth.currentUser;
    if (!user) return;

    const name = document.getElementById('competition-name').value;
    const description = document.getElementById('competition-desc').value;
    const type = document.getElementById('competition-type').value;
    const difficulty = document.getElementById('competition-difficulty').value;

    if (!name || !description || !type || !difficulty) {
        alert('Please fill all fields');
        return;
    }

    try {
        const competitionRef = await addDoc(collection(db, 'competitions'), {
            name,
            description,
            type,
            difficulty,
            createdBy: user.uid,
            createdAt: new Date(),
            status: 'open',
            participants: 0,
            winners: []
        });
        
        alert('Competition created!');
        loadCompetitions();
        return competitionRef.id;
    } catch (error) {
        console.error('Error creating competition:', error);
        alert('Error creating competition');
    }
}

export async function loadCompetitions() {
    // Implementation to load competitions
}

// UI Functions
export function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    document.getElementById(`${sectionId}-section`).style.display = 'block';
}

export function logout() {
    auth.signOut().then(() => {
        window.location.reload();
    });
}

async function checkForAchievements(userId) {
    const userRef = doc(db, 'users', userId);
    const competitionsRef = collection(db, 'competitions');
    
    // Get user data
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data() || {};
    
    // Get user's competition history
    const q = query(competitionsRef, where('winners', 'array-contains', userId));
    const querySnapshot = await getDocs(q);
    
    const achievements = userData.achievements || [];
    const newAchievements = [];
    
    // Check for first win
    if (querySnapshot.size > 0 && !achievements.some(a => a.id === 'first_win')) {
        newAchievements.push({
            id: 'first_win',
            ...MEDAL_CRITERIA['first_win'],
            date: new Date().toISOString()
        });
    }
    
    // Check for type-specific achievements
    const winsByType = {};
    querySnapshot.forEach(doc => {
        const data = doc.data();
        winsByType[data.type] = (winsByType[data.type] || 0) + 1;
    });
    
    Object.entries(winsByType).forEach(([type, count]) => {
        if (count >= 3) {
            const achievementId = `${type}_champ`;
            if (!achievements.some(a => a.id === achievementId)) {
                newAchievements.push({
                    id: achievementId,
                    title: `${type.charAt(0).toUpperCase() + type.slice(1)} Champion`,
                    description: `Won 3 ${type} challenges`,
                    date: new Date().toISOString()
                });
            }
        }
    });
    
    // Save new achievements if any
    if (newAchievements.length > 0) {
        await setDoc(userRef, {
            achievements: [...achievements, ...newAchievements]
        }, { merge: true });
        
        // Notify user
        showAchievementNotification(newAchievements);
    }
}

function renderAchievements(achievements) {
    const container = document.getElementById('medals-container');
    container.innerHTML = '';
    
    achievements.forEach(achievement => {
        const medal = document.createElement('div');
        medal.className = 'medal';
        medal.innerHTML = `
            <span class="medal-icon">🏅</span>
            <span class="medal-title">${achievement.title}</span>
            <span class="medal-date">${achievement.date}</span>
        `;
        container.appendChild(medal);
    });
}

function showAchievementNotification(achievements) {
    // Implementation to show achievement notification
}

// Initialize auth UI
function initAuthUI() {
    // Social login handlers
    document.getElementById('facebook-login')?.addEventListener('click', async () => {
        const result = await signInWithFacebook();
        showAuthMessage(result);
    });
    
    document.getElementById('twitter-login')?.addEventListener('click', async () => {
        const result = await signInWithTwitter();
        showAuthMessage(result);
    });
    
    // Phone login handlers
    document.getElementById('send-otp')?.addEventListener('click', async () => {
        const phoneNumber = document.getElementById('phone-number').value;
        const result = await startPhoneAuth(phoneNumber);
        if (result.success) {
            document.getElementById('verify-otp').style.display = 'block';
            showAuthMessage({ success: true, message: 'Verification code sent!' });
        } else {
            showAuthMessage(result);
        }
    });
    
    document.getElementById('verify-otp-btn')?.addEventListener('click', async () => {
        const code = document.getElementById('otp-code').value;
        const result = await verifyPhoneCode(window.verificationId, code);
        showAuthMessage(result);
    });
    
    // 2FA handlers
    document.getElementById('enable-2fa')?.addEventListener('click', () => {
        document.getElementById('2fa-setup').style.display = 'block';
    });
    
    document.getElementById('send-2fa-code')?.addEventListener('click', async () => {
        const phoneNumber = document.getElementById('2fa-phone').value;
        const result = await enrollSecondFactor(phoneNumber);
        if (result.success) {
            window.verificationId = result.verificationId;
            document.getElementById('verify-2fa-code').style.display = 'block';
            showAuthMessage({ success: true, message: '2FA code sent!' });
        } else {
            showAuthMessage(result);
        }
    });
    
    document.getElementById('verify-2fa-btn')?.addEventListener('click', async () => {
        const code = document.getElementById('2fa-code').value;
        const result = await verifySecondFactor(window.verificationId, code);
        if (result.success) {
            document.getElementById('2fa-status').textContent = 'Status: Enabled';
            showAuthMessage({ success: true, message: '2FA enabled successfully!' });
        } else {
            showAuthMessage(result);
        }
    });
}

// Show auth messages
function showAuthMessage(result) {
    const messageEl = document.getElementById('auth-message');
    messageEl.textContent = result.message;
    messageEl.className = `auth-message ${result.success ? 'success' : 'error'}`;
    
    setTimeout(() => {
        messageEl.className = 'auth-message';
        messageEl.textContent = '';
    }, 5000);
}

// Initialize Charts with Enhanced Features
async function initCharts() {
    try {
        // Get user data
        const user = auth.currentUser;
        if (!user) return;
        
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) return;
        
        const userData = userDoc.data();
        const stats = userData.stats || {};
        const history = userData.history || {};
        
        // Format data for tooltips
        const formatDate = (month) => {
            const [year, m] = month.split('-');
            return new Date(year, m-1).toLocaleDateString('da-DK', {month:'short', year:'numeric'});
        };
        
        // Create chart instances
        let progressChart, activityChart;
        
        // Progress Chart
        const progressCtx = document.getElementById('progress-chart').getContext('2d');
        progressChart = new Chart(progressCtx, {
            type: 'line',
            data: {
                labels: Object.keys(history.monthlyPoints || {}).map(formatDate),
                datasets: [{
                    label: 'Points Earned',
                    data: Object.values(history.monthlyPoints || {}),
                    borderColor: '#4361ee',
                    backgroundColor: 'rgba(67, 97, 238, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#4361ee',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { 
                        display: true, 
                        text: 'Monthly Progress',
                        font: { size: 16 }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: ctx => `${ctx.dataset.label}: ${ctx.raw.toLocaleString()} pts`,
                            footer: ([firstItem]) => {
                                const month = Object.keys(history.monthlyPoints || {})[firstItem.dataIndex];
                                const competitions = history.monthlyCompetitions?.[month] || [];
                                return competitions.length > 0 
                                    ? `Competitions: ${competitions.join(', ')}` 
                                    : '';
                            }
                        }
                    },
                    zoom: {
                        zoom: {
                            wheel: { enabled: true },
                            pinch: { enabled: true },
                            mode: 'xy'
                        },
                        pan: { 
                            enabled: true,
                            mode: 'xy' 
                        }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        title: { display: true, text: 'Points' }
                    },
                    x: {
                        title: { display: true, text: 'Month' }
                    }
                }
            }
        });

        // Activity Chart
        const activityCtx = document.getElementById('activity-chart').getContext('2d');
        activityChart = new Chart(activityCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(stats.categoryStats || {}),
                datasets: [{
                    label: 'Solved Problems',
                    data: Object.values(stats.categoryStats || {}),
                    backgroundColor: [
                        'rgba(67, 97, 238, 0.7)',
                        'rgba(72, 149, 239, 0.7)',
                        'rgba(76, 201, 240, 0.7)',
                        'rgba(248, 150, 30, 0.7)',
                        'rgba(247, 37, 133, 0.7)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { 
                        display: true, 
                        text: 'Problem Categories',
                        font: { size: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => `${ctx.label}: ${ctx.raw} problems (${Math.round((ctx.raw/stats.totalProblems)*100)}%)`,
                            afterLabel: ctx => {
                                const category = ctx.label.toLowerCase().replace(' ', '_');
                                const wins = stats.categoryWins?.[category] || 0;
                                return wins > 0 ? `Wins: ${wins}` : '';
                            }
                        }
                    },
                    legend: { display: false },
                    zoom: {
                        zoom: { enabled: false },
                        pan: { enabled: false }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        title: { display: true, text: 'Problems Solved' }
                    }
                }
            }
        });

        // Chart Controls
        document.getElementById('reset-progress-chart').addEventListener('click', () => {
            progressChart.resetZoom();
        });

        document.getElementById('reset-activity-chart').addEventListener('click', () => {
            activityChart.resetZoom();
        });

        document.getElementById('export-progress-chart').addEventListener('click', () => {
            exportChartData('progress_data.csv', 
                ['Month', 'Points'], 
                Object.entries(history.monthlyPoints || {})
            );
        });

        document.getElementById('export-activity-chart').addEventListener('click', () => {
            exportChartData('activity_data.csv', 
                ['Category', 'Problems Solved'], 
                Object.entries(stats.categoryStats || {})
            );
        });

        // Update stats
        updateStatsDisplay(stats);
    } catch (error) {
        console.error('Error loading chart data:', error);
    }
}

function exportChartData(filename, headers, data) {
    const csvContent = [
        headers.join(','),
        ...data.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function updateStatsDisplay(stats) {
    document.getElementById('competitions-joined').textContent = stats.competitionsJoined?.toLocaleString() || '0';
    document.getElementById('competitions-won').textContent = stats.competitionsWon?.toLocaleString() || '0';
    document.getElementById('total-points').textContent = stats.totalPoints?.toLocaleString() || '0';
    document.getElementById('win-rate').textContent = 
        stats.competitionsJoined ? `${Math.round((stats.competitionsWon / stats.competitionsJoined) * 100)}%` : '0%';
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initAuthUI();
    initCharts();
});
