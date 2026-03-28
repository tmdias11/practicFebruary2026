import { auth, db } from "../js/firebase.js";

import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    createUserWithEmailAndPassword,
    updateEmail,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    setDoc,
    updateDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const signupForm = document.getElementById('signupForm');

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const repPass = document.getElementById('repPass').value;

        if (password !== repPass) {
            alert("Пароли не совпадают!");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                username,
                email: user.email,
                role: "User",
                createdAt: new Date()
            });

            await sendEmailVerification(user);

            alert("Аккаунт создан. Проверьте почту для подтверждения.");
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    });
}

const signinForm = document.getElementById('signinForm');

if (signinForm) {
    signinForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            alert(error.message);
        }
    });
}

const logoutBtn = document.getElementById('logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signOut(auth);
    });
}

onAuthStateChanged(auth, async (user) => {
    const profile = document.getElementById('profile');
    const signup = document.getElementById('signup');
    const signin = document.getElementById('signin');
    const logout = document.getElementById('logout');
    const adminPanel = document.getElementById("adminPanel");

    if (user) {
        logout?.classList.remove('hidden');
        profile?.classList.remove('hidden');
        signup?.classList.add('hidden');
        signin?.classList.add('hidden');

        await profileInfo(user);

        if (adminPanel) {
            await showAdminUserList(user);
        }

        await loadOrders(user.uid);
    } else {
        logout?.classList.add('hidden');
        profile?.classList.add('hidden');
        signup?.classList.remove('hidden');
        signin?.classList.remove('hidden');
    }
});

const profileHeader = document.getElementById('profileHeader');
const userInfo = document.getElementById('userInfo');

async function profileInfo(user) {
    if (!profileHeader || !userInfo) return;

    const userSnap = await getDoc(doc(db, "users", user.uid));
    if (!userSnap.exists()) return;

    const userData = userSnap.data();

    profileHeader.innerText = "Ваш профиль";

    userInfo.innerHTML = `
        <div>Имя: ${userData.username}</div>
        <div>Email: ${user.email}</div>
        <div>
            Статус: 
            ${user.emailVerified
                ? '<span style="color:green">Подтверждён</span>'
                : '<span style="color:red">Не подтверждён</span>'}
        </div>

        ${!user.emailVerified ? '<button id="verifyEmailBtn">Подтвердить почту</button>' : ''}

        <button id="refreshProfileBtn">Обновить статус</button>

        <hr>

        <input type="text" id="newUsername" placeholder="Новое имя">
        <button id="changeUsernameBtn">Изменить имя</button>

        <hr>

        <input type="email" id="newEmail" placeholder="Новая почта">
        <input type="password" id="currentPasswordForEmail" placeholder="Текущий пароль">
        <button id="changeEmailBtn">Сменить почту</button>

        <hr>

        <input type="password" id="currentPassword" placeholder="Текущий пароль">
        <input type="password" id="newPassword" placeholder="Новый пароль">
        <button id="changePasswordBtn">Сменить пароль</button>
    `;

    attachProfileEvents(user);
}

function attachProfileEvents(user) {
    document.getElementById("verifyEmailBtn")?.addEventListener("click", async () => {
        await user.reload();
        await sendEmailVerification(auth.currentUser);
        alert("Письмо отправлено.");
    });

    document.getElementById("refreshProfileBtn")?.addEventListener("click", async () => {
        await user.reload();
        profileInfo(auth.currentUser);
    });

    document.getElementById("changeUsernameBtn")?.addEventListener("click", async () => {
        const newName = document.getElementById("newUsername").value;
        if (!newName) return;
        await updateDoc(doc(db, "users", user.uid), { username: newName });
        alert("Имя обновлено");
        profileInfo(auth.currentUser);
    });

    document.getElementById("changeEmailBtn")?.addEventListener("click", async () => {
        const newEmail = document.getElementById("newEmail").value;
        const password = document.getElementById("currentPasswordForEmail").value;
        if (!newEmail || !password) return;

        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);

        await updateEmail(user, newEmail);
        await sendEmailVerification(user);
        await updateDoc(doc(db, "users", user.uid), { email: newEmail });

        alert("Email обновлён. Подтвердите новую почту.");
        profileInfo(auth.currentUser);
    });

    document.getElementById("changePasswordBtn")?.addEventListener("click", async () => {
        const password = document.getElementById("currentPassword").value;
        const newPassword = document.getElementById("newPassword").value;
        if (!password || !newPassword) return;

        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);

        await updatePassword(user, newPassword);
        alert("Пароль обновлён");
    });
}

