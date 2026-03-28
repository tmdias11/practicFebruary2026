import { db, auth } from "./firebase.js";

import {
    collection,
    getDocs,
    deleteDoc,
    doc,
    addDoc
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

import { query, where } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const container = document.getElementById("cartContainer");
const totalEl = document.getElementById("totalPrice");
const checkoutBtn = document.getElementById("checkoutBtn");

let currentUser = null;
let cartItems = [];

onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    currentUser = user;
    loadCart();
});

async function loadCart() {
    const q = query(
        collection(db, "ticketsCart"),
        where("userId", "==", currentUser.uid)
    );

    const snapshot = await getDocs(q);

    cartItems = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
    }));

    renderCart();
}

function renderCart() {
    let html = "";
    let total = 0;
    if (!cartItems.length) {
        container.innerHTML = `<p class="empty-cart">Корзина пуста 🛒</p>`;
        totalEl.innerText = "";
        return;
    }

    cartItems.forEach(item => {
        total += item.price * item.quantity;

        html += `
            <div class="cart-item">
                <h3>${item.title}</h3>
                <p>${item.quantity} x ${item.price}</p>
                <button onclick="removeItem('${item.id}')">Удалить</button>
            </div>
        `;
    });

    container.innerHTML = html;
    totalEl.innerText = "Итого: " + total;
}

window.removeItem = async function(id) {
    await deleteDoc(doc(db, "ticketsCart", id));
    loadCart();
};

checkoutBtn.addEventListener("click", async () => {
    if (!cartItems.length) return;

    const total = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    await addDoc(collection(db, "ticketsOrders"), {
        userId: currentUser.uid,
        items: cartItems,
        total,
        createdAt: new Date()
    });

    for (const item of cartItems) {
        await deleteDoc(doc(db, "ticketsCart", item.id));
    }

    alert("Покупка завершена");
    loadCart();
});