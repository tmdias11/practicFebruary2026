import { db, auth } from "./firebase.js";

import {
    doc,
    getDoc,
    updateDoc,
    arrayUnion,
    increment,
    deleteDoc,
    collection,
    getDocs,
    addDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const params = new URLSearchParams(window.location.search);
const movieId = params.get("id");

const container = document.getElementById("movieContainer");
const form = document.getElementById("addMovieForm");
const stars = document.querySelectorAll(".starRating");
const recommendationsContainer = document.getElementById("recommendationsContainer");
const commentsContainer = document.getElementById("commentsContainer");
const commentForm = document.getElementById("commentForm");
const buyBtn = document.getElementById("buyTicketBtn");
const deleteMovieBtn = document.getElementById("deleteMovie");

let currentUserUid = null;
let currentUserRole = "User";

onAuthStateChanged(auth, async (user) => {
    try {
        form?.classList.add("hidden");

        if (user) {
            currentUserUid = user.uid;

            const userSnap = await getDoc(doc(db, "users", user.uid));
            if (userSnap.exists()) {
                currentUserRole = userSnap.data().role || "User";

                if (currentUserRole === "Admin") {
                    form?.classList.remove("hidden");
                }
            }

            console.log("Вошёл:", user.email);
        } else {
            currentUserUid = null;
            currentUserRole = "User";
            console.log("Пользователь не вошёл");
        }
    } catch (err) {
        console.error("Ошибка auth:", err);
    }
}); 

async function loadMovie() {
    if (!movieId || !container) {
        if (container) container.innerHTML = "<h2>Фильм не найден</h2>";
        return;
    }

    try {
        const movieSnap = await getDoc(doc(db, "movies", movieId));

        if (!movieSnap.exists()) {
            container.innerHTML = "<h2>Фильм не существует</h2>";
            return;
        }

        const movie = movieSnap.data();

        let ratingText = "Пока нет оценок";
        if (movie.ratingCount > 0) {
            const avg = movie.ratingSum / movie.ratingCount;
            ratingText = `${avg.toFixed(1)} (${movie.ratingCount} голосов)`;
        }

        const trailerHTML = movie.trailerUrl
            ? `<iframe width="560" height="315" src="${movie.trailerUrl}" allowfullscreen></iframe>`
            : `Трейлер не добавлен`;

        container.innerHTML = `
            <h1>${movie.title}</h1>
            <p><b>Страна:</b> ${movie.country}</p>
            <p><b>Год:</b> ${movie.year}</p>
            <p><b>Описание:</b> ${movie.description || "-"}</p>

            <h3>Трейлер</h3>
            ${trailerHTML}

            <h3>Рейтинг</h3>
            <p>${ratingText}</p>

            <p id="movieGenres"><b>Жанры:</b> ${(movie.genres || []).join(", ")}</p>
        `;

        showRecommendations(movie.genres || [], movieId);

    } catch (err) {
        console.error("Ошибка загрузки фильма:", err);
    }
}

stars.forEach((star, index) => {
    star.addEventListener("click", async () => {
        if (!currentUserUid) {
            alert("Только для зарегистрированных");
            return;
        }

        try {
            const movieRef = doc(db, "movies", movieId);
            const snap = await getDoc(movieRef);

            if (!snap.exists()) return;

            const movie = snap.data();

            if (movie.voters?.includes(currentUserUid)) {
                alert("Вы уже голосовали");
                return;
            }

            const rating = index + 1;

            await updateDoc(movieRef, {
                ratingSum: increment(rating),
                ratingCount: increment(1),
                voters: arrayUnion(currentUserUid)
            });

            loadMovie();

        } catch (err) {
            console.error("Ошибка рейтинга:", err);
        }
    });
});

form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
        const movieRef = doc(db, "movies", movieId);
        const snap = await getDoc(movieRef);
        if (!snap.exists()) return alert("Фильм не найден");

        const movie = snap.data();

        const updatedData = {
            title: document.getElementById("titleUpdate").value || movie.title,
            country: document.getElementById("countryUpdate").value || movie.country,
            year: Number(document.getElementById("yearUpdate").value || movie.year),
            img: document.getElementById("imgUpdate").value || movie.img,
            trailerUrl: document.getElementById("trailerUrlUpdate").value || movie.trailerUrl
        };

        await updateDoc(movieRef, updatedData);
        form.reset();
        loadMovie();

    } catch (err) {
        console.error("Ошибка обновления:", err);
    }
});