async function showAdminUserList(currentUser) {
    const adminSnap = await getDoc(doc(db, "users", currentUser.uid));
    if (!adminSnap.exists() || adminSnap.data().role !== "Admin") return;

    const usersSnapshot = await getDocs(collection(db, "users"));
    const adminPanel = document.getElementById("adminPanel");
    if (!adminPanel) return;

    adminPanel.innerHTML = "<h3>Админ панель</h3>";

    usersSnapshot.forEach(docSnap => {
        const userData = docSnap.data();
        const userId = docSnap.id;

        const userDiv = document.createElement("div");
        userDiv.style.marginBottom = "15px";
        userDiv.style.padding = "10px";
        userDiv.style.border = "1px solid #ccc";

        userDiv.innerHTML = `
            <div>
                <strong>${userData.username}</strong> 
                (${userData.email})
            </div>

            <div>
                <input type="text" id="name_${userId}" placeholder="Новое имя" value="${userData.username}">
            </div>

            <div>
                <select id="role_${userId}">
                    <option value="User" ${userData.role === "User" ? "selected" : ""}>User</option>
                    <option value="Admin" ${userData.role === "Admin" ? "selected" : ""}>Admin</option>
                </select>
            </div>

            <button id="update_${userId}">Сохранить изменения</button>
        `;

        adminPanel.appendChild(userDiv);

        document.getElementById(`update_${userId}`)?.addEventListener("click", async () => {
            const newName = document.getElementById(`name_${userId}`).value.trim();
            const newRole = document.getElementById(`role_${userId}`).value;
            const updateData = {};

            if (newName && newName !== userData.username) updateData.username = newName;
            if (newRole !== userData.role) updateData.role = newRole;

            if (Object.keys(updateData).length === 0) {
                alert("Нет изменений");
                return;
            }

            try {
                await updateDoc(doc(db, "users", userId), updateData);
                alert("Данные обновлены");
                showAdminUserList(currentUser);
            } catch (err) {
                console.error(err);
                alert("Ошибка обновления");
            }
        });
    });
}

async function loadOrders(userId) {
    const container = document.getElementById("ordersContainer");
    if (!container) return;

    const userSnap = await getDoc(doc(db, "users", userId));
    if (!userSnap.exists()) return;
    const userRole = userSnap.data().role;

    const snapshot = await getDocs(collection(db, "ticketsOrders"));
    const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    let html = "<h3>История покупок</h3>";

    if (userRole === "Admin") {
        for (const order of orders) {
            const ownerSnap = await getDoc(doc(db, "users", order.userId));
            const ownerName = ownerSnap.exists() ? ownerSnap.data().username : "Неизвестный";

            html += `<div style="border:1px solid #ccc; margin:10px; padding:10px">`;
            html += `<p>Пользователь: <strong>${ownerName}</strong> (${order.userId})</p>`;
            html += `<p>Сумма: ${order.total}</p>`;
            order.items.forEach(item => {
                html += `<p>${item.title} (${item.quantity})</p>`;
            });
            html += `</div>`;
        }
    } else {
        const userOrders = orders.filter(o => o.userId === userId);
        if (userOrders.length === 0) {
            html += "<p>Пока нет заказов</p>";
        } else {
            userOrders.forEach(order => {
                html += `<div style="border:1px solid #ccc; margin:10px; padding:10px">`;
                html += `<p>Сумма: ${order.total}</p>`;
                order.items.forEach(item => {
                    html += `<p>${item.title} (${item.quantity})</p>`;
                });
                html += `</div>`;
            });
        }
    }

    container.innerHTML = html;
}