deleteMovieBtn?.addEventListener("click", async () => {
    if (!confirm("Удалить фильм?")) return;

    try {
        await deleteDoc(doc(db, "movies", movieId));
        window.location.href = "../index.html";
    } catch (err) {
        console.error("Ошибка удаления:", err);
    }
});

async function showRecommendations(genres, currentMovieId) {
    if (!genres.length || !recommendationsContainer) return;

    try {
        const snapshot = await getDocs(collection(db, "movies"));

        const movies = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        const filtered = movies.filter(m =>
            m.id !== currentMovieId &&
            m.genres?.some(g => genres.includes(g))
        );

        if (!filtered.length) {
            recommendationsContainer.innerHTML = "<p>Нет похожих фильмов</p>";
            return;
        }

        recommendationsContainer.innerHTML = `
            <h3>Похожие фильмы</h3>
            <div class="recommendations-grid">
                ${filtered.map(m => {
                    const rating = m.ratingCount > 0
                        ? (m.ratingSum / m.ratingCount).toFixed(1)
                        : "Нет";

                    return `
                        <div class="movie-card">
                            <h2><a href="movie.html?id=${m.id}">${m.title}</a></h2>
                            <p>${m.country}</p>
                            <p>⭐ ${rating}</p>
                            <img src="${m.img || ""}" />
                        </div>
                    `;
                }).join("")}
            </div>
        `;

    } catch (err) {
        console.error("Ошибка рекомендаций:", err);
    }
}

commentForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUserUid) return alert("Войдите");

    const text = document.getElementById("commentText").value.trim();
    if (!text) return;

    try {
        await addDoc(collection(db, "comments"), {
            movieId,
            userId: currentUserUid,
            userEmail: auth.currentUser?.email || "Гость",
            text,
            createdAt: serverTimestamp()
        });

        commentForm.reset();
    } catch (err) {
        console.error("Ошибка комментария:", err);
    }
});

function escapeHTML(str) {
    return str.replace(/[&<>"']/g, m => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[m]));
}

function listenComments() {
    if (!commentsContainer) return;

    const q = query(
        collection(db, "comments"),
        where("movieId", "==", movieId),
        orderBy("createdAt", "desc")
    );

    onSnapshot(q, snapshot => {
        if (snapshot.empty) {
            commentsContainer.innerHTML = "<p>Нет комментариев</p>";
            return;
        }

        commentsContainer.innerHTML = snapshot.docs.map(docSnap => {
            const c = docSnap.data();
            const id = docSnap.id;

            const isAuthor = currentUserUid === c.userId;
            const isAdmin = currentUserRole === "Admin";

            return `
                <div class="comment">
                    <div>${escapeHTML(c.userEmail)}</div>
                    <div>${escapeHTML(c.text)}</div>
                    <div>
                        ${isAuthor ? `<button onclick="editComment('${id}', \`${c.text}\`)">✏️</button>` : ""}
                        ${(isAuthor || isAdmin) ? `<button onclick="deleteComment('${id}')">🗑</button>` : ""}
                    </div>
                </div>
            `;
        }).join("");
    });
}

window.editComment = async (id, oldText) => {
    const text = prompt("Редактировать:", oldText);
    if (!text || text === oldText) return;

    await updateDoc(doc(db, "comments", id), { text });
};

window.deleteComment = async (id) => {
    if (!confirm("Удалить?")) return;
    await deleteDoc(doc(db, "comments", id));
};

/* ================= BUY ================= */
buyBtn?.addEventListener("click", async () => {
    if (!currentUserUid) return alert("Войдите");

    try {
        const snap = await getDoc(doc(db, "movies", movieId));
        if (!snap.exists()) return;

        const movie = snap.data();

        await addDoc(collection(db, "ticketsCart"), {
            userId: currentUserUid,
            movieId,
            title: movie.title,
            price: 1500,
            quantity: 1,
            createdAt: serverTimestamp()
        });

        alert("Добавлено в корзину");

    } catch (err) {
        console.error("Ошибка покупки:", err);
    }
});

/* ================= INIT ================= */
loadMovie();
listenComments();
